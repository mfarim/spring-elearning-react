package com.elearning.modules.academic.controller;

import com.elearning.common.response.ApiResponse;
import com.elearning.modules.academic.dto.SubjectDto;
import com.elearning.modules.academic.dto.SubjectResponse;
import com.elearning.modules.academic.service.SubjectService;
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
@RequestMapping("/api/v1/subjects")
@RequiredArgsConstructor
@Tag(name = "Subject Management", description = "Endpoints for academic subjects")
public class SubjectController {

    private final SubjectService subjectService;

    @GetMapping
    @Operation(summary = "Get all subjects")
    public ResponseEntity<ApiResponse<List<SubjectResponse>>> getAllSubjects() {
        return ResponseEntity.ok(ApiResponse.success(subjectService.getAllSubjects(), "Subjects fetched successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get subject by ID")
    public ResponseEntity<ApiResponse<SubjectResponse>> getSubjectById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(subjectService.getSubjectById(id), "Subject details"));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create subject (Admin only)")
    public ResponseEntity<ApiResponse<SubjectResponse>> createSubject(@Valid @RequestBody SubjectDto dto) {
        SubjectResponse response = subjectService.createSubject(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Subject created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update subject (Admin only)")
    public ResponseEntity<ApiResponse<SubjectResponse>> updateSubject(@PathVariable Long id, @Valid @RequestBody SubjectDto dto) {
        return ResponseEntity.ok(ApiResponse.success(subjectService.updateSubject(id, dto), "Subject updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete subject (Admin only)")
    public ResponseEntity<ApiResponse<Void>> deleteSubject(@PathVariable Long id) {
        subjectService.deleteSubject(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Subject deleted successfully"));
    }
}
