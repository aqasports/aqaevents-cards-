import { execSync } from 'child_process';
import { Client } from 'pg';

async function main() {
  let envJson: string;
  try {
    envJson = execSync('npx netlify env:list --json', { encoding: 'utf8' });
  } catch (err: any) {
    return;
  }

  let vars: Record<string, string> = {};
  try {
    const parsed = JSON.parse(envJson);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item.key && item.value) {
          vars[item.key] = item.value;
        }
      }
    } else {
      vars = parsed;
    }
  } catch (err: any) {
    return;
  }

  const prodDbUrl = vars.DATABASE_URL;
  if (!prodDbUrl) return;

  const client = new Client({ connectionString: prodDbUrl });
  await client.connect();

  try {
    // Search notification logs containing 'daouedi' or '0566789065' or 'AQA-989751'
    const logsRes = await client.query(
      'SELECT * FROM "NotificationLog" WHERE recipient = \'0566789065\' OR message LIKE \'%AQA-989751%\' ORDER BY "sentAt" ASC'
    );
    console.log('--- NOTIFICATION LOGS ---');
    console.log(logsRes.rows.map(row => ({
      id: row.id,
      recipient: row.recipient,
      message: row.message,
      sentAt: row.sentAt
    })));

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main().catch(e => console.error(e));
