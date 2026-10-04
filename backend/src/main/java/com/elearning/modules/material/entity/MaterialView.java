package com.elearning.modules.material.entity;

import com.elearning.modules.user.entity.Student;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "material_views", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"learning_material_id", "student_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learning_material_id", nullable = false)
    private LearningMaterial learningMaterial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "viewed_at", nullable = false)
    @Builder.Default
    private LocalDateTime viewedAt = LocalDateTime.now();
}
