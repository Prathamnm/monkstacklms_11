const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const allLeaves = await prisma.leaveRequest.findMany({
      include: {
        employee: {
          select: { displayName: true, workEmail: true }
        }
      }
    });
    
    console.log('Total leaves in DB:', allLeaves.length);
    const breakdown = allLeaves.reduce((acc, l) => {
      const key = `${l.employee?.displayName || 'Unknown'} (${l.status})`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Breakdown by Employee and Status:');
    console.log(JSON.stringify(breakdown, null, 2));
    
    // Check if there are any leaves with status PENDING but maybe missing employee link?
    const orphaned = await prisma.leaveRequest.findMany({
      where: { employeeId: { equals: '' } }
    });
    console.log('Orphaned leaves (empty employeeId):', orphaned.length);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
