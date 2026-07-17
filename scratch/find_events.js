const fs = require('fs');
const path = require('path');

// Manually load env variables from .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
  });
}

// Convert DATABASE_URL to use absolute path to prisma/dev.db
const absoluteDbPath = path.resolve(__dirname, '../prisma/dev.db');
process.env.DATABASE_URL = `file:${absoluteDbPath}`;
console.log('Using database path:', process.env.DATABASE_URL);

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Searching for all sessions in database...');
    
    const sessions = await prisma.activitySession.findMany({
      include: {
        activity: true,
        redemptions: {
          include: {
            client: true
          }
        }
      }
    });

    console.log(`Total sessions found: ${sessions.length}`);
    sessions.forEach(s => {
      console.log(`Session ID: ${s.id}`);
      console.log(`Activity: ${s.activity.name} (ID: ${s.activity.id})`);
      console.log(`Date: ${s.sessionDate.toISOString()} (Raw: ${s.sessionDate})`);
      console.log(`Location: ${s.location}`);
      console.log(`Redemptions count: ${s.redemptions.length}`);
      s.redemptions.forEach(r => {
        console.log(`  - Redemption ID: ${r.id}, Client: ${r.client.fullName} (ID: ${r.client.id})`);
      });
      console.log('------------------------');
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
