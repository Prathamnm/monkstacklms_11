
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Querying raw database schema for audit_logs...')
  try {
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'audit_logs'
    `
    console.log('Table Info:', tableInfo)

    const enumInfo = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE typname = 'AuditAction'
    `
    console.log('Enum Info:', enumInfo)
    
    // Check for any records with invalid actions
    const records = await prisma.$queryRaw`SELECT id, action FROM audit_logs LIMIT 50`
    console.log('Recent records raw:', records)

  } catch (err) {
    console.error('Raw query error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
