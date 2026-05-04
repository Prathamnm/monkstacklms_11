const { Client } = require('pg');

const passwords = ['postgres', 'admin', 'password', '123456', '', 'root', 'Postgres123'];

async function tryPassword(pwd) {
  const connStr = `postgresql://postgres:${pwd}@localhost:5432/postgres`;
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch (e) {
    return false;
  }
}

async function findPassword() {
  for (const pwd of passwords) {
    console.log(`Trying: "${pwd}"`);
    if (await tryPassword(pwd)) {
      console.log(`\nSUCCESS! Password is: "${pwd}"`);
      return pwd;
    }
  }
  console.log('\nNone worked. What password did you set during PostgreSQL install?');
  return null;
}

findPassword();
