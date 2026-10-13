package com.elearning.common.controller;

import com.elearning.common.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Tag(name = "File Management", description = "Endpoints for downloading and accessing uploaded files")
public class FileController {

    private final FileStorageService fileStorageService;

    private static final java.util.Set<String> SAFE_INLINE_MIME_TYPES = java.util.Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif",
            "application/pdf",
            "audio/mpeg", "audio/wav", "audio/ogg",
            "video/mp4", "video/webm"
    );

    @GetMapping("/**")
    @Operation(summary = "Download / View File")
    public ResponseEntity<Resource> downloadFile(HttpServletRequest request) {
        String path = request.getRequestURI();
        String filePath = path.replaceFirst("^/api/v1/files/", "");

        String lowerPath = filePath.toLowerCase();
        if (lowerPath.endsWith(".html") || lowerPath.endsWith(".htm") || lowerPath.endsWith(".svg") || lowerPath.endsWith(".jsp")) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }

        Resource resource = fileStorageService.loadFileAsResource(filePath);

        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
        } catch (IOException ignored) {}

        if (contentType == null || contentType.contains("html") || contentType.contains("svg") || contentType.contains("javascript")) {
            contentType = "application/octet-stream";
        }

        String disposition = SAFE_INLINE_MIME_TYPES.contains(contentType) ? "inline" : "attachment";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + resource.getFilename() + "\"")
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }
}
