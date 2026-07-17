const { Client } = require('pg');

async function main() {
  const connectionString = 'postgresql://postgres.sqnkupionbghgjbmlkri:BTiUwvNaLOhCWCX0@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Connected to Supabase!');
    
    // Find all sessions in July 2026
    const res = await client.query(`
      SELECT 
        s.id as session_id, 
        s."sessionDate", 
        s.location, 
        s.capacity, 
        s.active,
        a.id as activity_id,
        a.name as activity_name
      FROM "ActivitySession" s
      JOIN "Activity" a ON s."activityId" = a.id
      WHERE s."sessionDate" >= '2026-07-01 00:00:00'
        AND s."sessionDate" <= '2026-07-31 23:59:59'
    `);
    
    console.log(`Found ${res.rows.length} sessions in July 2026:`);
    for (const s of res.rows) {
      console.log(`Session: ${s.session_id}`);
      console.log(`  Activity: ${s.activity_name} (ID: ${s.activity_id})`);
      console.log(`  Date: ${s.sessionDate}`);
      console.log(`  Location: ${s.location}`);
      console.log(`  Active: ${s.active}`);
      
      // Get redemptions for this session
      const red = await client.query(`
        SELECT r.id as redemption_id, c."fullName" as client_name, r."creditsUsed", c.id as client_id
        FROM "Redemption" r
        JOIN "Client" c ON r."clientId" = c.id
        WHERE r."sessionId" = $1
      `, [s.session_id]);
      
      console.log(`  Redemptions (${red.rows.length}):`);
      for (const r of red.rows) {
        console.log(`    - Redemption: ${r.redemption_id}, Client: ${r.client_name} (ID: ${r.client_id}), Credits: ${r.creditsUsed}`);
      }
      console.log('----------------------------');
    }
    
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
