package com.elearning.modules.announcement.controller;

import com.elearning.common.response.ApiResponse;
import com.elearning.modules.announcement.dto.AnnouncementDto;
import com.elearning.modules.announcement.dto.AnnouncementResponse;
import com.elearning.modules.announcement.service.AnnouncementService;
import com.elearning.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/announcements")
@RequiredArgsConstructor
@Tag(name = "Announcements", description = "Endpoints for school-wide noticeboard and announcements")
public class AnnouncementController {

    private final AnnouncementService announcementService;

    @GetMapping
    @Operation(summary = "Get announcements accessible to current user")
    public ResponseEntity<ApiResponse<List<AnnouncementResponse>>> getAnnouncements(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(announcementService.getAnnouncementsForUser(principal), "Announcements fetched"));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create an announcement (Admin only)")
    public ResponseEntity<ApiResponse<AnnouncementResponse>> createAnnouncement(@Valid @RequestBody AnnouncementDto dto) {
        AnnouncementResponse response = announcementService.createAnnouncement(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Announcement created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update an announcement (Admin only)")
    public ResponseEntity<ApiResponse<AnnouncementResponse>> updateAnnouncement(
            @PathVariable Long id,
            @Valid @RequestBody AnnouncementDto dto) {
        return ResponseEntity.ok(ApiResponse.success(announcementService.updateAnnouncement(id, dto), "Announcement updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete an announcement (Admin only)")
    public ResponseEntity<ApiResponse<Void>> deleteAnnouncement(@PathVariable Long id) {
        announcementService.deleteAnnouncement(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Announcement deleted"));
    }
}
