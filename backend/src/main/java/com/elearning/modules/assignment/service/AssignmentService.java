package com.elearning.modules.assignment.service;

import com.elearning.common.enums.Status;
import com.elearning.common.service.FileStorageService;
import com.elearning.modules.academic.entity.Classroom;
import com.elearning.modules.academic.entity.Subject;
import com.elearning.modules.academic.repository.ClassroomRepository;
import com.elearning.modules.academic.repository.SubjectRepository;
import com.elearning.modules.assignment.dto.*;
import com.elearning.modules.assignment.entity.Assignment;
import com.elearning.modules.assignment.entity.AssignmentDiscussion;
import com.elearning.modules.assignment.entity.AssignmentSubmission;
import com.elearning.modules.assignment.repository.AssignmentDiscussionRepository;
import com.elearning.modules.assignment.repository.AssignmentRepository;
import com.elearning.modules.assignment.repository.AssignmentSubmissionRepository;
import com.elearning.modules.user.entity.Student;
import com.elearning.modules.user.entity.Teacher;
import com.elearning.modules.user.entity.User;
import com.elearning.modules.user.repository.StudentRepository;
import com.elearning.modules.user.repository.TeacherRepository;
import com.elearning.modules.user.repository.UserRepository;
import com.elearning.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final AssignmentDiscussionRepository discussionRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final ClassroomRepository classroomRepository;
    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public List<AssignmentResponse> getAssignmentsForUser(UserPrincipal principal) {
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isTeacher = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));

        if (isAdmin) {
            return assignmentRepository.findAll().stream()
                    .map(a -> mapToResponse(a, null))
                    .collect(Collectors.toList());
        }

        if (isTeacher) {
            Teacher teacher = teacherRepository.findByUserId(principal.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Teacher profile not found"));
            return assignmentRepository.findByTeacherId(teacher.getId()).stream()
                    .map(a -> mapToResponse(a, null))
                    .collect(Collectors.toList());
        }

        // Student
        Student student = studentRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        if (student.getClassroom() == null) {
            return List.of();
        }

        return assignmentRepository.findByClassroomIdAndStatus(student.getClassroom().getId(), Status.published).stream()
                .map(a -> mapToResponse(a, student.getId()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AssignmentResponse getAssignmentById(Long id, UserPrincipal principal) {
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found with id: " + id));

        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isTeacher = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));

        Long studentId = null;
        if (!isAdmin && !isTeacher) {
            Student student = studentRepository.findByUserId(principal.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
            studentId = student.getId();

            if (assignment.getStatus() != Status.published) {
                throw new AccessDeniedException("Assignment is not published");
            }
            if (!assignment.getClassroom().getId().equals(student.getClassroom().getId())) {
                throw new AccessDeniedException("Assignment is not for your class");
            }
        }

        return mapToResponse(assignment, studentId);
    }

    @Transactional
    public AssignmentResponse createAssignment(AssignmentDto dto, UserPrincipal principal) {
        Teacher teacher = teacherRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Teacher profile not found"));

        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + dto.getSubjectId()));

        Classroom classroom = classroomRepository.findById(dto.getClassroomId())
                .orElseThrow(() -> new IllegalArgumentException("Classroom not found: " + dto.getClassroomId()));

        Assignment assignment = Assignment.builder()
                .teacher(teacher)
                .subject(subject)
                .classroom(classroom)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .instructions(dto.getInstructions())
                .maxScore(dto.getMaxScore())
                .dueDate(dto.getDueDate())
                .allowLateSubmission(dto.isAllowLateSubmission())
                .status(dto.getStatus())
                .build();

        return mapToResponse(assignmentRepository.save(assignment), null);
    }

    @Transactional
    public AssignmentResponse updateAssignment(Long id, AssignmentDto dto, UserPrincipal principal) {
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + id));

        validateTeacherOwnership(assignment, principal);

        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + dto.getSubjectId()));

        Classroom classroom = classroomRepository.findById(dto.getClassroomId())
                .orElseThrow(() -> new IllegalArgumentException("Classroom not found: " + dto.getClassroomId()));

        assignment.setSubject(subject);
        assignment.setClassroom(classroom);
        assignment.setTitle(dto.getTitle());
        assignment.setDescription(dto.getDescription());
        assignment.setInstructions(dto.getInstructions());
        assignment.setMaxScore(dto.getMaxScore());
        assignment.setDueDate(dto.getDueDate());
        assignment.setAllowLateSubmission(dto.isAllowLateSubmission());
        assignment.setStatus(dto.getStatus());

        return mapToResponse(assignmentRepository.save(assignment), null);
    }

    @Transactional
    public void deleteAssignment(Long id, UserPrincipal principal) {
        Assignment assignment = assignmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + id));

        validateTeacherOwnership(assignment, principal);
        assignmentRepository.delete(assignment);
    }

    // Submissions
    @Transactional
    public SubmissionResponse submitAssignment(Long assignmentId, String notes, MultipartFile file, UserPrincipal principal) {
        Student student = studentRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + assignmentId));

        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(assignment.getDueDate()) && !assignment.isAllowLateSubmission()) {
            throw new IllegalStateException("Submission deadline has passed and late submissions are not allowed.");
        }

        if (student.getClassroom() == null || !student.getClassroom().getId().equals(assignment.getClassroom().getId())) {
            throw new AccessDeniedException("This assignment is not for your class");
        }

        String storedPath = null;
        if (file != null && !file.isEmpty()) {
            storedPath = fileStorageService.storeFile(file, "submissions");
        }

        AssignmentSubmission submission = submissionRepository.findByAssignmentIdAndStudentId(assignmentId, student.getId())
                .orElseGet(() -> AssignmentSubmission.builder()
                        .assignment(assignment)
                        .student(student)
                        .build());

        if (storedPath != null) {
            if (submission.getFilePath() != null) {
                fileStorageService.deleteFile(submission.getFilePath());
            }
            submission.setFilePath(storedPath);
        }

        submission.setNotes(notes);
        submission.setStatus("submitted");
        submission.setSubmittedAt(now);

        return mapToSubmissionResponse(submissionRepository.save(submission));
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getSubmissions(Long assignmentId, UserPrincipal principal) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + assignmentId));

        validateTeacherOwnership(assignment, principal);

        return submissionRepository.findByAssignmentId(assignmentId).stream()
                .map(this::mapToSubmissionResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public SubmissionResponse gradeSubmission(Long submissionId, GradeSubmissionDto dto, UserPrincipal principal) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("Submission not found: " + submissionId));

        validateTeacherOwnership(submission.getAssignment(), principal);

        submission.setScore(dto.getScore());
        submission.setFeedback(dto.getFeedback());
        submission.setStatus("graded");
        submission.setGradedAt(LocalDateTime.now());

        return mapToSubmissionResponse(submissionRepository.save(submission));
    }

    // Discussions
    @Transactional(readOnly = true)
    public List<DiscussionResponse> getDiscussions(Long assignmentId) {
        List<AssignmentDiscussion> topLevel = discussionRepository.findByAssignmentIdAndParentIsNullOrderByCreatedAtAsc(assignmentId);
        return topLevel.stream().map(this::mapToDiscussionResponse).collect(Collectors.toList());
    }

    @Transactional
    public DiscussionResponse postDiscussion(Long assignmentId, DiscussionDto dto, UserPrincipal principal) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found"));

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        AssignmentDiscussion parent = null;
        if (dto.getParentId() != null) {
            parent = discussionRepository.findById(dto.getParentId())
                    .orElseThrow(() -> new IllegalArgumentException("Parent discussion not found"));
        }

        AssignmentDiscussion discussion = AssignmentDiscussion.builder()
                .assignment(assignment)
                .user(user)
                .parent(parent)
                .message(dto.getMessage())
                .build();

        return mapToDiscussionResponse(discussionRepository.save(discussion));
    }

    private void validateTeacherOwnership(Assignment assignment, UserPrincipal principal) {
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !assignment.getTeacher().getUser().getId().equals(principal.getId())) {
            throw new AccessDeniedException("You are not authorized for this assignment");
        }
    }

    private AssignmentResponse mapToResponse(Assignment a, Long studentId) {
        boolean hasSubmitted = false;
        Integer studentScore = null;
        String status = null;
        LocalDateTime submittedAt = null;

        if (studentId != null) {
            Optional<AssignmentSubmission> sub = submissionRepository.findByAssignmentIdAndStudentId(a.getId(), studentId);
            if (sub.isPresent()) {
                hasSubmitted = true;
                studentScore = sub.get().getScore();
                status = sub.get().getStatus();
                submittedAt = sub.get().getSubmittedAt();
            }
        }

        return AssignmentResponse.builder()
                .id(a.getId())
                .teacherId(a.getTeacher().getId())
                .teacherName(a.getTeacher().getUser().getName())
                .subjectId(a.getSubject().getId())
                .subjectName(a.getSubject().getName())
                .classroomId(a.getClassroom().getId())
                .classroomName(a.getClassroom().getName())
                .title(a.getTitle())
                .description(a.getDescription())
                .instructions(a.getInstructions())
                .maxScore(a.getMaxScore())
                .dueDate(a.getDueDate())
                .allowLateSubmission(a.isAllowLateSubmission())
                .status(a.getStatus())
                .createdAt(a.getCreatedAt())
                .hasSubmitted(hasSubmitted)
                .studentScore(studentScore)
                .studentSubmissionStatus(status)
                .studentSubmittedAt(submittedAt)
                .build();
    }

    private SubmissionResponse mapToSubmissionResponse(AssignmentSubmission s) {
        return SubmissionResponse.builder()
                .id(s.getId())
                .assignmentId(s.getAssignment().getId())
                .studentId(s.getStudent().getId())
                .studentName(s.getStudent().getUser().getName())
                .studentNis(s.getStudent().getNis())
                .filePath(s.getFilePath())
                .notes(s.getNotes())
                .score(s.getScore())
                .feedback(s.getFeedback())
                .status(s.getStatus())
                .submittedAt(s.getSubmittedAt())
                .gradedAt(s.getGradedAt())
                .build();
    }

    private DiscussionResponse mapToDiscussionResponse(AssignmentDiscussion d) {
        List<DiscussionResponse> replies = d.getReplies() != null ?
                d.getReplies().stream().map(this::mapToDiscussionResponse).collect(Collectors.toList()) : new ArrayList<>();

        String role = d.getUser().getRoles().stream().findFirst().map(r -> r.getName().name()).orElse("STUDENT");

        return DiscussionResponse.builder()
                .id(d.getId())
                .assignmentId(d.getAssignment().getId())
                .userId(d.getUser().getId())
                .userName(d.getUser().getName())
                .userRole(role)
                .message(d.getMessage())
                .createdAt(d.getCreatedAt())
                .replies(replies)
                .build();
    }
}
