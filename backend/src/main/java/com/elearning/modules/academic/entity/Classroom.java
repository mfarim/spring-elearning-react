package com.elearning.modules.academic.entity;

import com.elearning.common.entity.BaseEntity;
import com.elearning.modules.user.entity.Teacher;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "classrooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Classroom extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private Integer level;

    @Column(nullable = false)
    @Builder.Default
    private Integer capacity = 30;

    @Column(name = "academic_year", nullable = false, length = 20)
    private String academicYear;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "homeroom_teacher_id")
    private Teacher homeroomTeacher;
}
