package com.elearning.modules.academic.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassroomDto {
    @NotBlank(message = "Classroom name is required")
    private String name;

    @NotNull(message = "Level is required")
    private Integer level;

    private Integer capacity;

    @NotBlank(message = "Academic year is required")
    private String academicYear;

    private Long homeroomTeacherId;
}
