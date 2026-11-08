package com.elearning.security;

import com.elearning.common.response.ApiResponse;
import com.elearning.modules.auth.dto.AuthResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Keeps the refresh token out of JavaScript: it travels only in an httpOnly cookie scoped to the
 * auth endpoints, so an XSS bug cannot read it from localStorage and mint new sessions.
 * The short-lived access token is still returned in the JSON body.
 */
@Component
public class RefreshTokenCookies {

    public static final String COOKIE_NAME = "refresh_token";
    /** Only the auth endpoints (refresh, logout) ever receive the cookie. */
    public static final String COOKIE_PATH = "/api/v1/auth";

    private final boolean secure;
    private final String sameSite;
    private final Duration maxAge;

    public RefreshTokenCookies(
            @Value("${app.security.refresh-cookie.secure:true}") boolean secure,
            @Value("${app.security.refresh-cookie.same-site:Strict}") String sameSite,
            @Value("${app.jwt.refresh-token-expiration-ms:604800000}") long refreshTokenExpirationMs) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.maxAge = Duration.ofMillis(refreshTokenExpirationMs);
    }

    public ResponseCookie issue(String refreshToken) {
        return base(refreshToken).maxAge(maxAge).build();
    }

    public ResponseCookie clear() {
        return base("").maxAge(Duration.ZERO).build();
    }

    /**
     * Builds a 200 response for any endpoint that issues tokens: the refresh token is moved from the
     * JSON body into a Set-Cookie header.
     */
    public ResponseEntity<ApiResponse<AuthResponse>> respond(AuthResponse auth, String message) {
        String refreshToken = auth.getRefreshToken();
        auth.setRefreshToken(null);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (refreshToken != null && !refreshToken.isBlank()) {
            builder.header(HttpHeaders.SET_COOKIE, issue(refreshToken).toString());
        }
        return builder.body(ApiResponse.ok(auth, message));
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(COOKIE_PATH);
    }
}
