package com.elearning.modules.exam.controller;

import com.elearning.common.enums.Status;
import com.elearning.common.response.ApiResponse;
import com.elearning.modules.exam.dto.ExamDto;
import com.elearning.modules.exam.dto.ExamResponse;
import com.elearning.modules.exam.dto.QuestionDto;
import com.elearning.modules.exam.dto.QuestionResponse;
import com.elearning.modules.exam.service.ExamService;
import com.elearning.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/exams")
@RequiredArgsConstructor
@Tag(name = "Examination Management", description = "Endpoints for managing exams and question bank")
public class ExamController {

    private final ExamService examService;

    @GetMapping
    @Operation(summary = "Get exams accessible to current user")
    public ResponseEntity<ApiResponse<List<ExamResponse>>> getExams(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(examService.getExamsForUser(principal), "Exams fetched successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get exam details by ID")
    public ResponseEntity<ApiResponse<ExamResponse>> getExamById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(examService.getExamById(id, principal), "Exam details"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Create an examination")
    public ResponseEntity<ApiResponse<ExamResponse>> createExam(
            @Valid @RequestBody ExamDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        ExamResponse response = examService.createExam(dto, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Exam created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Update an examination")
    public ResponseEntity<ApiResponse<ExamResponse>> updateExam(
            @PathVariable Long id,
            @Valid @RequestBody ExamDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(examService.updateExam(id, dto, principal), "Exam updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Delete an examination")
    public ResponseEntity<ApiResponse<Void>> deleteExam(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        examService.deleteExam(id, principal);
        return ResponseEntity.ok(ApiResponse.success(null, "Exam deleted successfully"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Update exam publish status (draft/published/archived)")
    public ResponseEntity<ApiResponse<ExamResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam Status status,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(examService.updateExamStatus(id, status, principal), "Status updated"));
    }

    // Question Bank Endpoints
    @GetMapping("/{id}/questions")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get all questions for an examination (Teacher/Admin)")
    public ResponseEntity<ApiResponse<List<QuestionResponse>>> getQuestions(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(examService.getQuestions(id, principal), "Questions fetched successfully"));
    }

    @PostMapping("/{id}/questions")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Add a question to an examination")
    public ResponseEntity<ApiResponse<QuestionResponse>> addQuestion(
            @PathVariable Long id,
            @Valid @RequestBody QuestionDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        dto.setExaminationId(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(examService.addQuestion(dto, principal), "Question added"));
    }

    @PutMapping("/{id}/questions/{questionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Update a question")
    public ResponseEntity<ApiResponse<QuestionResponse>> updateQuestion(
            @PathVariable Long id,
            @PathVariable Long questionId,
            @Valid @RequestBody QuestionDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        dto.setExaminationId(id);
        return ResponseEntity.ok(ApiResponse.success(examService.updateQuestion(questionId, dto, principal), "Question updated"));
    }

    @DeleteMapping("/{id}/questions/{questionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Delete a question")
    public ResponseEntity<ApiResponse<Void>> deleteQuestion(
            @PathVariable Long id,
            @PathVariable Long questionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        examService.deleteQuestion(questionId, principal);
        return ResponseEntity.ok(ApiResponse.success(null, "Question deleted"));
    }

    @PostMapping(value = "/{id}/questions/import-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Bulk import questions from Excel file")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importQuestions(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(examService.importQuestionsFromExcel(id, file, principal), "Questions imported successfully"));
    }
}
