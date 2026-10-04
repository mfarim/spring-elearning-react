package com.elearning.modules.exam.dto;

import com.elearning.common.enums.Difficulty;
import com.elearning.common.enums.QuestionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionDto {
    @NotNull(message = "Examination ID is required")
    private Long examinationId;

    @NotBlank(message = "Question text is required")
    private String questionText;

    @NotNull(message = "Question type is required")
    private QuestionType questionType;

    private List<String> options;

    @NotBlank(message = "Correct answer is required")
    private String correctAnswer;

    private String audioPath;
    private String imagePath;
    private String explanation;

    @Builder.Default
    private Integer points = 1;

    @Builder.Default
    private Difficulty difficulty = Difficulty.medium;
}
