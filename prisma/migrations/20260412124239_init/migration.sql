-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('PUBLIC', 'FLOATER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ON_HOLD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ROLE_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'HOLIDAY_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'ANNOUNCEMENT_POST';
ALTER TYPE "AuditAction" ADD VALUE 'ANNOUNCEMENT_DELETE';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_OVERRIDE';
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_DEACTIVATE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'HOLIDAY_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'ANNOUNCEMENT_POSTED';
ALTER TYPE "NotificationType" ADD VALUE 'ROLE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT_DEACTIVATED';

-- AlterTable
ALTER TABLE "accrual_rules" ALTER COLUMN "accrualMethod" SET DEFAULT 'YEARLY_FLAT';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "designation" TEXT,
ADD COLUMN     "emergencyContact" TEXT;

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "isEmergency" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "public_holidays" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "HolidayType" NOT NULL DEFAULT 'PUBLIC',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "postedBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_postedBy_fkey" FOREIGN KEY ("postedBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
