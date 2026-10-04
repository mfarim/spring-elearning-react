package com.elearning.modules.exam.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "exam_answers", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"exam_attempt_id", "question_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_attempt_id", nullable = false)
    private ExamAttempt examAttempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "answer_text", columnDefinition = "TEXT")
    private String answerText;

    @Column(name = "points_earned", nullable = false)
    @Builder.Default
    private Integer pointsEarned = 0;

    @Column(name = "is_correct")
    private Boolean correct;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "answered_at")
    @Builder.Default
    private LocalDateTime answeredAt = LocalDateTime.now();
}
