package com.elearning.modules.assignment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiscussionDto {
    @NotBlank(message = "Message cannot be empty")
    private String message;
    private Long parentId;
}
