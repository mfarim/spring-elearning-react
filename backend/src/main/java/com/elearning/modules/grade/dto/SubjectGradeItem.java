package com.elearning.modules.grade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectGradeItem {
    private Long subjectId;
    private String subjectName;
    private String subjectCode;
    private Integer credits;
    private int avgExamScore;
    private int totalExams;
    private int passedExams;
    private int avgAssignmentScore;
    private int totalAssignments;
    private int overallScore;
}
