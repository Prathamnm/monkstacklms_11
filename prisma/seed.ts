import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database with system defaults...')

  const leaveTypes = [
    { code: 'ANNUAL', name: 'Annual Leave', yearlyQuota: 18, isAccrued: false, carryForwardLimit: 10 },
    { code: 'EMERGENCY', name: 'Emergency Leave', yearlyQuota: 2, isAccrued: false, carryForwardLimit: 0 },
    { code: 'FLOATER', name: 'Floater Holiday', yearlyQuota: 2, isAccrued: false, carryForwardLimit: 0 },
  ]

  for (const leaveType of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: leaveType.code },
      update: {
        name: leaveType.name,
        yearlyQuota: leaveType.yearlyQuota,
        isAccrued: leaveType.isAccrued,
        carryForwardLimit: leaveType.carryForwardLimit,
      },
      create: leaveType,
    })
  }
  console.log('Default leave types ensured')

  const defaultSettings = [
    { key: 'company_name', value: 'Moonshine', description: 'Company name' },
    { key: 'timezone', value: 'UTC', description: 'Default timezone' },
    { key: 'STANDARD_LEAVES_PER_YEAR', value: '18', description: 'Standard leaves per year flat grant' },
    { key: 'CARRY_FORWARD_MAX_DAYS', value: '10', description: 'Max carry forward' },
    { key: 'CARRY_FORWARD_ENABLED', value: 'true', description: 'Enable carry forward' },
    { key: 'ESCALATION_HOURS', value: '72', description: 'Hours before leave escalates to HR' },
    { key: 'LAST_ACCRUAL_RUN', value: '', description: 'Timestamp of last engine run' },
  ]

  for (const setting of defaultSettings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        description: setting.description,
      },
      create: setting,
    })
  }
  console.log('System settings initialized')

  console.log('\nSystem defaults seeded successfully!')
  console.log('')
  console.log('Employees are not created by this seed. They appear when users sign in (Entra sync)')
  console.log('or when HR imports the tenant directory:')
  console.log('  POST /api/hr/users/sync  (Bearer: HR user)  OR  x-sync-secret header for cron')
  console.log('Server needs: AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET (app-only Graph).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
