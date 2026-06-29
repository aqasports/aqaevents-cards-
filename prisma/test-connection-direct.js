const { PrismaClient } = require('@prisma/client');

process.env.DATABASE_URL = 'postgresql://postgres:BTiUwvNaLOhCWCX0@db.qhetuxenvgfizfpexzit.supabase.co:5432/postgres';

async function main() {
  const prisma = new PrismaClient();
  try {
    const c = await prisma.$queryRaw`SELECT count(*) FROM "members"`;
    console.log('Success! Connected directly to qhetuxenvgfizfpexzit database. Members:', c);
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
