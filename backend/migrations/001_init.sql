-- 001_init.sql: initial schema

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(255) NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL DEFAULT 'Staff',
  division VARCHAR(255) NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'Active',
  registered_at DATE NULL,
  inactive_at DATE NULL,
  last_login_at TIMESTAMP NULL,
  email_verified_at TIMESTAMP NULL,
  password VARCHAR(255) NOT NULL,
  remember_token VARCHAR(100) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY users_email_unique (email),
  INDEX users_role_idx (role),
  INDEX users_division_idx (division)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departemen (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  kode VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(255) NULL,
  position VARCHAR(255) NOT NULL,
  division VARCHAR(255) NULL,
  education VARCHAR(255) NULL,
  experience VARCHAR(255) NULL,
  skills TEXT NULL,
  cv_file VARCHAR(255) NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'Applied',
  rejection_reason TEXT NULL,
  notes TEXT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  interview_date DATE NULL,
  interview_time TIME NULL,
  interview_end_time TIME NULL,
  interview_mode VARCHAR(255) NULL,
  interviewer_name VARCHAR(255) NULL,
  meeting_link VARCHAR(255) NULL,
  interview_notes TEXT NULL,
  screening_at TIMESTAMP NULL,
  interview_at TIMESTAMP NULL,
  offering_at TIMESTAMP NULL,
  hired_at TIMESTAMP NULL,
  staff_assignment_selected TINYINT(1) NOT NULL DEFAULT 0,
  rejected_at TIMESTAMP NULL,
  INDEX applications_user_id_idx (user_id),
  INDEX applications_user_staff_assignment_idx (user_id, staff_assignment_selected),
  CONSTRAINT applications_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applicant_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  full_name VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(255) NULL,
  date_of_birth DATE NULL,
  gender VARCHAR(255) NULL,
  religion VARCHAR(255) NULL,
  address TEXT NULL,
  domicile_address TEXT NULL,
  city VARCHAR(255) NULL,
  province VARCHAR(255) NULL,
  profile_photo_path VARCHAR(255) NULL,
  educations JSON NULL,
  experiences JSON NULL,
  certifications JSON NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY applicant_profiles_user_id_unique (user_id),
  CONSTRAINT applicant_profiles_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  phone VARCHAR(255) NULL,
  date_of_birth DATE NULL,
  religion VARCHAR(255) NULL,
  gender VARCHAR(255) NULL,
  address TEXT NULL,
  domicile_address TEXT NULL,
  city VARCHAR(255) NULL,
  province VARCHAR(255) NULL,
  education_level VARCHAR(255) NULL,
  educations JSON NULL,
  profile_photo_path VARCHAR(255) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY staff_profiles_user_id_unique (user_id),
  CONSTRAINT staff_profiles_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_terminations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(255) NOT NULL,
  user_id INT UNSIGNED NULL,
  requested_by INT UNSIGNED NULL,
  employee_code VARCHAR(255) NULL,
  employee_name VARCHAR(255) NOT NULL,
  division VARCHAR(255) NULL,
  position VARCHAR(255) NULL,
  type ENUM('Resign','PHK','Pensiun') NOT NULL DEFAULT 'Resign',
  reason TEXT NULL,
  suggestion TEXT NULL,
  request_date DATE NULL,
  effective_date DATE NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'Diajukan',
  progress TINYINT NOT NULL DEFAULT 0,
  checklist JSON NULL,
  exit_interview_at TIMESTAMP NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX staff_terminations_user_id_idx (user_id),
  INDEX staff_terminations_requested_by_idx (requested_by),
  CONSTRAINT staff_terminations_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT staff_terminations_requested_by_foreign FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaints (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_code VARCHAR(255) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  handled_by_id INT UNSIGNED NULL,
  category VARCHAR(150) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
  attachment_path VARCHAR(255) NULL,
  attachment_name VARCHAR(255) NULL,
  attachment_mime VARCHAR(255) NULL,
  attachment_size INT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  resolution_notes TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX complaints_user_id_idx (user_id),
  INDEX complaints_handled_by_id_idx (handled_by_id),
  CONSTRAINT complaints_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT complaints_handled_by_id_foreign FOREIGN KEY (handled_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT UNSIGNED NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_mime VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX complaint_attachments_complaint_id_idx (complaint_id),
  CONSTRAINT complaint_attachments_complaint_id_foreign
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS letter_templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  template_content LONGTEXT NULL,
  header_text TEXT NULL,
  footer_text TEXT NULL,
  logo_path VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX letter_templates_created_by_idx (created_by),
  CONSTRAINT letter_templates_created_by_foreign FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS division_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  manager_name VARCHAR(255) NULL,
  capacity INT NOT NULL DEFAULT 0,
  is_hiring TINYINT(1) NOT NULL DEFAULT 0,
  job_title VARCHAR(255) NULL,
  job_description TEXT NULL,
  job_requirements JSON NULL,
  job_eligibility_criteria JSON NULL,
  hiring_opened_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS surat (
  surat_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  departemen_id INT UNSIGNED NULL,
  nomor_surat VARCHAR(255) NOT NULL,
  tipe_surat VARCHAR(255) NOT NULL DEFAULT 'keluar',
  jenis_surat VARCHAR(255) NOT NULL,
  tanggal_surat DATE NOT NULL,
  perihal VARCHAR(255) NOT NULL,
  isi_surat TEXT NOT NULL,
  status_persetujuan VARCHAR(255) NOT NULL DEFAULT 'Terkirim',
  tanggal_persetujuan DATE NULL,
  kategori VARCHAR(255) NOT NULL DEFAULT 'Internal',
  prioritas VARCHAR(255) NOT NULL DEFAULT 'medium',
  penerima VARCHAR(255) NOT NULL,
  target_division VARCHAR(255) NULL,
  previous_division VARCHAR(255) NULL,
  current_recipient ENUM('hr','division','archive') NOT NULL DEFAULT 'hr',
  disposed_by INT UNSIGNED NULL,
  disposed_at TIMESTAMP NULL,
  disposition_note TEXT NULL,
  is_finalized TINYINT(1) NOT NULL DEFAULT 0,
  disposition_document_path VARCHAR(255) NULL,
  disposition_document_name VARCHAR(255) NULL,
  reply_note TEXT NULL,
  reply_by INT UNSIGNED NULL,
  reply_at TIMESTAMP NULL,
  alamat_pengirim TEXT NULL,
  lampiran_path VARCHAR(255) NULL,
  lampiran_nama VARCHAR(255) NULL,
  lampiran_mime VARCHAR(255) NULL,
  lampiran_size INT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX surat_user_id_idx (user_id),
  INDEX surat_departemen_id_idx (departemen_id),
  INDEX surat_disposed_by_idx (disposed_by),
  INDEX surat_reply_by_idx (reply_by),
  CONSTRAINT surat_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT surat_departemen_id_foreign FOREIGN KEY (departemen_id) REFERENCES departemen(id) ON DELETE SET NULL,
  CONSTRAINT surat_disposed_by_foreign FOREIGN KEY (disposed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT surat_reply_by_foreign FOREIGN KEY (reply_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS surat_reply_histories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  surat_id INT UNSIGNED NOT NULL,
  replied_by INT UNSIGNED NULL,
  from_division VARCHAR(255) NULL,
  to_division VARCHAR(255) NULL,
  note TEXT NOT NULL,
  lampiran_path VARCHAR(255) NULL,
  lampiran_nama VARCHAR(255) NULL,
  lampiran_mime VARCHAR(255) NULL,
  lampiran_size INT NULL,
  replied_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX surat_reply_histories_surat_id_idx (surat_id),
  INDEX surat_reply_histories_replied_by_idx (replied_by),
  CONSTRAINT surat_reply_histories_surat_id_foreign FOREIGN KEY (surat_id) REFERENCES surat(surat_id) ON DELETE CASCADE,
  CONSTRAINT surat_reply_histories_replied_by_foreign FOREIGN KEY (replied_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS onboarding_checklists (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id INT UNSIGNED NOT NULL,
  contract_signed TINYINT(1) NOT NULL DEFAULT 0,
  inventory_handover TINYINT(1) NOT NULL DEFAULT 0,
  training_orientation TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY onboarding_checklists_application_id_unique (application_id),
  INDEX onboarding_checklists_application_id_idx (application_id),
  CONSTRAINT onboarding_checklists_application_id_foreign FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  email VARCHAR(255) NOT NULL PRIMARY KEY,
  token VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  payload LONGTEXT NOT NULL,
  last_activity INT NOT NULL,
  INDEX sessions_user_id_idx (user_id),
  CONSTRAINT sessions_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cache (
  `key` VARCHAR(255) NOT NULL PRIMARY KEY,
  `value` MEDIUMTEXT NOT NULL,
  expiration INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cache_locks (
  `key` VARCHAR(255) NOT NULL PRIMARY KEY,
  `owner` VARCHAR(255) NOT NULL,
  expiration INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  queue VARCHAR(255) NOT NULL,
  payload LONGTEXT NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL,
  reserved_at INT NULL,
  available_at INT NOT NULL,
  created_at INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_batches (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  total_jobs INT NOT NULL,
  pending_jobs INT NOT NULL,
  failed_jobs INT NOT NULL,
  failed_job_ids LONGTEXT NOT NULL,
  options MEDIUMTEXT NULL,
  cancelled_at INT NULL,
  created_at INT NOT NULL,
  finished_at INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS failed_jobs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(255) NOT NULL,
  connection TEXT NOT NULL,
  queue TEXT NOT NULL,
  payload LONGTEXT NOT NULL,
  exception LONGTEXT NOT NULL,
  failed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY failed_jobs_uuid_unique (uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS migrations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  migration VARCHAR(255) NOT NULL,
  batch INT NOT NULL,
  UNIQUE KEY migrations_migration_unique (migration),
  INDEX migrations_batch_idx (batch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recruitment_scoring_audits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT UNSIGNED NULL,
  action VARCHAR(64) NOT NULL,
  division_name VARCHAR(120) NULL,
  position_title VARCHAR(120) NULL,
  details_json JSON NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_recruitment_scoring_audits_created_at (created_at),
  INDEX idx_recruitment_scoring_audits_action (action),
  CONSTRAINT fk_recruitment_scoring_audits_actor
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS education_reference_custom (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institution VARCHAR(255) NULL,
  program VARCHAR(255) NULL,
  institution_normalized VARCHAR(255) NOT NULL DEFAULT '',
  program_normalized VARCHAR(255) NOT NULL DEFAULT '',
  source_user_id INT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY education_reference_custom_unique (institution_normalized, program_normalized),
  INDEX education_reference_custom_institution_idx (institution_normalized),
  INDEX education_reference_custom_program_idx (program_normalized),
  INDEX education_reference_custom_source_user_idx (source_user_id),
  CONSTRAINT education_reference_custom_source_user_foreign
    FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recruitment_sla_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  stage VARCHAR(50) NOT NULL,
  target_days INT NOT NULL DEFAULT 2,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY recruitment_sla_settings_stage_unique (stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  user_name VARCHAR(255) NULL,
  user_email VARCHAR(255) NULL,
  user_role VARCHAR(100) NULL,
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NULL,
  entity_id VARCHAR(100) NULL,
  description TEXT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NULL,
  INDEX idx_audit_logs_created_at (created_at),
  INDEX idx_audit_logs_module (module),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_user_id (user_id),
  CONSTRAINT fk_audit_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log_views (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  audit_log_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_audit_log_views_audit_user (audit_log_id, user_id),
  INDEX idx_audit_log_views_user_id (user_id),
  INDEX idx_audit_log_views_audit_log_id (audit_log_id),
  CONSTRAINT fk_audit_log_views_audit
    FOREIGN KEY (audit_log_id) REFERENCES audit_logs(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_log_views_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recruitment_ai_screenings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id INT UNSIGNED NOT NULL,
  actor_user_id INT UNSIGNED NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'groq',
  model_used VARCHAR(128) NULL,
  model_chain JSON NULL,
  prompt_version VARCHAR(64) NOT NULL DEFAULT 'cv-screening-v1',
  cv_file_path VARCHAR(255) NULL,
  cv_text_chars INT NOT NULL DEFAULT 0,
  match_score DECIMAL(5,2) NULL,
  recommendation VARCHAR(64) NULL,
  summary TEXT NULL,
  strengths_json JSON NULL,
  gaps_json JSON NULL,
  red_flags_json JSON NULL,
  interview_questions_json JSON NULL,
  token_prompt INT NOT NULL DEFAULT 0,
  token_completion INT NOT NULL DEFAULT 0,
  token_total INT NOT NULL DEFAULT 0,
  attempts_json JSON NULL,
  raw_response JSON NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'success',
  error_message TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX idx_recruitment_ai_screenings_application (application_id),
  INDEX idx_recruitment_ai_screenings_created_at (created_at),
  CONSTRAINT fk_recruitment_ai_screenings_application
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_recruitment_ai_screenings_actor
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS division_jobs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  division_profile_id INT UNSIGNED NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  job_description TEXT NOT NULL,
  job_requirements JSON NULL,
  job_eligibility_criteria JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  opened_at TIMESTAMP NULL,
  closed_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX division_jobs_division_profile_id_idx (division_profile_id),
  INDEX division_jobs_is_active_idx (is_active),
  CONSTRAINT division_jobs_division_profile_id_foreign
    FOREIGN KEY (division_profile_id) REFERENCES division_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  user_id INT UNSIGNED NOT NULL PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NULL,
  UNIQUE KEY email_verification_tokens_token_hash_unique (token_hash),
  INDEX email_verification_tokens_expires_at_idx (expires_at),
  CONSTRAINT email_verification_tokens_user_id_foreign
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
