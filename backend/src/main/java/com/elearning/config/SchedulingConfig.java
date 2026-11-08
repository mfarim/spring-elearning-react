package com.elearning.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Enables {@code @Scheduled} jobs such as the expired exam attempt finalizer. */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
