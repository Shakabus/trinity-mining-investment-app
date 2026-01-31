-- AlterTable
ALTER TABLE `users` ADD COLUMN `btc_wallet_address` VARCHAR(191) NULL,
    ADD COLUMN `eth_wallet_address` VARCHAR(191) NULL,
    ADD COLUMN `ltc_wallet_address` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `admin_activity_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor_admin_id` INTEGER NOT NULL,
    `target_user_id` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `detail` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `admin_activity_logs_actor_admin_id_fkey`(`actor_admin_id`),
    INDEX `admin_activity_logs_target_user_id_fkey`(`target_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin_activity_logs` ADD CONSTRAINT `admin_activity_logs_actor_admin_id_fkey` FOREIGN KEY (`actor_admin_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_activity_logs` ADD CONSTRAINT `admin_activity_logs_target_user_id_fkey` FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
