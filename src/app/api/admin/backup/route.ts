import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  try {
    // Export all tables
    const [
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
      adminUsersRaw,
      notificationLogs,
      products,
      demands,
      proposals
    ] = await prisma.$transaction([
      prisma.client.findMany(),
      prisma.card.findMany(),
      prisma.ledgerEntry.findMany(),
      prisma.redemption.findMany(),
      prisma.invoice.findMany(),
      prisma.package.findMany(),
      prisma.activity.findMany(),
      prisma.activitySession.findMany(),
      prisma.activityExpense.findMany(),
      prisma.auditLog.findMany(),
      prisma.adminUser.findMany(),
      prisma.notificationLog.findMany(),
      prisma.product.findMany(),
      prisma.cardDemand.findMany(),
      prisma.activityProposal.findMany()
    ]);

    // Sanitize admin users to remove password hash
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

    // Log the backup action
    await logAdminAction(
      session.user.id,
      "BACKUP_EXPORT",
      "System Database",
      `Exported database backup: ${JSON.stringify(backupData.metadata.counts)}`
    );

    // Format timestamp for filename
    const filenameDate = timestamp.replace(/[:.]/g, "-");
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Content-Disposition", `attachment; filename=aqa-backup-${filenameDate}.json`);

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers
    });
  } catch (err: unknown) {
    console.error("Backup creation failed:", err);
    return NextResponse.json(
      { error: "Backup creation failed: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
