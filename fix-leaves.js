// Quick script to fix join date
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Update all employees who joined today to have joined on Jan 1
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const updated = await prisma.employee.updateMany({
      where: {
        joinDate: {
          gte: today,
        }
      },
      data: {
        joinDate: new Date('2026-01-01'),
      }
    });
    
    console.log(`Updated ${updated.count} employees with joinDate = 2026-01-01\n`);
    
    // Now recalculate all leave balances
    const employees = await prisma.employee.findMany({
      select: { id: true, displayName: true, email: true, joinDate: true }
    });
    
    for (const emp of employees) {
      const year = new Date().getFullYear();
      const joiningMonth = emp.joinDate.getMonth() + 1;
      const remainingMonths = 13 - joiningMonth;
      const proratedStandard = (remainingMonths / 12) * 18;
      const proratedEmergency = (remainingMonths / 12) * 2;
      
      await prisma.leaveBalance.upsert({
        where: { employeeId: emp.id },
        create: {
          employeeId: emp.id,
          year,
          standardTotal: proratedStandard,
          standardAccrued: 0,
          standardUsed: 0,
          standardCarryForward: 0,
          emergencyTotal: proratedEmergency,
          emergencyUsed: 0,
        },
        update: {
          standardTotal: proratedStandard,
          emergencyTotal: proratedEmergency,
        }
      });
      
      console.log(`${emp.displayName} (${emp.email}): ${proratedStandard} days (joined: ${emp.joinDate.toISOString().split('T')[0]})`);
    }
    
    console.log('\n✅ All leave balances fixed!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
