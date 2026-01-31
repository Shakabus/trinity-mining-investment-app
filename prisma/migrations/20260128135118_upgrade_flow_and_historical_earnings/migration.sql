-- AlterTable
ALTER TABLE `earnings` ADD COLUMN `is_historical` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `is_withdrawable` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `user_plans` ADD COLUMN `upgrade_credit` DECIMAL(10, 2) NULL,
    ADD COLUMN `upgrade_from_plan_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `user_plans` ADD CONSTRAINT `user_plans_upgrade_from_plan_id_fkey` FOREIGN KEY (`upgrade_from_plan_id`) REFERENCES `user_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
