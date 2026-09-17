import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  calculateSubscriptionExpiration,
  getCallUrgency,
  getStoredCallRecords,
  logCallForEntity,
  SwimCallRecord,
  SwimCallStatus,
} from "@/lib/swim-calls";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || "all";
  const categoryFilter = searchParams.get("category") || "all";
  const urgencyFilter = searchParams.get("urgency") || "all";
  const searchQuery = (searchParams.get("q") || "").toLowerCase().trim();

  try {
    // 1. Fetch active members and stored call records concurrently with selective projection
    const [members, storedRecords] = await Promise.all([
      prisma.swimMember.findMany({
        select: {
          id: true,
          swimId: true,
          fullName: true,
          phone: true,
          email: true,
          category: true,
          level: true,
          formula: true,
          duration: true,
          dateOfStart: true,
          groupId: true,
          createdAt: true,
          updatedAt: true,
          group: {
            select: {
              name: true,
              coachName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      getStoredCallRecords(),
    ]);

    // 2. Build unified call targets list
    const unifiedList: (SwimCallRecord & { urgency: string })[] = [];

    for (const m of members) {
      try {
        const stored = storedRecords[m.id];
        const expirationDate = calculateSubscriptionExpiration(m.dateOfStart, m.duration).toISOString();
        const status: SwimCallStatus = stored?.status || "to_call";
        const urgency = getCallUrgency(stored?.expirationDate || expirationDate, stored?.callbackDate);
        const dateOfStartStr = m.dateOfStart ? m.dateOfStart.toISOString() : new Date().toISOString();
        const createdAtStr = m.createdAt ? m.createdAt.toISOString() : new Date().toISOString();
        const updatedAtStr = m.updatedAt ? m.updatedAt.toISOString() : new Date().toISOString();

        const record: SwimCallRecord & { urgency: string } = {
          id: m.id,
          entityType: "member",
          entityId: m.id,
          swimId: m.swimId,
          fullName: m.fullName,
          phone: m.phone,
          email: m.email,
          category: m.category,
          level: m.level,
          formula: m.formula,
          duration: m.duration || "3m",
          dateOfStart: dateOfStartStr,
          expirationDate: stored?.expirationDate || expirationDate,
          groupId: m.groupId,
          groupName: m.group?.name || null,
          coachName: m.group?.coachName || null,
          status,
          reinscriptionIntent: stored?.reinscriptionIntent || "none",
          lastOutcome: stored?.lastOutcome || null,
          lastObservation: stored?.lastObservation || null,
          lastCalledAt: stored?.lastCalledAt || null,
          callbackDate: stored?.callbackDate || null,
          callHistory: stored?.callHistory || [],
          proposedFormula: stored?.proposedFormula || null,
          proposedDuration: stored?.proposedDuration || null,
          proposedGroupId: stored?.proposedGroupId || null,
          createdAt: stored?.createdAt || createdAtStr,
          updatedAt: stored?.updatedAt || updatedAtStr,
          urgency,
        };

        unifiedList.push(record);
      } catch (rowErr) {
        logger.warn("Skipping corrupted swimmer in calls pipeline:", rowErr);
      }
    }

    // Include any standalone leads stored in records that are not members (O(1) lookup)
    const memberIdSet = new Set(members.map((m) => m.id));
    for (const [id, rec] of Object.entries(storedRecords)) {
      if (rec.entityType === "lead" && !memberIdSet.has(id)) {
        const urgency = getCallUrgency(rec.expirationDate, rec.callbackDate);
        unifiedList.push({ ...rec, urgency });
      }
    }

    // 4. Compute pipeline stats across all records before filtering
    const stats = {
      totalPipeline: unifiedList.length,
      toCall: unifiedList.filter((r) => r.status === "to_call").length,
      callbackScheduled: unifiedList.filter((r) => r.status === "callback_scheduled").length,
      interested: unifiedList.filter((r) => r.status === "interested").length,
      reinscribed: unifiedList.filter((r) => r.status === "reinscribed").length,
      unreachable: unifiedList.filter((r) => r.status === "unreachable").length,
      declined: unifiedList.filter((r) => r.status === "declined").length,
      dueToday: unifiedList.filter((r) => r.urgency === "due_today" || r.urgency === "overdue").length,
      conversionRate:
        unifiedList.length > 0
          ? Math.round((unifiedList.filter((r) => r.status === "reinscribed").length / unifiedList.length) * 100)
          : 0,
    };

    // 5. Apply filters
    let filtered = unifiedList;

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((r) => (r.category || "").toLowerCase() === categoryFilter.toLowerCase());
    }

    if (urgencyFilter !== "all") {
      filtered = filtered.filter((r) => r.urgency === urgencyFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter((r) => {
        return (
          (r.fullName && r.fullName.toLowerCase().includes(searchQuery)) ||
          (r.phone && r.phone.includes(searchQuery)) ||
          (r.swimId && r.swimId.toLowerCase().includes(searchQuery)) ||
          (r.lastObservation && r.lastObservation.toLowerCase().includes(searchQuery))
        );
      });
    }

    return NextResponse.json({
      records: filtered,
      stats,
    });
  } catch (err: unknown) {
    logger.error("GET admin swim calls error:", err);
    return NextResponse.json({ error: "Failed to fetch swim call records" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await request.json();
    const {
      entityId,
      outcome,
      observation,
      reinscriptionIntent,
      callbackDate,
      proposedFormula,
      proposedDuration,
      proposedGroupId,
    } = body;

    if (!entityId || !outcome || !observation) {
      return NextResponse.json(
        { error: "entityId, outcome, and observation are required" },
        { status: 400 }
      );
    }

    const callerName = session.user?.name || session.user?.email || "Staff";
    const callerEmail = session.user?.email || undefined;

    const updated = await logCallForEntity({
      entityId,
      callerName,
      callerEmail,
      outcome,
      observation,
      reinscriptionIntent: reinscriptionIntent || "medium",
      callbackDate: callbackDate || null,
      proposedFormula: proposedFormula || null,
      proposedDuration: proposedDuration || null,
      proposedGroupId: proposedGroupId || null,
      userId: session.user?.id || null,
    });

    if (!updated) {
      return NextResponse.json({ error: "Target entity not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, record: updated });
  } catch (err: unknown) {
    logger.error("POST admin swim call error:", err);
    return NextResponse.json({ error: "Failed to log swim call" }, { status: 500 });
  }
}
