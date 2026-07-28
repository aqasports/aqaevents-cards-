export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const backupKey = request.headers.get("X-Backup-Key");
    const validBackupKey = process.env.BACKUP_API_KEY;
    const hasValidKey = validBackupKey && backupKey === validBackupKey;
    
    // We assume an admin session might exist via a known cookie or authorization header.
    // Here we check for a generic admin session cookie or auth header if the key is not present.
    const hasAdminSession = request.cookies.has("admin_session") || request.headers.has("Authorization");

    if (!hasValidKey && !hasAdminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    const supabaseUrl = process.env.SUPABASE_STORAGE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    let uploaded = false;
    let uploadPath = null;
    let deletedCount = 0;

    if (supabaseUrl && supabaseKey) {
      const filenameDate = timestamp.replace(/[:.]/g, "-");
      const filename = `aqa-backup-${filenameDate}.json`;
      
      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/db-backups/${filename}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(backupData)
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        logger.error("[ERROR] Failed to upload backup to Supabase", errorText);
      } else {
        uploaded = true;
        uploadPath = `db-backups/${filename}`;
      }

      // 14-day rotation
      const listRes = await fetch(`${supabaseUrl}/storage/v1/object/list/db-backups`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prefix: "", limit: 1000 })
      });

      if (listRes.ok) {
        const objects: Array<{ name: string; created_at: string }> = await listRes.json();
        
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const toDelete = objects
          .filter(obj => {
            if (!obj.name.endsWith(".json")) return false;
            const createdAt = new Date(obj.created_at);
            return createdAt < fourteenDaysAgo;
          })
          .map(obj => obj.name);

        if (toDelete.length > 0) {
          const deleteRes = await fetch(`${supabaseUrl}/storage/v1/object/db-backups`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ prefixes: toDelete })
          });
          
          if (deleteRes.ok) {
            deletedCount = toDelete.length;
          } else {
            logger.error("[WARN] Failed to delete old backups", await deleteRes.text());
          }
        }
      } else {
        logger.error("[WARN] Failed to list backups for rotation", await listRes.text());
      }
    }

    return NextResponse.json({
      success: true,
      metadata: backupData.metadata,
      uploaded,
      uploadPath,
      deletedCount
    });
  } catch (error) {
    logger.error("[ERROR] Backup endpoint failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
