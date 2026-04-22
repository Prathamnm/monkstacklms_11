-- AlterTable
ALTER TABLE "employees" DROP COLUMN "emergencyContact",
ADD COLUMN "emergencyName" TEXT,
ADD COLUMN "emergencyPhone" TEXT,
ADD COLUMN "emergencyRelation" TEXT;
