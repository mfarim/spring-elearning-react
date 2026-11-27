package com.elearning.common.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Publishes to Google Cloud Pub/Sub through its REST API ({@code topics.publish}).
 *
 * <p>The official client library would add gRPC and several megabytes of dependencies for one call
 * every few seconds. Retries are already handled by the outbox (a failed publish stays pending), so a
 * plain HTTPS request with the VM's service-account token is enough.
 */
public class PubSubRestPublisher implements EventPublisher {

    public static final String DEFAULT_ENDPOINT = "https://pubsub.googleapis.com";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final Supplier<String> accessToken;
    private final URI publishUri;

    /**
     * @param topic full topic name, e.g. {@code projects/my-project/topics/exam-results}
     */
    public PubSubRestPublisher(HttpClient httpClient, ObjectMapper objectMapper, Supplier<String> accessToken,
                               String endpoint, String topic) {
        if (topic == null || !topic.matches("projects/[^/]+/topics/[^/]+")) {
            throw new IllegalArgumentException(
                    "app.outbox.pubsub.topic must look like projects/<project>/topics/<topic>, got: " + topic);
        }
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
        this.accessToken = accessToken;
        this.publishUri = URI.create(endpoint.replaceAll("/+$", "") + "/v1/" + topic + ":publish");
    }

    @Override
    public void publish(OutboxEvent event) throws Exception {
        Map<String, Object> body = Map.of("messages", List.of(Map.of(
                "data", Base64.getEncoder().encodeToString(event.getPayload().getBytes(StandardCharsets.UTF_8)),
                "attributes", Map.of(
                        "eventType", event.getEventType(),
                        "eventId", event.eventId()))));

        HttpRequest request = HttpRequest.newBuilder(publishUri)
                .header("Authorization", "Bearer " + accessToken.get())
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            String detail = response.body() == null ? "" : response.body();
            throw new IllegalStateException("Pub/Sub publish failed: HTTP " + response.statusCode() + " "
                    + detail.substring(0, Math.min(detail.length(), 200)));
        }
    }
}
