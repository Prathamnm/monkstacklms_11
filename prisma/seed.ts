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
      accrualMethod: 'MONTHLY',
      daysPerMonth: 1.5,
      carryForwardEnabled: true,
      carryForwardMaxDays: 10,
      isActive: true,
    },
  })
  console.log('✅ Accrual rule created')

  // Create Admin
  const admin = await prisma.employee.upsert({
    where: { email: 'admin@moonshine.onmicrosoft.com' },
    update: {},
    create: {
      entraObjectId: 'admin-entra-object-id-placeholder',
      email: 'admin@moonshine.onmicrosoft.com',
      displayName: 'System Admin',
      firstName: 'System',
      lastName: 'Admin',
      jobTitle: 'System Administrator',
      department: 'IT',
      role: 'ADMIN',
      employmentStatus: 'ACTIVE',
    },
  })

  // Create HR
  const hr = await prisma.employee.upsert({
    where: { email: 'hr@moonshine.onmicrosoft.com' },
    update: {},
    create: {
      entraObjectId: 'hr-entra-object-id-placeholder',
      email: 'hr@moonshine.onmicrosoft.com',
      displayName: 'HR Manager',
      firstName: 'HR',
      lastName: 'Manager',
      jobTitle: 'HR Manager',
      department: 'Human Resources',
      role: 'HR',
      employmentStatus: 'ACTIVE',
    },
  })

  // Create Manager
  const manager = await prisma.employee.upsert({
    where: { email: 'manager@moonshine.onmicrosoft.com' },
    update: {},
    create: {
      entraObjectId: 'manager-entra-object-id-placeholder',
      email: 'manager@moonshine.onmicrosoft.com',
      displayName: 'Team Manager',
      firstName: 'Team',
      lastName: 'Manager',
      jobTitle: 'Engineering Manager',
      department: 'Engineering',
      role: 'MANAGER',
      employmentStatus: 'ACTIVE',
    },
  })

  // Create 12 Employees
  const employeeData = [
    { firstName: 'Alice', lastName: 'Johnson', jobTitle: 'Software Engineer', department: 'Engineering' },
    { firstName: 'Bob', lastName: 'Smith', jobTitle: 'Software Engineer', department: 'Engineering' },
    { firstName: 'Carol', lastName: 'Davis', jobTitle: 'UI/UX Designer', department: 'Design' },
    { firstName: 'David', lastName: 'Wilson', jobTitle: 'Backend Developer', department: 'Engineering' },
    { firstName: 'Eve', lastName: 'Martinez', jobTitle: 'QA Engineer', department: 'Quality' },
    { firstName: 'Frank', lastName: 'Brown', jobTitle: 'DevOps Engineer', department: 'Infrastructure' },
    { firstName: 'Grace', lastName: 'Taylor', jobTitle: 'Product Manager', department: 'Product' },
    { firstName: 'Henry', lastName: 'Anderson', jobTitle: 'Frontend Developer', department: 'Engineering' },
    { firstName: 'Iris', lastName: 'Thomas', jobTitle: 'Data Analyst', department: 'Analytics' },
    { firstName: 'Jack', lastName: 'Jackson', jobTitle: 'Software Engineer', department: 'Engineering' },
    { firstName: 'Kate', lastName: 'White', jobTitle: 'Business Analyst', department: 'Product' },
    { firstName: 'Liam', lastName: 'Harris', jobTitle: 'Mobile Developer', department: 'Engineering' },
  ]

  const employees = []
  for (const data of employeeData) {
    const email = `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}@moonshine.onmicrosoft.com`
    const emp = await prisma.employee.upsert({
      where: { email },
      update: {},
      create: {
        entraObjectId: `employee-${data.firstName.toLowerCase()}-entra-id-placeholder`,
        email,
        displayName: `${data.firstName} ${data.lastName}`,
        firstName: data.firstName,
        lastName: data.lastName,
        jobTitle: data.jobTitle,
        department: data.department,
        role: 'EMPLOYEE',
        employmentStatus: 'ACTIVE',
        managerId: manager.id,
      },
    })
    employees.push(emp)
  }

  console.log(`✅ Created ${employees.length} employees`)

  // Create leave balances for all employees
  const allEmployees = [admin, hr, manager, ...employees]
  const year = new Date().getFullYear()

  for (const emp of allEmployees) {
    await prisma.leaveBalance.upsert({
      where: { employeeId: emp.id },
      update: {},
      create: {
        employeeId: emp.id,
        year,
        standardTotal: 18,
        standardAccrued: 9, // 6 months accrued (1.5 × 6)
        standardUsed: 0,
        standardCarryForward: 0,
        emergencyTotal: 2,
        emergencyUsed: 0,
      },
    })
  }
  console.log('✅ Leave balances initialized')

  // Create sample projects
  const projects = [
    { name: 'Project Alpha', code: 'PROJ-001', description: 'Core platform development', color: '#2563EB' },
    { name: 'Project Beta', code: 'PROJ-002', description: 'Mobile application revamp', color: '#7C3AED' },
    { name: 'Project Gamma', code: 'PROJ-003', description: 'Analytics dashboard', color: '#16A34A' },
    { name: 'Project Delta', code: 'PROJ-004', description: 'Infrastructure modernization', color: '#D97706' },
  ]

  const createdProjects = []
  for (const p of projects) {
    const project = await prisma.project.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    })
    createdProjects.push(project)
  }
  console.log(`✅ Created ${createdProjects.length} projects`)

  // Assign employees to projects
  const projectAssignments = [
    { projectIdx: 0, employeeIdxs: [0, 1, 3, 7, 9] }, // Alpha
    { projectIdx: 1, employeeIdxs: [2, 4, 7, 11] },    // Beta
    { projectIdx: 2, employeeIdxs: [5, 8, 10] },        // Gamma
    { projectIdx: 3, employeeIdxs: [1, 5, 6] },         // Delta
  ]

  for (const assignment of projectAssignments) {
    for (const empIdx of assignment.employeeIdxs) {
      await prisma.employeeProject.upsert({
        where: {
          employeeId_projectId: {
            employeeId: employees[empIdx].id,
            projectId: createdProjects[assignment.projectIdx].id,
          },
        },
        update: {},
        create: {
          employeeId: employees[empIdx].id,
          projectId: createdProjects[assignment.projectIdx].id,
          isActive: true,
        },
      })
    }
  }
  console.log('✅ Project assignments created')

  // Create sample leave requests
  const today = new Date()
  const futureDate = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d
  }
  const pastDate = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d
  }

  // Pending leave for employee 0
  await prisma.leaveRequest.create({
    data: {
      employeeId: employees[0].id,
      startDate: futureDate(7),
      endDate: futureDate(9),
      totalDays: 3,
      reason: 'Family vacation trip planned in advance',
      status: 'PENDING',
      startHalfDay: 'NONE',
      endHalfDay: 'NONE',
    },
  })

  // Approved leave for employee 1 (current - on leave today)
  await prisma.leaveRequest.create({
    data: {
      employeeId: employees[1].id,
      startDate: pastDate(1),
      endDate: futureDate(2),
      totalDays: 4,
      reason: 'Medical procedure and recovery',
      status: 'APPROVED',
      approverId: manager.id,
      approvedAt: pastDate(3),
      startHalfDay: 'NONE',
      endHalfDay: 'NONE',
    },
  })

  // Rejected leave
  await prisma.leaveRequest.create({
    data: {
      employeeId: employees[2].id,
      startDate: futureDate(14),
      endDate: futureDate(16),
      totalDays: 3,
      reason: 'Personal errands',
      status: 'REJECTED',
      approverId: manager.id,
      rejectedAt: pastDate(1),
      rejectionReason: 'Team at low capacity during this period',
      startHalfDay: 'NONE',
      endHalfDay: 'NONE',
    },
  })

  console.log('✅ Sample leave requests created')

  // Update leave balance for employee 1 (approved leave)
  await prisma.leaveBalance.update({
    where: { employeeId: employees[1].id },
    data: { standardUsed: 4 },
  })

  // Create ledger entry for employee 1's approved leave
  await prisma.leaveLedgerEntry.create({
    data: {
      employeeId: employees[1].id,
      type: 'USAGE',
      days: -4,
      reason: 'Leave approved',
      year,
      month: today.getMonth() + 1,
    },
  })

  // Create initial accrual ledger entries for all employees
  for (const emp of allEmployees) {
    for (let month = 1; month <= 6; month++) {
      await prisma.leaveLedgerEntry.create({
        data: {
          employeeId: emp.id,
          type: 'ACCRUAL',
          days: 1.5,
          reason: `Monthly accrual - Month ${month} ${year}`,
          year,
          month,
        },
      })
    }

    await prisma.leaveLedgerEntry.create({
      data: {
        employeeId: emp.id,
        type: 'EMERGENCY_GRANT',
        days: 2,
        reason: `Annual emergency leave grant for ${year}`,
        year,
      },
    })
  }

  console.log('✅ Ledger entries created')

  // Create default system settings
  const defaultSettings = [
    { key: 'company_name', value: 'Moonshine', description: 'Company name displayed throughout the app' },
    { key: 'timezone', value: 'UTC', description: 'Default timezone for date calculations' },
    { key: 'min_advance_days', value: '1', description: 'Minimum days in advance to apply for leave' },
    { key: 'working_days', value: 'MON,TUE,WED,THU,FRI', description: 'Working days of the week' },
    { key: 'sender_email', value: 'no-reply@moonshine.onmicrosoft.com', description: 'Email sender address' },
    { key: 'notifications_enabled', value: 'true', description: 'Enable in-app notifications' },
    { key: 'email_notifications_enabled', value: 'true', description: 'Enable email notifications' },
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
  console.log('  Admin:   admin@moonshine.onmicrosoft.com')
  console.log('  HR:      hr@moonshine.onmicrosoft.com')
  console.log('  Manager: manager@moonshine.onmicrosoft.com')
  console.log('  Employees: alice.johnson@moonshine.onmicrosoft.com, etc.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
