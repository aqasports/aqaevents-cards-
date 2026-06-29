const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const activities = await prisma.activity.findMany({});
    console.log('--- ACTIVITIES IN DATABASE ---');
    activities.forEach(act => {
      console.log(`ID: ${act.id} | Name: ${act.name} | Active: ${act.active} | Places: ${act.places}`);
    });
    console.log('------------------------------');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
