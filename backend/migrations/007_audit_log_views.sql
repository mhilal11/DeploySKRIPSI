CREATE TABLE IF NOT EXISTS audit_log_views (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  audit_log_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_audit_log_views_audit_user (audit_log_id, user_id),
  INDEX idx_audit_log_views_user_id (user_id),
  INDEX idx_audit_log_views_audit_log_id (audit_log_id),
  CONSTRAINT fk_audit_log_views_audit
    FOREIGN KEY (audit_log_id) REFERENCES audit_logs(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_log_views_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
