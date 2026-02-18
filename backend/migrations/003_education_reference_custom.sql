CREATE TABLE IF NOT EXISTS education_reference_custom (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  institution VARCHAR(255) NULL,
  program VARCHAR(255) NULL,
  institution_normalized VARCHAR(255) NOT NULL DEFAULT '',
  program_normalized VARCHAR(255) NOT NULL DEFAULT '',
  source_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY education_reference_custom_unique (institution_normalized, program_normalized),
  INDEX education_reference_custom_institution_idx (institution_normalized),
  INDEX education_reference_custom_program_idx (program_normalized),
  INDEX education_reference_custom_source_user_idx (source_user_id),
  CONSTRAINT education_reference_custom_source_user_foreign
    FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
