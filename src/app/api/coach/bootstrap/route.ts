import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { ensureSessions, toMidnightUTC } from "@/lib/swim-sessions";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error, coach, account, role } = await requireCoachSession(req);
  if (error || !coach || !account) return error;

  try {
    // 1. Resolve visible groups according to RBAC
    let groupIds: string[] = [];

    if (role === "head_coach") {
      const allActiveGroups = await prisma.swimGroup.findMany({
        where: { active: true },
        select: { id: true },
      });
      groupIds = allActiveGroups.map((g) => g.id);
    } else {
      const staffAssignments = await prisma.swimGroupStaff.findMany({
        where: {
          coachId: coach.id,
          endsOn: null,
          group: { active: true },
        },
        select: { groupId: true },
      });

      const replacementAssignments = await prisma.swimReplacement.findMany({
        where: {
          substituteCoachId: coach.id,
          status: { in: ["accepted", "assigned"] },
        },
        include: { session: { select: { groupId: true } } },
      });

      const set = new Set<string>();
      staffAssignments.forEach((a) => set.add(a.groupId));
      replacementAssignments.forEach((r) => set.add(r.session.groupId));
      groupIds = Array.from(set);
    }

    // 2. Materialize sessions for the upcoming 7 days on-demand
    const now = new Date();
    const today = toMidnightUTC(now);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (groupIds.length > 0) {
      await ensureSessions(groupIds, today, nextWeek);
    }

    // 3. Fetch groups details
    const groups = await prisma.swimGroup.findMany({
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
    });

    // 4. Fetch sessions in the next 7 days
    const sessions = await prisma.swimSession.findMany({
      where: {
        groupId: { in: groupIds },
        sessionDate: { gte: today, lte: nextWeek },
      },
      include: {
        group: {
          select: { id: true, name: true, category: true, level: true },
        },
        attendances: {
          select: { id: true, status: true },
        },
      },
      orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
    });

    const shapedSessions = sessions.map((s) => {
      const presentCount = s.attendances.filter((a) => a.status === "present").length;
      const absentCount = s.attendances.filter((a) => a.status === "absent").length;
      const totalMarked = s.attendances.length;

      return {
        id: s.id,
        groupId: s.groupId,
        groupName: s.group.name,
        category: s.group.category,
        level: s.group.level,
        sessionDate: s.sessionDate.toISOString().split("T")[0],
        startTime: s.startTime,
        location: s.location,
        status: s.status,
        cancelReason: s.cancelReason,
        isMySession: s.actualCoachId === coach.id,
        closedAt: s.closedAt,
        attendanceStats: {
          present: presentCount,
          absent: absentCount,
          marked: totalMarked,
        },
      };
    });

    // 5. Fetch pending replacement requests for this coach
    const pendingReplacements = await prisma.swimReplacement.findMany({
      where: {
        substituteCoachId: coach.id,
        status: "proposed",
      },
      include: {
        session: {
          include: { group: { select: { name: true, category: true } } },
        },
        originalCoach: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      coach: {
        id: coach.id,
        name: coach.name,
        email: account.email,
        phone: coach.phone,
        role,
        categories: account.categories ? JSON.parse(account.categories) : null,
      },
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        category: g.category,
        level: g.level,
        schedule: g.schedule,
        capacity: g.capacity,
        active: g.active,
        swimmerCount: g._count.swimmers,
        staff: g.staff.map((s) => ({
          coachId: s.coach.id,
          coachName: s.coach.name,
          role: s.role,
        })),
      })),
      sessions: shapedSessions,
      pendingReplacements: pendingReplacements.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        groupName: r.session.group.name,
        category: r.session.group.category,
        sessionDate: r.session.sessionDate.toISOString().split("T")[0],
        startTime: r.session.startTime,
        location: r.session.location,
        originalCoachName: r.originalCoach?.name ?? "Coach",
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      })),
      todayDate: today.toISOString().split("T")[0],
    });
  } catch (err) {
    logger.error("GET /api/coach/bootstrap error:", err);
    return NextResponse.json(
      { error: "Failed to load coach workspace data." },
      { status: 500 }
    );
  }
}
