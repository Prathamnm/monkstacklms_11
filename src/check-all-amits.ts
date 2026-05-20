
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const amits = await prisma.employee.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Amit', mode: 'insensitive' } },
        { displayName: { contains: 'Amit', mode: 'insensitive' } },
      ],
    },
    include: {
      leaveBalance: true,
    },
  })

  console.log('Amits found:', amits.length)
  for (const employee of amits) {
    console.log(`- ${employee.displayName} (${employee.id}):`, employee.leaveBalance ?? null)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
