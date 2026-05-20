/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `announcements` table. All the data in the column will be lost.
  - You are about to drop the column `deletedBy` on the `announcements` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `announcements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `leave_ledger_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `public_holidays` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LEAVE_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAVE_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAVE_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAVE_REVOKED';

-- AlterTable
ALTER TABLE "accrual_rules" ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "announcements" DROP COLUMN "deletedAt",
DROP COLUMN "deletedBy",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'UTC';

-- AlterTable
ALTER TABLE "leave_balances" ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "leave_ledger_entries" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "dayOverrides" JSONB,
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "public_holidays" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" TEXT;
