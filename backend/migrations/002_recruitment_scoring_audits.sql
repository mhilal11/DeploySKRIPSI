CREATE TABLE IF NOT EXISTS recruitment_scoring_audits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
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
