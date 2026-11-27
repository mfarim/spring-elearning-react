package com.elearning.common.outbox;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.function.Supplier;

/**
 * OAuth access token of the VM's service account, read from the Compute Engine metadata server.
 * No key file is involved: the token belongs to the service account attached to the VM, and it is
 * cached until a minute before it expires.
 */
public class MetadataServerTokenProvider implements Supplier<String> {

    /** IP instead of metadata.google.internal: works inside containers whatever their DNS setup. */
    public static final String DEFAULT_URL =
            "http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final URI tokenUri;
    private final Clock clock;

    private String token;
    private Instant refreshAt = Instant.EPOCH;

    public MetadataServerTokenProvider(HttpClient httpClient, ObjectMapper objectMapper, String tokenUrl, Clock clock) {
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
        this.tokenUri = URI.create(tokenUrl);
        this.clock = clock;
    }

    @Override
    public synchronized String get() {
        if (token != null && clock.instant().isBefore(refreshAt)) {
            return token;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(tokenUri)
                    .header("Metadata-Flavor", "Google")
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new IllegalStateException("Metadata server returned HTTP " + response.statusCode());
            }
            JsonNode body = objectMapper.readTree(response.body());
            token = body.path("access_token").asText();
            long expiresIn = body.path("expires_in").asLong(0);
            refreshAt = clock.instant().plusSeconds(Math.max(0, expiresIn - 60));
            return token;
        } catch (IOException e) {
            throw new IllegalStateException("Could not read an access token from the metadata server: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while reading an access token", e);
        }
    }
}
