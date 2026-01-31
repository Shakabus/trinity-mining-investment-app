-- CreateTable
CREATE TABLE `withdrawals` (
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

    INDEX `withdrawals_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_processed_by_admin_id_fkey` FOREIGN KEY (`processed_by_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
