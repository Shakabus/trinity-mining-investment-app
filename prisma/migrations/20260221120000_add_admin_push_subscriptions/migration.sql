CREATE TABLE `admin_push_subscriptions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `admin_user_id` INTEGER NOT NULL,
  `endpoint` VARCHAR(700) NOT NULL,
  `p256dh` VARCHAR(255) NOT NULL,
  `auth` VARCHAR(255) NOT NULL,
  `user_agent` VARCHAR(512) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `admin_push_subscriptions_endpoint_key`(`endpoint`),
  INDEX `admin_push_subscriptions_admin_user_id_idx`(`admin_user_id`),
  INDEX `admin_push_subscriptions_is_active_idx`(`is_active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `admin_push_subscriptions`
  ADD CONSTRAINT `admin_push_subscriptions_admin_user_id_fkey`
  FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
