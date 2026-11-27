package com.elearning.modules.exam.dto;

import com.elearning.common.enums.ExamType;
import com.elearning.common.enums.Status;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Duration;
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

    /**
     * Teacher who owns the exam. Only read when an admin creates the exam (an admin has no teacher
     * profile); a teacher always owns the exams they create.
     */
    private Long teacherId;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @Builder.Default
    private ExamType type = ExamType.quiz;

    @NotNull(message = "Duration is required")
    @Min(value = 1, message = "Duration must be at least 1 minute")
    @Builder.Default
    private Integer durationMinutes = 60;

    @NotNull(message = "Passing score is required")
    @Min(value = 0, message = "Passing score must be between 0 and 100")
    @Max(value = 100, message = "Passing score must be between 0 and 100")
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

    /** The exam window must close after it opens; otherwise no student could ever start the exam. */
    @JsonIgnore
    @AssertTrue(message = "End time must be after start time")
    public boolean isEndAfterStart() {
        if (startAt == null || endAt == null) {
            return true; // reported by @NotNull
        }
        return endAt.isAfter(startAt);
    }

    /** A student who starts at the opening time must be able to use the whole duration. */
    @JsonIgnore
    @AssertTrue(message = "Duration does not fit between start time and end time")
    public boolean isDurationWithinWindow() {
        if (startAt == null || endAt == null || durationMinutes == null || !endAt.isAfter(startAt)) {
            return true; // reported by the other constraints
        }
        return durationMinutes <= Duration.between(startAt, endAt).toMinutes();
    }
}
