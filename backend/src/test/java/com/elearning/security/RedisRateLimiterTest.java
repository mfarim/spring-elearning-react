package com.elearning.security;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RedisRateLimiterTest {

    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final RedisRateLimiter limiter = new RedisRateLimiter(redis);
    private final Duration minute = Duration.ofMinutes(1);

    private void counterReturns(Long value) {
        when(redis.execute(eq(RedisRateLimiter.INCREMENT_SCRIPT), eq(List.of("rate:login:ip:1")), eq("60000")))
                .thenReturn(value);
    }

    @Test
    void allowsWhileTheSharedCounterIsWithinCapacity() {
        counterReturns(5L);
        assertTrue(limiter.tryAcquire("login:ip:1", 5, minute));
    }

    @Test
    void rejectsOnceTheSharedCounterExceedsCapacity() {
        counterReturns(6L);
        assertFalse(limiter.tryAcquire("login:ip:1", 5, minute));
    }

    @Test
    void failsOpenWhenRedisIsUnavailable() {
        when(redis.execute(eq(RedisRateLimiter.INCREMENT_SCRIPT), eq(List.of("rate:login:ip:1")), eq("60000")))
                .thenThrow(new RedisConnectionFailureException("connection refused"));

        assertTrue(limiter.tryAcquire("login:ip:1", 5, minute));
    }

    @Test
    void resetDeletesTheCounter() {
        limiter.reset("login:email:a@b.c");

        verify(redis).delete("rate:login:email:a@b.c");
    }
}
