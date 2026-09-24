import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getStoredCallRecords } from "@/lib/swim-calls-server";
import crypto from "crypto";

export const SWIM_LAST_BACKUP_SETTING_KEY = "swim_last_backup_info";

export interface SwimBackupMetadata {
  timestamp: string;
  version: string;
  generator: string;
  checksum: string;
  counts: {
    members: number;
    groups: number;
    leads: number;
    payments: number;
    cards: number;
    callRecords: number;
  };
  totalRecords: number;
}

export interface SwimBackupData {
  metadata: SwimBackupMetadata;
  data: {
    members: any[];
    groups: any[];
    leads: any[];
    payments: any[];
    cards: any[];
    callRecords: Record<string, any>;
  };
}

export interface LastBackupInfo {
  timestamp: string;
  totalRecords: number;
  filename: string;
  storageStatus: "cloud" | "local";
  triggeredBy?: string;
  counts: {
    members: number;
    groups: number;
    leads: number;
    payments: number;
    cards: number;
    callRecords: number;
  };
}

/**
 * Fetches all AQA Swim records across all models and generates
 * a structured, checksummed snapshot object.
 */
export async function generateSwimBackupData(triggeredBy = "admin"): Promise<SwimBackupData> {
  const [members, groups, leads, payments, cards, callRecords] = await Promise.all([
    prisma.swimMember.findMany({
      include: {
        payments: { orderBy: { paidAt: "desc" } },
        card: true,
        group: { select: { id: true, name: true, coachName: true, schedule: true, level: true, category: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.swimGroup.findMany({
      include: {
        _count: { select: { swimmers: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.swimLead.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.swimPayment.findMany({
      orderBy: { paidAt: "asc" },
    }),
    prisma.swimCard.findMany({
      orderBy: { issuedAt: "asc" },
    }),
    getStoredCallRecords(),
  ]);

  const timestamp = new Date().toISOString();
  const counts = {
    members: members.length,
    groups: groups.length,
    leads: leads.length,
    payments: payments.length,
    cards: cards.length,
    callRecords: Object.keys(callRecords || {}).length,
  };

  const totalRecords =
    counts.members +
    counts.groups +
    counts.leads +
    counts.payments +
    counts.cards +
    counts.callRecords;

  const rawDataPayload = JSON.stringify({
    members,
    groups,
    leads,
    payments,
    cards,
    callRecords,
  });

  const checksum = crypto.createHash("sha256").update(rawDataPayload).digest("hex");

  const metadata: SwimBackupMetadata = {
    timestamp,
    version: "1.0.0",
    generator: `AQA Swim Backup Subsystem (${triggeredBy})`,
    checksum,
    counts,
    totalRecords,
  };

  return {
    metadata,
    data: {
      members,
      groups,
      leads,
      payments,
      cards,
      callRecords,
    },
  };
}

/**
 * Converts specific Swim datasets into clean, standard RFC 4180 CSV strings.
 */
export function convertSwimDataToCsv(
  type: "members" | "payments" | "leads" | "groups",
  data: any[]
): string {
  function escapeCsvCell(val: any): string {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  if (type === "members") {
    const headers = [
      "Swim ID",
      "Full Name",
      "Phone",
      "Email",
      "Category",
      "Level",
      "Formula",
      "Duration",
      "Price DA",
      "Payment Status",
      "Group Status",
      "Assigned Group",
      "Coach",
      "Date of Start",
      "Subscription Start",
      "Subscription End",
      "Created At",
      "Notes",
    ];

    const rows = (data || []).map((m) => [
      escapeCsvCell(m.swimId),
      escapeCsvCell(m.fullName),
      escapeCsvCell(m.phone),
      escapeCsvCell(m.email),
      escapeCsvCell(m.category),
      escapeCsvCell(m.level),
      escapeCsvCell(m.formula),
      escapeCsvCell(m.duration),
      escapeCsvCell(m.priceDA),
      escapeCsvCell(m.paymentStatus),
      escapeCsvCell(m.groupStatus),
      escapeCsvCell(m.group?.name || ""),
      escapeCsvCell(m.group?.coachName || ""),
      escapeCsvCell(m.dateOfStart ? new Date(m.dateOfStart).toISOString().slice(0, 10) : ""),
      escapeCsvCell(m.subscriptionStart ? new Date(m.subscriptionStart).toISOString().slice(0, 10) : ""),
      escapeCsvCell(m.subscriptionEnd ? new Date(m.subscriptionEnd).toISOString().slice(0, 10) : ""),
      escapeCsvCell(m.createdAt ? new Date(m.createdAt).toISOString() : ""),
      escapeCsvCell(m.notes),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  }

  if (type === "payments") {
    const headers = [
      "Payment ID",
      "Member ID",
      "Amount DA",
      "Method",
      "Paid At",
      "Notes",
      "Created At",
    ];

    const rows = (data || []).map((p) => [
      escapeCsvCell(p.id),
      escapeCsvCell(p.memberId),
      escapeCsvCell(p.amount),
      escapeCsvCell(p.method),
      escapeCsvCell(p.paidAt ? new Date(p.paidAt).toISOString() : ""),
      escapeCsvCell(p.notes),
      escapeCsvCell(p.createdAt ? new Date(p.createdAt).toISOString() : ""),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  }

  if (type === "leads") {
    const headers = [
      "Lead ID",
      "Full Name",
      "Phone",
      "Email",
      "Category",
      "Level",
      "Frequency",
      "Formula",
      "Duration",
      "Preferred Days",
      "Status",
      "Created At",
      "Notes",
    ];

    const rows = (data || []).map((l) => [
      escapeCsvCell(l.id),
      escapeCsvCell(l.fullName),
      escapeCsvCell(l.phone),
      escapeCsvCell(l.email),
      escapeCsvCell(l.category),
      escapeCsvCell(l.level),
      escapeCsvCell(l.frequency),
      escapeCsvCell(l.formula),
      escapeCsvCell(l.duration),
      escapeCsvCell(l.preferredDays),
      escapeCsvCell(l.status),
      escapeCsvCell(l.createdAt ? new Date(l.createdAt).toISOString() : ""),
      escapeCsvCell(l.notes),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  }

  if (type === "groups") {
    const headers = [
      "Group ID",
      "Name",
      "Category",
      "Level",
      "Coach Name",
      "Schedule",
      "Capacity",
      "Enrolled Count",
      "Active",
      "Created At",
    ];

    const rows = (data || []).map((g) => [
      escapeCsvCell(g.id),
      escapeCsvCell(g.name),
      escapeCsvCell(g.category),
      escapeCsvCell(g.level),
      escapeCsvCell(g.coachName),
      escapeCsvCell(g.schedule),
      escapeCsvCell(g.capacity),
      escapeCsvCell(g._count?.swimmers || g.swimmers?.length || 0),
      escapeCsvCell(g.active ? "Yes" : "No"),
      escapeCsvCell(g.createdAt ? new Date(g.createdAt).toISOString() : ""),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  }

  return "";
}

/**
 * Validates any raw backup JSON structure without modifying the database.
 * Computes difference with live database statistics.
 */
export async function validateSwimBackupSnapshot(raw: any) {
  if (!raw || typeof raw !== "object") {
    return { isValid: false, error: "Invalid backup format: Not a JSON object." };
  }

  if (!raw.metadata || typeof raw.metadata !== "object") {
    return { isValid: false, error: "Missing 'metadata' header in backup file." };
  }

  if (!raw.data || typeof raw.data !== "object") {
    return { isValid: false, error: "Missing 'data' container in backup file." };
  }

  const { members, groups, leads, payments, cards } = raw.data;

  if (
    !Array.isArray(members) ||
    !Array.isArray(groups) ||
    !Array.isArray(leads) ||
    !Array.isArray(payments) ||
    !Array.isArray(cards)
  ) {
    return {
      isValid: false,
      error: "Data tables must be arrays of members, groups, leads, payments, and cards.",
    };
  }

  // Get live counts from DB for comparison
  const [liveMembers, liveGroups, liveLeads, livePayments, liveCards] = await Promise.all([
    prisma.swimMember.count(),
    prisma.swimGroup.count(),
    prisma.swimLead.count(),
    prisma.swimPayment.count(),
    prisma.swimCard.count(),
  ]);

  const backupCounts = {
    members: members.length,
    groups: groups.length,
    leads: leads.length,
    payments: payments.length,
    cards: cards.length,
    callRecords: Object.keys(raw.data.callRecords || {}).length,
  };

  const liveCounts = {
    members: liveMembers,
    groups: liveGroups,
    leads: liveLeads,
    payments: livePayments,
    cards: liveCards,
  };

  const sampleMembers = members.slice(0, 5).map((m: any) => ({
    swimId: m.swimId || "Unknown",
    fullName: m.fullName || "Unknown",
    category: m.category || "Unknown",
    formula: m.formula || "Unknown",
    paymentStatus: m.paymentStatus || "Unknown",
  }));

  return {
    isValid: true,
    metadata: raw.metadata,
    backupCounts,
    liveCounts,
    sampleMembers,
  };
}

/**
 * Uploads a Swim backup payload to Supabase Storage if configured.
 * Uses the db-backups bucket with 'swim/' prefix.
 */
export async function uploadSwimBackupToSupabase(backupData: SwimBackupData) {
  const supabaseUrl = process.env.SUPABASE_STORAGE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { uploaded: false, reason: "Supabase storage credentials not configured." };
  }

  const filenameDate = backupData.metadata.timestamp.replace(/[:.]/g, "-");
  const filename = `swim/aqa-swim-backup-${filenameDate}.json`;

  try {
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/db-backups/${filename}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(backupData),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      logger.error("Failed to upload Swim backup to Supabase storage:", errText);
      return { uploaded: false, error: errText };
    }

    return {
      uploaded: true,
      path: `db-backups/${filename}`,
      filename,
    };
  } catch (err: any) {
    logger.error("Error during Swim backup upload:", err);
    return { uploaded: false, error: err.message || "Network error" };
  }
}

/**
 * Lists available swim backups from Supabase storage.
 */
export async function listSwimBackupsFromSupabase(): Promise<
  Array<{ name: string; created_at: string; size?: number; downloadUrl?: string }>
> {
  const supabaseUrl = process.env.SUPABASE_STORAGE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return [];
  }

  try {
    const listRes = await fetch(`${supabaseUrl}/storage/v1/object/list/db-backups`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefix: "swim", limit: 100 }),
    });

    if (listRes.ok) {
      const objects: Array<{ name: string; created_at: string; metadata?: { size?: number } }> =
        await listRes.json();
      return objects
        .filter((obj) => obj.name.endsWith(".json"))
        .map((obj) => ({
          name: obj.name,
          created_at: obj.created_at,
          size: obj.metadata?.size,
          downloadUrl: `${supabaseUrl}/storage/v1/object/public/db-backups/${obj.name}`,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  } catch (err) {
    logger.error("Failed to list Swim backups from Supabase:", err);
  }
  return [];
}

/**
 * Reads stored last backup metadata from PlatformSetting.
 */
export async function getLastSwimBackupInfo(): Promise<LastBackupInfo | null> {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: SWIM_LAST_BACKUP_SETTING_KEY },
      select: { value: true },
    });
    if (setting?.value) {
      return JSON.parse(setting.value) as LastBackupInfo;
    }
  } catch (err) {
    logger.error("Failed to read last swim backup info:", err);
  }
  return null;
}

/**
 * Persists last backup metadata to PlatformSetting.
 */
export async function setLastSwimBackupInfo(info: LastBackupInfo): Promise<void> {
  try {
    const val = JSON.stringify(info);
    await prisma.platformSetting.upsert({
      where: { key: SWIM_LAST_BACKUP_SETTING_KEY },
      create: { key: SWIM_LAST_BACKUP_SETTING_KEY, value: val },
      update: { value: val },
    });
  } catch (err) {
    logger.error("Failed to write last swim backup info:", err);
  }
}
