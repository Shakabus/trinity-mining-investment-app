-- Add KYC profile storage for withdrawal verification
CREATE TABLE `user_kyc` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'not_submitted',
  `first_name` VARCHAR(191) NOT NULL,
  `last_name` VARCHAR(191) NOT NULL,
  `date_of_birth` DATETIME(3) NOT NULL,
  `nationality` VARCHAR(191) NOT NULL,
  `residence_country` VARCHAR(191) NOT NULL,
  `address_line_1` VARCHAR(191) NOT NULL,
  `address_line_2` VARCHAR(191) NULL,
  `city` VARCHAR(191) NOT NULL,
  `state` VARCHAR(191) NOT NULL,
  `postal_code` VARCHAR(191) NOT NULL,
  `id_type` VARCHAR(191) NOT NULL,
  `id_number` VARCHAR(191) NOT NULL,
  `id_issuing_country` VARCHAR(191) NOT NULL,
  `id_expiry_date` DATETIME(3) NULL,
  `occupation` VARCHAR(191) NULL,
  `source_of_funds` VARCHAR(191) NULL,
  `pep_declaration` BOOLEAN NOT NULL DEFAULT false,
  `terms_accepted` BOOLEAN NOT NULL DEFAULT false,
  `id_document_front_url` VARCHAR(191) NOT NULL,
  `id_document_back_url` VARCHAR(191) NULL,
  `selfie_url` VARCHAR(191) NOT NULL,
  `proof_of_address_url` VARCHAR(191) NULL,
  `review_note` TEXT NULL,
  `reviewed_by_admin_id` INTEGER NULL,
  `reviewed_at` DATETIME(3) NULL,
  `submitted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `user_kyc_user_id_key`(`user_id`),
  INDEX `user_kyc_status_idx`(`status`),
  INDEX `user_kyc_reviewed_by_admin_id_idx`(`reviewed_by_admin_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_kyc`
  ADD CONSTRAINT `user_kyc_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_kyc`
  ADD CONSTRAINT `user_kyc_reviewed_by_admin_id_fkey`
  FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
