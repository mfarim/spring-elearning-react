package com.elearning.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Blocks every API call except the password-change flow while the authenticated user still has a
 * default / admin-assigned password. Disabled when app.security.demo-mode=true.
 * Not a Spring bean on purpose: it is only registered inside the security filter chain.
 */
public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    public static final String ERROR_CODE = "PASSWORD_CHANGE_REQUIRED";

    private static final Set<String> ALLOWED_PATHS = Set.of(
            "/api/v1/auth/me",
            "/api/v1/auth/change-password",
            "/api/v1/auth/logout",
            "/api/v1/auth/refresh",
            "/api/v1/auth/login",
            "/api/v1/admin/stop-impersonate"
    );

    private final boolean demoMode;

    public PasswordChangeRequiredFilter(boolean demoMode) {
        this.demoMode = demoMode;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (!demoMode
                && auth != null
                && auth.getPrincipal() instanceof UserPrincipal principal
                && principal.isMustChangePassword()
                && principal.getImpersonatorAdminId() == null
                && request.getRequestURI().startsWith("/api/")
                && !ALLOWED_PATHS.contains(request.getRequestURI())) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"success\":false,\"code\":\"" + ERROR_CODE
                    + "\",\"message\":\"Anda wajib mengganti password sebelum melanjutkan.\",\"data\":null}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
