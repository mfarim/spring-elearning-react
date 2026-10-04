package com.elearning.modules.material.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialViewerResponse {
    private Long studentId;
    private String studentName;
    private String nis;
    private LocalDateTime viewedAt;
}
