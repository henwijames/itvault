-- AlterTable
ALTER TABLE `internet_accounts` ADD COLUMN `status` ENUM('NEW', 'RENEWED', 'FOR_CANCELLATION', 'CANCELLED') NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE `internet_account_status_logs` (
    `id` VARCHAR(191) NOT NULL,
    `internet_account_id` VARCHAR(191) NOT NULL,
    `status` ENUM('NEW', 'RENEWED', 'FOR_CANCELLATION', 'CANCELLED') NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `internet_account_status_logs` ADD CONSTRAINT `internet_account_status_logs_internet_account_id_fkey` FOREIGN KEY (`internet_account_id`) REFERENCES `internet_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
