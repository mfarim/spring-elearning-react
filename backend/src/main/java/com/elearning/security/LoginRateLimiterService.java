package com.elearning.security;

import com.elearning.common.exception.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;


import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoginRateLimiterService {

    /** In-memory or Redis-backed (shared across instances), see {@code RateLimitConfig}. */
    private final RateLimiter rateLimiter;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    // 5 login attempts per minute per IP address
    private static final int MAX_ATTEMPTS_PER_IP = 5;
    // 5 login attempts per minute per account email
    private static final int MAX_ATTEMPTS_PER_EMAIL = 5;

    public void checkLoginAllowed(String clientIp, String email) {
        if (clientIp != null && !clientIp.isBlank()) {
            if (!rateLimiter.tryAcquire("login:ip:" + clientIp, MAX_ATTEMPTS_PER_IP, WINDOW)) {
                log.warn("Login rate limit exceeded for IP: {}", clientIp);
                throw new RateLimitExceededException("Terlalu banyak percobaan login dari alamat IP ini. Silakan tunggu 1 menit sebelum mencoba lagi.");
            }
        }

        if (email != null && !email.isBlank()) {
            String normalizedEmail = email.trim().toLowerCase();
            if (!rateLimiter.tryAcquire("login:email:" + normalizedEmail, MAX_ATTEMPTS_PER_EMAIL, WINDOW)) {
                log.warn("Login rate limit exceeded for email: {}", email);
                throw new RateLimitExceededException("Terlalu banyak percobaan login gagal untuk akun ini. Silakan tunggu 1 menit sebelum mencoba lagi.");
            }
        }
    }

    /**
     * Called after a successful login. Only the per-account bucket is reset; the per-IP bucket is kept,
     * otherwise an attacker could reset their IP limit by periodically logging into their own account.
     */
    public void clearRateLimit(String clientIp, String email) {
        if (email != null) {
            rateLimiter.reset("login:email:" + email.trim().toLowerCase());
        }
    }

    /**
     * Client IP as resolved by Tomcat's RemoteIpValve (server.forward-headers-strategy=native).
     * X-Forwarded-For is only honoured when the request comes from a trusted internal proxy
     * (server.tomcat.remoteip.internal-proxies), so clients cannot spoof their IP with headers.
     * CF-Connecting-IP / X-Real-IP are intentionally NOT read here: set the real client IP at the
     * edge proxy (e.g. nginx real_ip module with Cloudflare ranges) instead.
     */
    public static String getClientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
