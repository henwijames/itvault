/*
  Warnings:

  - You are about to drop the column `module_id` on the `permissions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `permissions` DROP FOREIGN KEY `permissions_module_id_fkey`;

-- DropIndex
DROP INDEX `permissions_module_id_fkey` ON `permissions`;

-- AlterTable
ALTER TABLE `permissions` DROP COLUMN `module_id`;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(500) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
