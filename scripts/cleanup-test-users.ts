import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Removing demo/test employees...')

  // Find all employees whose email ends with @moonshine.test
  const testEmployees = await prisma.employee.findMany({
    where: {
      email: { endsWith: '@moonshine.test' },
    },
    select: { id: true, email: true, displayName: true },
  })

  if (testEmployees.length === 0) {
    console.log('✅ No test employees found. Database is already clean.')
    return
  }

  console.log(`Found ${testEmployees.length} test employees:`)
  testEmployees.forEach(e => console.log(`  - ${e.displayName} (${e.email})`))

  const testIds = testEmployees.map(e => e.id)

  // Delete in correct order to avoid FK violations
  await prisma.notification.deleteMany({ where: { OR: [{ recipientId: { in: testIds } }, { senderId: { in: testIds } }] } })
  await prisma.auditLog.deleteMany({ where: { OR: [{ performedBy: { in: testIds } }, { targetId: { in: testIds } }] } })
  await prisma.leaveLedgerEntry.deleteMany({ where: { employeeId: { in: testIds } } })
  await prisma.leaveRequest.deleteMany({ where: { OR: [{ employeeId: { in: testIds } }, { approverId: { in: testIds } }] } })
  await prisma.leaveBalance.deleteMany({ where: { employeeId: { in: testIds } } })
  await prisma.employeeProject.deleteMany({ where: { employeeId: { in: testIds } } })
  await prisma.announcement.deleteMany({ where: { postedBy: { in: testIds } } })
  
  // Remove manager references from other employees
  await prisma.employee.updateMany({
    where: { managerId: { in: testIds } },
    data: { managerId: null },
  })

  // Finally delete the employees themselves
  const deleted = await prisma.employee.deleteMany({
    where: { id: { in: testIds } },
  })

  console.log(`✅ Deleted ${deleted.count} test employees successfully.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
