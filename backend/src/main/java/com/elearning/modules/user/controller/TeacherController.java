package com.elearning.modules.user.controller;

import com.elearning.common.response.ApiResponse;
import com.elearning.modules.user.dto.TeacherDto;
import com.elearning.modules.user.dto.TeacherResponse;
import com.elearning.modules.user.service.TeacherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/teachers")
@RequiredArgsConstructor
@Tag(name = "Teacher Management", description = "Endpoints for managing teachers")
public class TeacherController {

    private final TeacherService teacherService;

    @GetMapping
    @Operation(summary = "Get all teachers")
    public ResponseEntity<ApiResponse<List<TeacherResponse>>> getAllTeachers() {
        return ResponseEntity.ok(ApiResponse.success(teacherService.getAllTeachers(), "Teachers fetched successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get teacher by ID")
    public ResponseEntity<ApiResponse<TeacherResponse>> getTeacherById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(teacherService.getTeacherById(id), "Teacher details"));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create teacher (Admin only)")
    public ResponseEntity<ApiResponse<TeacherResponse>> createTeacher(@Valid @RequestBody TeacherDto dto) {
        TeacherResponse response = teacherService.createTeacher(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Teacher created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update teacher (Admin only)")
    public ResponseEntity<ApiResponse<TeacherResponse>> updateTeacher(@PathVariable Long id, @Valid @RequestBody TeacherDto dto) {
        return ResponseEntity.ok(ApiResponse.success(teacherService.updateTeacher(id, dto), "Teacher updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete teacher (Admin only)")
    public ResponseEntity<ApiResponse<Void>> deleteTeacher(@PathVariable Long id) {
        teacherService.deleteTeacher(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Teacher deleted successfully"));
    }
}
