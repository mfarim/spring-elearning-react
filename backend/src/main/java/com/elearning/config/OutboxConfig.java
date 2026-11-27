package com.elearning.config;

import com.elearning.common.outbox.EventPublisher;
import com.elearning.common.outbox.LoggingEventPublisher;
import com.elearning.common.outbox.MetadataServerTokenProvider;
import com.elearning.common.outbox.OutboxEventRepository;
import com.elearning.common.outbox.OutboxRelay;
import com.elearning.common.outbox.PubSubRestPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;

/**
 * Outbound events (transactional outbox). Nothing runs unless
 * {@code app.notifications.exam-results.enabled=true}; then {@code app.outbox.publisher} chooses
 * {@code log} (local development, default) or {@code pubsub} (Google Cloud Pub/Sub).
 */
@Configuration
@ConditionalOnProperty(name = "app.notifications.exam-results.enabled", havingValue = "true")
public class OutboxConfig {

    @Bean
    @ConditionalOnProperty(name = "app.outbox.publisher", havingValue = "log", matchIfMissing = true)
    public EventPublisher loggingEventPublisher() {
        return new LoggingEventPublisher();
    }

    @Bean
    @ConditionalOnProperty(name = "app.outbox.publisher", havingValue = "pubsub")
    public EventPublisher pubSubEventPublisher(
            ObjectMapper objectMapper,
            @Value("${app.outbox.pubsub.topic:}") String topic,
            @Value("${app.outbox.pubsub.endpoint:" + PubSubRestPublisher.DEFAULT_ENDPOINT + "}") String endpoint,
            @Value("${app.outbox.pubsub.token-url:" + MetadataServerTokenProvider.DEFAULT_URL + "}") String tokenUrl) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        MetadataServerTokenProvider tokens = new MetadataServerTokenProvider(httpClient, objectMapper, tokenUrl, Clock.systemUTC());
        return new PubSubRestPublisher(httpClient, objectMapper, tokens, endpoint, topic);
    }

    @Bean
    public OutboxRelay outboxRelay(
            OutboxEventRepository repository,
            EventPublisher publisher,
            PlatformTransactionManager transactionManager,
            @Value("${app.outbox.batch-size:50}") int batchSize,
            @Value("${app.outbox.max-attempts:10}") int maxAttempts) {
        return new OutboxRelay(repository, publisher, new TransactionTemplate(transactionManager),
                Clock.systemDefaultZone(), batchSize, maxAttempts);
    }
}
