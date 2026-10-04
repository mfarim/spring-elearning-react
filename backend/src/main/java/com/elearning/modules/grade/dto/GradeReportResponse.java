package com.elearning.modules.grade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeReportResponse {
    private Long studentId;
    private String studentName;
    private String nis;
    private String classroomName;
    private int overallGpa;
    private int totalCompletedExams;
    private int totalPassedExams;
    private List<SubjectGradeItem> subjects;
}
