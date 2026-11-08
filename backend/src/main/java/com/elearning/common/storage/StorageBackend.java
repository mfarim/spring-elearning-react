package com.elearning.common.storage;

import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;

/**
 * Where uploaded files are physically kept. Keys are relative paths such as
 * {@code materials/3f2a...pdf}; {@code FileStorageService} validates them before they get here.
 */
public interface StorageBackend {

    void put(String key, InputStream content, long size, String contentType) throws IOException;

    /** Returns the file, or throws a RuntimeException when it does not exist. */
    Resource get(String key);

    /** Deletes the file if it exists; missing files are ignored. */
    void delete(String key);
}
