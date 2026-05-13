
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.employee.findMany()
  const balances = await prisma.leaveBalance.findMany()
  
  for (const b of balances) {
    const available = b.standardTotal + b.standardCarryForward - b.standardUsed
    if (available === 38) {
      const u = users.find(x => x.id === b.employeeId)
      console.log(`FOUND USER WITH 38: ${u?.displayName} (${u?.id})`, b)
    }
  }
  console.log('Search complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
