CREATE TABLE `account_balance_freeze_controls` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `freeze_incoming_all` BOOLEAN NOT NULL DEFAULT false,
  `freeze_outgoing_all` BOOLEAN NOT NULL DEFAULT false,
  `account_incoming_freeze_usd` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `account_outgoing_freeze_usd` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `btc_incoming_freeze_usd` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `btc_outgoing_freeze_usd` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `eth_incoming_freeze_usd` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `eth_outgoing_freeze_usd` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `usdt_incoming_freeze_usd` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `usdt_outgoing_freeze_usd` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `sol_incoming_freeze_usd` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `sol_outgoing_freeze_usd` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `note` TEXT NULL,
  `updated_by_admin_id` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `account_balance_freeze_controls_user_id_key`(`user_id`),
  INDEX `account_balance_freeze_controls_updated_by_admin_id_fkey`(`updated_by_admin_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `account_balance_freeze_controls`
  ADD CONSTRAINT `account_balance_freeze_controls_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `account_balance_freeze_controls`
  ADD CONSTRAINT `account_balance_freeze_controls_updated_by_admin_id_fkey`
  FOREIGN KEY (`updated_by_admin_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
