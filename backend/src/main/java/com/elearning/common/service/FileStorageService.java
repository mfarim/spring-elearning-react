package com.elearning.common.service;

import com.elearning.common.storage.LocalStorageBackend;
import com.elearning.common.storage.StorageBackend;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Validates and names uploaded files, then hands them to the configured {@link StorageBackend}
 * (local disk or S3/MinIO). All security checks live here so they apply to every backend:
 * extension allow/deny lists, random file names, and rejection of path traversal in keys.
 */
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt", ".txt", ".csv",
            ".jpg", ".jpeg", ".png", ".webp", ".gif",
            ".zip", ".rar", ".7z",
            ".mp3", ".wav", ".ogg",
            ".mp4", ".webm"
    );

    private static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            ".html", ".htm", ".xhtml", ".svg", ".xml",
            ".jsp", ".jspx", ".php", ".phtml",
            ".exe", ".bat", ".cmd", ".sh", ".bash", ".ps1", ".vbs",
            ".js", ".mjs", ".jar", ".war", ".py", ".cgi", ".dll", ".so"
    );

    private final StorageBackend backend;

    @Autowired
    public FileStorageService(StorageBackend backend) {
        this.backend = backend;
    }

    /** Local-disk storage rooted at {@code uploadDir} (used by tests and simple setups). */
    public FileStorageService(String uploadDir) {
        this(new LocalStorageBackend(uploadDir));
    }

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

        boolean hasSubDirectory = subDirectory != null && !subDirectory.trim().isEmpty();
        if (hasSubDirectory) {
            validateKey(subDirectory);
        }
        String fileName = UUID.randomUUID() + extension;
        String key = hasSubDirectory ? subDirectory + "/" + fileName : fileName;
        validateKey(key);

        try (InputStream content = file.getInputStream()) {
            backend.put(key, content, file.getSize(), file.getContentType());
            return key;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + fileName + ". Please try again!", ex);
        }
    }

    public Resource loadFileAsResource(String filePath) {
        validateKey(filePath);
        return backend.get(filePath);
    }

    public void deleteFile(String filePath) {
        if (filePath == null || filePath.trim().isEmpty()) {
            return;
        }
        validateKey(filePath);
        backend.delete(filePath);
    }

    /** Rejects absolute paths, backslashes and any key that climbs out of the storage root. */
    static void validateKey(String key) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("File path is required");
        }
        if (key.contains("\\") || key.startsWith("/")) {
            throw new SecurityException("Invalid file path: " + key);
        }
        Path normalized = Paths.get(key).normalize();
        if (normalized.isAbsolute() || normalized.startsWith("..") || normalized.toString().isEmpty()) {
            throw new SecurityException("Access to path outside upload directory is forbidden: " + key);
        }
    }
}
