const { PrismaClient } = require('@prisma/client');

const regions = [
  'eu-central-1',
  'eu-west-3',
  'eu-west-1',
  'eu-west-2',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ca-central-1',
  'sa-east-1'
];

async function tryRegion(region) {
  const url = `postgresql://postgres.qhetuxenvgfizfpexzit:BTiUwvNaLOhCWCX0@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10&connect_timeout=10`;
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });
  try {
    const c = await prisma.$queryRaw`SELECT count(*) FROM "members"`;
    console.log(`\n🎉 SUCCESS! Connected via region ${region}!`);
    console.log('URL:', url);
    process.exit(0);
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('ENOTFOUND')) {
      // tenant not found in this region
      process.stdout.write('.');
    } else {
      console.log(`\nRegion ${region} failed with:`, err.message.split('\n')[0]);
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('Testing regions for pooler host...');
  for (const r of regions) {
    await tryRegion(r);
    // Also try aws-1- just in case
    const url2 = `postgresql://postgres.qhetuxenvgfizfpexzit:BTiUwvNaLOhCWCX0@aws-1-${r}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10&connect_timeout=10`;
    const prisma2 = new PrismaClient({
      datasources: {
        db: { url: url2 }
      }
    });
    try {
      const c = await prisma2.$queryRaw`SELECT count(*) FROM "members"`;
      console.log(`\n🎉 SUCCESS! Connected via region ${r} (aws-1)!`);
      console.log('URL:', url2);
      process.exit(0);
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('ENOTFOUND')) {
        process.stdout.write('.');
      } else {
        console.log(`\nRegion ${r} (aws-1) failed with:`, err.message.split('\n')[0]);
      }
    } finally {
      await prisma2.$disconnect();
    }
  }
  console.log('\nAll regions finished.');
}

main();
