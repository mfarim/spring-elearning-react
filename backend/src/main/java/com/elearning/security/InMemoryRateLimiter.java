package com.elearning.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;

import java.time.Duration;

/**
 * Token-bucket limiter kept in this JVM (Bucket4j). Bounded and expiring, so floods of distinct
 * IPs or emails cannot exhaust the heap. Limits are per instance: use {@link RedisRateLimiter}
 * when running more than one backend.
 */
public class InMemoryRateLimiter implements RateLimiter {

    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .maximumSize(200_000)
            .expireAfterAccess(Duration.ofMinutes(10))
            .build();

    @Override
    public boolean tryAcquire(String key, int capacity, Duration window) {
        Bucket bucket = buckets.get(key, k -> Bucket.builder()
                .addLimit(Bandwidth.classic(capacity, Refill.greedy(capacity, window)))
                .build());
        return bucket.tryConsume(1);
    }

    @Override
    public void reset(String key) {
        buckets.invalidate(key);
    }
}
