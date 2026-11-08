package com.elearning.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

import java.time.Duration;

/**
 * Server-side rate limiting filter (counters in memory or in Redis, see {@link RateLimiter}).
 * Intercepts incoming HTTP requests at the Servlet Filter layer before hitting controllers,
 * protecting against brute-force attacks, DDoS, and excessive API burst traffic.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    /** In-memory or Redis-backed, see {@code RateLimitConfig}. */
    private final RateLimiter rateLimiter;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    // Rate limit thresholds
    private static final int AUTH_CAPACITY = 10;            // 10 login/auth requests per minute per IP
    private static final int SUBMIT_CAPACITY = 60;          // 60 autosave/submit requests per minute per IP
    private static final int GENERAL_CAPACITY = 120;        // 120 general API requests per minute per IP

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
        if (requestUri.startsWith("/api/v1/auth/login") || requestUri.startsWith("/api/v1/auth/register")
                || requestUri.startsWith("/api/v1/auth/change-password")) {
            if (!rateLimiter.tryAcquire("api:auth:" + clientIp, AUTH_CAPACITY, WINDOW)) {
                log.warn("Rate limit [AUTH] exceeded for IP {} on {}", clientIp, requestUri);
                sendRateLimitResponse(response, "Terlalu banyak percobaan autentikasi dari alamat IP ini. Silakan tunggu 1 menit sebelum mencoba lagi.");
                return;
            }
        }

        // 2. Medium tier: Exam autosave and submissions (anti-flood during high-concurrency CBT)
        else if (requestUri.contains("/exams/") && (requestUri.endsWith("/submit") || requestUri.endsWith("/answer") || requestUri.endsWith("/answers"))) {
            if (!rateLimiter.tryAcquire("api:submit:" + clientIp, SUBMIT_CAPACITY, WINDOW)) {
                log.warn("Rate limit [EXAM SUBMIT] exceeded for IP {} on {}", clientIp, requestUri);
                sendRateLimitResponse(response, "Terlalu banyak permintaan submit ujian secara bersamaan. Silakan tunggu beberapa saat.");
                return;
            }
        }

        // 3. General API tier: All other /api/v1/** endpoints
        else if (requestUri.startsWith("/api/v1")) {
            if (!rateLimiter.tryAcquire("api:general:" + clientIp, GENERAL_CAPACITY, WINDOW)) {
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
