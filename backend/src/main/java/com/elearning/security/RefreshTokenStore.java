package com.elearning.security;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Set;

/**
 * Server-side registry of issued refresh tokens (by jti) backed by Redis.
 * A refresh token is only accepted while its jti is present; using it removes the jti (rotation),
 * so a stolen-and-replayed or logged-out refresh token can no longer mint new access tokens.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenStore {

    private static final String TOKEN_KEY = "auth:refresh:";
    private static final String USER_KEY = "auth:refresh:user:";

    private final StringRedisTemplate redis;

    public void store(String jti, Long userId, Duration ttl) {
        redis.opsForValue().set(TOKEN_KEY + jti, userId.toString(), ttl);
        redis.opsForSet().add(USER_KEY + userId, jti);
        redis.expire(USER_KEY + userId, ttl);
    }

    /** Atomically removes the jti. Returns true only if it existed and belonged to the given user. */
    public boolean consume(String jti, Long userId) {
        String owner = redis.opsForValue().getAndDelete(TOKEN_KEY + jti);
        redis.opsForSet().remove(USER_KEY + userId, jti);
        return owner != null && owner.equals(userId.toString());
    }

    public void revoke(String jti, Long userId) {
        redis.delete(TOKEN_KEY + jti);
        redis.opsForSet().remove(USER_KEY + userId, jti);
    }

    /** Revokes every refresh token of a user (password change, account compromise). */
    public void revokeAll(Long userId) {
        Set<String> jtis = redis.opsForSet().members(USER_KEY + userId);
        if (jtis != null) {
            jtis.forEach(jti -> redis.delete(TOKEN_KEY + jti));
        }
        redis.delete(USER_KEY + userId);
    }
}
