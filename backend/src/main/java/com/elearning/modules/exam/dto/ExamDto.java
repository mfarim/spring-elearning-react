package com.elearning.modules.exam.dto;

import com.elearning.common.enums.ExamType;
import com.elearning.common.enums.Status;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class ExamDto {
    @NotNull(message = "Subject ID is required")
    private Long subjectId;

    @NotNull(message = "Classroom ID is required")
    private Long classroomId;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @Builder.Default
    private ExamType type = ExamType.quiz;

    @Builder.Default
    private Integer durationMinutes = 60;

    @Builder.Default
    private Integer passingScore = 75;

    @NotNull(message = "Start time is required")
    private LocalDateTime startAt;

    @NotNull(message = "End time is required")
    private LocalDateTime endAt;

    private LocalDate examDate;

    @Builder.Default
    private boolean shuffleQuestions = false;

    @Builder.Default
    private boolean shuffleOptions = false;

    @Builder.Default
    private boolean showResult = false;

    @Builder.Default
    private boolean allowRetry = false;

    @Builder.Default
    private Status status = Status.draft;
}
