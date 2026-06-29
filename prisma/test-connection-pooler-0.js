const { PrismaClient } = require('@prisma/client');

process.env.DATABASE_URL = 'postgresql://postgres.qhetuxenvgfizfpexzit:BTiUwvNaLOhCWCX0@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20&connect_timeout=30';

async function main() {
  const prisma = new PrismaClient();
  try {
    const c = await prisma.$queryRaw`SELECT count(*) FROM "members"`;
    console.log('Success! Connected via pooler 0. Members:', c);
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
