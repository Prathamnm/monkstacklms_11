import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create default accrual rule
  const rule = await prisma.accrualRule.upsert({
    where: { id: 'default-rule' },
    update: {},
    create: {
      id: 'default-rule',
      name: 'Default Accrual Rule',
      standardLeavesPerYear: 18,
      emergencyLeavesPerYear: 2,
      accrualMethod: 'YEARLY_FLAT',
      daysPerMonth: 0,
      carryForwardEnabled: true,
      carryForwardMaxDays: 10,
      isActive: true,
    },
  })
  console.log('✅ Accrual rule created')

  // Create Admin
  const admin = await prisma.employee.upsert({
    where: { entraObjectId: 'admin-entra-object-id-placeholder' },
    update: { email: 'admin@monikajadhav1907gmail.onmicrosoft.com' },
    create: {
      entraObjectId: 'admin-entra-object-id-placeholder',
      email: 'admin@monikajadhav1907gmail.onmicrosoft.com',
      displayName: 'Monika Akanksha Kulkarni',
      firstName: 'Monika',
      lastName: 'Akanksha Kulkarni',
      jobTitle: 'System Administrator',
      department: 'IT',
      role: 'ADMIN',
      employmentStatus: 'ACTIVE',
    },
  })

  // Create HR
  const hr = await prisma.employee.upsert({
    where: { entraObjectId: 'hr-entra-object-id-placeholder' },
    update: { email: 'hr@monikajadhav1907gmail.onmicrosoft.com' },
    create: {
      entraObjectId: 'hr-entra-object-id-placeholder',
      email: 'hr@monikajadhav1907gmail.onmicrosoft.com',
      displayName: 'Sarah Miller',
      firstName: 'Sarah',
      lastName: 'Miller',
      jobTitle: 'HR Manager',
      department: 'Human Resources',
      role: 'HR',
      employmentStatus: 'ACTIVE',
    },
  })

  // Create Manager
  const manager = await prisma.employee.upsert({
    where: { entraObjectId: 'manager-entra-object-id-placeholder' },
    update: { email: 'manager@monikajadhav1907gmail.onmicrosoft.com' },
    create: {
      entraObjectId: 'manager-entra-object-id-placeholder',
      email: 'manager@monikajadhav1907gmail.onmicrosoft.com',
      displayName: 'David Chen',
      firstName: 'David',
      lastName: 'Chen',
      jobTitle: 'Engineering Manager',
      department: 'Engineering',
      role: 'MANAGER',
      employmentStatus: 'ACTIVE',
    },
  })

  const employee1 = await prisma.employee.upsert({
    where: { entraObjectId: `employee-alice-entra-id-placeholder` },
    update: { email: 'alice@monikajadhav1907gmail.onmicrosoft.com' },
    create: {
      entraObjectId: `employee-alice-entra-id-placeholder`,
      email: 'alice@monikajadhav1907gmail.onmicrosoft.com',
      displayName: `Alice Johnson`,
      firstName: 'Alice',
      lastName: 'Johnson',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      role: 'EMPLOYEE',
      employmentStatus: 'ACTIVE',
      managerId: manager.id,
    },
  })
  const employee2 = await prisma.employee.upsert({
    where: { entraObjectId: `employee-bob-entra-id-placeholder` },
    update: { email: 'bob@monikajadhav1907gmail.onmicrosoft.com' },
    create: {
      entraObjectId: `employee-bob-entra-id-placeholder`,
      email: 'bob@monikajadhav1907gmail.onmicrosoft.com',
      displayName: `Bob Smith`,
      firstName: 'Bob',
      lastName: 'Smith',
      jobTitle: 'UI Designer',
      department: 'Design',
      role: 'EMPLOYEE',
      employmentStatus: 'ACTIVE',
      managerId: manager.id,
    },
  })

  const allEmployees = [admin, hr, manager, employee1, employee2]
  console.log(`✅ Created ${allEmployees.length} demo employees`)

  // Create leave balances for all employees
  const year = new Date().getFullYear()

  for (const emp of allEmployees) {
    await prisma.leaveBalance.upsert({
      where: { employeeId: emp.id },
      update: {},
      create: {
        employeeId: emp.id,
        year,
        standardTotal: 18,
        standardAccrued: 18,
        standardUsed: 0,
        standardCarryForward: 0,
        emergencyTotal: 2,
        emergencyUsed: 0,
      },
    })
  }
  console.log('✅ Leave balances initialized for YEARLY_FLAT')

  // Create sample projects
  const projA = await prisma.project.upsert({
    where: { code: 'PROJ-001' },
    update: {},
    create: { name: 'Apollo App', code: 'PROJ-001', description: 'Core product', color: '#2563EB', status: 'ACTIVE' },
  })

  await prisma.employeeProject.upsert({
    where: { employeeId_projectId: { employeeId: employee1.id, projectId: projA.id } },
    update: {},
    create: { employeeId: employee1.id, projectId: projA.id, isActive: true },
  })

  // Future Dates
  const futureDate = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d
  }

  // Create sample holidays
  await prisma.publicHoliday.createMany({
    skipDuplicates: true,
    data: [
      { id: 'hol-1', name: 'New Year', date: new Date(year, 0, 1), type: 'PUBLIC', createdBy: hr.id },
      { id: 'hol-2', name: 'Christmas', date: new Date(year, 11, 25), type: 'PUBLIC', createdBy: hr.id },
      { id: 'hol-3', name: 'Company Anniversary', date: futureDate(15), type: 'FLOATER', createdBy: hr.id }
    ]
  })
  console.log('✅ Holidays created')

  // Create sample announcements
  const announcementsData = [
    { id: 'ann-1', title: 'Welcome to Moonshine V3', content: 'Our new leave management system is now live.', postedBy: hr.id },
  ]
  
  for (const ann of announcementsData) {
    await prisma.announcement.upsert({
      where: { id: ann.id },
      update: {},
      create: ann,
    })
  }

  // Leave Requests
  await prisma.leaveRequest.create({
    data: {
      employeeId: employee1.id, title: 'Annual Leave', startDate: futureDate(7), endDate: futureDate(9),
      totalDays: 3, reason: 'Family trip', status: 'PENDING', startHalfDay: 'NONE', endHalfDay: 'NONE',
    },
  })

  // Default system settings
  const defaultSettings = [
    { key: 'company_name', value: 'Moonshine', description: 'Company name' },
    { key: 'timezone', value: 'UTC', description: 'Default timezone' },
    { key: 'STANDARD_LEAVES_PER_YEAR', value: '18', description: 'Standard Leaves per year flat grant' },
    { key: 'CARRY_FORWARD_MAX_DAYS', value: '10', description: 'Max carry forward' },
    { key: 'CARRY_FORWARD_ENABLED', value: 'true', description: 'Enable carry forward' },
    { key: 'ESCALATION_HOURS', value: '72', description: 'Hours before leave escalates to admin' },
    { key: 'LAST_ACCRUAL_RUN', value: '', description: 'Timestamp of last engine run' },
  ]

  for (const setting of defaultSettings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }

  console.log('✅ System settings initialized')
  console.log('\n🎉 Seed completed successfully!')
  console.log('\nTest accounts:')
  console.log('  Admin:   admin@monikajadhav1907gmail.onmicrosoft.com')
  console.log('  HR:      hr@monikajadhav1907gmail.onmicrosoft.com')
  console.log('  Manager: manager@monikajadhav1907gmail.onmicrosoft.com')
  console.log('  Employees: alice@..., bob@... @monikajadhav1907gmail.onmicrosoft.com')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
