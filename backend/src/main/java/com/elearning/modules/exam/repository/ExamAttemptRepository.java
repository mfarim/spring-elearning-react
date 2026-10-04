package com.elearning.modules.exam.repository;

import com.elearning.modules.exam.entity.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {
    Optional<ExamAttempt> findByExaminationIdAndStudentId(Long examinationId, Long studentId);
    List<ExamAttempt> findByExaminationId(Long examinationId);
    List<ExamAttempt> findByStudentId(Long studentId);
}
