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
    
    const redemptionIds = [
      'cmroqk4oi0001ji09k0c4getw',
      'cmroqkdm80001l909sh4e496e',
      'cmroqkq450007l909yvau715a',
      'cmroqp1vm0001jx093ar2iri5',
      'cmroqp9lf0001l409weqb7rl8',
      'cmroqpt2t0001l7091zfuwvig'
    ];
    
    console.log('Checking CheckIns associated with redemptions...');
    const checkinsRes = await client.query(`
      SELECT * FROM "CheckIn"
      WHERE "redemptionId" = ANY($1)
    `, [redemptionIds]);
    console.log('CheckIns found:', checkinsRes.rows);
    
    console.log('Checking LedgerEntries associated with redemptions...');
    const ledgerRes = await client.query(`
      SELECT * FROM "LedgerEntry"
      WHERE "redemptionId" = ANY($1)
    `, [redemptionIds]);
    console.log('LedgerEntries found:', ledgerRes.rows);
    
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
