const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const actCount = await prisma.activity.count();
    const pkgCount = await prisma.package.count();
    console.log('RESULTS_START');
    console.log('Activity count in local DATABASE_URL:', actCount);
    console.log('Package count in local DATABASE_URL:', pkgCount);
    console.log('RESULTS_END');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
