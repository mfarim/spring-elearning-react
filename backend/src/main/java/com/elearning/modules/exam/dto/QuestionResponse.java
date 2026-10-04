package com.elearning.modules.exam.dto;

import com.elearning.common.enums.Difficulty;
import com.elearning.common.enums.QuestionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionResponse {
    private Long id;
    private Long examinationId;
    private String questionText;
    private QuestionType questionType;
    private List<String> options;
    private String audioPath;
    private String imagePath;
    private Integer points;
    private Difficulty difficulty;
    // Only populated for teachers or when results are officially revealed
    private String correctAnswer;
    private String explanation;
    // Current student's saved answer (if exam is running)
    private String studentAnswer;
}
