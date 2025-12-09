-- AlterTable
ALTER TABLE "Trailer" ADD COLUMN     "isRentedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rentalRateMonthly" INTEGER,
ADD COLUMN     "rentedToCustomerId" TEXT;

-- AddForeignKey
ALTER TABLE "Trailer" ADD CONSTRAINT "Trailer_rentedToCustomerId_fkey" FOREIGN KEY ("rentedToCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
