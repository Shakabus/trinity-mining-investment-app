-- AlterTable
ALTER TABLE `earnings` ADD COLUMN `is_admin_override` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `last_estimate_update_at` DATETIME(3) NULL,
    ADD COLUMN `last_usd_update_at` DATETIME(3) NULL;
