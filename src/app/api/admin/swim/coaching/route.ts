import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const url = new URL(req.url);
    const view = url.searchParams.get("view") || "overview";

    // 1. Fetch Coaches and CoachAccounts
    const coaches = await prisma.coach.findMany({
      where: { active: true },
      include: {
        account: true,
        groupAssignments: {
          where: { endsOn: null },
          include: {
            group: { select: { id: true, name: true, category: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // 2. Fetch Active Groups and their assigned Staff
    const groups = await prisma.swimGroup.findMany({
      where: { active: true },
      include: {
        staff: {
          where: { endsOn: null },
          include: {
            coach: { select: { id: true, name: true, phone: true } },
          },
        },
        _count: {
          select: {
            swimmers: { where: { groupStatus: { not: "rejected" } } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // 3. Fetch Recent Absences
    const absences = await prisma.swimCoachAbsence.findMany({
      include: {
        coach: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { startsAt: "desc" },
      take: 50,
    });

    // 4. Fetch Active Replacements
    const replacements = await prisma.swimReplacement.findMany({
      include: {
        session: {
          include: { group: { select: { id: true, name: true, category: true } } },
        },
        originalCoach: { select: { id: true, name: true } },
        substituteCoach: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 5. Compute KPIs
    const totalStaffCount = coaches.length;
    const coachesWithApp = coaches.filter((c) => c.account?.loginEnabled).length;
    const pendingAbsencesCount = absences.filter((a) => a.status === "pending").length;
    const pendingReplacementsCount = replacements.filter((r) => r.status === "proposed").length;

    return NextResponse.json({
      kpis: {
        totalStaffCount,
        coachesWithApp,
        pendingAbsencesCount,
        pendingReplacementsCount,
      },
      coaches: coaches.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.account?.email || c.email,
        phone: c.phone,
        specialties: c.specialties,
        hasAccount: !!c.account,
        role: c.account?.role || "coach",
        categories: c.account?.categories ? JSON.parse(c.account.categories) : [],
        loginEnabled: c.account?.loginEnabled ?? false,
        lastLoginAt: c.account?.lastLoginAt ?? null,
        activeGroups: c.groupAssignments.map((a) => ({
          groupId: a.group.id,
          groupName: a.group.name,
          category: a.group.category,
          role: a.role,
        })),
      })),
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        category: g.category,
        level: g.level,
        schedule: g.schedule,
        capacity: g.capacity,
        legacyCoachName: g.coachName,
        swimmerCount: g._count.swimmers,
        staff: g.staff.map((s) => ({
          id: s.id,
          coachId: s.coach.id,
          coachName: s.coach.name,
          role: s.role,
        })),
      })),
      absences: absences.map((a) => ({
        id: a.id,
        coachId: a.coachId,
        coachName: a.coach.name,
        startsAt: a.startsAt.toISOString(),
        endsAt: a.endsAt.toISOString(),
        reason: a.reason,
        details: a.details,
        status: a.status,
        decidedAt: a.decidedAt?.toISOString() ?? null,
      })),
      replacements: replacements.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        groupName: r.session.group.name,
        category: r.session.group.category,
        sessionDate: r.session.sessionDate.toISOString().split("T")[0],
        startTime: r.session.startTime,
        originalCoachName: r.originalCoach?.name ?? "Coach",
        substituteCoachName: r.substituteCoach?.name ?? "Non assigné",
        status: r.status,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error("GET /api/admin/swim/coaching error:", err);
    return NextResponse.json(
      { error: "Failed to fetch coaching data." },
      { status: 500 }
    );
  }
}
