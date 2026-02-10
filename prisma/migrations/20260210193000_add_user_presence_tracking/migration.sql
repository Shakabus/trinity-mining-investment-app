-- Add user presence tracking fields
ALTER TABLE `users`
  ADD COLUMN `last_seen_at` DATETIME(3) NULL,
  ADD COLUMN `current_session_started_at` DATETIME(3) NULL,
  ADD COLUMN `total_session_seconds` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `users_last_seen_at_idx` ON `users`(`last_seen_at`);

