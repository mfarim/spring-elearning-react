package com.elearning.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Server-Side Rate Limiting Filter using Bucket4j.
 * Intercepts incoming HTTP requests at the Servlet Filter layer before hitting controllers,
 * protecting against brute-force attacks, DDoS, and excessive API burst traffic.
 */
@Component
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> authIpBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> submitIpBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> generalIpBuckets = new ConcurrentHashMap<>();

    // Rate limit thresholds
    private static final int AUTH_CAPACITY = 10;            // 10 login/auth requests per minute per IP
    private static final int SUBMIT_CAPACITY = 60;          // 60 autosave/submit requests per minute per IP
    private static final int GENERAL_CAPACITY = 120;        // 120 general API requests per minute per IP

    private Bucket createBucket(int capacity, Duration duration) {
        Bandwidth limit = Bandwidth.classic(capacity, Refill.greedy(capacity, duration));
        return Bucket.builder().addLimit(limit).build();
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip rate limiting for static docs, actuator health checks, and options preflights
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || path.startsWith("/actuator")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/api-docs")
                || path.startsWith("/ws");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String clientIp = LoginRateLimiterService.getClientIp(request);
        String requestUri = request.getRequestURI();

        // 1. Strictest tier: Auth endpoints (Login, Refresh, Register)
        if (requestUri.startsWith("/api/v1/auth/login") || requestUri.startsWith("/api/v1/auth/register")) {
            Bucket authBucket = authIpBuckets.computeIfAbsent(
                    clientIp,
                    k -> createBucket(AUTH_CAPACITY, Duration.ofMinutes(1))
            );
            if (!authBucket.tryConsume(1)) {
                log.warn("Rate limit [AUTH] exceeded for IP {} on {}", clientIp, requestUri);
                sendRateLimitResponse(response, "Terlalu banyak percobaan autentikasi dari alamat IP ini. Silakan tunggu 1 menit sebelum mencoba lagi.");
                return;
            }
        }

        // 2. Medium tier: Exam autosave and submissions (anti-flood during high-concurrency CBT)
        else if (requestUri.contains("/exams/") && (requestUri.endsWith("/submit") || requestUri.endsWith("/answer") || requestUri.endsWith("/answers"))) {
            Bucket submitBucket = submitIpBuckets.computeIfAbsent(
                    clientIp,
                    k -> createBucket(SUBMIT_CAPACITY, Duration.ofMinutes(1))
            );
            if (!submitBucket.tryConsume(1)) {
                log.warn("Rate limit [EXAM SUBMIT] exceeded for IP {} on {}", clientIp, requestUri);
                sendRateLimitResponse(response, "Terlalu banyak permintaan submit ujian secara bersamaan. Silakan tunggu beberapa saat.");
                return;
            }
        }

        // 3. General API tier: All other /api/v1/** endpoints
        else if (requestUri.startsWith("/api/v1")) {
            Bucket generalBucket = generalIpBuckets.computeIfAbsent(
                    clientIp,
                    k -> createBucket(GENERAL_CAPACITY, Duration.ofMinutes(1))
            );
            if (!generalBucket.tryConsume(1)) {
                log.warn("Rate limit [GENERAL API] exceeded for IP {} on {}", clientIp, requestUri);
                sendRateLimitResponse(response, "Batas permintaan API terlampaui. Silakan kurangi frekuensi permintaan Anda.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private void sendRateLimitResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Retry-After", "60");
        response.setHeader("X-RateLimit-Retry-After-Seconds", "60");

        String jsonPayload = String.format(
                "{\"success\":false,\"message\":\"%s\",\"data\":null}",
                message
        );
        response.getWriter().write(jsonPayload);
        response.getWriter().flush();
    }
}
