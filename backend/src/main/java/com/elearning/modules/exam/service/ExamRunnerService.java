package com.elearning.modules.exam.service;

import com.elearning.common.enums.AttemptStatus;
import com.elearning.common.enums.Status;
import com.elearning.common.exception.AttemptExpiredException;
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

    /** Attempt states after which no more answers are accepted. */
    private static final Set<AttemptStatus> FINISHED_STATUSES = EnumSet.of(
            AttemptStatus.completed, AttemptStatus.submitted, AttemptStatus.needs_grading, AttemptStatus.force_finished);

    // noRollbackFor: when the time has run out, the attempt is finalized and that result must be
    // committed even though the request is rejected with AttemptExpiredException.
    @Transactional(noRollbackFor = AttemptExpiredException.class)
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

        // Exams with retries can have several attempts; always continue from the latest one.
        Optional<ExamAttempt> latestAttemptOpt = attemptRepository
                .findFirstByExaminationIdAndStudentIdOrderByAttemptNumberDesc(examId, student.getId());
        ExamAttempt attempt;

        if (latestAttemptOpt.isEmpty()) {
            attempt = createNewAttempt(exam, student, 1);
        } else if (FINISHED_STATUSES.contains(latestAttemptOpt.get().getStatus())) {
            if (!exam.isAllowRetry()) {
                throw new IllegalStateException("Exam already completed. Retries are not permitted.");
            }
            attempt = createNewAttempt(exam, student, latestAttemptOpt.get().getAttemptNumber() + 1);
        } else {
            attempt = latestAttemptOpt.get();
        }

        // Calculate remaining seconds
        long remainingSeconds = calculateRemainingSeconds(exam, attempt, now);
        if (remainingSeconds <= 0 && attempt.getStatus() == AttemptStatus.in_progress) {
            autoFinalizeAttempt(attempt, exam);
            throw new AttemptExpiredException("Exam duration has expired");
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

        final Long currentAttemptId = attempt.getId();

        List<QuestionResponse> questionResponses = questions.stream().map(q -> {
            List<String> options = q.getOptions();
            if (options != null && exam.isShuffleOptions()) {
                options = new ArrayList<>(options);
                Collections.shuffle(options, new Random(currentAttemptId * 17 + q.getId()));
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

    @Transactional(noRollbackFor = AttemptExpiredException.class)
    public void saveAnswer(Long attemptId, SubmitAnswerRequest req, UserPrincipal principal) {
        ExamAttempt attempt = getValidatedStudentAttempt(attemptId, principal);

        if (attempt.getStatus() != AttemptStatus.in_progress) {
            throw new IllegalStateException("Cannot save answer: attempt is " + attempt.getStatus());
        }

        long remaining = calculateRemainingSeconds(attempt.getExamination(), attempt, LocalDateTime.now());
        if (remaining <= 0) {
            autoFinalizeAttempt(attempt, attempt.getExamination());
            throw new AttemptExpiredException("Exam duration has expired. Attempt automatically submitted.");
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

        long answeredCount = answerRepository.countByExamAttemptId(attempt.getId());
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
        if (attempt.getStatus() != AttemptStatus.in_progress) {
            // Already finalized, e.g. by the background job or a parallel submit.
            return attempt;
        }

        List<Question> questions = questionRepository.findByExaminationIdOrderByIdAsc(exam.getId());
        Map<Long, ExamAnswer> answersByQuestionId = answerRepository.findByExamAttemptId(attempt.getId()).stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a, (a1, a2) -> a1));

        int totalPossiblePoints = 0;
        int totalEarnedPoints = 0;
        boolean needsManualGrading = false;

        for (Question q : questions) {
            int qPoints = pointsOf(q);
            totalPossiblePoints += qPoints;

            ExamAnswer ans = answersByQuestionId.get(q.getId());
            if (ans == null || ans.getAnswerText() == null || ans.getAnswerText().isBlank()) {
                // Unanswered: zero points and nothing left for the teacher to grade.
                if (ans == null) {
                    ans = ExamAnswer.builder().examAttempt(attempt).question(q).build();
                }
                ans.setPointsEarned(0);
                ans.setCorrect(false);
                answerRepository.save(ans);
                continue;
            }

            if (AnswerGrader.isAutoGraded(q.getQuestionType(), q.getCorrectAnswer())) {
                boolean isCorrect = AnswerGrader.isCorrect(q.getQuestionType(), ans.getAnswerText(), q.getCorrectAnswer());
                ans.setCorrect(isCorrect);
                ans.setPointsEarned(isCorrect ? qPoints : 0);
                totalEarnedPoints += ans.getPointsEarned();
            } else {
                // Essays and short answers without a key wait for the teacher; correct == null marks them as pending.
                needsManualGrading = true;
                ans.setCorrect(null);
                ans.setPointsEarned(0);
            }
            answerRepository.save(ans);
        }

        int score = AnswerGrader.scorePercent(totalEarnedPoints, totalPossiblePoints);
        attempt.setScore(score);
        attempt.setPassed(score >= exam.getPassingScore());
        attempt.setStatus(needsManualGrading ? AttemptStatus.needs_grading : AttemptStatus.completed);
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
        if (attempt.getStatus() == AttemptStatus.in_progress) {
            throw new IllegalStateException("The attempt is still in progress");
        }
        Question question = answer.getQuestion();
        if (AnswerGrader.isAutoGraded(question.getQuestionType(), question.getCorrectAnswer())) {
            throw new IllegalArgumentException("Only essays and short answers without an answer key can be graded manually");
        }
        int maxPoints = pointsOf(question);
        if (dto.getPointsEarned() < 0 || dto.getPointsEarned() > maxPoints) {
            throw new IllegalArgumentException("Points must be between 0 and " + maxPoints);
        }

        answer.setPointsEarned(dto.getPointsEarned());
        answer.setFeedback(dto.getFeedback());
        answer.setCorrect(dto.getPointsEarned() > 0);
        answerRepository.save(answer);

        List<Question> questions = questionRepository.findByExaminationIdOrderByIdAsc(attempt.getExamination().getId());
        List<ExamAnswer> answers = answerRepository.findByExamAttemptId(attempt.getId());

        int totalPossible = questions.stream().mapToInt(ExamRunnerService::pointsOf).sum();
        int totalEarned = answers.stream().mapToInt(a -> a.getPointsEarned() != null ? a.getPointsEarned() : 0).sum();
        // The attempt is only complete once every manually graded answer has a grade.
        boolean stillPending = answers.stream().anyMatch(a -> a.getCorrect() == null);

        int score = AnswerGrader.scorePercent(totalEarned, totalPossible);
        attempt.setScore(score);
        attempt.setPassed(score >= attempt.getExamination().getPassingScore());
        attempt.setStatus(stillPending ? AttemptStatus.needs_grading : AttemptStatus.completed);
        attemptRepository.save(attempt);
    }

    /**
     * Finalizes the attempt if it is still in progress and its deadline has passed.
     * Called by {@link ExpiredAttemptFinalizer}; each call runs in its own transaction.
     *
     * @return true if the attempt was finalized by this call
     */
    @Transactional
    public boolean finalizeIfExpired(Long attemptId) {
        return attemptRepository.findById(attemptId)
                .filter(a -> a.getStatus() == AttemptStatus.in_progress)
                .filter(a -> calculateRemainingSeconds(a.getExamination(), a, LocalDateTime.now()) <= 0)
                .map(a -> {
                    autoFinalizeAttempt(a, a.getExamination());
                    log.info("Auto-finalized expired exam attempt {}", attemptId);
                    return true;
                })
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public List<ExamMonitorResponse> getExamMonitor(Long examId, UserPrincipal principal) {
        Examination exam = examRepository.findById(examId)
                .orElseThrow(() -> new IllegalArgumentException("Exam not found: " + examId));

        validateTeacherOrAdmin(exam, principal);

        List<ExamAttempt> attempts = attemptRepository.findByExaminationId(examId);

        return attempts.stream().map(att -> {
            int answeredCount = (int) answerRepository.countByExamAttemptId(att.getId());
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

    private static int pointsOf(Question question) {
        return question.getPoints() != null ? question.getPoints() : 1;
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
