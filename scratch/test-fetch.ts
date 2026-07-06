import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const clients = await prisma.client.findMany({
      where: {
        archived: false
      }
    });
    console.log("Local fetch successful! Found clients:", clients.length);
  } catch (err) {
    console.error("Local fetch failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
