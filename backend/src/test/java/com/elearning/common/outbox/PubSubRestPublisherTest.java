package com.elearning.common.outbox;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Runs the publisher and the token provider against a local HTTP server that plays Pub/Sub and the metadata server. */
class PubSubRestPublisherTest {

    private static final String TOPIC = "projects/demo/topics/exam-results";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final List<String> publishedBodies = new ArrayList<>();
    private final List<String> authHeaders = new ArrayList<>();
    private final AtomicInteger tokenRequests = new AtomicInteger();
    private volatile int publishStatus = 200;
    private HttpServer server;
    private String baseUrl;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/token", exchange -> {
            tokenRequests.incrementAndGet();
            boolean fromGoogle = "Google".equals(exchange.getRequestHeaders().getFirst("Metadata-Flavor"));
            respond(exchange, fromGoogle ? 200 : 403, "{\"access_token\":\"tok-" + tokenRequests.get() + "\",\"expires_in\":3600}");
        });
        server.createContext("/v1/" + TOPIC + ":publish", exchange -> {
            authHeaders.add(exchange.getRequestHeaders().getFirst("Authorization"));
            publishedBodies.add(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            respond(exchange, publishStatus, publishStatus == 200 ? "{\"messageIds\":[\"1\"]}" : "{\"error\":\"unavailable\"}");
        });
        server.start();
        baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    @Test
    void publishesTheEventAsABase64MessageWithItsIdAsAttribute() throws Exception {
        publisher().publish(event());

        assertEquals(1, publishedBodies.size());
        assertEquals("Bearer tok-1", authHeaders.get(0));
        JsonNode message = objectMapper.readTree(publishedBodies.get(0)).get("messages").get(0);
        String data = new String(Base64.getDecoder().decode(message.get("data").asText()), StandardCharsets.UTF_8);
        assertEquals("{\"attemptId\":500}", data);
        assertEquals("exam.result_ready", message.get("attributes").get("eventType").asText());
        assertEquals("exam.result_ready:500", message.get("attributes").get("eventId").asText());
    }

    @Test
    void reusesTheAccessTokenUntilItIsAboutToExpire() throws Exception {
        PubSubRestPublisher publisher = publisher();
        publisher.publish(event());
        publisher.publish(event());

        assertEquals(1, tokenRequests.get());
    }

    @Test
    void anErrorResponseThrowsSoTheEventStaysPending() {
        publishStatus = 503;

        IllegalStateException error = assertThrows(IllegalStateException.class, () -> publisher().publish(event()));
        assertTrue(error.getMessage().contains("HTTP 503"));
    }

    @Test
    void rejectsATopicThatIsNotAFullResourceName() {
        assertThrows(IllegalArgumentException.class,
                () -> new PubSubRestPublisher(httpClient, objectMapper, () -> "t", baseUrl, "exam-results"));
    }

    private PubSubRestPublisher publisher() {
        Clock clock = Clock.fixed(Instant.parse("2026-11-15T03:00:00Z"), ZoneOffset.UTC);
        MetadataServerTokenProvider tokens = new MetadataServerTokenProvider(httpClient, objectMapper, baseUrl + "/token", clock);
        return new PubSubRestPublisher(httpClient, objectMapper, tokens, baseUrl, TOPIC);
    }

    private static OutboxEvent event() {
        return OutboxEvent.builder().id(1L).eventType("exam.result_ready").aggregateId(500L).payload("{\"attemptId\":500}").build();
    }

    private static void respond(com.sun.net.httpserver.HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
