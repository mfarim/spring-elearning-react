package com.elearning.modules.exam.service;

import com.elearning.common.enums.AttemptStatus;
import com.elearning.common.enums.QuestionType;
import com.elearning.common.enums.Status;
import com.elearning.common.exception.AttemptExpiredException;
import com.elearning.modules.academic.entity.Classroom;
import com.elearning.modules.exam.dto.EssayGradingDto;
import com.elearning.modules.exam.dto.SubmitAnswerRequest;
import com.elearning.modules.exam.entity.ExamAnswer;
import com.elearning.modules.exam.entity.ExamAttempt;
import com.elearning.modules.exam.entity.Examination;
import com.elearning.modules.exam.entity.Question;
import com.elearning.modules.exam.repository.ExamAnswerRepository;
import com.elearning.modules.exam.repository.ExamAttemptRepository;
import com.elearning.modules.exam.repository.ExaminationRepository;
import com.elearning.modules.exam.repository.QuestionRepository;
import com.elearning.modules.user.entity.Student;
import com.elearning.modules.user.entity.Teacher;
import com.elearning.modules.user.entity.User;
import com.elearning.modules.user.repository.StudentRepository;
import com.elearning.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExamRunnerServiceTest {

    private static final long EXAM_ID = 100L;
    private static final long ATTEMPT_ID = 500L;

    @Mock private ExaminationRepository examRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private ExamAttemptRepository attemptRepository;
    @Mock private ExamAnswerRepository answerRepository;
    @Mock private StudentRepository studentRepository;
    @Mock private ExamRealtimeService realtimeService;

    @InjectMocks
    private ExamRunnerService service;

    private Examination exam;
    private Student student;
    private UserPrincipal studentPrincipal;
    private UserPrincipal teacherPrincipal;

    @BeforeEach
    void setUp() {
        LocalDateTime now = LocalDateTime.now();

        Classroom classroom = Classroom.builder().name("IX A").build();
        classroom.setId(5L);

        User teacherUser = User.builder().name("Budi").email("budi@sekolah.id").password("x").build();
        teacherUser.setId(20L);
        Teacher teacher = Teacher.builder().user(teacherUser).nip("1987").build();
        teacher.setId(2L);

        User studentUser = User.builder().name("Andi").email("andi@siswa.id").password("x").build();
        studentUser.setId(10L);
        student = Student.builder().user(studentUser).classroom(classroom).nis("2025001").build();
        student.setId(1L);

        exam = Examination.builder()
                .teacher(teacher)
                .classroom(classroom)
                .title("Quiz 1")
                .durationMinutes(60)
                .passingScore(70)
                .startAt(now.minusHours(1))
                .endAt(now.plusHours(2))
                .status(Status.published)
                .build();
        exam.setId(EXAM_ID);

        studentPrincipal = new UserPrincipal(10L, "Andi", "andi@siswa.id", "x", true,
                List.of(new SimpleGrantedAuthority("ROLE_STUDENT")), null, false);
        teacherPrincipal = new UserPrincipal(20L, "Budi", "budi@sekolah.id", "x", true,
                List.of(new SimpleGrantedAuthority("ROLE_TEACHER")), null, false);

        when(examRepository.findById(EXAM_ID)).thenReturn(Optional.of(exam));
        when(studentRepository.findByUserId(10L)).thenReturn(Optional.of(student));
        when(answerRepository.save(any(ExamAnswer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(attemptRepository.save(any(ExamAttempt.class))).thenAnswer(inv -> {
            ExamAttempt attempt = inv.getArgument(0);
            if (attempt.getId() == null) {
                attempt.setId(ATTEMPT_ID + 1);
            }
            return attempt;
        });
    }

    // --- automatic grading on submit -------------------------------------------------------------

    @Test
    void finalizeGradesObjectiveQuestionsAndCompletesAttempt() {
        Question mc = question(1L, QuestionType.multiple_choice, "B", 2);
        Question tf = question(2L, QuestionType.true_false, "true", 1);
        Question shortAnswer = question(3L, QuestionType.short_answer, "Jakarta|DKI Jakarta", 1);
        Question unanswered = question(4L, QuestionType.multiple_choice, "A", 1);
        ExamAttempt attempt = attempt(AttemptStatus.in_progress, LocalDateTime.now().minusMinutes(10));

        ExamAnswer mcAnswer = answer(attempt, mc, "b");
        ExamAnswer tfAnswer = answer(attempt, tf, "false");
        ExamAnswer saAnswer = answer(attempt, shortAnswer, " dki jakarta ");
        stubQuestionsAndAnswers(List.of(mc, tf, shortAnswer, unanswered), List.of(mcAnswer, tfAnswer, saAnswer));

        ExamAttempt result = service.autoFinalizeAttempt(attempt, exam);

        // 2 (mc) + 0 (tf) + 1 (short answer) + 0 (unanswered) of 5 points = 60%, below the passing score of 70
        assertEquals(60, result.getScore());
        assertFalse(result.getPassed());
        assertEquals(AttemptStatus.completed, result.getStatus());
        assertTrue(mcAnswer.getCorrect());
        assertFalse(tfAnswer.getCorrect());
        assertTrue(saAnswer.getCorrect());
        assertEquals(1, saAnswer.getPointsEarned());

        ArgumentCaptor<ExamAnswer> saved = ArgumentCaptor.forClass(ExamAnswer.class);
        verify(answerRepository, atLeastOnce()).save(saved.capture());
        ExamAnswer placeholder = saved.getAllValues().stream()
                .filter(a -> a.getQuestion() == unanswered).findFirst().orElseThrow();
        assertFalse(placeholder.getCorrect());
        assertEquals(0, placeholder.getPointsEarned());
        verify(realtimeService).broadcastExamEvent(any(), any(), any());
    }

    @Test
    void finalizeLeavesEssaysAndShortAnswersWithoutKeyForTheTeacher() {
        Question essay = question(1L, QuestionType.essay, null, 5);
        Question keyless = question(2L, QuestionType.short_answer, "  ", 2);
        ExamAttempt attempt = attempt(AttemptStatus.in_progress, LocalDateTime.now().minusMinutes(10));
        ExamAnswer essayAnswer = answer(attempt, essay, "Photosynthesis converts light into chemical energy.");
        ExamAnswer keylessAnswer = answer(attempt, keyless, "anything");
        stubQuestionsAndAnswers(List.of(essay, keyless), List.of(essayAnswer, keylessAnswer));

        ExamAttempt result = service.autoFinalizeAttempt(attempt, exam);

        assertEquals(AttemptStatus.needs_grading, result.getStatus());
        assertNull(essayAnswer.getCorrect());
        assertNull(keylessAnswer.getCorrect());
        assertEquals(0, result.getScore());
    }

    @Test
    void finalizeDoesNothingForAttemptsThatAreAlreadyFinished() {
        ExamAttempt attempt = attempt(AttemptStatus.completed, LocalDateTime.now().minusMinutes(10));

        ExamAttempt result = service.autoFinalizeAttempt(attempt, exam);

        assertSame(attempt, result);
        verifyNoInteractions(questionRepository, realtimeService);
        verify(attemptRepository, never()).save(any());
    }

    // --- manual grading ------------------------------------------------------------------------

    @Test
    void manualGradingKeepsAttemptPendingUntilEveryEssayIsGraded() {
        Question essay1 = question(1L, QuestionType.essay, null, 4);
        Question essay2 = question(2L, QuestionType.essay, null, 6);
        ExamAttempt attempt = attempt(AttemptStatus.needs_grading, LocalDateTime.now().minusMinutes(30));
        ExamAnswer answer1 = answer(attempt, essay1, "first");
        answer1.setId(11L);
        ExamAnswer answer2 = answer(attempt, essay2, "second");
        answer2.setId(12L);
        stubQuestionsAndAnswers(List.of(essay1, essay2), List.of(answer1, answer2));
        when(attemptRepository.findById(ATTEMPT_ID)).thenReturn(Optional.of(attempt));
        when(answerRepository.findById(11L)).thenReturn(Optional.of(answer1));
        when(answerRepository.findById(12L)).thenReturn(Optional.of(answer2));

        service.gradeEssay(ATTEMPT_ID, 11L, EssayGradingDto.builder().pointsEarned(4).build(), teacherPrincipal);
        assertEquals(AttemptStatus.needs_grading, attempt.getStatus());

        service.gradeEssay(ATTEMPT_ID, 12L, EssayGradingDto.builder().pointsEarned(3).feedback("Add an example").build(), teacherPrincipal);
        assertEquals(AttemptStatus.completed, attempt.getStatus());
        assertEquals(70, attempt.getScore()); // 7 of 10 points
        assertTrue(attempt.getPassed());
        assertEquals("Add an example", answer2.getFeedback());
    }

    @Test
    void manualGradingRejectsPointsAboveTheQuestionMaximum() {
        Question essay = question(1L, QuestionType.essay, null, 4);
        ExamAttempt attempt = attempt(AttemptStatus.needs_grading, LocalDateTime.now().minusMinutes(30));
        ExamAnswer essayAnswer = answer(attempt, essay, "text");
        essayAnswer.setId(11L);
        when(attemptRepository.findById(ATTEMPT_ID)).thenReturn(Optional.of(attempt));
        when(answerRepository.findById(11L)).thenReturn(Optional.of(essayAnswer));

        assertThrows(IllegalArgumentException.class, () -> service.gradeEssay(
                ATTEMPT_ID, 11L, EssayGradingDto.builder().pointsEarned(5).build(), teacherPrincipal));
    }

    @Test
    void manualGradingRejectsAutoGradedQuestions() {
        Question mc = question(1L, QuestionType.multiple_choice, "A", 1);
        ExamAttempt attempt = attempt(AttemptStatus.needs_grading, LocalDateTime.now().minusMinutes(30));
        ExamAnswer mcAnswer = answer(attempt, mc, "A");
        mcAnswer.setId(11L);
        when(attemptRepository.findById(ATTEMPT_ID)).thenReturn(Optional.of(attempt));
        when(answerRepository.findById(11L)).thenReturn(Optional.of(mcAnswer));

        assertThrows(IllegalArgumentException.class, () -> service.gradeEssay(
                ATTEMPT_ID, 11L, EssayGradingDto.builder().pointsEarned(1).build(), teacherPrincipal));
    }

    // --- timing ------------------------------------------------------------------------------------

    @Test
    void savingAnAnswerAfterTheDeadlineFinalizesTheAttempt() {
        ExamAttempt attempt = attempt(AttemptStatus.in_progress, LocalDateTime.now().minusMinutes(61));
        when(attemptRepository.findById(ATTEMPT_ID)).thenReturn(Optional.of(attempt));
        stubQuestionsAndAnswers(List.of(), List.of());

        SubmitAnswerRequest request = SubmitAnswerRequest.builder().questionId(1L).answerText("A").build();

        assertThrows(AttemptExpiredException.class, () -> service.saveAnswer(ATTEMPT_ID, request, studentPrincipal));
        assertEquals(AttemptStatus.completed, attempt.getStatus());
        verify(questionRepository, never()).findById(anyLong());
    }

    @Test
    void backgroundFinalizerOnlyFinalizesExpiredInProgressAttempts() {
        ExamAttempt running = attempt(AttemptStatus.in_progress, LocalDateTime.now().minusMinutes(5));
        when(attemptRepository.findById(ATTEMPT_ID)).thenReturn(Optional.of(running));
        assertFalse(service.finalizeIfExpired(ATTEMPT_ID));
        assertEquals(AttemptStatus.in_progress, running.getStatus());

        ExamAttempt expired = attempt(AttemptStatus.in_progress, LocalDateTime.now().minusMinutes(90));
        when(attemptRepository.findById(ATTEMPT_ID)).thenReturn(Optional.of(expired));
        stubQuestionsAndAnswers(List.of(), List.of());
        assertTrue(service.finalizeIfExpired(ATTEMPT_ID));
        assertEquals(AttemptStatus.completed, expired.getStatus());
    }

    // --- starting and retrying -------------------------------------------------------------------

    @Test
    void startRejectsAFinishedAttemptWhenRetriesAreNotAllowed() {
        ExamAttempt awaitingGrades = attempt(AttemptStatus.needs_grading, LocalDateTime.now().minusMinutes(30));
        when(attemptRepository.findFirstByExaminationIdAndStudentIdOrderByAttemptNumberDesc(EXAM_ID, 1L))
                .thenReturn(Optional.of(awaitingGrades));

        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> service.startOrResumeAttempt(EXAM_ID, studentPrincipal));
        assertTrue(error.getMessage().contains("already completed"));
        verify(attemptRepository, never()).save(any());
    }

    @Test
    void startCreatesTheNextAttemptNumberWhenRetriesAreAllowed() {
        exam.setAllowRetry(true);
        ExamAttempt first = attempt(AttemptStatus.completed, LocalDateTime.now().minusMinutes(30));
        when(attemptRepository.findFirstByExaminationIdAndStudentIdOrderByAttemptNumberDesc(EXAM_ID, 1L))
                .thenReturn(Optional.of(first));
        when(questionRepository.findByExaminationIdOrderByIdAsc(EXAM_ID)).thenReturn(new ArrayList<>());

        service.startOrResumeAttempt(EXAM_ID, studentPrincipal);

        ArgumentCaptor<ExamAttempt> created = ArgumentCaptor.forClass(ExamAttempt.class);
        verify(attemptRepository).save(created.capture());
        assertEquals(2, created.getValue().getAttemptNumber());
        assertEquals(AttemptStatus.in_progress, created.getValue().getStatus());
    }

    // --- helpers ---------------------------------------------------------------------------------

    private Question question(long id, QuestionType type, String correctAnswer, int points) {
        Question question = Question.builder()
                .examination(exam)
                .questionText("Question " + id)
                .questionType(type)
                .correctAnswer(correctAnswer)
                .points(points)
                .build();
        question.setId(id);
        return question;
    }

    private ExamAttempt attempt(AttemptStatus status, LocalDateTime startedAt) {
        ExamAttempt attempt = ExamAttempt.builder()
                .examination(exam)
                .student(student)
                .attemptNumber(1)
                .status(status)
                .startedAt(startedAt)
                .build();
        attempt.setId(ATTEMPT_ID);
        return attempt;
    }

    private ExamAnswer answer(ExamAttempt attempt, Question question, String text) {
        return ExamAnswer.builder().examAttempt(attempt).question(question).answerText(text).build();
    }

    private void stubQuestionsAndAnswers(List<Question> questions, List<ExamAnswer> answers) {
        when(questionRepository.findByExaminationIdOrderByIdAsc(EXAM_ID)).thenReturn(new ArrayList<>(questions));
        when(answerRepository.findByExamAttemptId(ATTEMPT_ID)).thenReturn(new ArrayList<>(answers));
    }
}
