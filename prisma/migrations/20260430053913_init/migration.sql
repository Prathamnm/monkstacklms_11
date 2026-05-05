/*
  Warnings:

  - The values [EMPLOYEE_ONBOARD,EMPLOYEE_OFFBOARD,PROJECT_CREATE,PROJECT_UPDATE,PROJECT_MEMBER_ADD,PROJECT_MEMBER_REMOVE] on the enum `AuditAction` will be removed. If these variants are still used in the database, this will fail.
  - The values [FIRST_HALF,SECOND_HALF] on the enum `HalfDayType` will be removed. If these variants are still used in the database, this will fail.
  - The values [EMPLOYEE_ONBOARDED,EMPLOYEE_OFFBOARDED,PROJECT_ASSIGNED,PROJECT_REMOVED] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `designation` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the `employee_projects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projects` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('LEAVE_APPLY', 'LEAVE_APPROVE', 'LEAVE_REJECT', 'LEAVE_CANCEL', 'LEAVE_REVOKE', 'BALANCE_ADJUST', 'EMPLOYEE_UPDATE', 'RULES_UPDATE', 'ACCRUAL_RUN', 'ROLE_CHANGE', 'HOLIDAY_CREATE', 'ANNOUNCEMENT_POST', 'ANNOUNCEMENT_DELETE', 'ADMIN_OVERRIDE', 'ACCOUNT_DEACTIVATE');
ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "AuditAction_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "HalfDayType_new" AS ENUM ('NONE', 'HALF_DAY');
ALTER TABLE "leave_requests" ALTER COLUMN "endHalfDay" DROP DEFAULT;
ALTER TABLE "leave_requests" ALTER COLUMN "startHalfDay" DROP DEFAULT;
ALTER TABLE "leave_requests" ALTER COLUMN "startHalfDay" TYPE "HalfDayType_new" USING ("startHalfDay"::text::"HalfDayType_new");
ALTER TABLE "leave_requests" ALTER COLUMN "endHalfDay" TYPE "HalfDayType_new" USING ("endHalfDay"::text::"HalfDayType_new");
ALTER TYPE "HalfDayType" RENAME TO "HalfDayType_old";
ALTER TYPE "HalfDayType_new" RENAME TO "HalfDayType";
DROP TYPE "HalfDayType_old";
ALTER TABLE "leave_requests" ALTER COLUMN "endHalfDay" SET DEFAULT 'NONE';
ALTER TABLE "leave_requests" ALTER COLUMN "startHalfDay" SET DEFAULT 'NONE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('LEAVE_APPLIED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_CANCELLED', 'LEAVE_REVOKED', 'BALANCE_ADJUSTED', 'SYSTEM', 'HOLIDAY_CREATED', 'ANNOUNCEMENT_POSTED', 'ROLE_CHANGED', 'ACCOUNT_DEACTIVATED');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "employee_projects" DROP CONSTRAINT "employee_projects_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "employee_projects" DROP CONSTRAINT "employee_projects_projectId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_managerId_fkey";

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "designation";

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "halfDayDates" JSONB;

-- DropTable
DROP TABLE "employee_projects";

-- DropTable
DROP TABLE "projects";

-- DropEnum
DROP TYPE "ProjectStatus";
