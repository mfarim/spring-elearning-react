-- V3: exam attempt integrity and background finalization support.

-- 1) Renumber attempts per (exam, student) in start order, so the unique key below can be added
--    even if earlier concurrent "start" requests created duplicate attempt numbers. No rows are deleted.
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY examination_id, student_id ORDER BY started_at, id) AS rn
    FROM exam_attempts
)
UPDATE exam_attempts a
SET attempt_number = r.rn
FROM ranked r
WHERE a.id = r.id
  AND a.attempt_number <> r.rn;

-- 2) One row per attempt number: two simultaneous "start" requests can no longer create two attempts.
ALTER TABLE exam_attempts
    ADD CONSTRAINT uq_exam_attempt_number UNIQUE (examination_id, student_id, attempt_number);

-- 3) Optimistic locking: a student's submit and the background finalizer cannot both grade an attempt.
ALTER TABLE exam_attempts
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

-- 4) The finalizer looks up in-progress attempts every minute.
CREATE INDEX idx_exam_attempts_in_progress
    ON exam_attempts (examination_id)
    WHERE status = 'in_progress';
