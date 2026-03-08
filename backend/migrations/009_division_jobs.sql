CREATE TABLE IF NOT EXISTS division_jobs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  division_profile_id BIGINT UNSIGNED NOT NULL,
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
