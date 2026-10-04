package com.elearning.modules.assignment.controller;

import com.elearning.common.response.ApiResponse;
import com.elearning.modules.assignment.dto.*;
import com.elearning.modules.assignment.service.AssignmentService;
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

@RestController
@RequestMapping("/api/v1/assignments")
@RequiredArgsConstructor
@Tag(name = "Assignments & Discussions", description = "Endpoints for homework/assignments, submissions, grading, and discussion threads")
public class AssignmentController {

    private final AssignmentService assignmentService;

    @GetMapping
    @Operation(summary = "Get assignments for current user")
    public ResponseEntity<ApiResponse<List<AssignmentResponse>>> getAssignments(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(assignmentService.getAssignmentsForUser(principal), "Assignments fetched successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get assignment details by ID")
    public ResponseEntity<ApiResponse<AssignmentResponse>> getAssignmentById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(assignmentService.getAssignmentById(id, principal), "Assignment details"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Create an assignment")
    public ResponseEntity<ApiResponse<AssignmentResponse>> createAssignment(
            @Valid @RequestBody AssignmentDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        AssignmentResponse response = assignmentService.createAssignment(dto, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Assignment created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Update an assignment")
    public ResponseEntity<ApiResponse<AssignmentResponse>> updateAssignment(
            @PathVariable Long id,
            @Valid @RequestBody AssignmentDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(assignmentService.updateAssignment(id, dto, principal), "Assignment updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Delete an assignment")
    public ResponseEntity<ApiResponse<Void>> deleteAssignment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        assignmentService.deleteAssignment(id, principal);
        return ResponseEntity.ok(ApiResponse.success(null, "Assignment deleted successfully"));
    }

    @PostMapping(value = "/{id}/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Submit assignment with optional file attachment")
    public ResponseEntity<ApiResponse<SubmissionResponse>> submitAssignment(
            @PathVariable Long id,
            @RequestParam(value = "notes", required = false) String notes,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {
        SubmissionResponse response = assignmentService.submitAssignment(id, notes, file, principal);
        return ResponseEntity.ok(ApiResponse.success(response, "Assignment submitted successfully"));
    }

    @GetMapping("/{id}/submissions")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get all student submissions for an assignment")
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getSubmissions(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(assignmentService.getSubmissions(id, principal), "Submissions fetched successfully"));
    }

    @PostMapping("/submissions/{submissionId}/grade")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Grade student assignment submission")
    public ResponseEntity<ApiResponse<SubmissionResponse>> gradeSubmission(
            @PathVariable Long submissionId,
            @Valid @RequestBody GradeSubmissionDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(assignmentService.gradeSubmission(submissionId, dto, principal), "Submission graded successfully"));
    }

    @GetMapping("/{id}/discussions")
    @Operation(summary = "Get discussion board for an assignment")
    public ResponseEntity<ApiResponse<List<DiscussionResponse>>> getDiscussions(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(assignmentService.getDiscussions(id), "Discussions fetched"));
    }

    @PostMapping("/{id}/discussions")
    @Operation(summary = "Post a discussion comment or reply")
    public ResponseEntity<ApiResponse<DiscussionResponse>> postDiscussion(
            @PathVariable Long id,
            @Valid @RequestBody DiscussionDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(assignmentService.postDiscussion(id, dto, principal), "Comment posted"));
    }
}
