const { Client } = require('pg')

const ADMIN_URL = 'postgresql://postgres:postgres@localhost:5432/postgres'

async function setup() {
  const client = new Client({ connectionString: ADMIN_URL })
  
  try {
    await client.connect()
    console.log('Connected to PostgreSQL admin database')
    
    // Check if moonshine user exists
    const userCheck = await client.query(
      "SELECT 1 FROM pg_roles WHERE rolname = 'moonshine'"
    )
    
    if (userCheck.rows.length === 0) {
      await client.query("CREATE USER moonshine WITH PASSWORD 'moonshine'")
      console.log('Created user: moonshine')
    } else {
      console.log('User moonshine already exists')
    }
    
    // Check if database exists
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'moonshine_lms'"
    )
    
    if (dbCheck.rows.length === 0) {
      await client.query('CREATE DATABASE moonshine_lms')
      console.log('Created database: moonshine_lms')
    } else {
      console.log('Database moonshine_lms already exists')
    }
    
    // Grant privileges
    await client.query('GRANT ALL PRIVILEGES ON DATABASE moonshine_lms TO moonshine')
    console.log('Granted privileges to moonshine')
    
    console.log('\nSetup complete! Update your .env.local:')
    console.log('DATABASE_URL="postgresql://moonshine:moonshine@localhost:5432/moonshine_lms"')
    
  } catch (err) {
    console.error('Error:', err.message)
    console.log('\nTroubleshooting:')
    console.log('1. Check if postgres password is "postgres" (try: postgres, admin, or your Windows password)')
    console.log('2. If password is different, edit ADMIN_URL in this script')
    process.exit(1)
  } finally {
    await client.end()
  }
}

setup()
