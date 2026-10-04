package com.elearning.modules.announcement.entity;

import com.elearning.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "announcements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Announcement extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String target = "all"; // 'all', 'teacher', 'student'

    @Column(name = "is_published", nullable = false)
    @Builder.Default
    private boolean published = true;
}
