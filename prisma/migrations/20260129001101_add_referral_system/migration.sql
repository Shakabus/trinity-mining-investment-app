/*
  Warnings:

  - A unique constraint covering the columns `[referral_code]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `referral_code` VARCHAR(191) NULL,
    ADD COLUMN `referred_by_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `referral_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `bonus_percent` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
    `min_payment_usd` DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    `min_withdrawal_usd` DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referral_bonuses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referrer_id` INTEGER NOT NULL,
    `referee_id` INTEGER NOT NULL,
    `payment_id` INTEGER NULL,
    `amount_usd` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'available',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `referral_bonuses_referrer_id_fkey`(`referrer_id`),
    INDEX `referral_bonuses_referee_id_fkey`(`referee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referral_withdrawals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `coin_type` VARCHAR(191) NOT NULL,
    `amount_usd` DECIMAL(12, 2) NOT NULL,
    `amount_crypto` DECIMAL(20, 8) NOT NULL,
    `wallet_address` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `processed_by_admin_id` INTEGER NULL,
    `transaction_id` VARCHAR(191) NULL,
    `admin_notes` TEXT NULL,

    INDEX `referral_withdrawals_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_referral_code_key` ON `users`(`referral_code`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_referred_by_id_fkey` FOREIGN KEY (`referred_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_bonuses` ADD CONSTRAINT `referral_bonuses_referrer_id_fkey` FOREIGN KEY (`referrer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_bonuses` ADD CONSTRAINT `referral_bonuses_referee_id_fkey` FOREIGN KEY (`referee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_bonuses` ADD CONSTRAINT `referral_bonuses_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_withdrawals` ADD CONSTRAINT `referral_withdrawals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_withdrawals` ADD CONSTRAINT `referral_withdrawals_processed_by_admin_id_fkey` FOREIGN KEY (`processed_by_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
