package com.elearning.common.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.Objects;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path fileStorageLocation;

    public FileStorageService(@Value("${app.storage.upload-dir:./storage/uploads}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    private static final java.util.Set<String> ALLOWED_EXTENSIONS = java.util.Set.of(
            ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt", ".txt", ".csv",
            ".jpg", ".jpeg", ".png", ".webp", ".gif",
            ".zip", ".rar", ".7z",
            ".mp3", ".wav", ".ogg",
            ".mp4", ".webm"
    );

    private static final java.util.Set<String> BLOCKED_EXTENSIONS = java.util.Set.of(
            ".html", ".htm", ".xhtml", ".svg", ".xml",
            ".jsp", ".jspx", ".php", ".phtml",
            ".exe", ".bat", ".cmd", ".sh", ".bash", ".ps1", ".vbs",
            ".js", ".mjs", ".jar", ".war", ".py", ".cgi", ".dll", ".so"
    );

    public String storeFile(MultipartFile file, String subDirectory) {
        String originalFileName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (originalFileName.contains("..")) {
            throw new IllegalArgumentException("Filename contains invalid path sequence " + originalFileName);
        }

        String extension = "";
        int i = originalFileName.lastIndexOf('.');
        if (i >= 0) {
            extension = originalFileName.substring(i).toLowerCase();
        }

        if (extension.isEmpty() || !ALLOWED_EXTENSIONS.contains(extension) || BLOCKED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("File type not allowed (" + extension + "). Only safe documents and media formats are permitted.");
        }

        String fileName = UUID.randomUUID() + extension;

        try {
            Path targetDir = this.fileStorageLocation;
            if (subDirectory != null && !subDirectory.trim().isEmpty()) {
                targetDir = this.fileStorageLocation.resolve(subDirectory).normalize();
                if (!targetDir.startsWith(this.fileStorageLocation)) {
                    throw new SecurityException("Target sub-directory is outside base upload directory: " + subDirectory);
                }
                Files.createDirectories(targetDir);
            }

            Path targetLocation = targetDir.resolve(fileName).normalize();
            if (!targetLocation.startsWith(this.fileStorageLocation)) {
                throw new SecurityException("Target file location is outside base upload directory");
            }
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return (subDirectory != null && !subDirectory.trim().isEmpty() ? subDirectory + "/" : "") + fileName;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + fileName + ". Please try again!", ex);
        }
    }

    public Resource loadFileAsResource(String filePath) {
        try {
            Path file = this.fileStorageLocation.resolve(filePath).normalize();
            if (!file.startsWith(this.fileStorageLocation)) {
                throw new SecurityException("Access to path outside upload directory is forbidden: " + filePath);
            }
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("File not found " + filePath);
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("File not found " + filePath, ex);
        }
    }

    public void deleteFile(String filePath) {
        if (filePath == null || filePath.trim().isEmpty()) return;
        try {
            Path file = this.fileStorageLocation.resolve(filePath).normalize();
            if (!file.startsWith(this.fileStorageLocation)) {
                throw new SecurityException("Cannot delete file outside storage directory");
            }
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
        }
    }
}
