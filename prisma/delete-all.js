const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.sqnkupionbghgjbmlkri:BTiUwvNaLOhCWCX0@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20&connect_timeout=30'
    }
  }
});

async function main() {
  const before = await prisma.activity.count();
  console.log('Count BEFORE delete (via pooler):', before);

  const deleted = await prisma.activity.deleteMany({});
  console.log('Deleted:', deleted.count, 'records');

  const after = await prisma.activity.count();
  console.log('Count AFTER delete:', after);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
