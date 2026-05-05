
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Deep Cleaning Audit Logs...')
  try {
    const allLogs = await prisma.auditLog.findMany()
    console.log(`Processing ${allLogs.length} logs.`)
    
    const map: Record<string, string> = {
      'LEAVE_APPROVED': 'LEAVE_APPROVE',
      'LEAVE_REJECTED': 'LEAVE_REJECT',
      'LEAVE_CANCELLED': 'LEAVE_CANCEL',
      'LEAVE_REVOKED': 'LEAVE_REVOKE'
    }

    let updatedCount = 0
    for (const log of allLogs) {
      if (map[log.action]) {
        await prisma.auditLog.update({
          where: { id: log.id },
          data: { action: map[log.action] as any }
        })
        updatedCount++
      }
    }
    console.log(`Normalization complete. Updated ${updatedCount} records.`)
  } catch (err) {
    console.error('Error during deep clean:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
