package com.elearning.modules.material.controller;

import com.elearning.common.response.ApiResponse;
import com.elearning.modules.material.dto.LearningMaterialDto;
import com.elearning.modules.material.dto.LearningMaterialResponse;
import com.elearning.modules.material.dto.MaterialViewerResponse;
import com.elearning.modules.material.service.LearningMaterialService;
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
@RequestMapping("/api/v1/materials")
@RequiredArgsConstructor
@Tag(name = "Learning Materials", description = "Endpoints for learning materials, file uploads, and view tracking")
public class LearningMaterialController {

    private final LearningMaterialService materialService;

    @GetMapping
    @Operation(summary = "Get learning materials accessible to current user")
    public ResponseEntity<ApiResponse<List<LearningMaterialResponse>>> getMaterials(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(materialService.getMaterialsForUser(principal), "Materials fetched successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get learning material by ID")
    public ResponseEntity<ApiResponse<LearningMaterialResponse>> getMaterialById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(materialService.getMaterialById(id, principal), "Material details"));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Create learning material with optional attachment")
    public ResponseEntity<ApiResponse<LearningMaterialResponse>> createMaterial(
            @RequestPart("data") @Valid LearningMaterialDto dto,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {
        LearningMaterialResponse response = materialService.createMaterial(dto, file, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Material created successfully"));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Update learning material with optional attachment")
    public ResponseEntity<ApiResponse<LearningMaterialResponse>> updateMaterial(
            @PathVariable Long id,
            @RequestPart("data") @Valid LearningMaterialDto dto,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(materialService.updateMaterial(id, dto, file, principal), "Material updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Delete learning material")
    public ResponseEntity<ApiResponse<Void>> deleteMaterial(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        materialService.deleteMaterial(id, principal);
        return ResponseEntity.ok(ApiResponse.success(null, "Material deleted successfully"));
    }

    @PostMapping("/{id}/views")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Record material view for current student")
    public ResponseEntity<ApiResponse<Void>> recordView(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        materialService.recordView(id, principal);
        return ResponseEntity.ok(ApiResponse.success(null, "View recorded"));
    }

    @GetMapping("/{id}/viewers")
    @PreAuthorize("hasAnyRole('ADMIN', 'TEACHER')")
    @Operation(summary = "Get list of students who viewed this material")
    public ResponseEntity<ApiResponse<List<MaterialViewerResponse>>> getMaterialViewers(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(materialService.getMaterialViewers(id, principal), "Viewers fetched successfully"));
    }
}
