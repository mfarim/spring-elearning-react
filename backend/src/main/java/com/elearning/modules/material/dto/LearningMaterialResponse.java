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
public class LearningMaterialResponse {
    private Long id;
    private Long teacherId;
    private String teacherName;
    private Long subjectId;
    private String subjectName;
    private Long classroomId;
    private String classroomName;
    private String title;
    private String description;
    private String type;
    private String content;
    private String fileUrl;
    private String filePath;
    private boolean published;
    private long totalViews;
    private boolean hasViewed;
    private LocalDateTime createdAt;
}
