package com.elearning.config;

import com.elearning.common.storage.LocalStorageBackend;
import com.elearning.common.storage.S3StorageBackend;
import com.elearning.common.storage.StorageBackend;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Chooses where uploads are stored: {@code app.storage.type=local} (default, Docker volume) or
 * {@code s3} (AWS S3 / MinIO, required when running more than one backend instance).
 */
@Configuration
public class StorageConfig {

    @Bean
    @ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
    public StorageBackend localStorageBackend(@Value("${app.storage.upload-dir:./storage/uploads}") String uploadDir) {
        return new LocalStorageBackend(uploadDir);
    }

    @Bean
    @ConditionalOnProperty(name = "app.storage.type", havingValue = "s3")
    public StorageBackend s3StorageBackend(
            @Value("${app.storage.s3.bucket:}") String bucket,
            @Value("${app.storage.s3.region:us-east-1}") String region,
            @Value("${app.storage.s3.endpoint:}") String endpoint,
            @Value("${app.storage.s3.access-key:}") String accessKey,
            @Value("${app.storage.s3.secret-key:}") String secretKey,
            @Value("${app.storage.s3.path-style:false}") boolean pathStyle) {
        return S3StorageBackend.create(bucket, region, endpoint, accessKey, secretKey, pathStyle);
    }
}
