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
