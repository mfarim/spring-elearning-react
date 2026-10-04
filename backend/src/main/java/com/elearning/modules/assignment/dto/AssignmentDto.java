package com.elearning.modules.assignment.dto;

import com.elearning.common.enums.Status;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentDto {
    @NotNull(message = "Subject ID is required")
    private Long subjectId;

    @NotNull(message = "Classroom ID is required")
    private Long classroomId;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;
    private String instructions;

    @Builder.Default
    private Integer maxScore = 100;

    @NotNull(message = "Due date is required")
    private LocalDateTime dueDate;

    @Builder.Default
    private boolean allowLateSubmission = false;

    @Builder.Default
    private Status status = Status.draft;
}
