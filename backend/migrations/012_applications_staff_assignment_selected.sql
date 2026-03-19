-- 012_applications_staff_assignment_selected.sql
-- Menyimpan lamaran mana yang dipilih sebagai penugasan staff utama.

ALTER TABLE applications
  ADD COLUMN staff_assignment_selected TINYINT(1) NOT NULL DEFAULT 0 AFTER hired_at;

CREATE INDEX applications_user_staff_assignment_idx
  ON applications (user_id, staff_assignment_selected);
