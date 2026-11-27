-- V4: repair question options stored as a JSON object instead of a JSON array.
--
-- Question.options is mapped as List<String> and the grader compares the chosen option's text with
-- correct_answer. Older versions of seed_demo_data.sql inserted options as {"A": "10", "B": "20", ...},
-- which Jackson cannot read as a list: opening those exams in the editor or starting them failed with 500.
--
-- The application itself always writes arrays, so only rows from the old seed are touched. Keys are
-- option letters (A..E) or "Benar"/"Salah", so ordering by key keeps the original option order.
-- Running it on a database without such rows changes nothing.

UPDATE questions
SET options = COALESCE(
        (SELECT jsonb_agg(entry.value ORDER BY entry.key) FROM jsonb_each(questions.options) AS entry),
        '[]'::jsonb)
WHERE jsonb_typeof(options) = 'object';
