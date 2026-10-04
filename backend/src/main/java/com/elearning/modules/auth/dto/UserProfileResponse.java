package com.elearning.modules.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private List<String> roles;
    private Long teacherId;
    private Long studentId;
    private Long classroomId;
    private String classroomName;
    private boolean impersonated;
}
