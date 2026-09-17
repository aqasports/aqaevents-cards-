import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/audit";
import {
  SwimCallRecord,
  SwimCallStatus,
  SwimCallOutcome,
  ReinscriptionIntent,
  SwimCallEntry,
  calculateSubscriptionExpiration,
} from "./swim-calls";

export const SWIM_CALLS_SETTING_KEY = "swim_reinscription_calls";

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
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
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
