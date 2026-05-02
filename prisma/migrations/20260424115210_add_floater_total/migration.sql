-- AlterTable
ALTER TABLE "leave_balances" ADD COLUMN "floaterTotal" DOUBLE PRECISION NOT NULL DEFAULT 2,
ADD COLUMN "floaterUsed" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN "approverComments" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "notification_email" TEXT;