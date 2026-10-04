package com.elearning.modules.material.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningMaterialDto {
    @NotNull(message = "Subject ID is required")
    private Long subjectId;

    private Long classroomId;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotBlank(message = "Type is required (e.g. PDF, VIDEO, ARTICLE)")
    private String type;

    private String content;

    private String fileUrl;

    @Builder.Default
    private boolean published = false;
}
