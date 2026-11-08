package com.elearning.common.storage;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.AbortableInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class S3StorageBackendTest {

    private final S3Client s3 = mock(S3Client.class);
    private final S3StorageBackend backend = new S3StorageBackend(s3, "elearning-uploads");

    @Test
    void putUploadsToTheConfiguredBucket() throws IOException {
        backend.put("materials/a.pdf", new ByteArrayInputStream(new byte[]{1, 2, 3}), 3, "application/pdf");

        verify(s3).putObject(
                org.mockito.ArgumentMatchers.<PutObjectRequest>argThat(r -> r.bucket().equals("elearning-uploads")
                        && r.key().equals("materials/a.pdf")
                        && "application/pdf".equals(r.contentType())),
                any(RequestBody.class));
    }

    @Test
    void getReturnsTheObjectWithItsFileNameAndLength() throws IOException {
        byte[] content = "hello".getBytes(StandardCharsets.UTF_8);
        ResponseInputStream<GetObjectResponse> stream = new ResponseInputStream<>(
                GetObjectResponse.builder().contentLength((long) content.length).build(),
                AbortableInputStream.create(new ByteArrayInputStream(content)));
        when(s3.getObject(any(GetObjectRequest.class))).thenReturn(stream);

        Resource resource = backend.get("materials/a.pdf");

        assertEquals("a.pdf", resource.getFilename());
        assertEquals(5, resource.contentLength());
        assertEquals("hello", new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8));
    }

    @Test
    void missingObjectsAreReportedAsNotFound() {
        when(s3.getObject(any(GetObjectRequest.class))).thenThrow(NoSuchKeyException.builder().message("missing").build());

        RuntimeException error = assertThrows(RuntimeException.class, () -> backend.get("materials/missing.pdf"));
        assertEquals("File not found materials/missing.pdf", error.getMessage());
    }
}
