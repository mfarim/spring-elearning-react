package com.elearning.modules.exam.service;

import com.elearning.common.enums.QuestionType;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Locale;

/**
 * Pure grading rules for exam answers. Free of Spring and JPA so the rules can be unit tested directly.
 */
public final class AnswerGrader {

    /** Separates alternative accepted answers in a short-answer key, e.g. {@code "Jakarta|DKI Jakarta"}. */
    public static final String ALTERNATIVE_SEPARATOR = "|";

    private AnswerGrader() {
    }

    /**
     * Whether an answer to this question is graded automatically on submit.
     * Short answers need a non-blank key; essays (and short answers without a key) are graded by the teacher.
     */
    public static boolean isAutoGraded(QuestionType type, String correctAnswer) {
        return switch (type) {
            case multiple_choice, true_false -> true;
            case short_answer -> correctAnswer != null && !correctAnswer.isBlank();
            case essay -> false;
        };
    }

    /** Whether the given answer matches the key for an auto-graded question. */
    public static boolean isCorrect(QuestionType type, String answer, String correctAnswer) {
        if (answer == null || correctAnswer == null) {
            return false;
        }
        return switch (type) {
            case multiple_choice, true_false -> answer.trim().equalsIgnoreCase(correctAnswer.trim());
            case short_answer -> {
                String given = normalize(answer);
                yield !given.isEmpty() && Arrays.stream(correctAnswer.split("\\|"))
                        .map(AnswerGrader::normalize)
                        .filter(accepted -> !accepted.isEmpty())
                        .anyMatch(given::equals);
            }
            case essay -> false;
        };
    }

    /**
     * Normalizes free text for comparison: removes accents, lower-cases, collapses whitespace,
     * and drops punctuation at both ends ("  Jakarta. " and "jakarta" are equal).
     */
    public static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String text = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        text = text.toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
        return text.replaceAll("^[\\p{Punct}\\s]+|[\\p{Punct}\\s]+$", "");
    }

    /** Score from 0 to 100, rounded down; 0 when the exam has no points. */
    public static int scorePercent(int earnedPoints, int possiblePoints) {
        return possiblePoints > 0 ? (earnedPoints * 100) / possiblePoints : 0;
    }
}
