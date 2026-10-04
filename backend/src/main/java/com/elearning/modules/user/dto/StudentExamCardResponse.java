package com.elearning.modules.user.dto;

import com.elearning.common.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentExamCardResponse {
    private Long studentId;
    private String name;
    private String nis;
    private String nisn;
    private Gender gender;
    private LocalDate birthDate;
    private String classroomName;
    private String academicYear;
    private String barcodeData;
}
