package com.elearning.modules.user.entity;

import com.elearning.common.entity.BaseEntity;
import com.elearning.common.enums.Gender;
import com.elearning.modules.academic.entity.Classroom;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    private Classroom classroom;

    @Column(nullable = false, unique = true, length = 50)
    private String nis;

    @Column(length = 50)
    private String nisn;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 1, nullable = false)
    private Gender gender;

    @Column(columnDefinition = "TEXT")
    private String address;

    private String photo;
}
