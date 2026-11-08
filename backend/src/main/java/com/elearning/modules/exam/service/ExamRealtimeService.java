package com.elearning.modules.exam.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Map;

/**
 * Pushes exam events to the teacher's live monitor ({@code /topic/exams/{examId}/monitor}).
 *
 * <ul>
 *   <li>Events are sent only after the surrounding transaction commits, so the monitor never shows
 *       an answer or a score that was rolled back.</li>
 *   <li>{@code app.realtime.mode=local} (default): sent straight to this instance's in-memory STOMP broker.</li>
 *   <li>{@code app.realtime.mode=redis}: published to a Redis channel; every instance relays it to its own
 *       broker (see {@code RealtimeRedisConfig}), so teachers connected to any instance receive it.</li>
 * </ul>
 */
@Service
@Slf4j
public class ExamRealtimeService {

    public static final String REDIS_CHANNEL = "elearning:exam-events";

    private final SimpMessagingTemplate messagingTemplate;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final boolean redisFanout;

    public ExamRealtimeService(
            SimpMessagingTemplate messagingTemplate,
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper,
            @Value("${app.realtime.mode:local}") String mode) {
        this.messagingTemplate = messagingTemplate;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.redisFanout = "redis".equalsIgnoreCase(mode);
    }

    /** Message relayed between instances through Redis. */
    public record Envelope(String destination, Map<String, Object> message) {
    }

    public void broadcastExamEvent(Long examId, String eventType, Object payload) {
        Envelope envelope = new Envelope(
                "/topic/exams/" + examId + "/monitor",
                Map.of(
                        "eventType", eventType,
                        "timestamp", System.currentTimeMillis(),
                        "data", payload
                ));

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    dispatch(envelope);
                }
            });
        } else {
            dispatch(envelope);
        }
    }

    /** Called by the Redis listener on every instance when {@code app.realtime.mode=redis}. */
    public void deliverFromRedis(String json) {
        try {
            Envelope envelope = objectMapper.readValue(json, Envelope.class);
            sendLocally(envelope);
        } catch (JsonProcessingException e) {
            log.warn("Ignoring malformed exam event from Redis: {}", e.getOriginalMessage());
        }
    }

    private void dispatch(Envelope envelope) {
        if (!redisFanout) {
            sendLocally(envelope);
            return;
        }
        try {
            redisTemplate.convertAndSend(REDIS_CHANNEL, objectMapper.writeValueAsString(envelope));
        } catch (Exception e) {
            // Live monitoring is best effort: fall back to this instance rather than lose the event.
            log.warn("Failed to publish exam event to Redis, delivering locally: {}", e.getMessage());
            sendLocally(envelope);
        }
    }

    private void sendLocally(Envelope envelope) {
        try {
            messagingTemplate.convertAndSend(envelope.destination(), envelope.message());
        } catch (Exception e) {
            log.warn("Failed to broadcast WebSocket message to {}: {}", envelope.destination(), e.getMessage());
        }
    }
}
