package com.elearning.modules.assignment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiscussionResponse {
    private Long id;
    private Long assignmentId;
    private Long userId;
    private String userName;
    private String userRole;
    private String message;
    private LocalDateTime createdAt;
    private List<DiscussionResponse> replies;
}
