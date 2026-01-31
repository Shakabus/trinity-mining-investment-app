-- AlterTable
ALTER TABLE `support_messages` ADD COLUMN `attachment_name` VARCHAR(191) NULL,
    ADD COLUMN `attachment_size` INTEGER NULL,
    ADD COLUMN `attachment_type` VARCHAR(191) NULL,
    ADD COLUMN `attachment_url` VARCHAR(191) NULL;
