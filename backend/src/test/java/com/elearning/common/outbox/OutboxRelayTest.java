package com.elearning.common.outbox;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OutboxRelayTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-15T03:00:00Z"), ZoneOffset.UTC);

    private OutboxEventRepository repository;
    private EventPublisher publisher;
    private TransactionTemplate transactionTemplate;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        repository = mock(OutboxEventRepository.class);
        publisher = mock(EventPublisher.class);
        transactionTemplate = mock(TransactionTemplate.class);
        // Run the callback directly: the transaction itself is Spring's job, not the relay's.
        when(transactionTemplate.execute(any())).thenAnswer(inv -> ((TransactionCallback<Object>) inv.getArgument(0)).doInTransaction(null));
    }

    @Test
    void marksPublishedEventsAndRetriesFailedOnesLater() throws Exception {
        OutboxEvent ok = event(1L, 0);
        OutboxEvent failing = event(2L, 3);
        when(repository.lockPendingBatch(10, 50)).thenReturn(List.of(ok, failing));
        doThrow(new IllegalStateException("Pub/Sub publish failed: HTTP 503")).when(publisher).publish(failing);

        int published = relay(50).publishBatch();

        assertEquals(1, published);
        assertEquals(LocalDateTime.now(CLOCK), ok.getPublishedAt());
        assertNull(failing.getPublishedAt());
        assertEquals(4, failing.getAttempts());
        assertEquals("Pub/Sub publish failed: HTTP 503", failing.getLastError());
        verify(repository).saveAll(List.of(ok, failing));
    }

    @Test
    void keepsRelayingWhileFullBatchesPublishCleanly() {
        when(repository.lockPendingBatch(anyInt(), anyInt()))
                .thenReturn(List.of(event(1L, 0), event(2L, 0)))
                .thenReturn(List.of(event(3L, 0)));

        relay(2).relay();

        // First batch was full (2 of 2), second was partial (1 of 2): two rounds, then stop.
        verify(repository, times(2)).lockPendingBatch(10, 2);
    }

    @Test
    void stopsAfterABatchWithFailuresInsteadOfHammeringTheBroker() throws Exception {
        OutboxEvent failing = event(1L, 0);
        when(repository.lockPendingBatch(anyInt(), anyInt())).thenReturn(List.of(failing));
        doThrow(new IllegalStateException("down")).when(publisher).publish(any());

        relay(1).relay();

        verify(repository, times(1)).lockPendingBatch(10, 1);
    }

    private OutboxRelay relay(int batchSize) {
        return new OutboxRelay(repository, publisher, transactionTemplate, CLOCK, batchSize, 10);
    }

    private static OutboxEvent event(long id, int attempts) {
        return OutboxEvent.builder()
                .id(id)
                .eventType("exam.result_ready")
                .aggregateId(500L + id)
                .payload("{}")
                .attempts(attempts)
                .build();
    }
}
