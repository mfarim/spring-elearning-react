package com.elearning.modules.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {
    private String accessToken;
    /** Set by the service, then moved into an httpOnly cookie by the controller; never sent in the body. */
    private String refreshToken;
    private Long userId;
    private String name;
    private String email;
    private List<String> roles;
    private Long impersonatorAdminId;
    private boolean mustChangePassword;
}
