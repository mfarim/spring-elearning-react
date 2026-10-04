package com.elearning.modules.material.repository;

import com.elearning.modules.material.entity.LearningMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LearningMaterialRepository extends JpaRepository<LearningMaterial, Long> {
    List<LearningMaterial> findByTeacherId(Long teacherId);
    List<LearningMaterial> findByPublishedTrueAndClassroomId(Long classroomId);
}
