const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, '../backups/aqa-backup-2026-07-06T14-24-40-220Z.json');
if (!fs.existsSync(backupPath)) {
  console.log('Backup file does not exist.');
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

console.log('--- Searching Backup ---');
console.log('Metadata count:');
console.log(backup.metadata);

console.log('\n--- Activities in Backup:');
backup.data.activities.forEach(a => {
  console.log(`Activity ID: ${a.id}, Name: ${a.name}`);
});

console.log('\n--- Sessions in Backup:');
backup.data.sessions.forEach(s => {
  const act = backup.data.activities.find(a => a.id === s.activityId);
  console.log(`Session ID: ${s.id}, Date: ${s.sessionDate}, Location: ${s.location}, Activity: ${act ? act.name : s.activityId}`);
});

console.log('\n--- Redemptions in Backup:');
backup.data.redemptions.forEach(r => {
  const c = backup.data.clients.find(cl => cl.id === r.clientId);
  const act = backup.data.activities.find(a => a.id === r.activityId);
  console.log(`Redemption ID: ${r.id}, Client: ${c ? c.fullName : r.clientId}, Activity: ${act ? act.name : r.activityId}`);
});
