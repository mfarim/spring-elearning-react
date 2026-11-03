-- Security hardening: force rotation of default / admin-assigned passwords.
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Every account still using the publicly documented default password ("password")
-- must choose a new one on next login (ignored when APP_DEMO_MODE=true).
UPDATE users
SET must_change_password = TRUE
WHERE password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
