package com.elearning.modules.auth.service;

import com.elearning.common.enums.RoleType;
import com.elearning.modules.auth.dto.*;
import com.elearning.modules.user.entity.Role;
import com.elearning.modules.user.entity.Student;
import com.elearning.modules.user.entity.Teacher;
import com.elearning.modules.user.entity.User;
import com.elearning.modules.user.repository.RoleRepository;
import com.elearning.modules.user.repository.StudentRepository;
import com.elearning.modules.user.repository.TeacherRepository;
import com.elearning.modules.user.repository.UserRepository;
import com.elearning.security.JwtProvider;
import com.elearning.security.RefreshTokenStore;
import com.elearning.security.UserPrincipal;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenStore refreshTokenStore;

    @Value("${app.security.demo-mode:false}")
    private boolean demoMode;

    @Value("${app.security.registration-enabled:false}")
    private boolean registrationEnabled;

    /** Passwords that are documented publicly and can never be chosen as a new password. */
    private static final Set<String> FORBIDDEN_PASSWORDS = Set.of("password", "Student@123", "Teacher@123");

    /** Issues an access token plus a refresh token whose jti is registered server-side. */
    private String[] issueTokens(UserPrincipal principal) {
        String accessToken = jwtProvider.generateAccessToken(principal);
        String refreshToken = jwtProvider.generateRefreshToken(principal);
        Claims refreshClaims = jwtProvider.parseRefreshToken(refreshToken);
        refreshTokenStore.store(refreshClaims.getId(), principal.getId(), jwtProvider.getRefreshTokenTtl());
        return new String[]{accessToken, refreshToken};
    }

    private boolean mustChangePassword(UserPrincipal principal) {
        return !demoMode && principal.isMustChangePassword() && principal.getImpersonatorAdminId() == null;
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String[] tokens = issueTokens(principal);
        String accessToken = tokens[0];
        String refreshToken = tokens[1];

        List<String> roles = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(principal.getId())
                .name(principal.getName())
                .email(principal.getEmail())
                .roles(roles)
                .mustChangePassword(mustChangePassword(principal))
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String token = request.getRefreshToken();
        Claims claims = token == null ? null : jwtProvider.parseRefreshToken(token);
        if (claims == null) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }

        Long userId = Long.parseLong(claims.getSubject());
        // Rotation: each refresh token can be used exactly once; revoked/reused tokens are rejected.
        if (!refreshTokenStore.consume(claims.getId(), userId)) {
            throw new BadCredentialsException("Refresh token has been revoked or already used");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadCredentialsException("User associated with refresh token not found"));

        if (!user.isActive()) {
            throw new AccessDeniedException("User account is inactive");
        }

        Long impersonatorAdminId = JwtProvider.getImpersonatorAdminId(claims);
        UserPrincipal principal = UserPrincipal.create(user, impersonatorAdminId);

        String[] tokens = issueTokens(principal);
        String newAccessToken = tokens[0];
        String newRefreshToken = tokens[1];

        List<String> roles = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .roles(roles)
                .impersonatorAdminId(impersonatorAdminId)
                .mustChangePassword(mustChangePassword(principal))
                .build();
    }

    /** Revokes the given refresh token (logout). Invalid tokens are ignored. */
    public void logout(RefreshTokenRequest request) {
        String token = request.getRefreshToken();
        Claims claims = token == null ? null : jwtProvider.parseRefreshToken(token);
        if (claims != null) {
            refreshTokenStore.revoke(claims.getId(), Long.parseLong(claims.getSubject()));
        }
    }

    @Transactional
    public AuthResponse changePassword(UserPrincipal principal, ChangePasswordRequest request) {
        if (demoMode) {
            throw new AccessDeniedException("Ganti password dinonaktifkan pada mode demo");
        }
        if (principal.getImpersonatorAdminId() != null) {
            throw new AccessDeniedException("Tidak dapat mengganti password saat impersonasi");
        }

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new BadCredentialsException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Password saat ini salah");
        }
        if (request.getNewPassword().equals(request.getCurrentPassword())) {
            throw new IllegalArgumentException("Password baru harus berbeda dari password lama");
        }
        if (FORBIDDEN_PASSWORDS.contains(request.getNewPassword())) {
            throw new IllegalArgumentException("Password tersebut terlalu umum, silakan pilih password lain");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        user = userRepository.save(user);

        // Invalidate every existing session (other devices / possibly stolen refresh tokens).
        refreshTokenStore.revokeAll(user.getId());

        UserPrincipal updated = UserPrincipal.create(user);
        String[] tokens = issueTokens(updated);

        return AuthResponse.builder()
                .accessToken(tokens[0])
                .refreshToken(tokens[1])
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .roles(updated.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toList()))
                .mustChangePassword(false)
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (!registrationEnabled) {
            // Accounts are provisioned by admins; open self-registration would let anyone read
            // "all classes" materials and announcements.
            throw new AccessDeniedException("Self-registration is disabled");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered: " + request.getEmail());
        }

        Role studentRole = roleRepository.findByName(RoleType.ROLE_STUDENT)
                .orElseThrow(() -> new IllegalStateException("Default role ROLE_STUDENT not found in database"));

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .active(true)
                .roles(Set.of(studentRole))
                .build();

        user = userRepository.save(user);

        UserPrincipal principal = UserPrincipal.create(user);
        String[] tokens = issueTokens(principal);
        String accessToken = tokens[0];
        String refreshToken = tokens[1];

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .roles(List.of(RoleType.ROLE_STUDENT.name()))
                .build();
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + principal.getId()));

        Optional<Teacher> teacher = teacherRepository.findByUserId(user.getId());
        Optional<Student> student = studentRepository.findByUserId(user.getId());

        List<String> roles = user.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toList());

        Long classroomId = student.map(s -> s.getClassroom() != null ? s.getClassroom().getId() : null).orElse(null);
        String classroomName = student.map(s -> s.getClassroom() != null ? s.getClassroom().getName() : null).orElse(null);

        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .roles(roles)
                .teacherId(teacher.map(Teacher::getId).orElse(null))
                .studentId(student.map(Student::getId).orElse(null))
                .classroomId(classroomId)
                .classroomName(classroomName)
                .impersonated(principal.getImpersonatorAdminId() != null)
                .mustChangePassword(!demoMode && user.isMustChangePassword() && principal.getImpersonatorAdminId() == null)
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse impersonate(Long targetUserId, UserPrincipal adminPrincipal) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Target user not found with id: " + targetUserId));

        // Prevent admin from impersonating another admin or themselves
        boolean isTargetAdmin = targetUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleType.ROLE_ADMIN);

        if (isTargetAdmin || targetUser.getId().equals(adminPrincipal.getId())) {
            throw new AccessDeniedException("Cannot impersonate another admin or yourself");
        }

        UserPrincipal targetPrincipal = UserPrincipal.create(targetUser, adminPrincipal.getId());
        String[] tokens = issueTokens(targetPrincipal);
        String accessToken = tokens[0];
        String refreshToken = tokens[1];

        List<String> roles = targetPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(targetUser.getId())
                .name(targetUser.getName())
                .email(targetUser.getEmail())
                .roles(roles)
                .impersonatorAdminId(adminPrincipal.getId())
                .build();
    }

    @Transactional(readOnly = true)
    public AuthResponse stopImpersonate(UserPrincipal currentPrincipal) {
        Long adminId = currentPrincipal.getImpersonatorAdminId();
        if (adminId == null) {
            throw new IllegalArgumentException("You are not currently in an impersonation session");
        }

        User adminUser = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found with id: " + adminId));

        // The original admin must still be an active administrator to get an admin session back.
        boolean stillAdmin = adminUser.isActive() && adminUser.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleType.ROLE_ADMIN);
        if (!stillAdmin) {
            throw new AccessDeniedException("Original administrator account is no longer active");
        }

        UserPrincipal adminPrincipal = UserPrincipal.create(adminUser, null);
        String[] tokens = issueTokens(adminPrincipal);
        String accessToken = tokens[0];
        String refreshToken = tokens[1];

        List<String> roles = adminPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(adminUser.getId())
                .name(adminUser.getName())
                .email(adminUser.getEmail())
                .roles(roles)
                .impersonatorAdminId(null)
                .mustChangePassword(mustChangePassword(adminPrincipal))
                .build();
    }
}
