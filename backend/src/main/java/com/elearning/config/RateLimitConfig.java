package com.elearning.config;

import com.elearning.security.InMemoryRateLimiter;
import com.elearning.security.RateLimiter;
import com.elearning.security.RedisRateLimiter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Chooses where rate-limit counters live: {@code app.rate-limit.store=memory} (default, one instance)
 * or {@code redis} (shared by all instances).
 */
@Configuration
public class RateLimitConfig {

    @Bean
    @ConditionalOnProperty(name = "app.rate-limit.store", havingValue = "memory", matchIfMissing = true)
    public RateLimiter inMemoryRateLimiter() {
        return new InMemoryRateLimiter();
    }

    @Bean
    @ConditionalOnProperty(name = "app.rate-limit.store", havingValue = "redis")
    public RateLimiter redisRateLimiter(StringRedisTemplate redisTemplate) {
        return new RedisRateLimiter(redisTemplate);
    }
}
