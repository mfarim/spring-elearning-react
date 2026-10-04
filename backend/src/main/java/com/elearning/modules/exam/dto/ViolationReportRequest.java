package com.elearning.modules.exam.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ViolationReportRequest {
    @NotBlank(message = "Violation reason is required")
    private String reason;
}
