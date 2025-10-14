/*
  Warnings:

  - You are about to alter the column `data` on the `despesa` table. The data in that column could be lost. The data in that column will be cast from `DateTime(3)` to `DateTime(0)`.
  - You are about to alter the column `dataIda` on the `viagem` table. The data in that column could be lost. The data in that column will be cast from `DateTime(3)` to `DateTime(0)`.
  - You are about to alter the column `dataVolta` on the `viagem` table. The data in that column could be lost. The data in that column will be cast from `DateTime(3)` to `DateTime(0)`.

*/
-- AlterTable
ALTER TABLE `despesa` MODIFY `data` DATETIME(0) NOT NULL;

-- AlterTable
ALTER TABLE `viagem` MODIFY `dataIda` DATETIME(0) NOT NULL,
    MODIFY `dataVolta` DATETIME(0) NOT NULL;
