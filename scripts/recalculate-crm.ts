import { PrismaClient } from "@prisma/client";
import { syncClientCRM } from "../src/lib/crm";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting full CRM metrics and Total Spent recalculation for all clients...");

  const clients = await prisma.client.findMany({
    select: { id: true, fullName: true }
  });

  console.log(`Found ${clients.length} clients to process.`);

  let successCount = 0;
  for (const client of clients) {
    try {
      await syncClientCRM(client.id);
      
      // Fetch updated details to log them
      const updated = await prisma.client.findUnique({
        where: { id: client.id },
        select: { totalSpent: true, customerSegment: true }
      });
      
      console.log(`✓ Recalculated client "${client.fullName}" (${client.id}): Total Spent = ${updated?.totalSpent ?? 0} DA, Segment = ${updated?.customerSegment}`);
      successCount++;
    } catch (err) {
      console.error(`✕ Failed to recalculate client "${client.fullName}" (${client.id}):`, err);
    }
  }

  console.log(`CRM Recalculation complete. Successfully updated ${successCount}/${clients.length} clients.`);
}

main()
  .catch((e) => {
    console.error("Fatal error during CRM recalculation script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
