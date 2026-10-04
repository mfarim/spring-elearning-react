package com.elearning.modules.academic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectResponse {
    private Long id;
    private String name;
    private String code;
    private String description;
    private Long teacherId;
    private String teacherName;
    private Integer credits;
    private LocalDateTime createdAt;
}
