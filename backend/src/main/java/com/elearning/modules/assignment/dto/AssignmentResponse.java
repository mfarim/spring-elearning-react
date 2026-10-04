package com.elearning.modules.assignment.dto;

import com.elearning.common.enums.Status;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentResponse {
    private Long id;
    private Long teacherId;
    private String teacherName;
    private Long subjectId;
    private String subjectName;
    private Long classroomId;
    private String classroomName;
    private String title;
    private String description;
    private String instructions;
    private Integer maxScore;
    private LocalDateTime dueDate;
    private boolean allowLateSubmission;
    private Status status;
    private LocalDateTime createdAt;
    // Student submission metadata if requested in student context
    private boolean hasSubmitted;
    private Integer studentScore;
    private String studentSubmissionStatus;
    private LocalDateTime studentSubmittedAt;
}
