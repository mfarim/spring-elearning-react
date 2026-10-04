package com.elearning.modules.exam.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EssayGradingDto {
    @NotNull(message = "Points earned is required")
    private Integer pointsEarned;
    private String feedback;
}
