
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const balances = await prisma.leaveBalance.findMany({
    where: {
      OR: [
        { standardTotal: 38 },
        { standardAccrued: 38 },
        { standardCarryForward: 38 },
        { standardUsed: 38 }
      ]
    }
  })
  console.log('Balances with 38:', JSON.stringify(balances, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
