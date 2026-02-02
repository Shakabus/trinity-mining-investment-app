-- CreateTable
CREATE TABLE `trading_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `min_investment_usd` DECIMAL(12, 2) NOT NULL,
    `max_investment_usd` DECIMAL(12, 2) NOT NULL,
    `min_duration_hours` INTEGER NOT NULL,
    `max_duration_hours` INTEGER NOT NULL,
    `min_return_multiplier` DECIMAL(6, 3) NOT NULL,
    `max_return_multiplier` DECIMAL(6, 3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trading_plans_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trading_user_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `plan_id` INTEGER NOT NULL,
    `investment_usd` DECIMAL(12, 2) NOT NULL,
    `expected_return_usd` DECIMAL(12, 2) NOT NULL,
    `duration_hours` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'awaiting_payment',
    `payment_status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `trading_user_plans_plan_id_fkey`(`plan_id`),
    INDEX `trading_user_plans_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trading_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `trading_user_plan_id` INTEGER NOT NULL,
    `amount_usd` DECIMAL(12, 2) NOT NULL,
    `crypto_type` VARCHAR(191) NOT NULL,
    `wallet_address` VARCHAR(191) NOT NULL,
    `transaction_id` VARCHAR(191) NULL,
    `payment_proof_url` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `confirmations` INTEGER NOT NULL DEFAULT 0,
    `confirmed_by_admin_id` INTEGER NULL,
    `confirmed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `trading_payments_user_id_fkey`(`user_id`),
    INDEX `trading_payments_plan_id_fkey`(`trading_user_plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trading_stats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `trading_user_plan_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `bot_speed` DECIMAL(6, 2) NOT NULL DEFAULT 1.0,
    `strategy` VARCHAR(191) NOT NULL DEFAULT 'Adaptive Momentum',
    `risk_level` VARCHAR(191) NOT NULL DEFAULT 'balanced',
    `last_equity_usd` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `last_pnl_usd` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `win_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    `open_positions` INTEGER NOT NULL DEFAULT 0,
    `last_simulated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `trading_stats_user_id_fkey`(`user_id`),
    INDEX `trading_stats_plan_id_fkey`(`trading_user_plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trading_earnings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `trading_user_plan_id` INTEGER NOT NULL,
    `total_earned_usd` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `daily_estimate_usd` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `last_calculated_at` DATETIME(3) NULL,
    `is_admin_override` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `trading_earnings_user_id_fkey`(`user_id`),
    INDEX `trading_earnings_plan_id_fkey`(`trading_user_plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trading_withdrawals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `trading_user_plan_id` INTEGER NOT NULL,
    `amount_usd` DECIMAL(12, 2) NOT NULL,
    `wallet_address` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `processed_by_admin_id` INTEGER NULL,
    `transaction_id` VARCHAR(191) NULL,
    `admin_notes` TEXT NULL,

    INDEX `trading_withdrawals_user_id_fkey`(`user_id`),
    INDEX `trading_withdrawals_plan_id_fkey`(`trading_user_plan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `trading_user_plans` ADD CONSTRAINT `trading_user_plans_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `trading_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trading_user_plans` ADD CONSTRAINT `trading_user_plans_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trading_payments` ADD CONSTRAINT `trading_payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trading_payments` ADD CONSTRAINT `trading_payments_trading_user_plan_id_fkey` FOREIGN KEY (`trading_user_plan_id`) REFERENCES `trading_user_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trading_stats` ADD CONSTRAINT `trading_stats_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trading_stats` ADD CONSTRAINT `trading_stats_trading_user_plan_id_fkey` FOREIGN KEY (`trading_user_plan_id`) REFERENCES `trading_user_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trading_earnings` ADD CONSTRAINT `trading_earnings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trading_earnings` ADD CONSTRAINT `trading_earnings_trading_user_plan_id_fkey` FOREIGN KEY (`trading_user_plan_id`) REFERENCES `trading_user_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trading_withdrawals` ADD CONSTRAINT `trading_withdrawals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trading_withdrawals` ADD CONSTRAINT `trading_withdrawals_trading_user_plan_id_fkey` FOREIGN KEY (`trading_user_plan_id`) REFERENCES `trading_user_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trading_withdrawals` ADD CONSTRAINT `trading_withdrawals_processed_by_admin_id_fkey` FOREIGN KEY (`processed_by_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
