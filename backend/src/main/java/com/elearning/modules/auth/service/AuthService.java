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
import com.elearning.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
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

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String accessToken = jwtProvider.generateAccessToken(principal);
        String refreshToken = jwtProvider.generateRefreshToken(principal);

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
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
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
        String accessToken = jwtProvider.generateAccessToken(principal);
        String refreshToken = jwtProvider.generateRefreshToken(principal);

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
        String accessToken = jwtProvider.generateAccessToken(targetPrincipal);
        String refreshToken = jwtProvider.generateRefreshToken(targetPrincipal);

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

        UserPrincipal adminPrincipal = UserPrincipal.create(adminUser, null);
        String accessToken = jwtProvider.generateAccessToken(adminPrincipal);
        String refreshToken = jwtProvider.generateRefreshToken(adminPrincipal);

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
                .build();
    }
}
