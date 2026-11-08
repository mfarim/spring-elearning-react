package com.elearning.common.service;

import com.elearning.common.storage.StorageBackend;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/** The same validation applies whatever backend stores the bytes (disk or S3). */
class FileStorageServiceKeyTest {

    private final StorageBackend backend = mock(StorageBackend.class);
    private final FileStorageService service = new FileStorageService(backend);

    @Test
    void storedFilesGetARandomNameInsideTheSubdirectory() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "Bab 1.pdf", "application/pdf", "pdf".getBytes());

        String key = service.storeFile(file, "materials");

        assertTrue(key.matches("materials/[0-9a-f-]{36}\\.pdf"), key);
        verify(backend).put(startsWith("materials/"), any(InputStream.class), anyLong(), eq("application/pdf"));
    }

    @Test
    void absoluteAndBackslashPathsAreRejectedBeforeReachingTheBackend() {
        assertThrows(SecurityException.class, () -> service.loadFileAsResource("/etc/passwd"));
        assertThrows(SecurityException.class, () -> service.loadFileAsResource("materials\\..\\..\\secret"));
        assertThrows(SecurityException.class, () -> service.deleteFile("materials/../../secret"));
        verifyNoInteractions(backend);
    }
}
