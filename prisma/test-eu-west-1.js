const { PrismaClient } = require('@prisma/client');

async function testPooler(host) {
  const url = `postgresql://postgres.qhetuxenvgfizfpexzit:BTiUwvNaLOhCWCX0@${host}:6543/postgres?pgbouncer=true&connection_limit=1`;
  console.log('Testing', host);
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('🎉 CONNECTED TO', host);
  } catch (err) {
    console.log('Failed:', err.message.split('\n')[0] || err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await testPooler('aws-0-eu-west-1.pooler.supabase.com');
  await testPooler('aws-1-eu-west-1.pooler.supabase.com');
}

main();
