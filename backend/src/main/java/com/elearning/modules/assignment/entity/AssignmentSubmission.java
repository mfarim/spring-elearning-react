package com.elearning.modules.assignment.entity;

import com.elearning.modules.user.entity.Student;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "assignment_submissions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"assignment_id", "student_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "file_path")
    private String filePath;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private Integer score;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "submitted";

    @Column(name = "submitted_at", nullable = false)
    @Builder.Default
    private LocalDateTime submittedAt = LocalDateTime.now();

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;
}
