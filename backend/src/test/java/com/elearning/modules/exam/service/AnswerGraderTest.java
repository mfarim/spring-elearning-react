package com.elearning.modules.exam.service;

import com.elearning.common.enums.QuestionType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AnswerGraderTest {

    @Test
    void multipleChoiceIgnoresCaseAndSurroundingSpaces() {
        assertTrue(AnswerGrader.isCorrect(QuestionType.multiple_choice, " b ", "B"));
        assertFalse(AnswerGrader.isCorrect(QuestionType.multiple_choice, "A", "B"));
    }

    @Test
    void shortAnswerAcceptsAnyAlternativeAfterNormalization() {
        String key = "Jakarta|DKI Jakarta";
        assertTrue(AnswerGrader.isCorrect(QuestionType.short_answer, "  Jakarta. ", key));
        assertTrue(AnswerGrader.isCorrect(QuestionType.short_answer, "dki   JAKARTA", key));
        assertTrue(AnswerGrader.isCorrect(QuestionType.short_answer, "Bogotá", "Bogota"));
        assertFalse(AnswerGrader.isCorrect(QuestionType.short_answer, "Bandung", key));
    }

    @Test
    void shortAnswerRejectsEmptyAnswersAndEmptyKeyParts() {
        assertFalse(AnswerGrader.isCorrect(QuestionType.short_answer, "...", "Jakarta"));
        assertFalse(AnswerGrader.isCorrect(QuestionType.short_answer, "", "|"));
    }

    @Test
    void essaysAndMissingAnswersAreNeverAutoCorrect() {
        assertFalse(AnswerGrader.isCorrect(QuestionType.essay, "same", "same"));
        assertFalse(AnswerGrader.isCorrect(QuestionType.true_false, null, "true"));
    }

    @Test
    void onlyKeyedQuestionsAreAutoGraded() {
        assertTrue(AnswerGrader.isAutoGraded(QuestionType.multiple_choice, null));
        assertTrue(AnswerGrader.isAutoGraded(QuestionType.short_answer, "Jakarta"));
        assertFalse(AnswerGrader.isAutoGraded(QuestionType.short_answer, "   "));
        assertFalse(AnswerGrader.isAutoGraded(QuestionType.essay, "anything"));
    }

    @Test
    void scoreIsRoundedDownPercentage() {
        assertEquals(66, AnswerGrader.scorePercent(2, 3));
        assertEquals(100, AnswerGrader.scorePercent(5, 5));
        assertEquals(0, AnswerGrader.scorePercent(0, 0));
    }
}
