
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const ledger = await prisma.leaveLedgerEntry.findMany({
    where: { type: 'ACCRUAL' }
  })
  console.log('Accrual entries:', JSON.stringify(ledger, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
