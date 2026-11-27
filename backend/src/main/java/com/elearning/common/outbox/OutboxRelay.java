package com.elearning.common.outbox;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Publishes pending outbox events every few seconds.
 *
 * <ul>
 *   <li>A failed publish leaves the event pending with {@code attempts + 1}; after {@code maxAttempts}
 *       it is left for an operator (the row keeps the last error).</li>
 *   <li>Rows are locked with SKIP LOCKED, so several backend instances can run the relay safely.</li>
 *   <li>Delivery is at least once: a crash between publishing and committing republishes the event.
 *       Consumers deduplicate on the {@code eventId} attribute.</li>
 * </ul>
 *
 * Registered by {@code OutboxConfig} only when an outbound event type is enabled.
 */
@Slf4j
public class OutboxRelay {

    private final OutboxEventRepository repository;
    private final EventPublisher publisher;
    private final TransactionTemplate transactionTemplate;
    private final Clock clock;
    private final int batchSize;
    private final int maxAttempts;

    public OutboxRelay(OutboxEventRepository repository, EventPublisher publisher, TransactionTemplate transactionTemplate,
                       Clock clock, int batchSize, int maxAttempts) {
        this.repository = repository;
        this.publisher = publisher;
        this.transactionTemplate = transactionTemplate;
        this.clock = clock;
        this.batchSize = batchSize;
        this.maxAttempts = maxAttempts;
    }

    @Scheduled(initialDelayString = "${app.outbox.relay-initial-delay-ms:10000}",
            fixedDelayString = "${app.outbox.relay-interval-ms:5000}")
    public void relay() {
        // Keep going while full batches publish cleanly; stop at the first partial or failing batch.
        int published;
        do {
            Integer result = transactionTemplate.execute(status -> publishBatch());
            published = result == null ? 0 : result;
        } while (published == batchSize);
    }

    /** Publishes one batch inside the caller's transaction. Returns how many events were published. */
    int publishBatch() {
        List<OutboxEvent> events = repository.lockPendingBatch(maxAttempts, batchSize);
        int published = 0;
        for (OutboxEvent event : events) {
            try {
                publisher.publish(event);
                event.setPublishedAt(LocalDateTime.now(clock));
                event.setLastError(null);
                published++;
            } catch (Exception e) {
                event.setAttempts(event.getAttempts() + 1);
                event.setLastError(truncate(e.getMessage()));
                if (event.getAttempts() >= maxAttempts) {
                    log.error("Outbox event {} failed {} times and will not be retried: {}",
                            event.eventId(), event.getAttempts(), event.getLastError());
                } else {
                    log.warn("Outbox event {} not published (attempt {}): {}",
                            event.eventId(), event.getAttempts(), event.getLastError());
                }
            }
        }
        repository.saveAll(events);
        return published;
    }

    private static String truncate(String message) {
        if (message == null) return "unknown error";
        return message.length() <= 500 ? message : message.substring(0, 500);
    }
}
