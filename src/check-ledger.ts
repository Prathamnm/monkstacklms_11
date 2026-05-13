
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const amitId = 'cmocw475w003axwb8msja2sg2'
  const ledger = await prisma.leaveLedgerEntry.findMany({
    where: { employeeId: amitId },
    orderBy: { createdAt: 'desc' }
  })
  console.log('Ledger for Amit:', JSON.stringify(ledger, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
