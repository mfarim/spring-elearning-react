package com.elearning.modules.user.repository;

import com.elearning.modules.user.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByUserId(Long userId);
    List<Student> findByClassroomId(Long classroomId);
    boolean existsByNis(String nis);
}
