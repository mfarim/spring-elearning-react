package com.elearning.modules.grade.controller;

import com.elearning.common.response.ApiResponse;
import com.elearning.modules.grade.dto.GradeReportResponse;
import com.elearning.modules.grade.service.GradeService;
import com.elearning.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/student/grades")
@RequiredArgsConstructor
@Tag(name = "Student Grades & Report", description = "Endpoints for student gradebook, subject breakdown, and progress tracking")
public class GradeController {

    private final GradeService gradeService;

    @GetMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    @Operation(summary = "Get academic report and subject grades breakdown for current student")
    public ResponseEntity<ApiResponse<GradeReportResponse>> getGradeReport(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(gradeService.getStudentGradeReport(principal), "Grade report fetched"));
    }
}
