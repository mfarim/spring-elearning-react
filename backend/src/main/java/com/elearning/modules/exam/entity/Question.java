package com.elearning.modules.exam.entity;

import com.elearning.common.entity.BaseEntity;
import com.elearning.common.enums.Difficulty;
import com.elearning.common.enums.QuestionType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Entity
@Table(name = "questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examination_id", nullable = false)
    private Examination examination;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 50)
    private QuestionType questionType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> options;

    @JsonIgnore
    @Column(name = "correct_answer")
    private String correctAnswer;

    @Column(name = "audio_path")
    private String audioPath;

    @Column(name = "image_path")
    private String imagePath;

    @JsonIgnore
    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column(nullable = false)
    @Builder.Default
    private Integer points = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Difficulty difficulty = Difficulty.medium;
}
