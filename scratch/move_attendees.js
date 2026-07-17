const { Client } = require('pg');

async function main() {
  const connectionString = 'postgresql://postgres.sqnkupionbghgjbmlkri:BTiUwvNaLOhCWCX0@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const redemptionIds = [
    'cmroqk4oi0001ji09k0c4getw',
    'cmroqkdm80001l909sh4e496e',
    'cmroqkq450007l909yvau715a',
    'cmroqp1vm0001jx093ar2iri5',
    'cmroqp9lf0001l409weqb7rl8',
    'cmroqpt2t0001l7091zfuwvig'
  ];

  const targetSessionId = 'cmrlwg1pd0001jo09xjvizy0z'; // AQA kids session on July 16, 2026
  const targetActivityId = 'cmrjpxptz0001ju09ux1iees1'; // AQA kids activity ID
  const newReason = 'Redeemed AQA kids enfant /papa (Kid)';

  try {
    await client.connect();
    console.log('Connected to Supabase. Starting transaction...');
    await client.query('BEGIN');

    // 1. Update Redemptions
    console.log('Updating Redemptions...');
    const updateRedemptionsResult = await client.query(`
      UPDATE "Redemption"
      SET "activityId" = $1, "sessionId" = $2
      WHERE "id" = ANY($3)
    `, [targetActivityId, targetSessionId, redemptionIds]);
    
    console.log(`Successfully updated ${updateRedemptionsResult.rowCount} Redemption records.`);

    // 2. Update Ledger Entries
    console.log('Updating Ledger Entries...');
    const updateLedgerResult = await client.query(`
      UPDATE "LedgerEntry"
      SET "reason" = $1
      WHERE "redemptionId" = ANY($2)
    `, [newReason, redemptionIds]);

    console.log(`Successfully updated ${updateLedgerResult.rowCount} LedgerEntry records.`);

    // Commit Transaction
    await client.query('COMMIT');
    console.log('Transaction committed successfully!');

  } catch (err) {
    console.error('Error occurred, rolling back transaction...', err.message);
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Failed to rollback transaction:', rollbackErr.message);
    }
  } finally {
    await client.end();
  }
}

main();
