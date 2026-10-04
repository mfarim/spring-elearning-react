package com.elearning.modules.exam.service;

import com.elearning.common.enums.Difficulty;
import com.elearning.common.enums.QuestionType;
import com.elearning.common.enums.Status;
import com.elearning.modules.academic.entity.Classroom;
import com.elearning.modules.academic.entity.Subject;
import com.elearning.modules.academic.repository.ClassroomRepository;
import com.elearning.modules.academic.repository.SubjectRepository;
import com.elearning.modules.exam.dto.ExamDto;
import com.elearning.modules.exam.dto.ExamResponse;
import com.elearning.modules.exam.dto.QuestionDto;
import com.elearning.modules.exam.dto.QuestionResponse;
import com.elearning.modules.exam.entity.ExamAttempt;
import com.elearning.modules.exam.entity.Examination;
import com.elearning.modules.exam.entity.Question;
import com.elearning.modules.exam.repository.ExamAttemptRepository;
import com.elearning.modules.exam.repository.ExaminationRepository;
import com.elearning.modules.exam.repository.QuestionRepository;
import com.elearning.modules.user.entity.Student;
import com.elearning.modules.user.entity.Teacher;
import com.elearning.modules.user.repository.StudentRepository;
import com.elearning.modules.user.repository.TeacherRepository;
import com.elearning.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamService {

    private final ExaminationRepository examRepository;
    private final QuestionRepository questionRepository;
    private final ExamAttemptRepository attemptRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final ClassroomRepository classroomRepository;

    @Transactional(readOnly = true)
    public List<ExamResponse> getExamsForUser(UserPrincipal principal) {
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isTeacher = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));

        if (isAdmin) {
            return examRepository.findAll().stream()
                    .map(e -> mapToResponse(e, null))
                    .collect(Collectors.toList());
        }

        if (isTeacher) {
            Teacher teacher = teacherRepository.findByUserId(principal.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Teacher profile not found"));
            return examRepository.findByTeacherId(teacher.getId()).stream()
                    .map(e -> mapToResponse(e, null))
                    .collect(Collectors.toList());
        }

        // Student
        Student student = studentRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
        if (student.getClassroom() == null) {
            return List.of();
        }

        return examRepository.findByClassroomIdAndStatus(student.getClassroom().getId(), Status.published).stream()
                .map(e -> mapToResponse(e, student.getId()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ExamResponse getExamById(Long id, UserPrincipal principal) {
        Examination exam = examRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found with id: " + id));

        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isTeacher = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEACHER"));

        Long studentId = null;
        if (!isAdmin && !isTeacher) {
            Student student = studentRepository.findByUserId(principal.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));
            studentId = student.getId();

            if (exam.getStatus() != Status.published) {
                throw new AccessDeniedException("Exam is not published");
            }
            if (!exam.getClassroom().getId().equals(student.getClassroom().getId())) {
                throw new AccessDeniedException("Exam is not scheduled for your class");
            }
        }

        return mapToResponse(exam, studentId);
    }

    @Transactional
    public ExamResponse createExam(ExamDto dto, UserPrincipal principal) {
        Teacher teacher = teacherRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Teacher profile not found"));

        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + dto.getSubjectId()));

        Classroom classroom = classroomRepository.findById(dto.getClassroomId())
                .orElseThrow(() -> new IllegalArgumentException("Classroom not found: " + dto.getClassroomId()));

        Examination exam = Examination.builder()
                .teacher(teacher)
                .subject(subject)
                .classroom(classroom)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .type(dto.getType())
                .durationMinutes(dto.getDurationMinutes())
                .passingScore(dto.getPassingScore())
                .startAt(dto.getStartAt())
                .endAt(dto.getEndAt())
                .examDate(dto.getExamDate() != null ? dto.getExamDate() : dto.getStartAt().toLocalDate())
                .shuffleQuestions(dto.isShuffleQuestions())
                .shuffleOptions(dto.isShuffleOptions())
                .showResult(dto.isShowResult())
                .allowRetry(dto.isAllowRetry())
                .status(dto.getStatus())
                .totalQuestions(0)
                .build();

        return mapToResponse(examRepository.save(exam), null);
    }

    @Transactional
    public ExamResponse updateExam(Long id, ExamDto dto, UserPrincipal principal) {
        Examination exam = examRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + id));

        validateTeacherOwnership(exam, principal);

        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + dto.getSubjectId()));

        Classroom classroom = classroomRepository.findById(dto.getClassroomId())
                .orElseThrow(() -> new IllegalArgumentException("Classroom not found: " + dto.getClassroomId()));

        exam.setSubject(subject);
        exam.setClassroom(classroom);
        exam.setTitle(dto.getTitle());
        exam.setDescription(dto.getDescription());
        exam.setType(dto.getType());
        exam.setDurationMinutes(dto.getDurationMinutes());
        exam.setPassingScore(dto.getPassingScore());
        exam.setStartAt(dto.getStartAt());
        exam.setEndAt(dto.getEndAt());
        exam.setExamDate(dto.getExamDate() != null ? dto.getExamDate() : dto.getStartAt().toLocalDate());
        exam.setShuffleQuestions(dto.isShuffleQuestions());
        exam.setShuffleOptions(dto.isShuffleOptions());
        exam.setShowResult(dto.isShowResult());
        exam.setAllowRetry(dto.isAllowRetry());
        exam.setStatus(dto.getStatus());

        return mapToResponse(examRepository.save(exam), null);
    }

    @Transactional
    public void deleteExam(Long id, UserPrincipal principal) {
        Examination exam = examRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + id));

        validateTeacherOwnership(exam, principal);
        examRepository.delete(exam);
    }

    @Transactional
    public ExamResponse updateExamStatus(Long id, Status status, UserPrincipal principal) {
        Examination exam = examRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + id));

        validateTeacherOwnership(exam, principal);
        exam.setStatus(status);
        return mapToResponse(examRepository.save(exam), null);
    }

    // Questions Management
    @Transactional(readOnly = true)
    public List<QuestionResponse> getQuestions(Long examId, UserPrincipal principal) {
        Examination exam = examRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));

        validateTeacherOwnership(exam, principal);

        return questionRepository.findByExaminationIdOrderByIdAsc(examId).stream()
                .map(q -> QuestionResponse.builder()
                        .id(q.getId())
                        .examinationId(exam.getId())
                        .questionText(q.getQuestionText())
                        .questionType(q.getQuestionType())
                        .options(q.getOptions())
                        .correctAnswer(q.getCorrectAnswer())
                        .explanation(q.getExplanation())
                        .audioPath(q.getAudioPath())
                        .imagePath(q.getImagePath())
                        .points(q.getPoints())
                        .difficulty(q.getDifficulty())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public QuestionResponse addQuestion(QuestionDto dto, UserPrincipal principal) {
        Examination exam = examRepository.findById(dto.getExaminationId())
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + dto.getExaminationId()));

        validateTeacherOwnership(exam, principal);

        Question q = Question.builder()
                .examination(exam)
                .questionText(dto.getQuestionText())
                .questionType(dto.getQuestionType())
                .options(dto.getOptions())
                .correctAnswer(dto.getCorrectAnswer())
                .explanation(dto.getExplanation())
                .audioPath(dto.getAudioPath())
                .imagePath(dto.getImagePath())
                .points(dto.getPoints() != null ? dto.getPoints() : 1)
                .difficulty(dto.getDifficulty() != null ? dto.getDifficulty() : Difficulty.medium)
                .build();

        q = questionRepository.save(q);

        exam.setTotalQuestions(exam.getTotalQuestions() + 1);
        examRepository.save(exam);

        return QuestionResponse.builder()
                .id(q.getId())
                .examinationId(exam.getId())
                .questionText(q.getQuestionText())
                .questionType(q.getQuestionType())
                .options(q.getOptions())
                .correctAnswer(q.getCorrectAnswer())
                .explanation(q.getExplanation())
                .audioPath(q.getAudioPath())
                .imagePath(q.getImagePath())
                .points(q.getPoints())
                .difficulty(q.getDifficulty())
                .build();
    }

    @Transactional
    public QuestionResponse updateQuestion(Long id, QuestionDto dto, UserPrincipal principal) {
        Question q = questionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + id));

        validateTeacherOwnership(q.getExamination(), principal);

        q.setQuestionText(dto.getQuestionText());
        q.setQuestionType(dto.getQuestionType());
        q.setOptions(dto.getOptions());
        q.setCorrectAnswer(dto.getCorrectAnswer());
        q.setExplanation(dto.getExplanation());
        q.setAudioPath(dto.getAudioPath());
        q.setImagePath(dto.getImagePath());
        if (dto.getPoints() != null) q.setPoints(dto.getPoints());
        if (dto.getDifficulty() != null) q.setDifficulty(dto.getDifficulty());

        q = questionRepository.save(q);

        return QuestionResponse.builder()
                .id(q.getId())
                .examinationId(q.getExamination().getId())
                .questionText(q.getQuestionText())
                .questionType(q.getQuestionType())
                .options(q.getOptions())
                .correctAnswer(q.getCorrectAnswer())
                .explanation(q.getExplanation())
                .audioPath(q.getAudioPath())
                .imagePath(q.getImagePath())
                .points(q.getPoints())
                .difficulty(q.getDifficulty())
                .build();
    }

    @Transactional
    public void deleteQuestion(Long id, UserPrincipal principal) {
        Question q = questionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + id));

        Examination exam = q.getExamination();
        validateTeacherOwnership(exam, principal);

        questionRepository.delete(q);
        exam.setTotalQuestions(Math.max(0, exam.getTotalQuestions() - 1));
        examRepository.save(exam);
    }

    @Transactional
    public Map<String, Object> importQuestionsFromExcel(Long examId, MultipartFile file, UserPrincipal principal) {
        Examination exam = examRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));

        validateTeacherOwnership(exam, principal);

        int count = 0;
        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();

            // Columns: [Question Text, Question Type, Opt A, Opt B, Opt C, Opt D, Opt E, Correct Answer, Points, Explanation]
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String text = formatter.formatCellValue(row.getCell(0)).trim();
                String typeStr = formatter.formatCellValue(row.getCell(1)).trim().toUpperCase();
                if (text.isEmpty()) continue;

                QuestionType type = QuestionType.multiple_choice;
                if ("ESSAY".equals(typeStr)) type = QuestionType.essay;
                else if ("TRUE_FALSE".equals(typeStr)) type = QuestionType.true_false;

                List<String> options = new ArrayList<>();
                if (type == QuestionType.multiple_choice) {
                    for (int c = 2; c <= 6; c++) {
                        String opt = formatter.formatCellValue(row.getCell(c)).trim();
                        if (!opt.isEmpty()) options.add(opt);
                    }
                } else if (type == QuestionType.true_false) {
                    options = List.of("Benar", "Salah");
                }

                String correctAnswer = formatter.formatCellValue(row.getCell(7)).trim();
                String pointsStr = formatter.formatCellValue(row.getCell(8)).trim();
                int points = 1;
                try {
                    if (!pointsStr.isEmpty()) points = Integer.parseInt(pointsStr);
                } catch (NumberFormatException ignored) {}

                String explanation = formatter.formatCellValue(row.getCell(9)).trim();

                Question question = Question.builder()
                        .examination(exam)
                        .questionText(text)
                        .questionType(type)
                        .options(options)
                        .correctAnswer(correctAnswer)
                        .explanation(explanation)
                        .points(points)
                        .difficulty(Difficulty.medium)
                        .build();

                questionRepository.save(question);
                count++;
            }

            exam.setTotalQuestions(exam.getTotalQuestions() + count);
            examRepository.save(exam);

        } catch (Exception e) {
            log.error("Failed to parse questions Excel", e);
            throw new RuntimeException("Failed to read Excel questions: " + e.getMessage());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("importedCount", count);
        return result;
    }

    private void validateTeacherOwnership(Examination exam, UserPrincipal principal) {
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !exam.getTeacher().getUser().getId().equals(principal.getId())) {
            throw new AccessDeniedException("You are not authorized to modify this exam");
        }
    }

    private ExamResponse mapToResponse(Examination e, Long studentId) {
        String attemptStatus = null;
        Integer studentScore = null;
        Boolean studentPassed = null;
        Long currentAttemptId = null;

        if (studentId != null) {
            Optional<ExamAttempt> attempt = attemptRepository.findByExaminationIdAndStudentId(e.getId(), studentId);
            if (attempt.isPresent()) {
                ExamAttempt att = attempt.get();
                attemptStatus = att.getStatus().name();
                studentScore = att.getScore();
                studentPassed = att.getPassed();
                currentAttemptId = att.getId();
            }
        }

        return ExamResponse.builder()
                .id(e.getId())
                .teacherId(e.getTeacher().getId())
                .teacherName(e.getTeacher().getUser().getName())
                .subjectId(e.getSubject().getId())
                .subjectName(e.getSubject().getName())
                .classroomId(e.getClassroom().getId())
                .classroomName(e.getClassroom().getName())
                .title(e.getTitle())
                .description(e.getDescription())
                .type(e.getType())
                .durationMinutes(e.getDurationMinutes())
                .passingScore(e.getPassingScore())
                .startAt(e.getStartAt())
                .endAt(e.getEndAt())
                .examDate(e.getExamDate())
                .totalQuestions(e.getTotalQuestions())
                .shuffleQuestions(e.isShuffleQuestions())
                .shuffleOptions(e.isShuffleOptions())
                .showResult(e.isShowResult())
                .allowRetry(e.isAllowRetry())
                .status(e.getStatus())
                .createdAt(e.getCreatedAt())
                .studentAttemptStatus(attemptStatus)
                .studentScore(studentScore)
                .studentPassed(studentPassed)
                .currentAttemptId(currentAttemptId)
                .build();
    }
}
