const { Client } = require('pg');

const ADMIN_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';

async function setup() {
  console.log('Connecting to PostgreSQL...');
  const client = new Client({ connectionString: ADMIN_URL });
  
  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL admin database');
    
    // Check if moonshine_lms database exists
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'moonshine_lms'"
    );
    
    if (dbCheck.rows.length === 0) {
      await client.query('CREATE DATABASE moonshine_lms');
      console.log('✓ Created database: moonshine_lms');
    } else {
      console.log('✓ Database moonshine_lms already exists');
    }
    
    console.log('\n✓ Database setup complete!');
    console.log('Now run: npx prisma migrate dev --name init');
    
  } catch (err) {
    console.error('Error:', err.message);
    console.log('\nIf password "postgres" is incorrect, edit ADMIN_URL in this file');
  } finally {
    await client.end();
  }
}

setup();
