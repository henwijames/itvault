-- AlterTable
ALTER TABLE `asset_borrow_logs` ADD COLUMN `borrowing_branch_id` VARCHAR(191) NULL,
    MODIFY `staff_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `asset_borrow_logs` ADD CONSTRAINT `asset_borrow_logs_borrowing_branch_id_fkey` FOREIGN KEY (`borrowing_branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
