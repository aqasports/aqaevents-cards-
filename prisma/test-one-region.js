const { PrismaClient } = require('@prisma/client');

process.env.DATABASE_URL = 'postgresql://postgres.qhetuxenvgfizfpexzit:BTiUwvNaLOhCWCX0@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Connected!');
  } catch (err) {
    console.log('Error name:', err.name);
    console.log('Error message:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
