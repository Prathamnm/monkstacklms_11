
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.employee.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Amit', mode: 'insensitive' } },
        { displayName: { contains: 'Amit', mode: 'insensitive' } }
      ]
    }
  })

  console.log('Amits found:', users.length)
  for (const u of users) {
    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId: u.id }
    })
    console.log(`- ${u.displayName} (${u.id}):`, balance)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
