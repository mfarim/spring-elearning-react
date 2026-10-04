package com.elearning.modules.academic.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectDto {
    @NotBlank(message = "Subject name is required")
    private String name;

    @NotBlank(message = "Subject code is required")
    private String code;

    private String description;

    private Long teacherId;

    @Builder.Default
    private Integer credits = 2;
}
