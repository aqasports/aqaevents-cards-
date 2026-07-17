const { Client } = require('pg');

async function main() {
  const connectionString = 'postgresql://aqa_user:aqa_password@localhost:5432/aqa_event_card';
  console.log('Testing connection to local PostgreSQL:', connectionString);
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Successfully connected to local PostgreSQL database!');
    const res = await client.query('SELECT name FROM sqlite_master WHERE type=\'table\''); // Wait, postgres doesn't have sqlite_master, let's query information_schema
    console.log('Querying tables...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables found:', tables.rows.map(r => r.table_name));
    
    // Check Client count
    const clientCount = await client.query('SELECT COUNT(*) FROM "Client"');
    console.log('Client count:', clientCount.rows[0].count);
    
  } catch (err) {
    console.log('Failed to connect to local PostgreSQL:', err.message);
  } finally {
    await client.end();
  }
}

main();
