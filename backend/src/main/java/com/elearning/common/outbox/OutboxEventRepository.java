package com.elearning.common.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    /**
     * Records an event unless one with the same type and aggregate already exists. Never throws on a
     * duplicate, so it cannot roll back the transaction that is grading the exam.
     *
     * @return 1 if the event was recorded, 0 if it already existed
     */
    @Modifying
    @Query(value = """
            INSERT INTO outbox_events (event_type, aggregate_id, payload)
            VALUES (:eventType, :aggregateId, :payload)
            ON CONFLICT (event_type, aggregate_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("eventType") String eventType,
                       @Param("aggregateId") Long aggregateId,
                       @Param("payload") String payload);

    /**
     * Locks the oldest unpublished events. SKIP LOCKED lets several backend instances run the relay
     * at the same time without publishing the same row twice.
     */
    @Query(value = """
            SELECT * FROM outbox_events
            WHERE published_at IS NULL AND attempts < :maxAttempts
            ORDER BY id
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<OutboxEvent> lockPendingBatch(@Param("maxAttempts") int maxAttempts, @Param("limit") int limit);
}
