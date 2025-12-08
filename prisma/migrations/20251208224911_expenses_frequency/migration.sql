/*
  Warnings:

  - The `recurrenceFreq` column on the `Expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "RecurrenceFreq" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "recurrenceFreq",
ADD COLUMN     "recurrenceFreq" "RecurrenceFreq";
