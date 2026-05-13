
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.employee.findMany()
  console.log('All Users:', JSON.stringify(users.map(u => ({ id: u.id, name: u.displayName, first: u.firstName })), null, 2))
  
  const balances = await prisma.leaveBalance.findMany()
  console.log('All Balances:', JSON.stringify(balances, null, 2))

  const rules = await prisma.accrualRule.findMany()
  console.log('All Rules:', JSON.stringify(rules, null, 2))

  const settings = await prisma.systemSettings.findMany()
  console.log('All Settings:', JSON.stringify(settings, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
