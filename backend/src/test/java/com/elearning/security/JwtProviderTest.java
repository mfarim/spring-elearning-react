package com.elearning.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class JwtProviderTest {

    private static final String BASE64_SECRET = "dGhpcy1pcy1hLXZlcnktc2VjdXJlLTI1Ni1iaXQtbG9uZy1zZWNyZXQta2V5LWZvci1qd3Qtc2lnbmluZw==";
    private JwtProvider jwtProvider;

    @BeforeEach
    void setUp() {
        jwtProvider = new JwtProvider(BASE64_SECRET, 900000, 604800000);
    }

    @Test
    void testGenerateAndValidateAccessToken() {
        UserPrincipal principal = new UserPrincipal(
                1L,
                "Admin User",
                "admin@elearning.com",
                "password",
                true,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")),
                null
        );

        String accessToken = jwtProvider.generateAccessToken(principal);
        assertNotNull(accessToken);
        assertTrue(jwtProvider.validateToken(accessToken));
        assertEquals(1L, jwtProvider.getUserIdFromToken(accessToken));
        assertNull(jwtProvider.getImpersonatorAdminIdFromToken(accessToken));
    }

    @Test
    void testGenerateAndValidateRefreshToken() {
        UserPrincipal principal = new UserPrincipal(
                2L,
                "Student User",
                "student@elearning.com",
                "password",
                true,
                List.of(new SimpleGrantedAuthority("ROLE_STUDENT")),
                1L // impersonated by admin 1
        );

        String refreshToken = jwtProvider.generateRefreshToken(principal);
        assertNotNull(refreshToken);
        assertTrue(jwtProvider.validateToken(refreshToken));
        assertEquals(2L, jwtProvider.getUserIdFromToken(refreshToken));
    }

    @Test
    void testValidateToken_InvalidSignature_ReturnsFalse() {
        String invalidToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.invalidSignature12345";
        assertFalse(jwtProvider.validateToken(invalidToken));
    }
}
