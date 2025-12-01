/*
  Warnings:

  - You are about to drop the column `category` on the `Expense` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "category",
ADD COLUMN     "categoryGroup" TEXT,
ADD COLUMN     "categoryKey" TEXT,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "label" TEXT;
