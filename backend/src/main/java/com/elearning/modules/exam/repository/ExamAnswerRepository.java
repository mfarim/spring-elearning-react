package com.elearning.modules.exam.repository;

import com.elearning.modules.exam.entity.ExamAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamAnswerRepository extends JpaRepository<ExamAnswer, Long> {
    List<ExamAnswer> findByExamAttemptId(Long examAttemptId);
    Optional<ExamAnswer> findByExamAttemptIdAndQuestionId(Long examAttemptId, Long questionId);
}
