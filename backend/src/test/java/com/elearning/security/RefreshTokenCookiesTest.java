package com.elearning.security;

import com.elearning.common.response.ApiResponse;
import com.elearning.modules.auth.dto.AuthResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RefreshTokenCookiesTest {

    private final RefreshTokenCookies cookies = new RefreshTokenCookies(true, "Strict", Duration.ofDays(7).toMillis());

    @Test
    void issuedCookieIsHttpOnlySecureAndScopedToAuthEndpoints() {
        ResponseCookie cookie = cookies.issue("token-value");

        assertEquals(RefreshTokenCookies.COOKIE_NAME, cookie.getName());
        assertEquals("token-value", cookie.getValue());
        assertTrue(cookie.isHttpOnly());
        assertTrue(cookie.isSecure());
        assertEquals("Strict", cookie.getSameSite());
        assertEquals("/api/v1/auth", cookie.getPath());
        assertEquals(Duration.ofDays(7), cookie.getMaxAge());
    }

    @Test
    void clearedCookieExpiresImmediately() {
        ResponseCookie cookie = cookies.clear();

        assertEquals(Duration.ZERO, cookie.getMaxAge());
        assertEquals("/api/v1/auth", cookie.getPath());
    }

    @Test
    void respondMovesTheRefreshTokenFromTheBodyIntoACookie() {
        AuthResponse auth = AuthResponse.builder().accessToken("access").refreshToken("refresh").userId(1L).build();

        ResponseEntity<ApiResponse<AuthResponse>> response = cookies.respond(auth, "ok");

        String setCookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertNotNull(setCookie);
        assertTrue(setCookie.startsWith("refresh_token=refresh"));
        assertTrue(setCookie.contains("HttpOnly"));
        assertNotNull(response.getBody());
        assertNull(response.getBody().getData().getRefreshToken(), "refresh token must not be readable by JavaScript");
        assertEquals("access", response.getBody().getData().getAccessToken());
    }

    @Test
    void respondWithoutRefreshTokenSetsNoCookie() {
        AuthResponse auth = AuthResponse.builder().accessToken("access").build();

        ResponseEntity<ApiResponse<AuthResponse>> response = cookies.respond(auth, "ok");

        assertFalse(response.getHeaders().containsKey(HttpHeaders.SET_COOKIE));
    }
}
