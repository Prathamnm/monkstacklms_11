ALTER TABLE "employees" DROP COLUMN IF EXISTS "emergencyContact";
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "emergencyName" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "emergencyRelation" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "emergencyPhone" TEXT;
