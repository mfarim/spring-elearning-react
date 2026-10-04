package com.elearning.modules.exam.dto;

import com.elearning.common.enums.AttemptStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamMonitorResponse {
    private Long attemptId;
    private Long studentId;
    private String studentName;
    private String nis;
    private AttemptStatus status;
    private Integer score;
    private Boolean passed;
    private Integer violations;
    private Integer answeredCount;
    private Integer totalQuestions;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
}
