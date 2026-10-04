package com.elearning.modules.grade.service;

import com.elearning.common.enums.AttemptStatus;
import com.elearning.modules.academic.entity.Subject;
import com.elearning.modules.academic.repository.SubjectRepository;
import com.elearning.modules.assignment.entity.AssignmentSubmission;
import com.elearning.modules.assignment.repository.AssignmentSubmissionRepository;
import com.elearning.modules.exam.entity.ExamAttempt;
import com.elearning.modules.exam.repository.ExamAttemptRepository;
import com.elearning.modules.grade.dto.GradeReportResponse;
import com.elearning.modules.grade.dto.SubjectGradeItem;
import com.elearning.modules.user.entity.Student;
import com.elearning.modules.user.repository.StudentRepository;
import com.elearning.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GradeService {

    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final ExamAttemptRepository attemptRepository;
    private final AssignmentSubmissionRepository submissionRepository;

    @Transactional(readOnly = true)
    public GradeReportResponse getStudentGradeReport(UserPrincipal principal) {
        Student student = studentRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        List<Subject> subjects = subjectRepository.findAll();
        List<ExamAttempt> attempts = attemptRepository.findByStudentId(student.getId()).stream()
                .filter(a -> a.getStatus() == AttemptStatus.completed)
                .collect(Collectors.toList());

        List<AssignmentSubmission> submissions = submissionRepository.findAll().stream()
                .filter(s -> s.getStudent().getId().equals(student.getId()) && s.getScore() != null)
                .collect(Collectors.toList());

        List<SubjectGradeItem> subjectItems = new ArrayList<>();
        int totalOverall = 0;
        int activeSubjects = 0;

        for (Subject sub : subjects) {
            List<ExamAttempt> subAttempts = attempts.stream()
                    .filter(a -> a.getExamination().getSubject().getId().equals(sub.getId()))
                    .collect(Collectors.toList());

            List<AssignmentSubmission> subSubs = submissions.stream()
                    .filter(s -> s.getAssignment().getSubject().getId().equals(sub.getId()))
                    .collect(Collectors.toList());

            int avgExam = (int) Math.round(subAttempts.stream().mapToInt(a -> a.getScore() != null ? a.getScore() : 0).average().orElse(0));
            int totalExams = subAttempts.size();
            int passedExams = (int) subAttempts.stream().filter(a -> Boolean.TRUE.equals(a.getPassed())).count();

            int avgAssign = (int) Math.round(subSubs.stream().mapToInt(AssignmentSubmission::getScore).average().orElse(0));
            int totalAssign = subSubs.size();

            int overall = 0;
            if (totalExams > 0 && totalAssign > 0) {
                overall = (avgExam + avgAssign) / 2;
            } else if (totalExams > 0) {
                overall = avgExam;
            } else if (totalAssign > 0) {
                overall = avgAssign;
            }

            if (overall > 0) {
                totalOverall += overall;
                activeSubjects++;
            }

            subjectItems.add(SubjectGradeItem.builder()
                    .subjectId(sub.getId())
                    .subjectName(sub.getName())
                    .subjectCode(sub.getCode())
                    .credits(sub.getCredits())
                    .avgExamScore(avgExam)
                    .totalExams(totalExams)
                    .passedExams(passedExams)
                    .avgAssignmentScore(avgAssign)
                    .totalAssignments(totalAssign)
                    .overallScore(overall)
                    .build());
        }

        int overallGpa = activeSubjects > 0 ? totalOverall / activeSubjects : 0;
        int totalCompletedExams = attempts.size();
        int totalPassedExams = (int) attempts.stream().filter(a -> Boolean.TRUE.equals(a.getPassed())).count();

        return GradeReportResponse.builder()
                .studentId(student.getId())
                .studentName(student.getUser().getName())
                .nis(student.getNis())
                .classroomName(student.getClassroom() != null ? student.getClassroom().getName() : "-")
                .overallGpa(overallGpa)
                .totalCompletedExams(totalCompletedExams)
                .totalPassedExams(totalPassedExams)
                .subjects(subjectItems)
                .build();
    }
}
