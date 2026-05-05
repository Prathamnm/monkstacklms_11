
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Inspecting Audit Logs...')
  try {
    const allLogs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    })
    console.log(`Found ${allLogs.length} logs.`)
    
    const actionCounts: Record<string, number> = {}
    allLogs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
    })
    console.log('Action distribution:', actionCounts)

    // Normalize bad action keys if found
    const map: Record<string, string> = {
      'LEAVE_APPROVED': 'LEAVE_APPROVE',
      'LEAVE_REJECTED': 'LEAVE_REJECT',
      'LEAVE_CANCELLED': 'LEAVE_CANCEL',
      'LEAVE_REVOKED': 'LEAVE_REVOKE'
    }

    for (const log of allLogs) {
      if (map[log.action]) {
        console.log(`Updating log ${log.id}: ${log.action} -> ${map[log.action]}`)
        await prisma.auditLog.update({
          where: { id: log.id },
          data: { action: map[log.action] as any }
        })
      }
    }
    console.log('Normalization complete.')
  } catch (err) {
    console.error('Error during inspection:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
