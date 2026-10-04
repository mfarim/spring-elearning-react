package com.elearning.modules.auth.controller;

import com.elearning.common.response.ApiResponse;
import com.elearning.modules.auth.dto.*;
import com.elearning.modules.auth.service.AuthService;
import com.elearning.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Authentication & User Management", description = "Endpoints for user login, registration, profile, and impersonation")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/auth/login")
    @Operation(summary = "User Login", description = "Authenticate with email and password to receive JWT tokens")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Login successful"));
    }

    @PostMapping("/auth/register")
    @Operation(summary = "Student Registration", description = "Register a new student account")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Registration successful"));
    }

    @GetMapping("/auth/me")
    @Operation(summary = "Get Current Profile", description = "Get authenticated user profile details")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(@AuthenticationPrincipal UserPrincipal principal) {
        UserProfileResponse profile = authService.getProfile(principal);
        return ResponseEntity.ok(ApiResponse.ok(profile));
    }

    @PostMapping("/admin/impersonate/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Start Impersonation", description = "Admin can impersonate a teacher or student user")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<ApiResponse<AuthResponse>> impersonate(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserPrincipal adminPrincipal
    ) {
        AuthResponse response = authService.impersonate(userId, adminPrincipal);
        return ResponseEntity.ok(ApiResponse.ok(response, "Impersonation started successfully"));
    }

    @PostMapping("/admin/stop-impersonate")
    @Operation(summary = "Stop Impersonation", description = "Revert impersonated session back to administrator")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<ApiResponse<AuthResponse>> stopImpersonate(@AuthenticationPrincipal UserPrincipal currentPrincipal) {
        AuthResponse response = authService.stopImpersonate(currentPrincipal);
        return ResponseEntity.ok(ApiResponse.ok(response, "Returned to admin session"));
    }
}
