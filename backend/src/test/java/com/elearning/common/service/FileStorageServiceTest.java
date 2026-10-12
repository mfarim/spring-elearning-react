package com.elearning.common.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class FileStorageServiceTest {

    @TempDir
    Path tempUploadDir;

    private FileStorageService fileStorageService;

    @BeforeEach
    void setUp() {
        fileStorageService = new FileStorageService(tempUploadDir.toString());
    }

    @Test
    void testStoreAndLoadFile_Success() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "sample-material.pdf",
                "application/pdf",
                "dummy content for testing".getBytes()
        );

        String storedPath = fileStorageService.storeFile(file, "materials");
        assertNotNull(storedPath);
        assertTrue(storedPath.startsWith("materials/"));

        Resource resource = fileStorageService.loadFileAsResource(storedPath);
        assertTrue(resource.exists());
        assertTrue(resource.isReadable());
    }

    @Test
    void testStoreFile_PathTraversalInFilename_ThrowsException() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "../../etc/passwd.txt",
                "text/plain",
                "malicious content".getBytes()
        );

        assertThrows(IllegalArgumentException.class, () ->
                fileStorageService.storeFile(file, "materials")
        );
    }

    @Test
    void testStoreFile_PathTraversalInSubDirectory_ThrowsSecurityException() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "normal.pdf",
                "application/pdf",
                "hello".getBytes()
        );

        assertThrows(SecurityException.class, () ->
                fileStorageService.storeFile(file, "../../outside")
        );
    }

    @Test
    void testLoadFile_PathTraversal_ThrowsSecurityException() {
        assertThrows(SecurityException.class, () ->
                fileStorageService.loadFileAsResource("../../application.yml")
        );
    }

    @Test
    void testDeleteFile_PathTraversal_ThrowsSecurityException() {
        assertThrows(SecurityException.class, () ->
                fileStorageService.deleteFile("../../secret.txt")
        );
    }
}
