package com.elearning.modules.user.controller;

import com.elearning.common.response.ApiResponse;
import com.elearning.modules.user.dto.StudentDto;
import com.elearning.modules.user.dto.StudentExamCardResponse;
import com.elearning.modules.user.dto.StudentResponse;
import com.elearning.modules.user.service.StudentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/students")
@RequiredArgsConstructor
@Tag(name = "Student Management", description = "Endpoints for managing students, bulk Excel import, and exam cards")
public class StudentController {

    private final StudentService studentService;

    @GetMapping
    @Operation(summary = "Get all students with optional classroom filter")
    public ResponseEntity<ApiResponse<List<StudentResponse>>> getStudents(
            @RequestParam(required = false) Long classroomId) {
        return ResponseEntity.ok(ApiResponse.success(studentService.getStudents(classroomId), "Students fetched successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get student by ID")
    public ResponseEntity<ApiResponse<StudentResponse>> getStudentById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(studentService.getStudentById(id), "Student details"));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create student (Admin only)")
    public ResponseEntity<ApiResponse<StudentResponse>> createStudent(@Valid @RequestBody StudentDto dto) {
        StudentResponse response = studentService.createStudent(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Student created successfully"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update student (Admin only)")
    public ResponseEntity<ApiResponse<StudentResponse>> updateStudent(@PathVariable Long id, @Valid @RequestBody StudentDto dto) {
        return ResponseEntity.ok(ApiResponse.success(studentService.updateStudent(id, dto), "Student updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete student (Admin only)")
    public ResponseEntity<ApiResponse<Void>> deleteStudent(@PathVariable Long id) {
        studentService.deleteStudent(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Student deleted successfully"));
    }

    @PostMapping(value = "/import-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Import students from Excel template")
    public ResponseEntity<ApiResponse<Map<String, Object>>> importStudents(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "classroomId", required = false) Long classroomId) {
        Map<String, Object> result = studentService.importStudentsFromExcel(file, classroomId);
        return ResponseEntity.ok(ApiResponse.success(result, "Excel import completed"));
    }

    @GetMapping("/exam-cards")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get exam card print data for students")
    public ResponseEntity<ApiResponse<List<StudentExamCardResponse>>> getExamCards(
            @RequestParam(required = false) Long classroomId) {
        return ResponseEntity.ok(ApiResponse.success(studentService.getExamCards(classroomId), "Exam cards fetched successfully"));
    }
}
