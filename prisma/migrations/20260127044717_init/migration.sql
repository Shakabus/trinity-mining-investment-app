-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clerk_user_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `wallet_address` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `account_status` VARCHAR(191) NOT NULL DEFAULT 'inactive',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_clerk_user_id_key`(`clerk_user_id`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `base_price` DECIMAL(10, 2) NOT NULL,
    `coin_type` VARCHAR(191) NOT NULL,
    `base_hashrate` DECIMAL(15, 8) NOT NULL,
    `hashrate_unit` VARCHAR(191) NOT NULL,
    `algorithm` VARCHAR(191) NOT NULL,
    `hardware_model` VARCHAR(191) NOT NULL,
    `power_efficiency` VARCHAR(191) NOT NULL,
    `maintenance_fee_per_unit_day` DECIMAL(10, 6) NOT NULL,
    `electricity_cost_per_unit_day` DECIMAL(10, 6) NOT NULL,
    `uptime_guarantee` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `plans_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_duration_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `duration_days` INTEGER NOT NULL,
    `duration_label` VARCHAR(191) NOT NULL,
    `price_multiplier` DECIMAL(5, 2) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `plan_duration_options_plan_id_fkey`(`plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_features` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `feature_text` TEXT NOT NULL,
    `feature_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `plan_features_plan_id_fkey`(`plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `plan_id` INTEGER NOT NULL,
    `selected_duration_days` INTEGER NOT NULL,
    `final_price` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'selected',
    `payment_status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `auto_renew` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_plans_plan_id_fkey`(`plan_id`),
    INDEX `user_plans_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `user_plan_id` INTEGER NOT NULL,
    `amount_usd` DECIMAL(10, 2) NOT NULL,
    `amount_crypto` DECIMAL(20, 8) NULL,
    `crypto_type` VARCHAR(191) NOT NULL,
    `wallet_address` VARCHAR(191) NOT NULL,
    `transaction_id` VARCHAR(191) NULL,
    `payment_proof_url` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `confirmations` INTEGER NOT NULL DEFAULT 0,
    `admin_notes` TEXT NULL,
    `confirmed_by_admin_id` INTEGER NULL,
    `confirmed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payments_user_id_fkey`(`user_id`),
    INDEX `payments_user_plan_id_fkey`(`user_plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mining_stats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `user_plan_id` INTEGER NOT NULL,
    `assigned_hashrate` DECIMAL(15, 8) NOT NULL,
    `hashrate_unit` VARCHAR(191) NOT NULL,
    `counter_speed` DECIMAL(10, 6) NOT NULL DEFAULT 0.001000,
    `algorithm` VARCHAR(191) NOT NULL,
    `mining_pool` VARCHAR(191) NOT NULL,
    `data_center_location` VARCHAR(191) NOT NULL,
    `machine_model` VARCHAR(191) NOT NULL,
    `uptime_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 99.90,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_counter_value` DECIMAL(20, 10) NOT NULL DEFAULT 0.0000000000,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `mining_stats_user_id_fkey`(`user_id`),
    INDEX `mining_stats_user_plan_id_fkey`(`user_plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `earnings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `user_plan_id` INTEGER NOT NULL,
    `coin_type` VARCHAR(191) NOT NULL,
    `daily_estimate_usd` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `daily_estimate_crypto` DECIMAL(20, 8) NOT NULL DEFAULT 0.00000000,
    `total_earned_usd` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total_earned_crypto` DECIMAL(20, 8) NOT NULL DEFAULT 0.00000000,
    `last_calculated_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `earnings_user_id_fkey`(`user_id`),
    INDEX `earnings_user_plan_id_fkey`(`user_plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `multi_asset_allocations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_plan_id` INTEGER NOT NULL,
    `coin_type` VARCHAR(191) NOT NULL,
    `hashrate` DECIMAL(15, 8) NOT NULL,
    `hashrate_unit` VARCHAR(191) NOT NULL,
    `algorithm` VARCHAR(191) NOT NULL,
    `hardware_model` VARCHAR(191) NOT NULL,
    `maintenance_fee` DECIMAL(10, 6) NOT NULL,
    `electricity_cost` DECIMAL(10, 6) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `multi_asset_allocations_user_plan_id_fkey`(`user_plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `plan_duration_options` ADD CONSTRAINT `plan_duration_options_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_features` ADD CONSTRAINT `plan_features_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_plans` ADD CONSTRAINT `user_plans_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_plans` ADD CONSTRAINT `user_plans_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_plan_id_fkey` FOREIGN KEY (`user_plan_id`) REFERENCES `user_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mining_stats` ADD CONSTRAINT `mining_stats_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mining_stats` ADD CONSTRAINT `mining_stats_user_plan_id_fkey` FOREIGN KEY (`user_plan_id`) REFERENCES `user_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `earnings` ADD CONSTRAINT `earnings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `earnings` ADD CONSTRAINT `earnings_user_plan_id_fkey` FOREIGN KEY (`user_plan_id`) REFERENCES `user_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `multi_asset_allocations` ADD CONSTRAINT `multi_asset_allocations_user_plan_id_fkey` FOREIGN KEY (`user_plan_id`) REFERENCES `user_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
