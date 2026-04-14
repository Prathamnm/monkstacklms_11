import { prisma } from '@/lib/db/prisma'
import { calculateProratedLeaves, calculateProratedEmergencyLeaves } from '@/lib/leave/prorateService'

async function fixLeaveBalances() {
  try {
    const year = new Date().getFullYear()
    
    const employees = await prisma.employee.findMany({
      where: { employmentStatus: 'ACTIVE' },
      select: { id: true, displayName: true, joinDate: true },
    })
    
    console.log(`Found ${employees.length} active employees\n`)
    
    for (const emp of employees) {
      const balance = await prisma.leaveBalance.findUnique({
        where: { employeeId: emp.id },
      })
      
      if (!balance) {
        console.log(`⚠️  No balance record for ${emp.displayName}`)
        continue
      }
      
      const proratedStandard = calculateProratedLeaves(emp.joinDate, 18, year)
      const proratedEmergency = calculateProratedEmergencyLeaves(emp.joinDate, 2, year)
      
      if (balance.standardTotal !== proratedStandard || balance.emergencyTotal !== proratedEmergency) {
        console.log(`Updating ${emp.displayName}:`)
        console.log(`  Join Date: ${emp.joinDate.toISOString().split('T')[0]}`)
        console.log(`  Old Standard: ${balance.standardTotal} → New: ${proratedStandard}`)
        console.log(`  Old Emergency: ${balance.emergencyTotal} → New: ${proratedEmergency}`)
        
        await prisma.leaveBalance.update({
          where: { employeeId: emp.id },
          data: {
            standardTotal: proratedStandard,
            emergencyTotal: proratedEmergency,
          },
        })
        console.log(`  ✅ Updated\n`)
      } else {
        console.log(`✓ ${emp.displayName} - Already correct (${proratedStandard} days)\n`)
      }
    }
    
    console.log('✅ All leave balances fixed!')
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

fixLeaveBalances()
