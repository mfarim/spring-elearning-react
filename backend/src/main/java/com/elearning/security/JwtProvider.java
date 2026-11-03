package com.elearning.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class JwtProvider {

    public static final String CLAIM_TYPE = "typ";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";
    private static final String CLAIM_IMPERSONATOR = "impersonatorAdminId";

    /** Secrets that were ever published in this repository and must never be used to sign tokens. */
    private static final Set<String> KNOWN_PUBLIC_SECRETS = Set.of(
            "dGhpcy1pcy1hLXZlcnktc2VjdXJlLTI1Ni1iaXQtbG9uZy1zZWNyZXQta2V5LWZvci1qd3Qtc2lnbmluZw=="
    );

    private final SecretKey secretKey;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiration-ms:900000}") long accessTokenExpirationMs,
            @Value("${app.jwt.refresh-token-expiration-ms:604800000}") long refreshTokenExpirationMs
    ) {
        if (secret == null || secret.trim().isEmpty()) {
            throw new IllegalStateException("CRITICAL: app.jwt.secret is not configured! Please provide JWT_SECRET environment variable.");
        }
        if (KNOWN_PUBLIC_SECRETS.contains(secret.trim())) {
            throw new IllegalStateException("CRITICAL: app.jwt.secret uses a publicly known example value. Generate a new one with: openssl rand -base64 32");
        }
        byte[] keyBytes = Decoders.BASE64.decode(secret.trim());
        if (keyBytes.length < 32) {
            throw new IllegalArgumentException("CRITICAL: JWT secret key must be at least 256 bits (32 bytes) long for HMAC-SHA256!");
        }
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    public String generateAccessToken(UserPrincipal userPrincipal) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpirationMs);

        List<String> roles = userPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        var builder = Jwts.builder()
                .subject(userPrincipal.getId().toString())
                .claim(CLAIM_TYPE, TYPE_ACCESS)
                .claim("email", userPrincipal.getEmail())
                .claim("name", userPrincipal.getName())
                .claim("roles", roles)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey);

        if (userPrincipal.getImpersonatorAdminId() != null) {
            builder.claim(CLAIM_IMPERSONATOR, userPrincipal.getImpersonatorAdminId());
        }

        return builder.compact();
    }

    /**
     * Generates a refresh token with a unique id (jti). The caller is responsible for
     * registering the jti in {@link RefreshTokenStore} so it can be rotated and revoked.
     */
    public String generateRefreshToken(UserPrincipal userPrincipal) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpirationMs);

        var builder = Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(userPrincipal.getId().toString())
                .claim(CLAIM_TYPE, TYPE_REFRESH)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey);

        if (userPrincipal.getImpersonatorAdminId() != null) {
            builder.claim(CLAIM_IMPERSONATOR, userPrincipal.getImpersonatorAdminId());
        }

        return builder.compact();
    }

    public Duration getRefreshTokenTtl() {
        return Duration.ofMillis(refreshTokenExpirationMs);
    }

    /** Valid signature, not expired, and typ=access. Refresh tokens are rejected. */
    public boolean validateAccessToken(String token) {
        Claims claims = parseClaims(token);
        return claims != null && TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class));
    }

    /** Returns the claims of a valid refresh token (typ=refresh with a jti), or null otherwise. */
    public Claims parseRefreshToken(String token) {
        Claims claims = parseClaims(token);
        if (claims == null || !TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class)) || claims.getId() == null) {
            return null;
        }
        return claims;
    }

    public Long getUserIdFromToken(String token) {
        return Long.parseLong(getClaims(token).getSubject());
    }

    public Long getImpersonatorAdminIdFromToken(String token) {
        return getImpersonatorAdminId(getClaims(token));
    }

    public static Long getImpersonatorAdminId(Claims claims) {
        Object impId = claims.get(CLAIM_IMPERSONATOR);
        if (impId instanceof Number number) {
            return number.longValue();
        }
        return null;
    }

    private Claims parseClaims(String token) {
        try {
            return getClaims(token);
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
