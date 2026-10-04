-- Seed demo users, teachers, students, classrooms, subjects, announcements, materials, assignments, exams
DO $$
DECLARE
    v_admin_pwd TEXT := '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; -- 'password'
    v_budi_id BIGINT;
    v_siti_id BIGINT;
    v_andi_id BIGINT;
    v_dewi_id BIGINT;
    v_budi_teacher_id BIGINT;
    v_siti_teacher_id BIGINT;
    v_class_x1 BIGINT;
    v_class_x2 BIGINT;
    v_class_xi1 BIGINT;
    v_subj_mtk BIGINT;
    v_subj_bin BIGINT;
    v_subj_pwb BIGINT;
    v_exam1 BIGINT;
    v_exam2 BIGINT;
BEGIN
    -- Update existing admin or insert admin@sekolah.id
    UPDATE users SET email = 'admin@sekolah.id' WHERE id = 1;
    INSERT INTO users (name, email, password, is_active)
    VALUES ('Administrator', 'admin@elearning.com', v_admin_pwd, TRUE)
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, 1 FROM users u WHERE u.email = 'admin@elearning.com'
    ON CONFLICT DO NOTHING;

    -- Teachers
    INSERT INTO users (name, email, password, is_active)
    VALUES ('Budi Santoso, M.Pd.', 'budi@sekolah.id', v_admin_pwd, TRUE)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_budi_id;

    INSERT INTO user_roles (user_id, role_id) VALUES (v_budi_id, 2) ON CONFLICT DO NOTHING;

    INSERT INTO teachers (user_id, nip, address)
    VALUES (v_budi_id, '198501012010011001', 'Jl. Merdeka No. 45, Jakarta')
    ON CONFLICT (user_id) DO UPDATE SET nip = EXCLUDED.nip
    RETURNING id INTO v_budi_teacher_id;

    -- Teacher alias teacher@elearning.com
    INSERT INTO users (name, email, password, is_active)
    VALUES ('Budi Santoso, M.Pd.', 'teacher@elearning.com', v_admin_pwd, TRUE)
    ON CONFLICT (email) DO NOTHING;
    INSERT INTO user_roles (user_id, role_id)
    SELECT id, 2 FROM users WHERE email = 'teacher@elearning.com' ON CONFLICT DO NOTHING;

    INSERT INTO users (name, email, password, is_active)
    VALUES ('Siti Nurhaliza, S.Pd.', 'siti@sekolah.id', v_admin_pwd, TRUE)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_siti_id;

    INSERT INTO user_roles (user_id, role_id) VALUES (v_siti_id, 2) ON CONFLICT DO NOTHING;

    INSERT INTO teachers (user_id, nip, address)
    VALUES (v_siti_id, '198703152011012002', 'Jl. Diponegoro No. 12, Bandung')
    ON CONFLICT (user_id) DO UPDATE SET nip = EXCLUDED.nip
    RETURNING id INTO v_siti_teacher_id;

    -- Classrooms
    INSERT INTO classrooms (name, level, capacity, academic_year, homeroom_teacher_id)
    VALUES ('X IPA 1', 10, 36, '2026/2027', v_budi_teacher_id)
    RETURNING id INTO v_class_x1;

    INSERT INTO classrooms (name, level, capacity, academic_year, homeroom_teacher_id)
    VALUES ('X IPA 2', 10, 36, '2026/2027', v_siti_teacher_id)
    RETURNING id INTO v_class_x2;

    INSERT INTO classrooms (name, level, capacity, academic_year)
    VALUES ('XI IPA 1', 11, 36, '2026/2027')
    RETURNING id INTO v_class_xi1;

    INSERT INTO classrooms (name, level, capacity, academic_year)
    VALUES ('XII IPA 1', 12, 36, '2026/2027');

    -- Students
    INSERT INTO users (name, email, password, is_active)
    VALUES ('Andi Pratama', 'andi.pratama1@siswa.id', v_admin_pwd, TRUE)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_andi_id;

    INSERT INTO user_roles (user_id, role_id) VALUES (v_andi_id, 3) ON CONFLICT DO NOTHING;

    INSERT INTO students (user_id, classroom_id, nis, nisn, gender, address)
    VALUES (v_andi_id, v_class_x1, '20250001', '0012345678', 'L', 'Jl. Mawar No. 10')
    ON CONFLICT (user_id) DO UPDATE SET nis = EXCLUDED.nis;

    -- Student alias student@elearning.com
    INSERT INTO users (name, email, password, is_active)
    VALUES ('Andi Pratama', 'student@elearning.com', v_admin_pwd, TRUE)
    ON CONFLICT (email) DO NOTHING;
    INSERT INTO user_roles (user_id, role_id)
    SELECT id, 3 FROM users WHERE email = 'student@elearning.com' ON CONFLICT DO NOTHING;

    INSERT INTO users (name, email, password, is_active)
    VALUES ('Dewi Lestari', 'dewi.lestari@siswa.id', v_admin_pwd, TRUE)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_dewi_id;

    INSERT INTO user_roles (user_id, role_id) VALUES (v_dewi_id, 3) ON CONFLICT DO NOTHING;

    INSERT INTO students (user_id, classroom_id, nis, nisn, gender, address)
    VALUES (v_dewi_id, v_class_x1, '20250002', '0012345679', 'P', 'Jl. Melati No. 5')
    ON CONFLICT (user_id) DO UPDATE SET nis = EXCLUDED.nis;

    -- Subjects
    INSERT INTO subjects (name, code, description, teacher_id, credits)
    VALUES ('Matematika Wajib', 'MTK-10', 'Aljabar, Trigonometri, dan Kalkulus Dasar', v_budi_teacher_id, 3)
    RETURNING id INTO v_subj_mtk;

    INSERT INTO subjects (name, code, description, teacher_id, credits)
    VALUES ('Bahasa Indonesia', 'BIN-10', 'Tata Bahasa, Resensi Karya, dan Penulisan Ilmiah', v_siti_teacher_id, 2)
    RETURNING id INTO v_subj_bin;

    INSERT INTO subjects (name, code, description, teacher_id, credits)
    VALUES ('Pemrograman Web & Java', 'PWB-11', 'Arsitektur Spring Boot, React, dan API RESTful', v_budi_teacher_id, 4)
    RETURNING id INTO v_subj_pwb;

    INSERT INTO subjects (name, code, description, teacher_id, credits)
    VALUES ('Fisika Dasar', 'FIS-10', 'Mekanika Klasik dan Termodinamika', v_budi_teacher_id, 3);

    -- Announcements
    INSERT INTO announcements (title, content, target, is_published)
    VALUES 
    ('Jadwal Penilaian Akhir Semester (PAS) Ganjil 2026/2027', 'Seluruh peserta didik diwajibkan membawa kartu peserta ujian CBT resmi yang telah dicetak melalui portal siswa.', 'all', TRUE),
    ('Rapat Koordinasi Dewan Guru & Verifikasi Bank Soal', 'Bapak/Ibu guru diharapkan menyelesaikan input kisi-kisi dan butir soal ujian pada modul Bank Soal sebelum tanggal 10 Oktober 2026.', 'teacher', TRUE),
    ('Panduan Ujian CBT Online & Anti-Cheat System', 'Pastikan menggunakan browser Chrome versi terbaru dan mengaktifkan izin fullscreen saat mengerjakan ujian CBT.', 'student', TRUE);

    -- Learning Materials
    INSERT INTO learning_materials (teacher_id, subject_id, classroom_id, title, description, type, content, is_published)
    VALUES 
    (v_budi_teacher_id, v_subj_mtk, v_class_x1, 'Modul 1: Matriks & Sistem Persamaan Linier', 'Pembahasan lengkap operasi matriks, invers, dan determinan.', 'document', 'Materi ini membahas dasar-dasar matriks dan operasinya.', TRUE),
    (v_budi_teacher_id, v_subj_pwb, v_class_x1, 'Video Tutorial: Membangun REST API Spring Boot 3 & React', 'Panduan pembuatan sistem decoupled high-concurrency.', 'video', 'https://www.youtube.com/watch?v=example', TRUE),
    (v_siti_teacher_id, v_subj_bin, v_class_x1, 'Artikel: Kaidah Penulisan Esai Argumentatif', 'Pedoman struktur esai, tata bahasa baku, dan kutipan.', 'text', 'Teks panduan penulisan esai argumentatif akademik.', TRUE);

    -- Assignments
    INSERT INTO assignments (teacher_id, subject_id, classroom_id, title, description, instructions, max_score, due_date, status)
    VALUES
    (v_budi_teacher_id, v_subj_pwb, v_class_x1, 'Tugas Mandiri 1: Implementasi REST Controller', 'Membuat endpoint CRUD menggunakan Spring Data JPA dan PostgreSQL.', 'Kumpulkan link repository GitHub dan dokumen ringkasan PDF.', 100, CURRENT_TIMESTAMP + INTERVAL '7 days', 'published'),
    (v_budi_teacher_id, v_subj_mtk, v_class_x1, 'Latihan Soal Matriks dan Vektor Ruang', 'Kerjakan soal latihan halaman 45-50 buku pegangan siswa.', 'Tulis tangan jawaban di kertas folio lalu unggah foto/scan PDF.', 100, CURRENT_TIMESTAMP + INTERVAL '5 days', 'published');

    -- Examinations
    INSERT INTO examinations (teacher_id, subject_id, classroom_id, title, description, type, duration_minutes, passing_score, start_at, end_at, total_questions, status, shuffle_questions, shuffle_options)
    VALUES
    (v_budi_teacher_id, v_subj_mtk, v_class_x1, 'Penilaian Akhir Semester (PAS) Matematika Wajib', 'Ujian CBT terintegrasi proctoring anti-cheat', 'uas', 90, 75, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '30 days', 5, 'published', TRUE, TRUE)
    RETURNING id INTO v_exam1;

    INSERT INTO examinations (teacher_id, subject_id, classroom_id, title, description, type, duration_minutes, passing_score, start_at, end_at, total_questions, status, shuffle_questions, shuffle_options)
    VALUES
    (v_budi_teacher_id, v_subj_pwb, v_class_x1, 'Ujian Harian: Pemrograman Web & Java 21', 'Kuis pemahaman konsep OOP, Spring Beans, dan React Hooks', 'quiz', 60, 75, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '30 days', 3, 'published', TRUE, TRUE)
    RETURNING id INTO v_exam2;

    -- Questions
    INSERT INTO questions (examination_id, question_text, question_type, options, correct_answer, points)
    VALUES
    (v_exam1, 'Jika matriks A berordo 2x2 memiliki determinan 5, maka nilai dari determinan 2A adalah...', 'multiple_choice', '{"A": "10", "B": "20", "C": "25", "D": "40", "E": "50"}'::jsonb, '20', 20),
    (v_exam1, 'Dua garis sejajar memiliki gradien yang sama besar.', 'true_false', '{"Benar": "Benar", "Salah": "Salah"}'::jsonb, 'Benar', 20),
    (v_exam1, 'Jelaskan konsep invers matriks dan sebutkan syarat sebuah matriks memiliki invers!', 'essay', NULL, 'Matriks memiliki invers jika determinan != 0 (non-singular).', 60),

    (v_exam2, 'Anotasi Spring Boot yang digunakan untuk menandai kelas sebagai REST Controller adalah...', 'multiple_choice', '{"A": "@Controller", "B": "@RestController", "C": "@Service", "D": "@Component", "E": "@Endpoint"}'::jsonb, '@RestController', 30),
    (v_exam2, 'React hook apa yang digunakan untuk mengelola efek samping seperti data fetching?', 'multiple_choice', '{"A": "useState", "B": "useEffect", "C": "useMemo", "D": "useContext", "E": "useRef"}'::jsonb, 'useEffect', 30),
    (v_exam2, 'Jelaskan perbedaan synchronous dan asynchronous dalam konteks pemrosesan Web API!', 'essay', NULL, 'Synchronous blocking, asynchronous non-blocking.', 40);

    -- Exam Attempt
    INSERT INTO exam_attempts (examination_id, student_id, attempt_number, score, is_passed, violations, status, started_at, finished_at)
    SELECT v_exam1, s.id, 1, 88, TRUE, 0, 'completed', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour'
    FROM students s WHERE s.user_id = v_andi_id;

END $$;
