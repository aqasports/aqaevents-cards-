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
    console.log('Querying sqlite_master for tables...');
    const tables = await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );
    console.log('Tables found:', tables);

    for (const t of tables) {
      const countResult = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "${t.name}"`
      );
      // SQLite returns count as BigInt or Number depending on driver, so let's format it
      const count = countResult[0].count;
      console.log(`Table: ${t.name}, Row Count: ${count}`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
