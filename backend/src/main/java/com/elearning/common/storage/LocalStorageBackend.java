package com.elearning.common.storage;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/** Files on the local disk / Docker volume (single instance). */
public class LocalStorageBackend implements StorageBackend {

    private final Path root;

    public LocalStorageBackend(String uploadDir) {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not create the upload directory " + this.root, ex);
        }
    }

    @Override
    public void put(String key, InputStream content, long size, String contentType) throws IOException {
        Path target = resolve(key);
        Files.createDirectories(target.getParent());
        Files.copy(content, target, StandardCopyOption.REPLACE_EXISTING);
    }

    @Override
    public Resource get(String key) {
        Path file = resolve(key);
        try {
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new RuntimeException("File not found " + key);
        } catch (MalformedURLException ex) {
            throw new RuntimeException("File not found " + key, ex);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException ignored) {
            // Best effort, same as before: a leftover file is not worth failing the request.
        }
    }

    /** Second line of defence against path traversal, in addition to the key validation in FileStorageService. */
    private Path resolve(String key) {
        Path file = root.resolve(key).normalize();
        if (!file.startsWith(root)) {
            throw new SecurityException("Access to path outside upload directory is forbidden: " + key);
        }
        return file;
    }
}
