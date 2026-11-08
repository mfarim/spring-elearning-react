package com.elearning.modules.exam.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ExamRealtimeServiceTest {

    private static final String MONITOR = "/topic/exams/7/monitor";

    private final SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private ExamRealtimeService service(String mode) {
        return new ExamRealtimeService(messaging, redis, objectMapper, mode);
    }

    @AfterEach
    void clearTransactionSynchronization() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void localModeSendsDirectlyToTheMonitorTopic() {
        service("local").broadcastExamEvent(7L, "ANSWER_SAVED", Map.of("answeredCount", 3));

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(messaging).convertAndSend(eq(MONITOR), payload.capture());
        assertEquals("ANSWER_SAVED", ((Map<?, ?>) payload.getValue()).get("eventType"));
        verifyNoInteractions(redis);
    }

    @Test
    void insideATransactionTheEventIsSentOnlyAfterCommit() {
        TransactionSynchronizationManager.initSynchronization();

        service("local").broadcastExamEvent(7L, "EXAM_SUBMITTED", Map.of("score", 80));
        verifyNoInteractions(messaging);

        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        verify(messaging).convertAndSend(eq(MONITOR), any(Object.class));
    }

    @Test
    void redisModePublishesToTheChannelAndEveryInstanceDeliversLocally() {
        ExamRealtimeService realtime = service("redis");

        realtime.broadcastExamEvent(7L, "STUDENT_JOINED", Map.of("studentName", "Andi"));

        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(redis).convertAndSend(eq(ExamRealtimeService.REDIS_CHANNEL), json.capture());
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));

        // What the Redis listener does on each instance:
        realtime.deliverFromRedis(json.getValue());
        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(messaging).convertAndSend(eq(MONITOR), payload.capture());
        assertEquals("STUDENT_JOINED", ((Map<?, ?>) payload.getValue()).get("eventType"));
    }

    @Test
    void redisFailureFallsBackToLocalDelivery() {
        when(redis.convertAndSend(anyString(), any())).thenThrow(new RedisConnectionFailureException("down"));

        service("redis").broadcastExamEvent(7L, "ANSWER_SAVED", Map.of("answeredCount", 1));

        verify(messaging).convertAndSend(eq(MONITOR), any(Object.class));
    }

    @Test
    void malformedRedisMessagesAreIgnored() {
        service("redis").deliverFromRedis("not json");

        verifyNoInteractions(messaging);
    }
}
