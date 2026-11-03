package com.elearning.common.service;

import com.elearning.modules.assignment.entity.AssignmentSubmission;
import com.elearning.modules.assignment.repository.AssignmentSubmissionRepository;
import com.elearning.modules.material.entity.LearningMaterial;
import com.elearning.modules.material.repository.LearningMaterialRepository;
import com.elearning.modules.user.entity.Student;
import com.elearning.modules.user.repository.StudentRepository;
import com.elearning.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Decides whether the current user may download a stored file.
 * - submissions/**: admin, the submitting student, or the teacher who owns the assignment
 * - materials/**:   admin/teacher, or a student of the target classroom when the material is published
 * - anything else:  admin/teacher only
 */
@Service
@RequiredArgsConstructor
public class FileAccessService {

    public static final String FILES_URL_PREFIX = "/api/v1/files/";

    private final AssignmentSubmissionRepository submissionRepository;
    private final LearningMaterialRepository materialRepository;
    private final StudentRepository studentRepository;

    @Transactional(readOnly = true)
    public boolean canRead(String filePath, UserPrincipal principal) {
        if (principal == null || filePath == null || filePath.isBlank()) {
            return false;
        }
        boolean isAdmin = hasRole(principal, "ROLE_ADMIN");
        boolean isTeacher = hasRole(principal, "ROLE_TEACHER");

        if (filePath.startsWith("submissions/")) {
            Optional<AssignmentSubmission> submission = submissionRepository.findFirstByFilePath(filePath);
            if (submission.isEmpty()) {
                return false;
            }
            if (isAdmin) {
                return true;
            }
            AssignmentSubmission s = submission.get();
            boolean isOwnerStudent = s.getStudent().getUser().getId().equals(principal.getId());
            boolean isOwnerTeacher = isTeacher && s.getAssignment().getTeacher().getUser().getId().equals(principal.getId());
            return isOwnerStudent || isOwnerTeacher;
        }

        if (filePath.startsWith("materials/")) {
            List<LearningMaterial> materials = materialRepository.findByFilePathOrFileUrl(filePath, FILES_URL_PREFIX + filePath);
            if (materials.isEmpty()) {
                return false;
            }
            if (isAdmin || isTeacher) {
                return true;
            }
            Optional<Student> student = studentRepository.findByUserId(principal.getId());
            if (student.isEmpty()) {
                return false;
            }
            Long studentClassroomId = student.get().getClassroom() != null ? student.get().getClassroom().getId() : null;
            return materials.stream().anyMatch(m -> m.isPublished()
                    && (m.getClassroom() == null || m.getClassroom().getId().equals(studentClassroomId)));
        }

        return isAdmin || isTeacher;
    }

    private boolean hasRole(UserPrincipal principal, String role) {
        return principal.getAuthorities().stream().anyMatch(a -> role.equals(a.getAuthority()));
    }
}
