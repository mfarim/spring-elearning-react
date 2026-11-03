package com.elearning.security;

import com.elearning.common.exception.RateLimitExceededException;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

import java.time.Duration;

@Service
@Slf4j
public class LoginRateLimiterService {

    // Bounded + expiring so that floods of distinct IPs/emails cannot exhaust heap memory.
    private final Cache<String, Bucket> ipBuckets = newBucketCache();
    private final Cache<String, Bucket> emailBuckets = newBucketCache();

    static Cache<String, Bucket> newBucketCache() {
        return Caffeine.newBuilder()
                .maximumSize(100_000)
                .expireAfterAccess(Duration.ofMinutes(10))
                .build();
    }

    // 5 login attempts per minute per IP address
    private static final int MAX_ATTEMPTS_PER_IP = 5;
    // 5 login attempts per minute per account email
    private static final int MAX_ATTEMPTS_PER_EMAIL = 5;

    private Bucket createBucket(int capacity, Duration duration) {
        Bandwidth limit = Bandwidth.classic(capacity, Refill.greedy(capacity, duration));
        return Bucket.builder().addLimit(limit).build();
    }

    public void checkLoginAllowed(String clientIp, String email) {
        if (clientIp != null && !clientIp.isBlank()) {
            Bucket ipBucket = ipBuckets.get(clientIp, k -> createBucket(MAX_ATTEMPTS_PER_IP, Duration.ofMinutes(1)));
            if (!ipBucket.tryConsume(1)) {
                log.warn("Login rate limit exceeded for IP: {}", clientIp);
                throw new RateLimitExceededException("Terlalu banyak percobaan login dari alamat IP ini. Silakan tunggu 1 menit sebelum mencoba lagi.");
            }
        }

        if (email != null && !email.isBlank()) {
            String normalizedEmail = email.trim().toLowerCase();
            Bucket emailBucket = emailBuckets.get(normalizedEmail, k -> createBucket(MAX_ATTEMPTS_PER_EMAIL, Duration.ofMinutes(1)));
            if (!emailBucket.tryConsume(1)) {
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
            emailBuckets.invalidate(email.trim().toLowerCase());
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
