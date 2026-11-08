package com.elearning.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RefreshTokenStoreTest {

    private StringRedisTemplate redis;
    private ValueOperations<String, String> values;
    private SetOperations<String, String> sets;
    private RefreshTokenStore store;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        values = mock(ValueOperations.class);
        sets = mock(SetOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(redis.opsForSet()).thenReturn(sets);
        store = new RefreshTokenStore(redis);
    }

    @Test
    void storeRegistersTheTokenAndIndexesItByUser() {
        Duration ttl = Duration.ofDays(7);

        store.store("jti-1", 7L, ttl);

        verify(values).set("auth:refresh:jti-1", "7", ttl);
        verify(sets).add("auth:refresh:user:7", "jti-1");
        verify(redis).expire("auth:refresh:user:7", ttl);
    }

    @Test
    void aRefreshTokenCanBeConsumedExactlyOnce() {
        when(values.getAndDelete("auth:refresh:jti-1")).thenReturn("7").thenReturn(null);

        assertTrue(store.consume("jti-1", 7L));
        assertFalse(store.consume("jti-1", 7L), "a replayed refresh token must be rejected");
    }

    @Test
    void aTokenIssuedToAnotherUserIsRejected() {
        when(values.getAndDelete("auth:refresh:jti-1")).thenReturn("8");

        assertFalse(store.consume("jti-1", 7L));
    }

    @Test
    void revokeAllDeletesEveryTokenOfTheUser() {
        when(sets.members("auth:refresh:user:7")).thenReturn(Set.of("a", "b"));

        store.revokeAll(7L);

        verify(redis).delete("auth:refresh:a");
        verify(redis).delete("auth:refresh:b");
        verify(redis).delete("auth:refresh:user:7");
    }
}
