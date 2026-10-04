package com.elearning.modules.exam.repository;

import com.elearning.common.enums.Status;
import com.elearning.modules.exam.entity.Examination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExaminationRepository extends JpaRepository<Examination, Long> {
    List<Examination> findByTeacherId(Long teacherId);
    List<Examination> findByClassroomIdAndStatus(Long classroomId, Status status);
}
