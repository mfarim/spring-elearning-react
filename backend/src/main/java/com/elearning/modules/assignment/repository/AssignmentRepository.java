package com.elearning.modules.assignment.repository;

import com.elearning.common.enums.Status;
import com.elearning.modules.assignment.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByTeacherId(Long teacherId);
    List<Assignment> findByClassroomIdAndStatus(Long classroomId, Status status);
}
