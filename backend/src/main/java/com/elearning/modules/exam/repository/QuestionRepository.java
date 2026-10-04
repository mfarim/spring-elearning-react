package com.elearning.modules.exam.repository;

import com.elearning.modules.exam.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByExaminationIdOrderByIdAsc(Long examinationId);
}
