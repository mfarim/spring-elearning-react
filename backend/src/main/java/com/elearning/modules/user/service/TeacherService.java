package com.elearning.modules.user.service;

import com.elearning.common.enums.RoleType;
import com.elearning.modules.user.dto.TeacherDto;
import com.elearning.modules.user.dto.TeacherResponse;
import com.elearning.modules.user.entity.Role;
import com.elearning.modules.user.entity.Teacher;
import com.elearning.modules.user.entity.User;
import com.elearning.modules.user.repository.RoleRepository;
import com.elearning.modules.user.repository.TeacherRepository;
import com.elearning.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<TeacherResponse> getAllTeachers() {
        return teacherRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TeacherResponse getTeacherById(Long id) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Teacher not found with id: " + id));
        return mapToResponse(teacher);
    }

    @Transactional
    public TeacherResponse createTeacher(TeacherDto dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("Email is already registered: " + dto.getEmail());
        }
        if (teacherRepository.existsByNip(dto.getNip())) {
            throw new IllegalArgumentException("NIP is already registered: " + dto.getNip());
        }

        Role teacherRole = roleRepository.findByName(RoleType.ROLE_TEACHER)
                .orElseThrow(() -> new IllegalStateException("ROLE_TEACHER not found"));

        String rawPassword = (dto.getPassword() != null && !dto.getPassword().isBlank()) ? dto.getPassword() : "Teacher@123";

        User user = User.builder()
                .name(dto.getName())
                .email(dto.getEmail())
                .password(passwordEncoder.encode(rawPassword))
                .phone(dto.getPhone())
                .active(true)
                .roles(new HashSet<>(Collections.singletonList(teacherRole)))
                .build();

        user = userRepository.save(user);

        Teacher teacher = Teacher.builder()
                .user(user)
                .nip(dto.getNip())
                .address(dto.getAddress())
                .photo(dto.getPhoto())
                .build();

        return mapToResponse(teacherRepository.save(teacher));
    }

    @Transactional
    public TeacherResponse updateTeacher(Long id, TeacherDto dto) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Teacher not found with id: " + id));

        User user = teacher.getUser();
        if (!user.getEmail().equals(dto.getEmail()) && userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("Email is already registered: " + dto.getEmail());
        }
        if (!teacher.getNip().equals(dto.getNip()) && teacherRepository.existsByNip(dto.getNip())) {
            throw new IllegalArgumentException("NIP is already registered: " + dto.getNip());
        }

        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(dto.getPassword()));
        }
        userRepository.save(user);

        teacher.setNip(dto.getNip());
        teacher.setAddress(dto.getAddress());
        if (dto.getPhoto() != null) {
            teacher.setPhoto(dto.getPhoto());
        }

        return mapToResponse(teacherRepository.save(teacher));
    }

    @Transactional
    public void deleteTeacher(Long id) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Teacher not found with id: " + id));
        teacherRepository.delete(teacher);
        userRepository.delete(teacher.getUser());
    }

    private TeacherResponse mapToResponse(Teacher t) {
        return TeacherResponse.builder()
                .id(t.getId())
                .userId(t.getUser().getId())
                .name(t.getUser().getName())
                .email(t.getUser().getEmail())
                .phone(t.getUser().getPhone())
                .nip(t.getNip())
                .address(t.getAddress())
                .photo(t.getPhoto())
                .active(t.getUser().isActive())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
