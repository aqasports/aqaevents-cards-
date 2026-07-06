import { PrismaClient } from "@prisma/client";
import { syncClientCRM } from "../src/lib/crm";

// --- PRODUCTION SAFETY GUARD ---
const dbUrl = process.env.DATABASE_URL ?? "";
if (dbUrl.includes("supabase.com") || dbUrl.includes("neon.tech") || dbUrl.includes("amazonaws.com")) {
  console.error("\n  BLOCKED: This script cannot run against a production database.");
  console.error("  Your DATABASE_URL points to a remote hosted database.");
  console.error("  Use the local Docker database instead: docker-compose up -d\n");
  process.exit(1);
}

const prisma = new PrismaClient();


async function main() {
  console.log("Starting CRM synchronization for all clients...");
  const clients = await prisma.client.findMany({ select: { id: true, fullName: true } });
  console.log(`Found ${clients.length} clients to process.`);

  for (const client of clients) {
    try {
      await syncClientCRM(client.id);
      console.log(`✓ Synchronized client: ${client.fullName} (${client.id})`);
    } catch (err) {
      console.error(`✗ Failed to synchronize client ${client.fullName} (${client.id}):`, err);
    }
  }

  console.log("CRM synchronization completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
