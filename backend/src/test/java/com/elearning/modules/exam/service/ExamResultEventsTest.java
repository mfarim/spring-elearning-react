package com.elearning.modules.exam.service;

import com.elearning.common.outbox.OutboxEventRepository;
import com.elearning.modules.exam.entity.ExamAttempt;
import com.elearning.modules.exam.entity.Examination;
import com.elearning.modules.user.entity.Student;
import com.elearning.modules.user.entity.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class ExamResultEventsTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private OutboxEventRepository outbox;
    private ExamAttempt attempt;
    private Examination exam;

    @BeforeEach
    void setUp() {
        outbox = mock(OutboxEventRepository.class);

        User user = User.builder().name("Andi").email("andi@siswa.id").password("x").build();
        Student student = Student.builder().user(user).nis("2025001").build();
        exam = Examination.builder().title("Quiz 1").passingScore(70).build();
        exam.setId(100L);
        attempt = ExamAttempt.builder()
                .examination(exam)
                .student(student)
                .score(85)
                .passed(true)
                .finishedAt(LocalDateTime.of(2026, 11, 15, 10, 30))
                .build();
        attempt.setId(500L);
    }

    @Test
    void doesNothingWhenNotificationsAreDisabled() {
        new ExamResultEvents(outbox, objectMapper, false).resultReady(attempt);

        verifyNoInteractions(outbox);
    }

    @Test
    void includesTheScoreWhenTheExamShowsResults() throws Exception {
        exam.setShowResult(true);

        JsonNode payload = record();

        assertEquals("andi@siswa.id", payload.get("studentEmail").asText());
        assertEquals("Quiz 1", payload.get("examTitle").asText());
        assertTrue(payload.get("showScore").asBoolean());
        assertEquals(85, payload.get("score").asInt());
        assertTrue(payload.get("passed").asBoolean());
        assertEquals(70, payload.get("passingScore").asInt());
    }

    @Test
    void leavesTheScoreOutWhenTheTeacherHidesResults() throws Exception {
        exam.setShowResult(false);

        JsonNode payload = record();

        assertFalse(payload.get("showScore").asBoolean());
        assertFalse(payload.has("score"));
        assertFalse(payload.has("passed"));
    }

    private JsonNode record() throws Exception {
        new ExamResultEvents(outbox, objectMapper, true).resultReady(attempt);

        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(outbox).insertIfAbsent(eq(ExamResultEvents.RESULT_READY), eq(500L), payload.capture());
        return objectMapper.readTree(payload.getValue());
    }
}
