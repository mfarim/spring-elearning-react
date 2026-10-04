package com.elearning.modules.material.repository;

import com.elearning.modules.material.entity.MaterialView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MaterialViewRepository extends JpaRepository<MaterialView, Long> {
    Optional<MaterialView> findByLearningMaterialIdAndStudentId(Long materialId, Long studentId);
    boolean existsByLearningMaterialIdAndStudentId(Long materialId, Long studentId);
    long countByLearningMaterialId(Long materialId);
    List<MaterialView> findByLearningMaterialId(Long materialId);
}
