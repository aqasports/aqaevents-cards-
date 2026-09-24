import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/audit";
import {
  generateSwimBackupData,
  convertSwimDataToCsv,
  validateSwimBackupSnapshot,
  uploadSwimBackupToSupabase,
  listSwimBackupsFromSupabase,
  getLastSwimBackupInfo,
  setLastSwimBackupInfo,
  LastBackupInfo,
} from "@/lib/swim-backup";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "status";

  try {
    // 1. Status Overview & History
    if (action === "status") {
      const [membersCount, groupsCount, leadsCount, paymentsCount, cardsCount, paymentsAgg, lastBackup, cloudBackups] =
        await Promise.all([
          prisma.swimMember.count(),
          prisma.swimGroup.count(),
          prisma.swimLead.count(),
          prisma.swimPayment.count(),
          prisma.swimCard.count(),
          prisma.swimPayment.aggregate({
            _sum: { amount: true },
          }),
          getLastSwimBackupInfo(),
          listSwimBackupsFromSupabase(),
        ]);

      const liveCounts = {
        members: membersCount,
        groups: groupsCount,
        leads: leadsCount,
        payments: paymentsCount,
        cards: cardsCount,
        totalRevenueCollected: paymentsAgg._sum.amount || 0,
      };

      const hasCloudStorage = Boolean(
        process.env.SUPABASE_STORAGE_URL && process.env.SUPABASE_SERVICE_KEY
      );

      return NextResponse.json({
        liveCounts,
        lastBackup,
        hasCloudStorage,
        cloudBackups,
      });
    }

    // 2. Direct JSON Download
    if (action === "download") {
      const backup = await generateSwimBackupData(session.user?.name || "Admin");
      const filenameDate = backup.metadata.timestamp.replace(/[:.]/g, "-");
      const filename = `aqa-swim-backup-${filenameDate}.json`;

      await logAdminAction(
        session.user?.id || null,
        "SWIM_BACKUP_DOWNLOADED",
        `Manual JSON download: ${filename}`,
        JSON.stringify(backup.metadata.counts)
      );

      return new NextResponse(JSON.stringify(backup, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // 3. Export CSV (Members)
    if (action === "export-members-csv") {
      const members = await prisma.swimMember.findMany({
        include: {
          group: { select: { name: true, coachName: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const csv = convertSwimDataToCsv("members", members);
      const filename = `aqa-swimmers-${new Date().toISOString().slice(0, 10)}.csv`;

      await logAdminAction(
        session.user?.id || null,
        "SWIM_MEMBERS_CSV_EXPORTED",
        `Exported ${members.length} swimmers to CSV`
      );

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // 4. Export CSV (Payments Ledger)
    if (action === "export-payments-csv") {
      const payments = await prisma.swimPayment.findMany({
        orderBy: { paidAt: "desc" },
      });

      const csv = convertSwimDataToCsv("payments", payments);
      const filename = `aqa-swim-payments-${new Date().toISOString().slice(0, 10)}.csv`;

      await logAdminAction(
        session.user?.id || null,
        "SWIM_PAYMENTS_CSV_EXPORTED",
        `Exported ${payments.length} payment transactions to CSV`
      );

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // 5. Export CSV (Leads)
    if (action === "export-leads-csv") {
      const leads = await prisma.swimLead.findMany({
        orderBy: { createdAt: "desc" },
      });

      const csv = convertSwimDataToCsv("leads", leads);
      const filename = `aqa-swim-leads-${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    logger.error("GET /api/admin/swim/backup error:", err);
    return NextResponse.json({ error: "Failed to process backup request" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "create";

  try {
    // 1. Dry-Run Validation / Preview of an uploaded backup file
    if (action === "preview") {
      const body = await request.json();
      const snapshot = body.snapshot || body;
      const report = await validateSwimBackupSnapshot(snapshot);

      await logAdminAction(
        session.user?.id || null,
        "SWIM_BACKUP_VALIDATION_INSPECTED",
        `Validated backup: ${report.isValid ? "Valid" : "Invalid"}`
      );

      return NextResponse.json(report);
    }

    // 2. Create Instant Backup & Upload to Cloud Storage
    const backup = await generateSwimBackupData(session.user?.name || "Admin");
    const filenameDate = backup.metadata.timestamp.replace(/[:.]/g, "-");
    const filename = `aqa-swim-backup-${filenameDate}.json`;

    const uploadResult = await uploadSwimBackupToSupabase(backup);

    const info: LastBackupInfo = {
      timestamp: backup.metadata.timestamp,
      totalRecords: backup.metadata.totalRecords,
      filename,
      storageStatus: uploadResult.uploaded ? "cloud" : "local",
      triggeredBy: session.user?.name || session.user?.email || "Admin",
      counts: backup.metadata.counts,
    };

    await setLastSwimBackupInfo(info);

    await logAdminAction(
      session.user?.id || null,
      "SWIM_BACKUP_CREATED",
      `Backup snapshot created: ${filename} (${info.storageStatus})`,
      JSON.stringify(backup.metadata.counts)
    );

    return NextResponse.json({
      success: true,
      info,
      uploadResult,
      metadata: backup.metadata,
    });
  } catch (err) {
    logger.error("POST /api/admin/swim/backup error:", err);
    return NextResponse.json({ error: "Failed to create backup snapshot" }, { status: 500 });
  }
}
