import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️ Wiping existing data...')

  // Delete in correct order to respect FK constraints
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.leaveLedgerEntry.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.leaveBalance.deleteMany()
  await prisma.announcement.deleteMany()
  
  // Clear manager links before deleting employees
  await prisma.employee.updateMany({
    data: { managerId: null }
  })
  
  await prisma.employee.deleteMany()
  
  console.log('✅ All data wiped successfully.')
}

main()
  .catch((e) => {
    console.error('❌ Error wiping data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
