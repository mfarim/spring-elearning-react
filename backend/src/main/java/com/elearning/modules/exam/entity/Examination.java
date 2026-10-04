package com.elearning.modules.exam.entity;

import com.elearning.common.entity.BaseEntity;
import com.elearning.common.enums.ExamType;
import com.elearning.common.enums.Status;
import com.elearning.modules.academic.entity.Classroom;
import com.elearning.modules.academic.entity.Subject;
import com.elearning.modules.user.entity.Teacher;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "examinations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Examination extends BaseEntity {

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private ExamType type = ExamType.quiz;

    @Column(name = "duration_minutes", nullable = false)
    @Builder.Default
    private Integer durationMinutes = 60;

    @Column(name = "passing_score", nullable = false)
    @Builder.Default
    private Integer passingScore = 75;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    @Column(name = "exam_date")
    private LocalDate examDate;

    @Column(name = "total_questions", nullable = false)
    @Builder.Default
    private Integer totalQuestions = 0;

    @Column(name = "shuffle_questions", nullable = false)
    @Builder.Default
    private boolean shuffleQuestions = false;

    @Column(name = "shuffle_options", nullable = false)
    @Builder.Default
    private boolean shuffleOptions = false;

    @Column(name = "show_result", nullable = false)
    @Builder.Default
    private boolean showResult = false;

    @Column(name = "allow_retry", nullable = false)
    @Builder.Default
    private boolean allowRetry = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.draft;

    @OneToMany(mappedBy = "examination", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Question> questions = new ArrayList<>();
}
