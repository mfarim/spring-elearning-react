package com.elearning.modules.exam.dto;

import com.elearning.common.enums.ExamType;
import com.elearning.common.enums.Status;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamResponse {
    private Long id;
    private Long teacherId;
    private String teacherName;
    private Long subjectId;
    private String subjectName;
    private Long classroomId;
    private String classroomName;
    private String title;
    private String description;
    private ExamType type;
    private Integer durationMinutes;
    private Integer passingScore;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private LocalDate examDate;
    private Integer totalQuestions;
    private boolean shuffleQuestions;
    private boolean shuffleOptions;
    private boolean showResult;
    private boolean allowRetry;
    private Status status;
    private LocalDateTime createdAt;
    // Student attempt status if fetched in student context
    private String studentAttemptStatus;
    private Integer studentScore;
    private Boolean studentPassed;
    private Long currentAttemptId;
}
