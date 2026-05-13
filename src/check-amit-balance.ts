
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.employee.findFirst({
    where: {
      OR: [
        { firstName: 'Amit' },
        { displayName: { contains: 'Amit' } }
      ]
    }
  })

  if (!user) {
    console.log('User Amit not found')
    return
  }

  console.log('User found:', user.id, user.displayName)

  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId: user.id }
  })

  console.log('Leave Balance:', balance)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
