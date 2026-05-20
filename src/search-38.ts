
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tables = ['Employee', 'LeaveBalance', 'LeaveRequest', 'LeaveLedgerEntry', 'AccrualRule', 'SystemSettings']
  
  for (const table of tables) {
    // @ts-expect-error - dynamic Prisma delegate access (debug script)
    const records = await prisma[table.charAt(0).toLowerCase() + table.slice(1)].findMany()
    for (const record of records) {
      const json = JSON.stringify(record)
      if (json.includes('38')) {
        console.log(`Found 38 in ${table}:`, record)
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
