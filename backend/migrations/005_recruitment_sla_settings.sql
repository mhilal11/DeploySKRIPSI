CREATE TABLE IF NOT EXISTS recruitment_sla_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  stage VARCHAR(50) NOT NULL,
  target_days INT NOT NULL DEFAULT 2,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY recruitment_sla_settings_stage_unique (stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
