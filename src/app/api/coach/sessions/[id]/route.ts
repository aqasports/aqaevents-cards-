import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canViewSession } from "@/lib/coach-rbac";
import { getGroupRoster } from "@/lib/swim-roster";
import { computeEndTime, extractGroupScheduleMeta } from "@/lib/swim-sessions";
import {
  aggregateSwimmerCumulativeBilan,
  computeSwimmerSuiviProgression,
} from "@/lib/swim-skills";
import { getCurrentHonorLockStatus } from "@/lib/swim-honors";
import {
  computeIsNewClientSwimmer,
  getMovedSwimmerIds,
} from "@/lib/swim-coach-notifications";
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

    const [roster, ratingLog, otherSwimmers, honorLockStatus] = await Promise.all([
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
      getCurrentHonorLockStatus(),
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

    // Fetch reviews for all roster + attendance members in one query to hydrate bars & stored Bilan
    const allMemberIds = Array.from(
      new Set([
        ...roster.map((m) => m.id),
        ...session.attendances.map((a) => a.memberId),
      ])
    );

    const [memberReviews, memberAttendances, movedMemberIds] =
      allMemberIds.length > 0
        ? await Promise.all([
            prisma.swimTechReview.findMany({
              where: { memberId: { in: allMemberIds } },
              orderBy: { createdAt: "desc" },
              select: {
                memberId: true,
                skills: true,
                metrics: true,
                strengths: true,
                recommendedLevel: true,
              },
            }),
            prisma.swimAttendance.findMany({
              where: { memberId: { in: allMemberIds } },
              select: { memberId: true },
            }),
            getMovedSwimmerIds(allMemberIds),
          ])
        : [[], [], new Set<string>()];

    const totalAttCountByMemberId = new Map<string, number>();
    for (const a of memberAttendances) {
      totalAttCountByMemberId.set(
        a.memberId,
        (totalAttCountByMemberId.get(a.memberId) || 0) + 1
      );
    }

    const reviewsByMemberId = new Map<
      string,
      Array<{
        skills: string | null;
        metrics: string | null;
        strengths: string | null;
        recommendedLevel: string | null;
      }>
    >();
    for (const r of memberReviews) {
      const list = reviewsByMemberId.get(r.memberId) || [];
      list.push(r);
      reviewsByMemberId.set(r.memberId, list);
    }

    const shapedMembers = roster.map((m) => {
      const att = attendanceByMemberId.get(m.id);
      const binStatus = normalizeBinaryStatus(att?.status);
      const revs = reviewsByMemberId.get(m.id) || [];
      const cumulative = aggregateSwimmerCumulativeBilan(revs);
      const prog = computeSwimmerSuiviProgression(
        revs[0]?.skills || null,
        revs.length
      );
      const totalAtt = totalAttCountByMemberId.get(m.id) || 0;
      const isNewClient = computeIsNewClientSwimmer({
        memberId: m.id,
        totalAttendances: totalAtt,
        isMultiGroup: m.isMultiGroup,
        movedMemberIds,
      });

      return {
        id: m.id,
        memberId: m.id,
        swimId: m.swimId,
        fullName: m.fullName,
        phone: role === "assistant" ? null : m.phone,
        category: m.category,
        level: revs[0]?.recommendedLevel || m.level || prog.badgeLabel,
        badgeKey: prog.badgeKey,
        badgeLabel: prog.badgeLabel,
        bars: cumulative.bars,
        lastTouchedBar: cumulative.lastTouchedBar,
        totalDistanceMeters: cumulative.totalDistanceMeters,
        record50m: cumulative.record50m,
        recordApnea: cumulative.recordApnea,
        weightKg: cumulative.weightKg,
        heightCm: cumulative.heightCm,
        wordFromCoach: cumulative.wordFromCoach,
        cardCode: m.cardCode,
        paymentStatus: m.paymentStatus,
        isMultiGroup: m.isMultiGroup,
        isNewClient,
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
          const revs = reviewsByMemberId.get(guestMember.id) || [];
          const cumulative = aggregateSwimmerCumulativeBilan(revs);
          const prog = computeSwimmerSuiviProgression(
            revs[0]?.skills || null,
            revs.length
          );

          shapedMembers.push({
            id: guestMember.id,
            memberId: guestMember.id,
            swimId: guestMember.swimId,
            fullName: guestMember.fullName,
            phone: role === "assistant" ? null : guestMember.phone,
            category: guestMember.category,
            level: revs[0]?.recommendedLevel || guestMember.level || prog.badgeLabel,
            badgeKey: prog.badgeKey,
            badgeLabel: prog.badgeLabel,
            bars: cumulative.bars,
            lastTouchedBar: cumulative.lastTouchedBar,
            totalDistanceMeters: cumulative.totalDistanceMeters,
            record50m: cumulative.record50m,
            recordApnea: cumulative.recordApnea,
            weightKg: cumulative.weightKg,
            heightCm: cumulative.heightCm,
            wordFromCoach: cumulative.wordFromCoach,
            cardCode: null,
            paymentStatus: "paid",
            isMultiGroup: false,
            isNewClient: false,
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
        honorLockStatus,
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
