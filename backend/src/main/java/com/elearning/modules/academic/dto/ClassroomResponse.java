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
public class ClassroomResponse {
    private Long id;
    private String name;
    private Integer level;
    private Integer capacity;
    private String academicYear;
    private Long homeroomTeacherId;
    private String homeroomTeacherName;
    private LocalDateTime createdAt;
}
