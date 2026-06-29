const { PrismaClient } = require('@prisma/client');

process.env.DATABASE_URL = 'postgresql://postgres.sqnkupionbghgjbmlkri:BTiUwvNaLOhCWCX0@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20&connect_timeout=30';

async function main() {
  const prisma = new PrismaClient();
  try {
    const res = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'members'
      )
    `;
    console.log('Members table exists in sqnkupionbghgjbmlkri:', res);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
