package com.elearning.modules.exam.repository;

import com.elearning.modules.exam.entity.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    /** The student's most recent attempt (exams with retries can have several). */
    Optional<ExamAttempt> findFirstByExaminationIdAndStudentIdOrderByAttemptNumberDesc(Long examinationId, Long studentId);

    List<ExamAttempt> findByExaminationId(Long examinationId);

    List<ExamAttempt> findByStudentId(Long studentId);

    /**
     * IDs of in-progress attempts whose deadline has passed. The deadline is the earlier of
     * (started_at + exam duration) and the exam's end_at, the same rule the service uses.
     */
    @Query(value = """
            SELECT a.id
            FROM exam_attempts a
            JOIN examinations e ON e.id = a.examination_id
            WHERE a.status = 'in_progress'
              AND LEAST(a.started_at + make_interval(mins => e.duration_minutes), e.end_at) <= :now
            ORDER BY a.id
            """, nativeQuery = true)
    List<Long> findExpiredInProgressAttemptIds(@Param("now") LocalDateTime now);
}
