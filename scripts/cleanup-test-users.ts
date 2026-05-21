import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Removing demo/test employees...')

  const testEmployees = await prisma.employee.findMany({
    where: {
      workEmail: {
        endsWith: 'monikajadhav1907gmail.onmicrosoft.com',
      },
    },
    select: { id: true, workEmail: true, displayName: true },
  })

  if (testEmployees.length === 0) {
    console.log('No test employees found. Database is already clean.')
    return
  }

  console.log(`Found ${testEmployees.length} test employees:`)
  testEmployees.forEach((employee) => {
    console.log(`  - ${employee.displayName} (${employee.workEmail})`)
  })

  const testIds = testEmployees.map((employee) => employee.id)

  await prisma.employee.updateMany({
    where: { managerId: { in: testIds } },
    data: { managerId: null },
  })

  const deleted = await prisma.employee.deleteMany({
    where: { id: { in: testIds } },
  })

  console.log(`Deleted ${deleted.count} test employees successfully.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
