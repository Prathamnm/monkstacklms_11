// Create moonshine_lms database using Windows authentication (trust mode)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Find PostgreSQL data directory
const pgDataPaths = [
  'C:\\Program Files\\PostgreSQL\\15\\data',
  'C:\\Program Files\\PostgreSQL\\14\\data',
  'C:\\Program Files\\PostgreSQL\\16\\data',
];

let pgDataPath = null;
for (const p of pgDataPaths) {
  if (fs.existsSync(p)) {
    pgDataPath = p;
    break;
  }
}

if (!pgDataPath) {
  console.log('PostgreSQL data directory not found. Trying default...');
  pgDataPath = 'C:\\Program Files\\PostgreSQL\\15\\data';
}

console.log('Found PostgreSQL at:', pgDataPath);

// Stop PostgreSQL
console.log('\n1. Stopping PostgreSQL...');
try {
  execSync('net stop postgresql-x64-15', { stdio: 'inherit' });
} catch (e) {
  console.log('   Already stopped or service name different');
}

// Modify pg_hba.conf to allow trust authentication
const hbaPath = path.join(pgDataPath, 'pg_hba.conf');
console.log('\n2. Modifying pg_hba.conf for passwordless auth...');

if (fs.existsSync(hbaPath)) {
  let hbaContent = fs.readFileSync(hbaPath, 'utf8');
  
  // Replace md5/scram-sha-256 with trust for local connections
  hbaContent = hbaContent.replace(/^(host\s+all\s+all\s+127\.0\.0\.1\/32\s+)(md5|scram-sha-256|password)/gm, '$1trust');
  hbaContent = hbaContent.replace(/^(host\s+all\s+all\s+::1\/128\s+)(md5|scram-sha-256|password)/gm, '$1trust');
  hbaContent = hbaContent.replace(/^(local\s+all\s+all\s+)(md5|scram-sha-256|password)/gm, '$1trust');
  
  fs.writeFileSync(hbaPath, hbaContent);
  console.log('   Updated pg_hba.conf');
} else {
  console.log('   pg_hba.conf not found at:', hbaPath);
}

// Start PostgreSQL
console.log('\n3. Starting PostgreSQL...');
try {
  execSync('net start postgresql-x64-15', { stdio: 'inherit' });
} catch (e) {
  console.log('   Failed to start. Trying alternative...');
}

console.log('\n4. Now you can connect without password!');
console.log('   Update .env.local with:');
console.log('   DATABASE_URL="postgresql://postgres@localhost:5432/postgres"');
console.log('\n5. Then run: npx prisma migrate dev --name init');
