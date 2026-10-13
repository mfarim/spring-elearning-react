package com.elearning.security;

import com.elearning.common.exception.RateLimitExceededException;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class LoginRateLimiterService {

    private final Map<String, Bucket> ipBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> emailBuckets = new ConcurrentHashMap<>();

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
            Bucket ipBucket = ipBuckets.computeIfAbsent(clientIp, k -> createBucket(MAX_ATTEMPTS_PER_IP, Duration.ofMinutes(1)));
            if (!ipBucket.tryConsume(1)) {
                log.warn("Login rate limit exceeded for IP: {}", clientIp);
                throw new RateLimitExceededException("Terlalu banyak percobaan login dari alamat IP ini. Silakan tunggu 1 menit sebelum mencoba lagi.");
            }
        }

        if (email != null && !email.isBlank()) {
            String normalizedEmail = email.trim().toLowerCase();
            Bucket emailBucket = emailBuckets.computeIfAbsent(normalizedEmail, k -> createBucket(MAX_ATTEMPTS_PER_EMAIL, Duration.ofMinutes(1)));
            if (!emailBucket.tryConsume(1)) {
                log.warn("Login rate limit exceeded for email: {}", email);
                throw new RateLimitExceededException("Terlalu banyak percobaan login gagal untuk akun ini. Silakan tunggu 1 menit sebelum mencoba lagi.");
            }
        }
    }

    public void clearRateLimit(String clientIp, String email) {
        if (clientIp != null) {
            ipBuckets.remove(clientIp);
        }
        if (email != null) {
            emailBuckets.remove(email.trim().toLowerCase());
        }
    }

    public static String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("CF-Connecting-IP"); // Cloudflare Real Client IP
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Forwarded-For");
            if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
                int commaIdx = ip.indexOf(',');
                if (commaIdx > 0) {
                    ip = ip.substring(0, commaIdx).trim();
                }
            }
        }
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}
