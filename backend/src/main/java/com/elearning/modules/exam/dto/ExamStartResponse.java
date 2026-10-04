package com.elearning.modules.exam.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamStartResponse {
    private Long attemptId;
    private Long examId;
    private String examTitle;
    private Integer durationMinutes;
    private Long remainingSeconds;
    private LocalDateTime startedAt;
    private Integer totalQuestions;
    private List<QuestionResponse> questions;
}
