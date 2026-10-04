package com.elearning.modules.announcement.repository;

import com.elearning.modules.announcement.entity.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    List<Announcement> findByPublishedTrueOrderByCreatedAtDesc();
    List<Announcement> findByPublishedTrueAndTargetInOrderByCreatedAtDesc(List<String> targets);
    List<Announcement> findAllByOrderByCreatedAtDesc();
}
