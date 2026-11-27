-- V6: keep showing results for the exams that exist today.
--
-- Until this version the show_result flag was stored but never applied: students always saw their
-- score. The backend now hides the score of exams with show_result = FALSE, so existing exams are
-- switched on to keep behaving as they did. Teachers can turn it off per exam in the exam form.

UPDATE examinations SET show_result = TRUE WHERE show_result = FALSE;
