package com.elearning.modules.exam.service;

import com.elearning.modules.exam.repository.ExamAttemptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Background job that finalizes exam attempts whose deadline has passed while the student was away
 * (closed the browser, lost connection). Without it such attempts stay "in_progress" until the student
 * comes back, so the teacher's results and the student's grade would be missing.
 *
 * Safe to run on several instances: each attempt is finalized in its own transaction and the
 * {@code @Version} column on the attempt lets only one instance win.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.exam.finalizer.enabled", havingValue = "true", matchIfMissing = true)
public class ExpiredAttemptFinalizer {

    private final ExamAttemptRepository attemptRepository;
    private final ExamRunnerService examRunnerService;

    @Scheduled(
            initialDelayString = "${app.exam.finalizer.initial-delay-ms:30000}",
            fixedDelayString = "${app.exam.finalizer.interval-ms:60000}")
    public void finalizeExpiredAttempts() {
        List<Long> expiredIds = attemptRepository.findExpiredInProgressAttemptIds(LocalDateTime.now());
        if (expiredIds.isEmpty()) {
            return;
        }

        int finalized = 0;
        for (Long attemptId : expiredIds) {
            try {
                if (examRunnerService.finalizeIfExpired(attemptId)) {
                    finalized++;
                }
            } catch (ObjectOptimisticLockingFailureException e) {
                log.debug("Attempt {} was finalized concurrently by another request or instance", attemptId);
            } catch (RuntimeException e) {
                // One broken attempt must not stop the others from being finalized.
                log.warn("Could not finalize expired attempt {}: {}", attemptId, e.getMessage());
            }
        }
        log.info("Finalized {} of {} expired exam attempts", finalized, expiredIds.size());
    }
}
