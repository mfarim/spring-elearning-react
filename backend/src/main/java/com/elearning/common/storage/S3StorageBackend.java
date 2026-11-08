package com.elearning.common.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.InputStream;
import java.net.URI;

/**
 * Files in an S3-compatible bucket (AWS S3, MinIO, Cloudflare R2, ...), so every backend instance sees
 * the same uploads. Downloads still go through the API, which keeps the per-file authorization checks.
 */
@Slf4j
public class S3StorageBackend implements StorageBackend, AutoCloseable {

    private final S3Client s3;
    private final String bucket;

    public S3StorageBackend(S3Client s3, String bucket) {
        this.s3 = s3;
        this.bucket = bucket;
    }

    /**
     * @param endpoint  empty for AWS; e.g. {@code http://minio:9000} for MinIO
     * @param accessKey empty to use the default AWS credential chain (env vars, instance role, ...)
     * @param pathStyle true for MinIO and most self-hosted S3 implementations
     */
    public static S3StorageBackend create(String bucket, String region, String endpoint,
                                          String accessKey, String secretKey, boolean pathStyle) {
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException("app.storage.s3.bucket is required when app.storage.type=s3");
        }
        AwsCredentialsProvider credentials = accessKey == null || accessKey.isBlank()
                ? DefaultCredentialsProvider.create()
                : StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));

        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(credentials)
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(pathStyle).build());
        if (endpoint != null && !endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }
        log.info("Using S3 storage: bucket={}, region={}, endpoint={}", bucket, region,
                endpoint == null || endpoint.isBlank() ? "AWS default" : endpoint);
        return new S3StorageBackend(builder.build(), bucket);
    }

    @Override
    public void put(String key, InputStream content, long size, String contentType) {
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .build();
        s3.putObject(request, RequestBody.fromInputStream(content, size));
    }

    @Override
    public Resource get(String key) {
        try {
            ResponseInputStream<GetObjectResponse> stream =
                    s3.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build());
            String fileName = key.substring(key.lastIndexOf('/') + 1);
            Long length = stream.response().contentLength();
            return new InputStreamResource(stream) {
                @Override
                public String getFilename() {
                    return fileName;
                }

                @Override
                public long contentLength() {
                    return length != null ? length : -1;
                }
            };
        } catch (NoSuchKeyException e) {
            throw new RuntimeException("File not found " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (RuntimeException e) {
            log.warn("Could not delete {} from bucket {}: {}", key, bucket, e.getMessage());
        }
    }

    @Override
    public void close() {
        s3.close();
    }
}
