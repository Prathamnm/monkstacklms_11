import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Wiping existing data...')

  // Use raw SQL with IF EXISTS so this script works across schema revisions.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "audit_logs" RESTART IDENTITY CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "messages" RESTART IDENTITY CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "leave_request_days" RESTART IDENTITY CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "leave_requests" RESTART IDENTITY CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "leave_ledger_entries" RESTART IDENTITY CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "employee_profiles" RESTART IDENTITY CASCADE')
  await prisma.$executeRawUnsafe('UPDATE "employees" SET "managerId" = NULL')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "employees" RESTART IDENTITY CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "leave_types" RESTART IDENTITY CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "public_holidays" RESTART IDENTITY CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "policies" RESTART IDENTITY CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "system_settings" RESTART IDENTITY CASCADE')

  console.log('All data wiped successfully.')
}

main()
  .catch((error) => {
    console.error('Error wiping data:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
