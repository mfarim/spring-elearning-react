package com.elearning.modules.material.entity;

import com.elearning.common.entity.BaseEntity;
import com.elearning.modules.academic.entity.Classroom;
import com.elearning.modules.academic.entity.Subject;
import com.elearning.modules.user.entity.Teacher;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "learning_materials")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningMaterial extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    private Classroom classroom;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "file_url", columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "is_published", nullable = false)
    @Builder.Default
    private boolean published = false;
}
