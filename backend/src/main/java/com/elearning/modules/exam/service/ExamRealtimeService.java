package com.elearning.modules.exam.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamRealtimeService {

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcastExamEvent(Long examId, String eventType, Object payload) {
        try {
            String destination = "/topic/exams/" + examId + "/monitor";
            Map<String, Object> message = Map.of(
                    "eventType", eventType,
                    "timestamp", System.currentTimeMillis(),
                    "data", payload
            );
            messagingTemplate.convertAndSend(destination, message);
        } catch (Exception e) {
            log.warn("Failed to broadcast WebSocket message for exam {}: {}", examId, e.getMessage());
        }
    }
}
