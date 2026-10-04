package com.elearning.modules.exam.controller;

import com.elearning.common.response.ApiResponse;
import com.elearning.modules.exam.dto.*;
import com.elearning.modules.exam.entity.ExamAttempt;
import com.elearning.modules.exam.service.ExamRunnerService;
import com.elearning.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/exams")
@RequiredArgsConstructor
@Tag(name = "CBT Exam Runner & Live Monitor", description = "Endpoints for students taking exams, autosaving, anti-cheat detection, and live monitoring")
public class ExamRunnerController {

    private final ExamRunnerService examRunnerService;

    @PostMapping("/{id}/start")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Start or resume examination session for student")
    public ResponseEntity<ApiResponse<ExamStartResponse>> startExam(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        ExamStartResponse response = examRunnerService.startOrResumeAttempt(id, principal);
        return ResponseEntity.ok(ApiResponse.success(response, "Exam session started"));
    }

    @PostMapping("/attempts/{attemptId}/answer")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Autosave student's answer for a question")
    public ResponseEntity<ApiResponse<Void>> saveAnswer(
            @PathVariable Long attemptId,
            @Valid @RequestBody SubmitAnswerRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        examRunnerService.saveAnswer(attemptId, req, principal);
        return ResponseEntity.ok(ApiResponse.success(null, "Answer saved"));
    }

    @PostMapping("/attempts/{attemptId}/violation")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Report anti-cheat violation (tab-switch, fullscreen exit)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reportViolation(
            @PathVariable Long attemptId,
            @Valid @RequestBody ViolationReportRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        int violations = examRunnerService.reportViolation(attemptId, req, principal);
        return ResponseEntity.ok(ApiResponse.success(Map.of("violations", violations), "Violation recorded"));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Finalize and submit examination attempt")
    public ResponseEntity<ApiResponse<Map<String, Object>>> submitAttempt(
            @PathVariable Long attemptId,
            @AuthenticationPrincipal UserPrincipal principal) {
        ExamAttempt attempt = examRunnerService.submitAttempt(attemptId, principal);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "attemptId", attempt.getId(),
                "status", attempt.getStatus(),
                "score", attempt.getScore() != null ? attempt.getScore() : 0,
                "passed", attempt.getPassed() != null ? attempt.getPassed() : false
        ), "Exam submitted successfully"));
    }

    @PostMapping("/attempts/{attemptId}/answers/{answerId}/grade-essay")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Grade an essay answer manually")
    public ResponseEntity<ApiResponse<Void>> gradeEssay(
            @PathVariable Long attemptId,
            @PathVariable Long answerId,
            @Valid @RequestBody EssayGradingDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        examRunnerService.gradeEssay(attemptId, answerId, dto, principal);
        return ResponseEntity.ok(ApiResponse.success(null, "Essay answer graded successfully"));
    }

    @GetMapping("/{id}/monitor")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get live examination monitoring room data")
    public ResponseEntity<ApiResponse<List<ExamMonitorResponse>>> getExamMonitor(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        List<ExamMonitorResponse> monitorData = examRunnerService.getExamMonitor(id, principal);
        return ResponseEntity.ok(ApiResponse.success(monitorData, "Exam monitor data fetched"));
    }
}
