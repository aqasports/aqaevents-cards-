import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canViewSession } from "@/lib/coach-rbac";
import { getGroupRoster } from "@/lib/swim-roster";
import { computeEndTime, extractGroupScheduleMeta } from "@/lib/swim-sessions";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, coach, role } = await requireCoachSession(req);
  if (error || !coach) return error;

  const { id: sessionId } = await params;

  try {
    const session = await prisma.swimSession.findUnique({
      where: { id: sessionId },
      include: {
        group: true,
        attendances: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    const isAllowed = await canViewSession(
      { coachId: coach.id, role, coachName: coach.name },
      { id: session.id, groupId: session.groupId, actualCoachId: session.actualCoachId }
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this session." },
        { status: 403, headers: corsHeaders }
      );
    }

    const [roster, ratingLog, otherSwimmers] = await Promise.all([
      getGroupRoster(session.groupId),
      prisma.auditLog.findFirst({
        where: {
          action: "COACH_SESSION_RATING",
          target: sessionId,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.swimMember.findMany({
        where: {
          groupStatus: { not: "rejected" },
        },
        select: {
          id: true,
          swimId: true,
          fullName: true,
          category: true,
          level: true,
          groupId: true,
        },
        orderBy: { fullName: "asc" },
        take: 150,
      }),
    ]);

    let sessionRating: Record<string, unknown> | null = null;
    if (ratingLog?.details) {
      try {
        sessionRating = JSON.parse(ratingLog.details);
      } catch {
        sessionRating = null;
      }
    }

    // Map existing attendances (strictly binary present/absent)
    const attendanceByMemberId = new Map(
      session.attendances.map((a) => [a.memberId, a])
    );

    const normalizeBinaryStatus = (raw?: string | null) =>
      raw?.toLowerCase() === "absent" ? "absent" : "present";

    const shapedMembers = roster.map((m) => {
      const att = attendanceByMemberId.get(m.id);
      const binStatus = normalizeBinaryStatus(att?.status);
      return {
        id: m.id,
        memberId: m.id,
        swimId: m.swimId,
        fullName: m.fullName,
        phone: role === "assistant" ? null : m.phone,
        category: m.category,
        level: m.level,
        cardCode: m.cardCode,
        paymentStatus: m.paymentStatus,
        status: binStatus,
        rawStatus: att ? binStatus : "unmarked",
        isMarked: Boolean(att),
        method: att?.method ?? "manual",
        note: att?.note ?? null,
        notes: att?.note ?? null,
        isGuest: att?.isGuest ?? false,
        markedAt: att?.markedAt ? att.markedAt.toISOString() : null,
      };
    });

    // Also include any guest attendees who were not in the default roster
    for (const att of session.attendances) {
      if (!roster.some((m) => m.id === att.memberId)) {
        const guestMember = await prisma.swimMember.findUnique({
          where: { id: att.memberId },
          select: {
            id: true,
            swimId: true,
            fullName: true,
            phone: true,
            category: true,
            level: true,
          },
        });
        if (guestMember) {
          const binStatus = normalizeBinaryStatus(att.status);
          shapedMembers.push({
            id: guestMember.id,
            memberId: guestMember.id,
            swimId: guestMember.swimId,
            fullName: guestMember.fullName,
            phone: role === "assistant" ? null : guestMember.phone,
            category: guestMember.category,
            level: guestMember.level,
            cardCode: null,
            paymentStatus: "paid",
            status: binStatus,
            rawStatus: binStatus,
            isMarked: true,
            method: att.method,
            note: att.note,
            notes: att.note,
            isGuest: true,
            markedAt: att.markedAt ? att.markedAt.toISOString() : null,
          });
        }
      }
    }

    const rosterIds = new Set(shapedMembers.map((m) => m.memberId));
    const clubSwimmers = otherSwimmers
      .filter((s) => !rosterIds.has(s.id))
      .map((s) => ({
        id: s.id,
        swimId: s.swimId,
        fullName: s.fullName,
        category: s.category,
        level: s.level,
      }));

    const meta = extractGroupScheduleMeta(session.group.schedule);
    const endTime = computeEndTime(session.startTime, 60);
    const pool = session.location || meta.pool || "Piscine AQA";
    const isViewOnly = role === "assistant" || session.status === "cancelled";

    return NextResponse.json(
      {
        session: {
          id: session.id,
          groupId: session.groupId,
          groupName: session.group.name,
          category: session.group.category,
          level: session.group.level,
          sessionDate: session.sessionDate.toISOString().split("T")[0],
          startTime: session.startTime,
          endTime,
          pool,
          location: pool,
          status: session.status,
          cancelReason: session.cancelReason,
          closedAt: session.closedAt ? session.closedAt.toISOString() : null,
          canEdit: !isViewOnly,
          isViewOnly,
          sessionRating,
        },
        members: shapedMembers,
        groupMembers: shapedMembers,
        attendance: session.attendances.map((a) => {
          const bin = normalizeBinaryStatus(a.status);
          return {
            id: a.id,
            sessionId: a.sessionId,
            memberId: a.memberId,
            status: bin.toUpperCase(),
            rawStatus: bin,
            isGuest: a.isGuest,
            note: a.note,
            notes: a.note,
          };
        }),
        clubSwimmers,
        sessionRating,
        isViewOnly,
        canEdit: !isViewOnly,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    logger.error("GET /api/coach/sessions/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to load session details." },
      { status: 500, headers: corsHeaders }
    );
  }
}
