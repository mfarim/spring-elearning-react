package com.elearning.modules.exam.service;

import com.elearning.common.enums.AttemptStatus;
import com.elearning.common.enums.QuestionType;
import com.elearning.common.enums.Status;
import com.elearning.modules.exam.dto.*;
import com.elearning.modules.exam.entity.ExamAnswer;
import com.elearning.modules.exam.entity.ExamAttempt;
import com.elearning.modules.exam.entity.Examination;
import com.elearning.modules.exam.entity.Question;
import com.elearning.modules.exam.repository.ExamAnswerRepository;
import com.elearning.modules.exam.repository.ExamAttemptRepository;
import com.elearning.modules.exam.repository.ExaminationRepository;
import com.elearning.modules.exam.repository.QuestionRepository;
import com.elearning.modules.user.entity.Student;
import com.elearning.modules.user.repository.StudentRepository;
import com.elearning.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamRunnerService {

    private final ExaminationRepository examRepository;
    private final QuestionRepository questionRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ExamAnswerRepository answerRepository;
    private final StudentRepository studentRepository;
    private final ExamRealtimeService realtimeService;

    @Transactional
    public ExamStartResponse startOrResumeAttempt(Long examId, UserPrincipal principal) {
        Student student = studentRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        Examination exam = examRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));

        if (exam.getStatus() != Status.published) {
            throw new IllegalStateException("Exam is not active or published");
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(exam.getStartAt())) {
            throw new IllegalStateException("Exam has not started yet. Starts at: " + exam.getStartAt());
        }
        if (now.isAfter(exam.getEndAt())) {
            throw new IllegalStateException("Exam schedule has ended at: " + exam.getEndAt());
        }

        if (student.getClassroom() == null || !student.getClassroom().getId().equals(exam.getClassroom().getId())) {
            throw new AccessDeniedException("This exam is not assigned to your classroom");
        }

        Optional<ExamAttempt> existingAttemptOpt = attemptRepository.findByExaminationIdAndStudentId(examId, student.getId());
        ExamAttempt attempt;

        if (existingAttemptOpt.isPresent()) {
            attempt = existingAttemptOpt.get();
            if (attempt.getStatus() == AttemptStatus.completed || attempt.getStatus() == AttemptStatus.submitted) {
                if (!exam.isAllowRetry()) {
                    throw new IllegalStateException("Exam already completed. Retries are not permitted.");
                } else {
                    attempt = createNewAttempt(exam, student, attempt.getAttemptNumber() + 1);
                }
            }
        } else {
            attempt = createNewAttempt(exam, student, 1);
        }

        // Calculate remaining seconds
        long remainingSeconds = calculateRemainingSeconds(exam, attempt, now);
        if (remainingSeconds <= 0 && attempt.getStatus() == AttemptStatus.in_progress) {
            autoFinalizeAttempt(attempt, exam);
            throw new IllegalStateException("Exam duration has expired");
        }

        // Fetch questions and existing answers
        List<Question> questions = questionRepository.findByExaminationIdOrderByIdAsc(examId);
        if (exam.isShuffleQuestions()) {
            Collections.shuffle(questions, new Random(attempt.getId() * 31));
        }

        Map<Long, String> studentAnswersMap = answerRepository.findByExamAttemptId(attempt.getId())
                .stream()
                .filter(a -> a.getAnswerText() != null)
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), ExamAnswer::getAnswerText, (a1, a2) -> a1));

        List<QuestionResponse> questionResponses = questions.stream().map(q -> {
            List<String> options = q.getOptions();
            if (options != null && exam.isShuffleOptions()) {
                options = new ArrayList<>(options);
                Collections.shuffle(options, new Random(attempt.getId() * 17 + q.getId()));
            }

            return QuestionResponse.builder()
                    .id(q.getId())
                    .examinationId(exam.getId())
                    .questionText(q.getQuestionText())
                    .questionType(q.getQuestionType())
                    .options(options)
                    .audioPath(q.getAudioPath())
                    .imagePath(q.getImagePath())
                    .points(q.getPoints())
                    .difficulty(q.getDifficulty())
                    .correctAnswer(null) // STRICT SECURITY: hide answer key
                    .explanation(null)   // STRICT SECURITY: hide explanation
                    .studentAnswer(studentAnswersMap.get(q.getId()))
                    .build();
        }).collect(Collectors.toList());

        realtimeService.broadcastExamEvent(exam.getId(), "STUDENT_JOINED", Map.of(
                "attemptId", attempt.getId(),
                "studentId", student.getId(),
                "studentName", student.getUser().getName(),
                "status", attempt.getStatus()
        ));

        return ExamStartResponse.builder()
                .attemptId(attempt.getId())
                .examId(exam.getId())
                .examTitle(exam.getTitle())
                .durationMinutes(exam.getDurationMinutes())
                .remainingSeconds(remainingSeconds)
                .startedAt(attempt.getStartedAt())
                .totalQuestions(questionResponses.size())
                .questions(questionResponses)
                .build();
    }

    @Transactional
    public void saveAnswer(Long attemptId, SubmitAnswerRequest req, UserPrincipal principal) {
        ExamAttempt attempt = getValidatedStudentAttempt(attemptId, principal);

        if (attempt.getStatus() != AttemptStatus.in_progress) {
            throw new IllegalStateException("Cannot save answer: attempt is " + attempt.getStatus());
        }

        long remaining = calculateRemainingSeconds(attempt.getExamination(), attempt, LocalDateTime.now());
        if (remaining <= 0) {
            autoFinalizeAttempt(attempt, attempt.getExamination());
            throw new IllegalStateException("Exam duration has expired. Attempt automatically submitted.");
        }

        Question question = questionRepository.findById(req.getQuestionId())
                .orElseThrow(() -> new IllegalArgumentException("Question not found"));

        if (!question.getExamination().getId().equals(attempt.getExamination().getId())) {
            throw new IllegalArgumentException("Question does not belong to this examination");
        }

        ExamAnswer answer = answerRepository.findByExamAttemptIdAndQuestionId(attempt.getId(), question.getId())
                .orElseGet(() -> ExamAnswer.builder()
                        .examAttempt(attempt)
                        .question(question)
                        .pointsEarned(0)
                        .build());

        answer.setAnswerText(req.getAnswerText());
        answer.setAnsweredAt(LocalDateTime.now());
        answerRepository.save(answer);

        int answeredCount = answerRepository.findByExamAttemptId(attempt.getId()).size();
        realtimeService.broadcastExamEvent(attempt.getExamination().getId(), "ANSWER_SAVED", Map.of(
                "attemptId", attempt.getId(),
                "studentId", attempt.getStudent().getId(),
                "answeredCount", answeredCount
        ));
    }

    @Transactional
    public int reportViolation(Long attemptId, ViolationReportRequest req, UserPrincipal principal) {
        ExamAttempt attempt = getValidatedStudentAttempt(attemptId, principal);

        int currentViolations = attempt.getViolations() + 1;
        attempt.setViolations(currentViolations);

        log.warn("Exam violation reported for student {} in attempt {}: {} (Total violations: {})",
                principal.getUsername(), attemptId, req.getReason(), currentViolations);

        realtimeService.broadcastExamEvent(attempt.getExamination().getId(), "VIOLATION_REPORTED", Map.of(
                "attemptId", attempt.getId(),
                "studentId", attempt.getStudent().getId(),
                "studentName", attempt.getStudent().getUser().getName(),
                "reason", req.getReason(),
                "violations", currentViolations
        ));

        if (currentViolations >= 5 && attempt.getStatus() == AttemptStatus.in_progress) {
            log.warn("Exceeded max violations. Auto-submitting attempt {}", attemptId);
            autoFinalizeAttempt(attempt, attempt.getExamination());
        } else {
            attemptRepository.save(attempt);
        }

        return currentViolations;
    }

    @Transactional
    public ExamAttempt submitAttempt(Long attemptId, UserPrincipal principal) {
        ExamAttempt attempt = getValidatedStudentAttempt(attemptId, principal);
        if (attempt.getStatus() != AttemptStatus.in_progress) {
            return attempt;
        }

        return autoFinalizeAttempt(attempt, attempt.getExamination());
    }

    @Transactional
    public ExamAttempt autoFinalizeAttempt(ExamAttempt attempt, Examination exam) {
        List<Question> questions = questionRepository.findByExaminationIdOrderByIdAsc(exam.getId());
        List<ExamAnswer> answers = answerRepository.findByExamAttemptId(attempt.getId());

        Map<Long, ExamAnswer> answersByQuestionId = answers.stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a, (a1, a2) -> a1));

        int totalPossiblePoints = 0;
        int totalEarnedPoints = 0;
        boolean hasEssay = false;

        for (Question q : questions) {
            int qPoints = q.getPoints() != null ? q.getPoints() : 1;
            totalPossiblePoints += qPoints;

            ExamAnswer ans = answersByQuestionId.get(q.getId());
            if (ans == null) {
                ans = ExamAnswer.builder()
                        .examAttempt(attempt)
                        .question(q)
                        .answerText(null)
                        .pointsEarned(0)
                        .correct(false)
                        .build();
                answerRepository.save(ans);
                continue;
            }

            if (q.getQuestionType() == QuestionType.multiple_choice || q.getQuestionType() == QuestionType.true_false) {
                boolean isCorrect = ans.getAnswerText() != null &&
                        q.getCorrectAnswer() != null &&
                        ans.getAnswerText().trim().equalsIgnoreCase(q.getCorrectAnswer().trim());

                ans.setCorrect(isCorrect);
                ans.setPointsEarned(isCorrect ? qPoints : 0);
                if (isCorrect) {
                    totalEarnedPoints += qPoints;
                }
                answerRepository.save(ans);
            } else if (q.getQuestionType() == QuestionType.essay) {
                hasEssay = true;
                ans.setCorrect(null);
                ans.setPointsEarned(0);
                answerRepository.save(ans);
            }
        }

        int score = totalPossiblePoints > 0 ? (totalEarnedPoints * 100) / totalPossiblePoints : 0;
        attempt.setScore(score);
        attempt.setPassed(score >= exam.getPassingScore());
        attempt.setStatus(hasEssay ? AttemptStatus.needs_grading : AttemptStatus.completed);
        attempt.setFinishedAt(LocalDateTime.now());

        ExamAttempt savedAttempt = attemptRepository.save(attempt);

        realtimeService.broadcastExamEvent(exam.getId(), "EXAM_SUBMITTED", Map.of(
                "attemptId", savedAttempt.getId(),
                "studentId", savedAttempt.getStudent().getId(),
                "studentName", savedAttempt.getStudent().getUser().getName(),
                "score", savedAttempt.getScore() != null ? savedAttempt.getScore() : 0,
                "status", savedAttempt.getStatus()
        ));

        return savedAttempt;
    }

    @Transactional
    public void gradeEssay(Long attemptId, Long answerId, EssayGradingDto dto, UserPrincipal principal) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found"));

        validateTeacherOrAdmin(attempt.getExamination(), principal);

        ExamAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new IllegalArgumentException("Answer not found"));

        if (!answer.getExamAttempt().getId().equals(attempt.getId())) {
            throw new IllegalArgumentException("Answer does not belong to this attempt");
        }

        answer.setPointsEarned(dto.getPointsEarned());
        answer.setFeedback(dto.getFeedback());
        answer.setCorrect(dto.getPointsEarned() > 0);
        answerRepository.save(answer);

        List<Question> questions = questionRepository.findByExaminationIdOrderByIdAsc(attempt.getExamination().getId());
        List<ExamAnswer> answers = answerRepository.findByExamAttemptId(attempt.getId());

        int totalPossible = questions.stream().mapToInt(q -> q.getPoints() != null ? q.getPoints() : 1).sum();
        int totalEarned = answers.stream().mapToInt(ExamAnswer::getPointsEarned).sum();

        int score = totalPossible > 0 ? (totalEarned * 100) / totalPossible : 0;
        attempt.setScore(score);
        attempt.setPassed(score >= attempt.getExamination().getPassingScore());
        attempt.setStatus(AttemptStatus.completed);
        attemptRepository.save(attempt);
    }

    @Transactional(readOnly = true)
    public List<ExamMonitorResponse> getExamMonitor(Long examId, UserPrincipal principal) {
        Examination exam = examRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));

        validateTeacherOrAdmin(exam, principal);

        List<ExamAttempt> attempts = attemptRepository.findByExaminationId(examId);

        return attempts.stream().map(att -> {
            int answeredCount = answerRepository.findByExamAttemptId(att.getId()).size();
            return ExamMonitorResponse.builder()
                    .attemptId(att.getId())
                    .studentId(att.getStudent().getId())
                    .studentName(att.getStudent().getUser().getName())
                    .nis(att.getStudent().getNis())
                    .status(att.getStatus())
                    .score(att.getScore())
                    .passed(att.getPassed())
                    .violations(att.getViolations())
                    .answeredCount(answeredCount)
                    .totalQuestions(exam.getTotalQuestions())
                    .startedAt(att.getStartedAt())
                    .finishedAt(att.getFinishedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    private ExamAttempt createNewAttempt(Examination exam, Student student, int attemptNumber) {
        ExamAttempt attempt = ExamAttempt.builder()
                .examination(exam)
                .student(student)
                .attemptNumber(attemptNumber)
                .status(AttemptStatus.in_progress)
                .violations(0)
                .startedAt(LocalDateTime.now())
                .build();
        return attemptRepository.save(attempt);
    }

    private long calculateRemainingSeconds(Examination exam, ExamAttempt attempt, LocalDateTime now) {
        LocalDateTime examDeadline = attempt.getStartedAt().plusMinutes(exam.getDurationMinutes());
        if (exam.getEndAt() != null && exam.getEndAt().isBefore(examDeadline)) {
            examDeadline = exam.getEndAt();
        }
        return Math.max(0, Duration.between(now, examDeadline).getSeconds());
    }

    private ExamAttempt getValidatedStudentAttempt(Long attemptId, UserPrincipal principal) {
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Attempt not found: " + attemptId));

        Student student = studentRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found"));

        if (!attempt.getStudent().getId().equals(student.getId())) {
            throw new AccessDeniedException("This attempt does not belong to you");
        }

        return attempt;
    }

    private void validateTeacherOrAdmin(Examination exam, UserPrincipal principal) {
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !exam.getTeacher().getUser().getId().equals(principal.getId())) {
            throw new AccessDeniedException("You are not authorized for this exam");
        }
    }
}
