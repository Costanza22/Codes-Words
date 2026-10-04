CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(254) COLLATE utf8mb4_bin NOT NULL UNIQUE,
  password_hash VARCHAR(256) NOT NULL,
  last_lesson VARCHAR(64) NOT NULL DEFAULT 'html-hello',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX sessions_expiry (expires_at),
  INDEX sessions_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  lesson_id VARCHAR(64) NOT NULL,
  draft MEDIUMTEXT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  completed_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, lesson_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  attempts INT UNSIGNED NOT NULL,
  resets_at DATETIME(3) NOT NULL,
  INDEX rate_limits_expiry (resets_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
