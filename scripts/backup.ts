import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  console.log("Starting local backup export...");
  
  if (dbUrl.includes("supabase.com") || dbUrl.includes("neon.tech") || dbUrl.includes("amazonaws.com")) {
    console.log("⚠️  WARNING: Running backup against remote database: " + dbUrl.split("@")[1]);
  } else {
    console.log("ℹ️  Running backup against local database: " + dbUrl);
  }

  try {
    const clients = await prisma.client.findMany();
    const cards = await prisma.card.findMany();
    const ledgerEntries = await prisma.ledgerEntry.findMany();
    const redemptions = await prisma.redemption.findMany();
    const invoices = await prisma.invoice.findMany();
    const packages = await prisma.package.findMany();
    const activities = await prisma.activity.findMany();
    const sessions = await prisma.activitySession.findMany();
    const expenses = await prisma.activityExpense.findMany();
    const auditLogs = await prisma.auditLog.findMany();
    const adminUsersRaw = await prisma.adminUser.findMany();
    const notificationLogs = await prisma.notificationLog.findMany();
    const products = await prisma.product.findMany();
    const demands = await prisma.cardDemand.findMany();
    const proposals = await prisma.activityProposal.findMany();

    const adminUsers = adminUsersRaw.map(({ passwordHash, ...rest }) => rest);

    const timestamp = new Date().toISOString();
    const backupData = {
      metadata: {
        timestamp,
        version: "1.0.0",
        counts: {
          clients: clients.length,
          cards: cards.length,
          ledgerEntries: ledgerEntries.length,
          redemptions: redemptions.length,
          invoices: invoices.length,
          packages: packages.length,
          activities: activities.length,
          sessions: sessions.length,
          expenses: expenses.length,
          auditLogs: auditLogs.length,
          adminUsers: adminUsers.length,
          notificationLogs: notificationLogs.length,
          products: products.length,
          demands: demands.length,
          proposals: proposals.length
        }
      },
      data: {
        clients,
        cards,
        ledgerEntries,
        redemptions,
        invoices,
        packages,
        activities,
        sessions,
        expenses,
        auditLogs,
        adminUsers,
        notificationLogs,
        products,
        demands,
        proposals
      }
    };

    const backupsDir = path.join(__dirname, "../backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const filenameDate = timestamp.replace(/[:.]/g, "-");
    const filepath = path.join(backupsDir, `aqa-backup-${filenameDate}.json`);

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), "utf8");
    console.log(`\n✅ Backup successfully saved to: ${filepath}`);
    console.log("Record counts:");
    console.log(JSON.stringify(backupData.metadata.counts, null, 2));
  } catch (err: unknown) {
    console.error("❌ Backup failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
