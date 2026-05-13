
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const amitId = 'cmocw475w003axwb8msja2sg2'
  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId: amitId }
  })
  
  if (balance) {
    console.log('Balance found:', balance)
    console.log('Calculation: ', balance.standardTotal, '+', balance.standardCarryForward, '-', balance.standardUsed)
    console.log('Result:', balance.standardTotal + balance.standardCarryForward - balance.standardUsed)
  } else {
    console.log('Balance not found')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
