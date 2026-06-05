/*
  Warnings:

  - You are about to drop the column `account_holder_name` on the `internet_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `contact_number` on the `internet_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `date_of_birth` on the `internet_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `emirates_id_expiry` on the `internet_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `emirates_id_number` on the `internet_accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `internet_accounts` DROP COLUMN `account_holder_name`,
    DROP COLUMN `contact_number`,
    DROP COLUMN `date_of_birth`,
    DROP COLUMN `emirates_id_expiry`,
    DROP COLUMN `emirates_id_number`,
    ADD COLUMN `account_holder_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `staff` ADD COLUMN `contact_number` VARCHAR(191) NULL,
    ADD COLUMN `date_of_birth` DATETIME(3) NULL,
    ADD COLUMN `emirates_id_expiry` DATETIME(3) NULL,
    ADD COLUMN `emirates_id_number` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `internet_accounts` ADD CONSTRAINT `internet_accounts_account_holder_id_fkey` FOREIGN KEY (`account_holder_id`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
