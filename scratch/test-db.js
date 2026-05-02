const { PrismaClient } = require('@prisma/client')

async function main() {
  const url = "postgresql://postgres:postgres@localhost:5432/postgres"
  console.log('Testing connection to:', url)
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  })

  try {
    await prisma.$connect()
    console.log('Successfully connected to database!')
  } catch (e) {
    console.error('Connection failed!')
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
