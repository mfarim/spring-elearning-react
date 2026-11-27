package com.elearning.modules.exam.service;

import com.elearning.common.outbox.OutboxEventRepository;
import com.elearning.modules.exam.entity.ExamAttempt;
import com.elearning.modules.exam.entity.Examination;
import com.elearning.modules.user.entity.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Records an "exam result ready" event in the outbox when an attempt's result becomes final, so the
 * student can be e-mailed. Call it inside the transaction that sets the attempt to {@code completed}:
 * the event is then committed or rolled back together with the grade.
 *
 * <p>The score is only included when the exam shows results to students ({@code show_result}); otherwise
 * the e-mail just says the exam was graded.
 */
@Service
public class ExamResultEvents {

    public static final String RESULT_READY = "exam.result_ready";

    private final OutboxEventRepository outbox;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    public ExamResultEvents(OutboxEventRepository outbox, ObjectMapper objectMapper,
                            @Value("${app.notifications.exam-results.enabled:false}") boolean enabled) {
        this.outbox = outbox;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
    }

    public void resultReady(ExamAttempt attempt) {
        if (!enabled) {
            return;
        }
        Examination exam = attempt.getExamination();
        User user = attempt.getStudent().getUser();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("attemptId", attempt.getId());
        payload.put("examId", exam.getId());
        payload.put("examTitle", exam.getTitle());
        payload.put("studentName", user.getName());
        payload.put("studentEmail", user.getEmail());
        payload.put("showScore", exam.isShowResult());
        if (exam.isShowResult()) {
            payload.put("score", attempt.getScore());
            payload.put("passed", attempt.getPassed());
            payload.put("passingScore", exam.getPassingScore());
        }
        payload.put("finishedAt", attempt.getFinishedAt() == null ? null : attempt.getFinishedAt().toString());

        try {
            outbox.insertIfAbsent(RESULT_READY, attempt.getId(), objectMapper.writeValueAsString(payload));
        } catch (JsonProcessingException e) {
            // Plain maps of strings and numbers always serialize; fail loudly if that ever changes.
            throw new IllegalStateException("Could not serialize exam result event", e);
        }
    }
}
