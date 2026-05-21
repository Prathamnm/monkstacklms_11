/*
  Warnings:

  - You are about to drop the column `isEmergency` on the `leave_requests` table. All the data in the column will be lost.
  - Added the required column `leaveTypeId` to the `leave_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "leave_ledger_entries" ADD COLUMN     "leaveTypeId" TEXT;

-- AlterTable
ALTER TABLE "leave_requests" DROP COLUMN "isEmergency",
ADD COLUMN     "leaveTypeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "leave_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yearlyQuota" DOUBLE PRECISION NOT NULL,
    "isAccrued" BOOLEAN NOT NULL DEFAULT false,
    "carryForwardLimit" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_request_days" (
    "id" TEXT NOT NULL,
    "leaveRequestId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "portion" "HalfDayType" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "leave_request_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_code_key" ON "leave_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "leave_request_days_leaveRequestId_date_key" ON "leave_request_days"("leaveRequestId", "date");

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_request_days" ADD CONSTRAINT "leave_request_days_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
