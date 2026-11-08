package com.elearning.security;

import java.time.Duration;

/**
 * Counts requests per key (e.g. {@code "login:ip:203.0.113.7"}) and decides whether one more is allowed.
 * Implementations: {@link InMemoryRateLimiter} for a single instance, {@link RedisRateLimiter} when several
 * backend instances must share the same limits.
 */
public interface RateLimiter {

    /** Records one request for {@code key}; returns false when more than {@code capacity} happened within {@code window}. */
    boolean tryAcquire(String key, int capacity, Duration window);

    /** Forgets the history of {@code key} (e.g. after a successful login). */
    void reset(String key);
}
