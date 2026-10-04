package com.elearning.modules.academic.controller;

import com.elearning.common.response.ApiResponse;
import com.elearning.modules.academic.dto.ClassroomDto;
import com.elearning.modules.academic.dto.ClassroomResponse;
import com.elearning.modules.academic.service.ClassroomService;
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
@RequestMapping("/api/v1/classrooms")
@RequiredArgsConstructor
@Tag(name = "Classroom Management", description = "Endpoints for academic classrooms")
public class ClassroomController {

    private final ClassroomService classroomService;

    @GetMapping
    @Operation(summary = "Get all classrooms")
    public ResponseEntity<ApiResponse<List<ClassroomResponse>>> getAllClassrooms() {
        return ResponseEntity.ok(ApiResponse.success(classroomService.getAllClassrooms(), "Classrooms fetched successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get classroom by ID")
    public ResponseEntity<ApiResponse<ClassroomResponse>> getClassroomById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(classroomService.getClassroomById(id), "Classroom details"));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new classroom (Admin only)")
    public ResponseEntity<ApiResponse<ClassroomResponse>> createClassroom(@Valid @RequestBody ClassroomDto dto) {
        ClassroomResponse response = classroomService.createClassroom(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Classroom created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update classroom (Admin only)")
    public ResponseEntity<ApiResponse<ClassroomResponse>> updateClassroom(@PathVariable Long id, @Valid @RequestBody ClassroomDto dto) {
        return ResponseEntity.ok(ApiResponse.success(classroomService.updateClassroom(id, dto), "Classroom updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete classroom (Admin only)")
    public ResponseEntity<ApiResponse<Void>> deleteClassroom(@PathVariable Long id) {
        classroomService.deleteClassroom(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Classroom deleted successfully"));
    }
}
