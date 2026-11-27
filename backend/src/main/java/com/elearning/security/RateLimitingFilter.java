package com.elearning.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
 *
 * <p>Requests that carry a valid access token are counted per user. A school computer lab usually shares
 * one public IP address, so counting per IP would make a whole class share one budget and lock students
 * out while they save answers. Only requests without a valid token (and the auth endpoints, where no
 * token exists yet) are counted per IP.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Duration WINDOW = Duration.ofMinutes(1);
    private static final String USER_KEY_PREFIX = "user:";
    private static final String IP_KEY_PREFIX = "ip:";
    private static final String BEARER_PREFIX = "Bearer ";

    /** In-memory or Redis-backed, see {@code RateLimitConfig}. */
    private final RateLimiter rateLimiter;
    /** Reads the user id from the access token; this filter runs before {@link JwtAuthenticationFilter}. */
    private final JwtProvider jwtProvider;

    // Requests per minute (see app.rate-limit.* in application.yml)
    @Value("${app.rate-limit.auth-per-ip:200}")
    private int authPerIp = 200;

    @Value("${app.rate-limit.exam-per-user:120}")
    private int examPerUser = 120;

    @Value("${app.rate-limit.api-per-user:120}")
    private int apiPerUser = 120;

    @Value("${app.rate-limit.anonymous-per-ip:300}")
    private int anonymousPerIp = 300;

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

        if (isAuthEndpoint(requestUri)) {
            // 1. Auth endpoints (login, register, change password): no trusted identity yet, so count per IP.
            //    Brute force on a single account is limited separately, per e-mail, in LoginRateLimiterService.
            if (!rateLimiter.tryAcquire("api:auth:" + clientIp, authPerIp, WINDOW)) {
                log.warn("Rate limit [AUTH] exceeded for IP {} on {}", clientIp, requestUri);
                sendRateLimitResponse(response, "Terlalu banyak percobaan autentikasi dari alamat IP ini. Silakan tunggu 1 menit sebelum mencoba lagi.");
                return;
            }
        } else if (isExamWriteEndpoint(requestUri)) {
            // 2. Exam autosave and submissions (anti-flood during high-concurrency CBT), per student.
            String clientKey = resolveClientKey(request, clientIp);
            if (!rateLimiter.tryAcquire("api:submit:" + clientKey, capacityFor(clientKey, examPerUser), WINDOW)) {
                log.warn("Rate limit [EXAM SUBMIT] exceeded for {} on {}", clientKey, requestUri);
                sendRateLimitResponse(response, "Terlalu banyak permintaan simpan jawaban dalam waktu singkat. Silakan tunggu beberapa saat.");
                return;
            }
        } else if (requestUri.startsWith("/api/v1")) {
            // 3. Every other /api/v1/** endpoint, per user.
            String clientKey = resolveClientKey(request, clientIp);
            if (!rateLimiter.tryAcquire("api:general:" + clientKey, capacityFor(clientKey, apiPerUser), WINDOW)) {
                log.warn("Rate limit [GENERAL API] exceeded for {} on {}", clientKey, requestUri);
                sendRateLimitResponse(response, "Batas permintaan API terlampaui. Silakan kurangi frekuensi permintaan Anda.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private static boolean isAuthEndpoint(String requestUri) {
        return requestUri.startsWith("/api/v1/auth/login")
                || requestUri.startsWith("/api/v1/auth/register")
                || requestUri.startsWith("/api/v1/auth/change-password");
    }

    private static boolean isExamWriteEndpoint(String requestUri) {
        return requestUri.contains("/exams/")
                && (requestUri.endsWith("/submit") || requestUri.endsWith("/answer") || requestUri.endsWith("/answers"));
    }

    /**
     * {@code "user:<id>"} when the request carries a valid access token, otherwise {@code "ip:<address>"}.
     * A forged or expired token never selects a user bucket, so it cannot be used to dodge the IP limit.
     */
    String resolveClientKey(HttpServletRequest request, String clientIp) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            try {
                if (jwtProvider.validateAccessToken(token)) {
                    return USER_KEY_PREFIX + jwtProvider.getUserIdFromToken(token);
                }
            } catch (RuntimeException e) {
                // Malformed token or subject: fall through and count the request per IP.
            }
        }
        return IP_KEY_PREFIX + clientIp;
    }

    private int capacityFor(String clientKey, int perUserCapacity) {
        return clientKey.startsWith(USER_KEY_PREFIX) ? perUserCapacity : anonymousPerIp;
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
