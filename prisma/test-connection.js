const { Client } = require('pg');
const connectionString = 'postgresql://postgres.qhetuxenvgfizfpexzit:BTiUwvNaLOhCWCX0@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require';

async function testConn() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Success! Connected to qhetuxenvgfizfpexzit database.');
    const res = await client.query('SELECT count(*) FROM "members"');
    console.log('Members count:', res.rows[0].count);
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

testConn();
