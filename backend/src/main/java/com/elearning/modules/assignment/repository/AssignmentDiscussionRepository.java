package com.elearning.modules.assignment.repository;

import com.elearning.modules.assignment.entity.AssignmentDiscussion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentDiscussionRepository extends JpaRepository<AssignmentDiscussion, Long> {
    List<AssignmentDiscussion> findByAssignmentIdAndParentIsNullOrderByCreatedAtAsc(Long assignmentId);
    List<AssignmentDiscussion> findByParentIdOrderByCreatedAtAsc(Long parentId);
}
