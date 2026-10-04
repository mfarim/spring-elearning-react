package com.elearning.modules.assignment.entity;

import com.elearning.common.entity.BaseEntity;
import com.elearning.common.enums.Status;
import com.elearning.modules.academic.entity.Classroom;
import com.elearning.modules.academic.entity.Subject;
import com.elearning.modules.user.entity.Teacher;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "assignments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assignment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id", nullable = false)
    private Classroom classroom;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "max_score", nullable = false)
    @Builder.Default
    private Integer maxScore = 100;

    @Column(name = "due_date", nullable = false)
    private LocalDateTime dueDate;

    @Column(name = "allow_late_submission", nullable = false)
    @Builder.Default
    private boolean allowLateSubmission = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.draft;
}
