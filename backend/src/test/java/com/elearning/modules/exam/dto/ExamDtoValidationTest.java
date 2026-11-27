package com.elearning.modules.exam.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/** Schedule rules of an exam: the window must be open, and the duration must fit inside it. */
class ExamDtoValidationTest {

    private static final LocalDateTime START = LocalDateTime.of(2026, 12, 1, 7, 0);

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    /** 60 minutes inside a two-hour window. */
    private static ExamDto.ExamDtoBuilder validExam() {
        return ExamDto.builder()
                .subjectId(1L)
                .classroomId(1L)
                .title("Ujian Harian")
                .durationMinutes(60)
                .startAt(START)
                .endAt(START.plusHours(2));
    }

    private static Set<String> violatedProperties(ExamDto dto) {
        return validator.validate(dto).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    @Test
    void acceptsADurationThatFitsTheWindow() {
        assertThat(violatedProperties(validExam().build())).isEmpty();
    }

    @Test
    void acceptsADurationThatFillsTheWholeWindow() {
        assertThat(violatedProperties(validExam().durationMinutes(120).build())).isEmpty();
    }

    @Test
    void rejectsAnEndTimeBeforeTheStartTime() {
        ExamDto dto = validExam().endAt(START.minusMinutes(1)).build();

        assertThat(violatedProperties(dto)).containsExactly("endAfterStart");
    }

    @Test
    void rejectsAnEndTimeEqualToTheStartTime() {
        ExamDto dto = validExam().endAt(START).build();

        assertThat(violatedProperties(dto)).containsExactly("endAfterStart");
    }

    @Test
    void rejectsADurationLongerThanTheWindow() {
        ExamDto dto = validExam().durationMinutes(121).build();

        assertThat(violatedProperties(dto)).containsExactly("durationWithinWindow");
    }

    @Test
    void reportsMissingTimesOnlyAsMissing() {
        ExamDto dto = validExam().startAt(null).endAt(null).build();

        assertThat(violatedProperties(dto)).containsExactlyInAnyOrder("startAt", "endAt");
    }

    @Test
    void rejectsAPassingScoreAbove100() {
        ExamDto dto = validExam().passingScore(101).build();

        assertThat(violatedProperties(dto)).containsExactly("passingScore");
    }
}
