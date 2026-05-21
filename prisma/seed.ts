import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with system defaults...')

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
  console.log('✅ Default accrual rule ensured')

  // Create default leave types
  const leaveTypes = [
    { code: 'ANNUAL', name: 'Annual Leave', yearlyQuota: 18, isAccrued: false, carryForwardLimit: 10 },
    { code: 'EMERGENCY', name: 'Emergency Leave', yearlyQuota: 2, isAccrued: false, carryForwardLimit: 0 },
    { code: 'FLOATER', name: 'Floater Holiday', yearlyQuota: 2, isAccrued: false, carryForwardLimit: 0 },
  ]

  for (const leaveType of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: leaveType.code },
      update: {},
      create: leaveType,
    })
  }
  console.log('✅ Default leave types ensured')

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

  console.log('\n🎉 System defaults seeded successfully!')
  console.log('')
  console.log('Employees are not created by this seed. They appear when users sign in (Entra sync)')
  console.log('or when an admin imports the tenant directory:')
  console.log('  POST /api/admin/users/sync  (Bearer: admin user)  OR  x-sync-secret header for cron')
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
