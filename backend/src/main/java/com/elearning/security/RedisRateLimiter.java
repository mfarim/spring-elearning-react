package com.elearning.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;

import java.time.Duration;
import java.util.List;

/**
 * Fixed-window limiter shared by every backend instance through Redis. The counter is incremented and,
 * on the first hit of a window, given its expiry in one Lua script, so a crash between the two steps
 * cannot leave a key that never expires.
 *
 * If Redis is unreachable the request is allowed (fail open): availability of the exam platform is
 * preferred over strict limiting, and the outage is logged.
 */
@Slf4j
public class RedisRateLimiter implements RateLimiter {

    static final String KEY_PREFIX = "rate:";

    static final DefaultRedisScript<Long> INCREMENT_SCRIPT = new DefaultRedisScript<>(
            "local current = redis.call('INCR', KEYS[1]) "
                    + "if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end "
                    + "return current",
            Long.class);

    private final StringRedisTemplate redis;

    public RedisRateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public boolean tryAcquire(String key, int capacity, Duration window) {
        try {
            Long count = redis.execute(INCREMENT_SCRIPT, List.of(KEY_PREFIX + key), String.valueOf(window.toMillis()));
            return count == null || count <= capacity;
        } catch (RuntimeException e) {
            log.warn("Rate-limit store unavailable, allowing request for {}: {}", key, e.getMessage());
            return true;
        }
    }

    @Override
    public void reset(String key) {
        try {
            redis.delete(KEY_PREFIX + key);
        } catch (RuntimeException e) {
            log.warn("Could not reset rate limit for {}: {}", key, e.getMessage());
        }
    }
}
