import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { resolveCoachGroupIds } from "@/lib/coach-rbac";
import {
  ensureSessions,
  toMidnightUTC,
  computeEndTime,
  extractGroupScheduleMeta,
} from "@/lib/swim-sessions";
import { SWIM_SKILLS_CATALOG_V1, SWIM_PROGRESSION_BADGES } from "@/lib/swim-skills";
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

export async function GET(req: NextRequest) {
  const { error, coach, account, role } = await requireCoachSession(req);
  if (error || !coach || !account) return error;

  try {
    // 1. Resolve visible groups according to RBAC (including legacy SwimGroup.coachName)
    const groupIds = await resolveCoachGroupIds({
      coachId: coach.id,
      role,
      coachName: coach.name,
    });

    // 2. Materialize sessions for the upcoming 7 days on-demand
    const now = new Date();
    const today = toMidnightUTC(now);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (groupIds.length > 0) {
      await ensureSessions(groupIds, today, nextWeek);
    }

    // 3. Fetch groups, sessions, replacements, absences, and active coaches in parallel
    const [groups, sessions, allReplacements, myAbsences, allCoaches] = await Promise.all([
      prisma.swimGroup.findMany({
        where: { id: { in: groupIds } },
        include: {
          staff: {
            where: { endsOn: null },
            include: { coach: { select: { id: true, name: true, phone: true } } },
          },
          _count: {
            select: {
              swimmers: { where: { groupStatus: { not: "rejected" } } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.swimSession.findMany({
        where: {
          groupId: { in: groupIds },
          sessionDate: { gte: today, lte: nextWeek },
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              category: true,
              level: true,
              schedule: true,
              coachName: true,
              _count: {
                select: {
                  swimmers: { where: { groupStatus: { not: "rejected" } } },
                },
              },
            },
          },
          attendances: {
            select: { id: true, status: true },
          },
        },
        orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
      }),
      prisma.swimReplacement.findMany({
        where:
          role === "head_coach"
            ? {}
            : {
                OR: [
                  { substituteCoachId: coach.id },
                  { originalCoachId: coach.id },
                ],
              },
        include: {
          session: {
            include: { group: { select: { id: true, name: true, category: true } } },
          },
          originalCoach: { select: { id: true, name: true, phone: true } },
          substituteCoach: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.swimCoachAbsence.findMany({
        where: role === "head_coach" ? {} : { coachId: coach.id },
        include: {
          coach: { select: { id: true, name: true } },
        },
        orderBy: { startsAt: "desc" },
        take: 25,
      }),
      prisma.coach.findMany({
        where: { active: true },
        select: { id: true, name: true, phone: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // 4. Hydrate session ratings stored in AuditLog (zero schema changes required)
    const sessionIds = sessions.map((s) => s.id);
    const ratingLogs =
      sessionIds.length > 0
        ? await prisma.auditLog.findMany({
            where: {
              action: "COACH_SESSION_RATING",
              target: { in: sessionIds },
            },
            orderBy: { createdAt: "desc" },
          })
        : [];

    const ratingBySessionId = new Map<string, Record<string, unknown>>();
    for (const log of ratingLogs) {
      if (log.target && !ratingBySessionId.has(log.target) && log.details) {
        try {
          ratingBySessionId.set(log.target, JSON.parse(log.details));
        } catch {
          // ignore malformed JSON
        }
      }
    }

    const groupCountById = new Map<string, number>();
    for (const g of groups) {
      groupCountById.set(g.id, g._count.swimmers);
    }

    const todayStr = today.toISOString().split("T")[0];

    const shapedSessions = sessions.map((s) => {
      const presentCount = s.attendances.filter((a) => a.status === "present").length;
      const lateCount = s.attendances.filter((a) => a.status === "late").length;
      const excusedCount = s.attendances.filter((a) => a.status === "excused").length;
      const absentCount = s.attendances.filter((a) => a.status === "absent").length;
      const totalMarked = s.attendances.length;
      const meta = extractGroupScheduleMeta(s.group.schedule);
      const endTime = computeEndTime(s.startTime, 60);
      const pool = s.location || meta.pool || "Piscine AQA";
      const totalMembers = s.group._count.swimmers || groupCountById.get(s.groupId) || 0;
      const sessionRating = ratingBySessionId.get(s.id) || null;

      return {
        id: s.id,
        groupId: s.groupId,
        groupName: s.group.name,
        category: s.group.category,
        level: s.group.level,
        sessionDate: s.sessionDate.toISOString().split("T")[0],
        startTime: s.startTime,
        endTime,
        location: pool,
        pool,
        status: s.status,
        cancelReason: s.cancelReason,
        isMySession: s.actualCoachId === coach.id || role === "head_coach",
        closedAt: s.closedAt ? s.closedAt.toISOString() : null,
        attendanceCount: presentCount + lateCount,
        totalMembers,
        attendanceStats: {
          present: presentCount,
          late: lateCount,
          excused: excusedCount,
          absent: absentCount,
          marked: totalMarked,
          total: totalMembers,
        },
        sessionRating,
      };
    });

    const todaySessions = shapedSessions.filter((s) => s.sessionDate === todayStr);

    const shapedGroups = groups.map((g) => {
      const meta = extractGroupScheduleMeta(g.schedule);
      const myStaff = g.staff.find((s) => s.coachId === coach.id);
      const roleInGroup =
        role === "head_coach"
          ? "head_coach"
          : myStaff?.role || (role === "assistant" ? "assistant" : "lead");

      return {
        id: g.id,
        name: g.name,
        category: g.category,
        level: g.level,
        schedule: g.schedule || "",
        scheduleDays: meta.scheduleDays,
        startTime: meta.startTime,
        endTime: meta.endTime,
        pool: meta.pool,
        slots: meta.slots,
        capacity: g.capacity,
        active: g.active,
        coachName: g.coachName || g.staff[0]?.coach.name || coach.name,
        swimmerCount: g._count.swimmers,
        activeMembersCount: g._count.swimmers,
        roleInGroup,
        canEdit: role !== "assistant",
        staff: g.staff.map((s) => ({
          coachId: s.coach.id,
          coachName: s.coach.name,
          phone: s.coach.phone,
          role: s.role,
        })),
      };
    });

    const shapeReplacement = (r: (typeof allReplacements)[number]) => {
      const endTime = computeEndTime(r.session.startTime, 60);
      const pool = r.session.location || "Piscine AQA";
      return {
        id: r.id,
        sessionId: r.sessionId,
        groupId: r.session.group.id,
        groupName: r.session.group.name,
        category: r.session.group.category,
        sessionDate: r.session.sessionDate.toISOString().split("T")[0],
        startTime: r.session.startTime,
        endTime,
        location: pool,
        pool,
        originalCoachId: r.originalCoachId,
        originalCoachName: r.originalCoach?.name ?? "Coach AQA",
        substituteCoachId: r.substituteCoachId,
        substituteCoachName: r.substituteCoach?.name ?? null,
        status: r.status.toUpperCase(),
        rawStatus: r.status,
        note: r.note,
        reason: r.note,
        isIncomingForMe: r.substituteCoachId === coach.id,
        createdAt: r.createdAt.toISOString(),
      };
    };

    const pendingRequests = allReplacements
      .filter((r) => r.status === "proposed" && (r.substituteCoachId === coach.id || role === "head_coach"))
      .map(shapeReplacement);

    const activeReplacements = allReplacements
      .filter((r) => r.status !== "proposed" || r.originalCoachId === coach.id)
      .map(shapeReplacement);

    return NextResponse.json(
      {
        coach: {
          id: coach.id,
          coachId: coach.id,
          name: coach.name,
          email: account.email,
          phone: coach.phone,
          role,
          categories: account.categories ? JSON.parse(account.categories) : null,
        },
        allCoaches: allCoaches.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          isMe: c.id === coach.id,
        })),
        groups: shapedGroups,
        sessions: shapedSessions,
        todaySessions: todaySessions.length > 0 ? todaySessions : shapedSessions.slice(0, 6),
        actualTodaySessions: todaySessions,
        pendingReplacements: pendingRequests,
        pendingRequests,
        activeReplacements,
        myAbsences: myAbsences.map((a) => ({
          id: a.id,
          coachId: a.coachId,
          coachName: a.coach.name,
          startsAt: a.startsAt.toISOString(),
          endsAt: a.endsAt.toISOString(),
          reason: a.reason,
          details: a.details,
          status: a.status,
          createdAt: a.createdAt.toISOString(),
        })),
        skillsCatalog: SWIM_SKILLS_CATALOG_V1,
        progressionBadges: SWIM_PROGRESSION_BADGES,
        todayDate: todayStr,
        serverTime: now.toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    logger.error("GET /api/coach/bootstrap error:", err);
    return NextResponse.json(
      { error: "Failed to load coach workspace data." },
      { status: 500, headers: corsHeaders }
    );
  }
}

