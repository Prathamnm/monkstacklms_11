
import { PrismaClient } from '@prisma/client'
import { getLeaveBalance } from './src/lib/leave/balanceService'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.employee.findMany()
  for (const u of users) {
    const balance = await getLeaveBalance(u.id)
    if (balance.availableStandard === 38 || balance.effectiveAvailable === 38) {
      console.log(`FOUND USER WITH 38: ${u.displayName} (${u.id})`, balance)
    }
  }
  console.log('Search complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
