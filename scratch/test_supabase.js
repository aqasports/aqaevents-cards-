const { Client } = require('pg');

async function main() {
  const connectionString = 'postgresql://postgres.sqnkupionbghgjbmlkri:BTiUwvNaLOhCWCX0@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';
  console.log('Testing connection to Supabase sqnkupionbghgjbmlkri with rejectUnauthorized: false...');
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Successfully connected to Supabase database!');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables found:', tables.rows.map(r => r.table_name));
    
    // Check Client count
    if (tables.rows.some(r => r.table_name === 'Client')) {
      const clientCount = await client.query('SELECT COUNT(*) FROM "Client"');
      console.log('Client count in "Client":', clientCount.rows[0].count);
    }
    
  } catch (err) {
    console.log('Failed to connect to Supabase:', err.message);
  } finally {
    await client.end();
  }
}

main();
