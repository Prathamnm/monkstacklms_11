import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TEST_EMAIL_SUFFIX = 'monikajadhav1907gmail.onmicrosoft.com'

type TestEmployeeRow = {
  id: string
  email: string
  displayName: string | null
}

async function main() {
  console.log('Removing demo/test employees...')

  const testEmployees = await prisma.$queryRaw<TestEmployeeRow[]>`
    SELECT id, email, "displayName"
    FROM "employees"
    WHERE email LIKE ${`%${TEST_EMAIL_SUFFIX}`}
  `

  if (testEmployees.length === 0) {
    console.log('No test employees found. Database is already clean.')
    return
  }

  console.log(`Found ${testEmployees.length} test employees:`)
  testEmployees.forEach((employee) => {
    console.log(`  - ${employee.displayName ?? 'Unnamed'} (${employee.email})`)
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
