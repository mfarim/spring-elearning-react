package com.elearning.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class JwtProviderTest {

    private static final String BASE64_SECRET = "dGVzdC1vbmx5LWp3dC1zZWNyZXQta2V5LWZvci11bml0LXRlc3RzLTEyMzQ1Ng==";
    private JwtProvider jwtProvider;

    @BeforeEach
    void setUp() {
        jwtProvider = new JwtProvider(BASE64_SECRET, 900000, 604800000);
    }

    private UserPrincipal admin() {
        return new UserPrincipal(1L, "Admin User", "admin@elearning.com", "password", true,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")), null, false);
    }

    private UserPrincipal impersonatedStudent() {
        return new UserPrincipal(2L, "Student User", "student@elearning.com", "password", true,
                List.of(new SimpleGrantedAuthority("ROLE_STUDENT")), 1L, false);
    }

    @Test
    void testGenerateAndValidateAccessToken() {
        String accessToken = jwtProvider.generateAccessToken(admin());
        assertNotNull(accessToken);
        assertTrue(jwtProvider.validateAccessToken(accessToken));
        assertEquals(1L, jwtProvider.getUserIdFromToken(accessToken));
        assertNull(jwtProvider.getImpersonatorAdminIdFromToken(accessToken));
    }

    @Test
    void testGenerateAndParseRefreshToken() {
        String refreshToken = jwtProvider.generateRefreshToken(impersonatedStudent());
        Claims claims = jwtProvider.parseRefreshToken(refreshToken);
        assertNotNull(claims);
        assertNotNull(claims.getId(), "refresh token must carry a jti for revocation");
        assertEquals("2", claims.getSubject());
        assertEquals(1L, JwtProvider.getImpersonatorAdminId(claims));
    }

    @Test
    void testRefreshTokenIsNotAcceptedAsAccessToken() {
        String refreshToken = jwtProvider.generateRefreshToken(admin());
        assertFalse(jwtProvider.validateAccessToken(refreshToken));
    }

    @Test
    void testAccessTokenIsNotAcceptedAsRefreshToken() {
        String accessToken = jwtProvider.generateAccessToken(admin());
        assertNull(jwtProvider.parseRefreshToken(accessToken));
    }

    @Test
    void testRefreshTokensAreUnique() {
        Claims a = jwtProvider.parseRefreshToken(jwtProvider.generateRefreshToken(admin()));
        Claims b = jwtProvider.parseRefreshToken(jwtProvider.generateRefreshToken(admin()));
        assertNotEquals(a.getId(), b.getId());
    }

    @Test
    void testValidateToken_InvalidSignature_ReturnsFalse() {
        String invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.invalidSignature12345";
        assertFalse(jwtProvider.validateAccessToken(invalidToken));
        assertNull(jwtProvider.parseRefreshToken(invalidToken));
    }

    @Test
    void testPubliclyKnownSecretIsRejected() {
        String leaked = "dGhpcy1pcy1hLXZlcnktc2VjdXJlLTI1Ni1iaXQtbG9uZy1zZWNyZXQta2V5LWZvci1qd3Qtc2lnbmluZw==";
        assertThrows(IllegalStateException.class, () -> new JwtProvider(leaked, 900000, 604800000));
    }
}
