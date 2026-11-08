package com.elearning.security;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InMemoryRateLimiterTest {

    private final InMemoryRateLimiter limiter = new InMemoryRateLimiter();
    private final Duration minute = Duration.ofMinutes(1);

    @Test
    void allowsUpToCapacityThenRejects() {
        assertTrue(limiter.tryAcquire("login:ip:1", 2, minute));
        assertTrue(limiter.tryAcquire("login:ip:1", 2, minute));
        assertFalse(limiter.tryAcquire("login:ip:1", 2, minute));
    }

    @Test
    void keysAreCountedSeparately() {
        assertTrue(limiter.tryAcquire("login:ip:1", 1, minute));
        assertTrue(limiter.tryAcquire("login:ip:2", 1, minute));
        assertFalse(limiter.tryAcquire("login:ip:1", 1, minute));
    }

    @Test
    void resetForgetsPreviousRequests() {
        assertTrue(limiter.tryAcquire("login:email:a@b.c", 1, minute));
        assertFalse(limiter.tryAcquire("login:email:a@b.c", 1, minute));

        limiter.reset("login:email:a@b.c");

        assertTrue(limiter.tryAcquire("login:email:a@b.c", 1, minute));
    }
}
