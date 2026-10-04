package com.elearning.modules.user.dto;

import com.elearning.common.enums.Gender;
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
public class StudentResponse {
    private Long id;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private String nis;
    private String nisn;
    private LocalDate birthDate;
    private Gender gender;
    private String address;
    private String photo;
    private Long classroomId;
    private String classroomName;
    private boolean active;
    private LocalDateTime createdAt;
}
