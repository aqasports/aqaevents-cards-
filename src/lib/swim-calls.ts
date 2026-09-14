import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/audit";

export type SwimCallStatus =
  | "to_call"
  | "callback_scheduled"
  | "interested"
  | "reinscribed"
  | "unreachable"
  | "declined";

export type SwimCallOutcome =
  | "answered_interested"
  | "answered_callback"
  | "answered_reinscribed"
  | "answered_declined"
  | "no_answer"
  | "busy"
  | "invalid_number";

export type ReinscriptionIntent = "high" | "medium" | "low" | "none";

export interface SwimCallEntry {
  id: string;
  callerName: string;
  callerEmail?: string;
  outcome: SwimCallOutcome;
  observation: string;
  reinscriptionIntent: ReinscriptionIntent;
  callbackDate: string | null;
  calledAt: string;
}

export interface SwimCallRecord {
  id: string;
  entityType: "member" | "lead";
  entityId: string;
  swimId?: string;
  fullName: string;
  phone: string;
  email?: string | null;
  category: string;
  level: string;
  formula: string;
  duration: string;
  dateOfStart: string;
  expirationDate: string;
  groupId?: string | null;
  groupName?: string | null;
  coachName?: string | null;
  status: SwimCallStatus;
  reinscriptionIntent: ReinscriptionIntent;
  lastOutcome?: SwimCallOutcome | null;
  lastObservation?: string | null;
  lastCalledAt?: string | null;
  callbackDate?: string | null;
  callHistory: SwimCallEntry[];
  proposedFormula?: string | null;
  proposedDuration?: string | null;
  proposedGroupId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const SWIM_CALLS_SETTING_KEY = "swim_reinscription_calls";

/**
 * Calculates the expiration date of a swim subscription based on dateOfStart and duration.
 */
export function calculateSubscriptionExpiration(dateOfStart: Date | string, duration?: string | null): Date {
  const start = typeof dateOfStart === "string" ? new Date(dateOfStart) : new Date(dateOfStart.getTime());
  if (isNaN(start.getTime())) {
    return new Date();
  }

  const result = new Date(start);
  const dur = (duration || "3m").toLowerCase().trim();

  if (dur === "1m") {
    result.setMonth(result.getMonth() + 1);
  } else if (dur === "3m") {
    result.setMonth(result.getMonth() + 3);
  } else if (dur === "6m") {
    result.setMonth(result.getMonth() + 6);
  } else if (dur === "9m") {
    result.setMonth(result.getMonth() + 9);
  } else if (dur === "12m" || dur === "1y") {
    result.setFullYear(result.getFullYear() + 1);
  } else {
    // Default fallback: 3 months
    result.setMonth(result.getMonth() + 3);
  }

  return result;
}

/**
 * Determines the call urgency based on subscription expiration and scheduled callback date.
 */
export function getCallUrgency(
  expirationDate: Date | string,
  callbackDate?: Date | string | null
): "due_today" | "overdue" | "expiring_soon" | "active" {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (callbackDate) {
    const cb = typeof callbackDate === "string" ? new Date(callbackDate) : callbackDate;
    if (!isNaN(cb.getTime())) {
      if (cb <= todayEnd) {
        if (cb < todayStart) return "overdue";
        return "due_today";
      }
    }
  }

  const exp = typeof expirationDate === "string" ? new Date(expirationDate) : expirationDate;
  if (isNaN(exp.getTime())) return "active";

  if (exp < todayStart) {
    return "overdue";
  }

  const fourteenDaysFuture = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (exp <= fourteenDaysFuture) {
    return "expiring_soon";
  }

  return "active";
}

/**
 * Formats a phone number for Algerian WhatsApp (replaces leading 0 with 213).
 */
export function formatAlgerianPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) {
    return `213${digits.slice(1)}`;
  }
  if (!digits.startsWith("213") && digits.length >= 9) {
    return `213${digits}`;
  }
  return digits;
}

/**
 * Generates a clean WhatsApp link with a professional reinscription template.
 * Strictly no emojis.
 */
export function formatWhatsAppReinscriptionUrl(
  phone: string,
  fullName: string,
  currentFormula?: string | null
): string {
  const waNumber = formatAlgerianPhoneForWhatsApp(phone);
  const formulaText = currentFormula ? ` (formule ${currentFormula})` : "";
  const message = `Salam ${fullName}, l'equipe AQA Swim vous contacte pour le renouvellement de votre inscription${formulaText}. Souhaitez-vous conserver votre creneau habituel ou ajuster votre formule pour la prochaine session ? N'hesitez pas a nous repondre ou a nous contacter directement.`;
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}

let cachedCallRecords: { data: Record<string, SwimCallRecord>; timestamp: number } | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds

export function invalidateCallRecordsCache(): void {
  cachedCallRecords = null;
}

/**
 * Reads all stored call records from PlatformSetting.
 */
export async function getStoredCallRecords(): Promise<Record<string, SwimCallRecord>> {
  const now = Date.now();
  if (cachedCallRecords && now - cachedCallRecords.timestamp < CACHE_TTL_MS) {
    return cachedCallRecords.data;
  }

  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: SWIM_CALLS_SETTING_KEY },
      select: { value: true },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (typeof parsed === "object" && parsed !== null) {
        cachedCallRecords = { data: parsed as Record<string, SwimCallRecord>, timestamp: now };
        return parsed as Record<string, SwimCallRecord>;
      }
    }
  } catch (err) {
    logger.error("Failed to read swim call records from PlatformSetting:", err);
  }
  return {};
}

/**
 * Persists all stored call records to PlatformSetting.
 */
export async function saveStoredCallRecords(records: Record<string, SwimCallRecord>): Promise<void> {
  cachedCallRecords = { data: records, timestamp: Date.now() };
  const serialized = JSON.stringify(records);
  await prisma.platformSetting.upsert({
    where: { key: SWIM_CALLS_SETTING_KEY },
    create: {
      key: SWIM_CALLS_SETTING_KEY,
      value: serialized,
    },
    update: {
      value: serialized,
    },
  });
}

/**
 * Helper to record a call outcome and sync with SwimMember notes.
 */
export async function logCallForEntity(params: {
  entityId: string;
  callerName: string;
  callerEmail?: string;
  outcome: SwimCallOutcome;
  observation: string;
  reinscriptionIntent: ReinscriptionIntent;
  callbackDate?: string | null;
  proposedFormula?: string | null;
  proposedDuration?: string | null;
  proposedGroupId?: string | null;
  userId?: string | null;
}): Promise<SwimCallRecord | null> {
  const {
    entityId,
    callerName,
    callerEmail,
    outcome,
    observation,
    reinscriptionIntent,
    callbackDate,
    proposedFormula,
    proposedDuration,
    proposedGroupId,
    userId,
  } = params;

  const now = new Date().toISOString();
  const records = await getStoredCallRecords();
  let existing = records[entityId];

  // If not found in records, fetch member to construct base
  if (!existing) {
    const member = await prisma.swimMember.findUnique({
      where: { id: entityId },
      include: { group: true },
    });

    if (member) {
      const expDate = calculateSubscriptionExpiration(member.dateOfStart, member.duration).toISOString();
      existing = {
        id: member.id,
        entityType: "member",
        entityId: member.id,
        swimId: member.swimId,
        fullName: member.fullName,
        phone: member.phone,
        email: member.email,
        category: member.category,
        level: member.level,
        formula: member.formula,
        duration: member.duration || "3m",
        dateOfStart: member.dateOfStart.toISOString(),
        expirationDate: expDate,
        groupId: member.groupId,
        groupName: member.group?.name || null,
        coachName: member.group?.coachName || null,
        status: "to_call",
        reinscriptionIntent: "none",
        callHistory: [],
        createdAt: now,
        updatedAt: now,
      };
    } else {
      // Check if it's a lead
      const lead = await prisma.swimLead.findUnique({
        where: { id: entityId },
      });
      if (lead) {
        const expDate = calculateSubscriptionExpiration(lead.createdAt, lead.duration).toISOString();
        existing = {
          id: lead.id,
          entityType: "lead",
          entityId: lead.id,
          fullName: lead.fullName,
          phone: lead.phone,
          email: lead.email,
          category: lead.category || "homme",
          level: lead.level || "beginner",
          formula: lead.formula || "G10",
          duration: lead.duration || "3m",
          dateOfStart: lead.createdAt.toISOString(),
          expirationDate: expDate,
          status: "to_call",
          reinscriptionIntent: "none",
          callHistory: [],
          createdAt: now,
          updatedAt: now,
        };
      }
    }
  }

  if (!existing) {
    return null;
  }

  // Determine new call status
  let newStatus: SwimCallStatus = existing.status;
  if (outcome === "answered_reinscribed") {
    newStatus = "reinscribed";
  } else if (outcome === "answered_interested") {
    newStatus = "interested";
  } else if (outcome === "answered_callback") {
    newStatus = "callback_scheduled";
  } else if (outcome === "answered_declined") {
    newStatus = "declined";
  } else if (outcome === "no_answer" || outcome === "busy" || outcome === "invalid_number") {
    newStatus = "unreachable";
  }

  const callEntry: SwimCallEntry = {
    id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    callerName,
    callerEmail,
    outcome,
    observation: observation.trim(),
    reinscriptionIntent,
    callbackDate: callbackDate || null,
    calledAt: now,
  };

  existing.status = newStatus;
  existing.lastOutcome = outcome;
  existing.lastObservation = observation.trim();
  existing.lastCalledAt = now;
  existing.callbackDate = callbackDate || null;
  existing.reinscriptionIntent = reinscriptionIntent;
  if (proposedFormula) existing.proposedFormula = proposedFormula;
  if (proposedDuration) existing.proposedDuration = proposedDuration;
  if (proposedGroupId) existing.proposedGroupId = proposedGroupId;
  existing.updatedAt = now;
  existing.callHistory = [callEntry, ...(existing.callHistory || [])];

  records[entityId] = existing;
  await saveStoredCallRecords(records);

  // Sync to SwimMember.notes if entity is a member
  if (existing.entityType === "member") {
    try {
      const member = await prisma.swimMember.findUnique({
        where: { id: entityId },
        select: { notes: true },
      });
      const dateFormatted = new Date().toLocaleDateString("en-GB");
      const noteLine = `[Call ${dateFormatted} by ${callerName} - ${outcome}]: ${observation.trim()}`;
      const updatedNotes = member?.notes ? `${member.notes}\n${noteLine}` : noteLine;

      await prisma.swimMember.update({
        where: { id: entityId },
        data: { notes: updatedNotes },
      });
    } catch (err) {
      logger.error("Failed to sync call observation to SwimMember.notes:", err);
    }
  }

  // Audit log
  await logAdminAction(
    userId ?? null,
    "SWIM_CALL_LOGGED",
    `SwimCall:${existing.fullName} (${existing.phone})`,
    JSON.stringify({
      outcome,
      status: newStatus,
      reinscriptionIntent,
      observation: observation.trim(),
    })
  );

  return existing;
}
