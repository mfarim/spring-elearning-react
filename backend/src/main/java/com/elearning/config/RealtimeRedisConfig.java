package com.elearning.config;

import com.elearning.modules.exam.service.ExamRealtimeService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

import java.nio.charset.StandardCharsets;

/**
 * Multi-instance live monitoring: every backend instance subscribes to the exam-events channel and relays
 * each event to its own in-memory STOMP broker, so a teacher sees events no matter which instance the
 * student's request hit. Enabled with {@code app.realtime.mode=redis}.
 */
@Configuration
@ConditionalOnProperty(name = "app.realtime.mode", havingValue = "redis")
public class RealtimeRedisConfig {

    @Bean
    public RedisMessageListenerContainer examEventsListenerContainer(
            RedisConnectionFactory connectionFactory, ExamRealtimeService realtimeService) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(
                (message, pattern) -> realtimeService.deliverFromRedis(new String(message.getBody(), StandardCharsets.UTF_8)),
                new ChannelTopic(ExamRealtimeService.REDIS_CHANNEL));
        return container;
    }
}
