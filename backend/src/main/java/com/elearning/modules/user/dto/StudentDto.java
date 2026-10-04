package com.elearning.modules.user.dto;

import com.elearning.common.enums.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDto {
    @NotBlank(message = "Name is required")
    private String name;

    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    private String email;

    private String password;

    private String phone;

    @NotBlank(message = "NIS is required")
    private String nis;

    private String nisn;

    private LocalDate birthDate;

    @NotNull(message = "Gender is required (M or F)")
    private Gender gender;

    private String address;

    private String photo;

    private Long classroomId;
}
