CREATE TABLE IF NOT EXISTS email_verification_tokens (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NULL,
  UNIQUE KEY email_verification_tokens_token_hash_unique (token_hash),
  INDEX email_verification_tokens_expires_at_idx (expires_at),
  CONSTRAINT email_verification_tokens_user_id_foreign
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
