package com.elearning.modules.material.service;

import com.elearning.common.enums.RoleType;
import com.elearning.common.service.FileStorageService;
import com.elearning.modules.academic.entity.Classroom;
import com.elearning.modules.academic.entity.Subject;
import com.elearning.modules.academic.repository.ClassroomRepository;
import com.elearning.modules.academic.repository.SubjectRepository;
import com.elearning.modules.material.dto.LearningMaterialDto;
import com.elearning.modules.material.dto.LearningMaterialResponse;
import com.elearning.modules.material.dto.MaterialViewerResponse;
import com.elearning.modules.material.entity.LearningMaterial;
import com.elearning.modules.material.entity.MaterialView;
import com.elearning.modules.material.repository.LearningMaterialRepository;
import com.elearning.modules.material.repository.MaterialViewRepository;
import com.elearning.modules.user.entity.Student;
import com.elearning.modules.user.entity.Teacher;
import com.elearning.modules.user.entity.User;
import com.elearning.modules.user.repository.StudentRepository;
import com.elearning.modules.user.repository.TeacherRepository;
import com.elearning.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LearningMaterialService {

    private final LearningMaterialRepository materialRepository;
    private final MaterialViewRepository materialViewRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final ClassroomRepository classroomRepository;
    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public List<LearningMaterialResponse> getMaterialsForUser(UserPrincipal principal) {
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isTeacher = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));

        if (isAdmin) {
            return materialRepository.findAll().stream()
                    .map(m -> mapToResponse(m, null))
                    .collect(Collectors.toList());
        }

        if (isTeacher) {
            Teacher teacher = teacherRepository.findByUserId(principal.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Teacher profile not found"));
            return materialRepository.findByTeacherId(teacher.getId()).stream()
                    .map(m -> mapToResponse(m, null))
                    .collect(Collectors.toList());
        }

        // Student
        Student student = studentRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        if (student.getClassroom() == null) {
            return List.of();
        }

        return materialRepository.findByPublishedTrueAndClassroomId(student.getClassroom().getId()).stream()
                .map(m -> mapToResponse(m, student.getId()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public LearningMaterialResponse getMaterialById(Long id, UserPrincipal principal) {
        LearningMaterial material = materialRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Material not found with id: " + id));

        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isTeacher = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));

        Long studentId = null;
        if (!isAdmin && !isTeacher) {
            Student student = studentRepository.findByUserId(principal.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
            studentId = student.getId();

            if (!material.isPublished()) {
                throw new AccessDeniedException("Material is not published");
            }
            if (material.getClassroom() != null && (student.getClassroom() == null || !material.getClassroom().getId().equals(student.getClassroom().getId()))) {
                throw new AccessDeniedException("You are not authorized to view this material");
            }
        }

        return mapToResponse(material, studentId);
    }

    @Transactional
    public LearningMaterialResponse createMaterial(LearningMaterialDto dto, MultipartFile file, UserPrincipal principal) {
        Teacher teacher = teacherRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Teacher profile not found for user: " + principal.getUsername()));

        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + dto.getSubjectId()));

        Classroom classroom = null;
        if (dto.getClassroomId() != null) {
            classroom = classroomRepository.findById(dto.getClassroomId())
                    .orElseThrow(() -> new IllegalArgumentException("Classroom not found: " + dto.getClassroomId()));
        }

        String storedFilePath = null;
        String fileUrl = dto.getFileUrl();
        if (file != null && !file.isEmpty()) {
            storedFilePath = fileStorageService.storeFile(file, "materials");
            fileUrl = "/api/v1/files/" + storedFilePath;
        }

        LearningMaterial material = LearningMaterial.builder()
                .teacher(teacher)
                .subject(subject)
                .classroom(classroom)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .type(dto.getType())
                .content(dto.getContent())
                .fileUrl(fileUrl)
                .filePath(storedFilePath)
                .published(dto.isPublished())
                .build();

        return mapToResponse(materialRepository.save(material), null);
    }

    @Transactional
    public LearningMaterialResponse updateMaterial(Long id, LearningMaterialDto dto, MultipartFile file, UserPrincipal principal) {
        LearningMaterial material = materialRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Material not found: " + id));

        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !material.getTeacher().getUser().getId().equals(principal.getId())) {
            throw new AccessDeniedException("You are not allowed to update this material");
        }

        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + dto.getSubjectId()));

        Classroom classroom = null;
        if (dto.getClassroomId() != null) {
            classroom = classroomRepository.findById(dto.getClassroomId())
                    .orElseThrow(() -> new IllegalArgumentException("Classroom not found: " + dto.getClassroomId()));
        }

        if (file != null && !file.isEmpty()) {
            if (material.getFilePath() != null) {
                fileStorageService.deleteFile(material.getFilePath());
            }
            String storedPath = fileStorageService.storeFile(file, "materials");
            material.setFilePath(storedPath);
            material.setFileUrl("/api/v1/files/" + storedPath);
        } else if (dto.getFileUrl() != null) {
            material.setFileUrl(dto.getFileUrl());
        }

        material.setSubject(subject);
        material.setClassroom(classroom);
        material.setTitle(dto.getTitle());
        material.setDescription(dto.getDescription());
        material.setType(dto.getType());
        material.setContent(dto.getContent());
        material.setPublished(dto.isPublished());

        return mapToResponse(materialRepository.save(material), null);
    }

    @Transactional
    public void deleteMaterial(Long id, UserPrincipal principal) {
        LearningMaterial material = materialRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Material not found: " + id));

        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !material.getTeacher().getUser().getId().equals(principal.getId())) {
            throw new AccessDeniedException("You are not allowed to delete this material");
        }

        if (material.getFilePath() != null) {
            fileStorageService.deleteFile(material.getFilePath());
        }

        materialRepository.delete(material);
    }

    @Transactional
    public void recordView(Long materialId, UserPrincipal principal) {
        Student student = studentRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        LearningMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new IllegalArgumentException("Material not found"));

        if (!materialViewRepository.existsByLearningMaterialIdAndStudentId(material.getId(), student.getId())) {
            MaterialView view = MaterialView.builder()
                    .learningMaterial(material)
                    .student(student)
                    .viewedAt(LocalDateTime.now())
                    .build();
            materialViewRepository.save(view);
        }
    }

    @Transactional(readOnly = true)
    public List<MaterialViewerResponse> getMaterialViewers(Long materialId, UserPrincipal principal) {
        LearningMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new IllegalArgumentException("Material not found"));

        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !material.getTeacher().getUser().getId().equals(principal.getId())) {
            throw new AccessDeniedException("You are not allowed to view analytics for this material");
        }

        return materialViewRepository.findByLearningMaterialId(materialId).stream()
                .map(v -> MaterialViewerResponse.builder()
                        .studentId(v.getStudent().getId())
                        .studentName(v.getStudent().getUser().getName())
                        .nis(v.getStudent().getNis())
                        .viewedAt(v.getViewedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private LearningMaterialResponse mapToResponse(LearningMaterial m, Long studentId) {
        long totalViews = materialViewRepository.countByLearningMaterialId(m.getId());
        boolean hasViewed = studentId != null && materialViewRepository.existsByLearningMaterialIdAndStudentId(m.getId(), studentId);

        return LearningMaterialResponse.builder()
                .id(m.getId())
                .teacherId(m.getTeacher().getId())
                .teacherName(m.getTeacher().getUser().getName())
                .subjectId(m.getSubject().getId())
                .subjectName(m.getSubject().getName())
                .classroomId(m.getClassroom() != null ? m.getClassroom().getId() : null)
                .classroomName(m.getClassroom() != null ? m.getClassroom().getName() : "All Classes")
                .title(m.getTitle())
                .description(m.getDescription())
                .type(m.getType())
                .content(m.getContent())
                .fileUrl(m.getFileUrl())
                .filePath(m.getFilePath())
                .published(m.isPublished())
                .totalViews(totalViews)
                .hasViewed(hasViewed)
                .createdAt(m.getCreatedAt())
                .build();
    }
}
