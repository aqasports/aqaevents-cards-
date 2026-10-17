import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canViewSwimGroup } from "@/lib/coach-rbac";
import { getGroupRoster } from "@/lib/swim-roster";
import {
  ensureSessions,
  toMidnightUTC,
  computeEndTime,
  extractGroupScheduleMeta,
} from "@/lib/swim-sessions";
import {
  AQA_SUIVI_BADGES,
  AQA_SUIVI_STAGES,
  computeSwimmerSuiviProgression,
} from "@/lib/swim-skills";
import {
  computeIsNewClientSwimmer,
  getMovedSwimmerIds,
  getNewClientSwimmerIds,
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

  const { id: groupId } = await params;

  try {
    const isAllowed = await canViewSwimGroup(
      { coachId: coach.id, role, coachName: coach.name },
      groupId
    );
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this training group." },
        { status: 403, headers: corsHeaders }
      );
    }

    const group = await prisma.swimGroup.findUnique({
      where: { id: groupId },
      include: {
        staff: {
          where: { endsOn: null },
          include: { coach: { select: { id: true, name: true, phone: true } } },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    // Ensure upcoming 14 days of sessions exist for this group
    const now = new Date();
    const today = toMidnightUTC(now);
    const nextTwoWeeks = new Date(today);
    nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await ensureSessions([groupId], today, nextTwoWeeks);

    const [rawRoster, sessions] = await Promise.all([
      getGroupRoster(groupId),
      prisma.swimSession.findMany({
        where: {
          groupId,
          sessionDate: { gte: sevenDaysAgo, lte: nextTwoWeeks },
        },
        include: {
          attendances: { select: { id: true, status: true } },
        },
        orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
      }),
    ]);

    const memberIds = rawRoster.map((m) => m.id);

    const [memberAttendances, memberReviews, movedMemberIds, newClientMemberIds] =
      await Promise.all([
        memberIds.length > 0
          ? prisma.swimAttendance.findMany({
              where: { memberId: { in: memberIds } },
              select: { memberId: true, status: true },
            })
          : Promise.resolve([]),
        memberIds.length > 0
          ? prisma.swimTechReview.findMany({
              where: { memberId: { in: memberIds } },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                memberId: true,
                skills: true,
                recommendedLevel: true,
                createdAt: true,
              },
            })
          : Promise.resolve([]),
        getMovedSwimmerIds(memberIds),
        getNewClientSwimmerIds(memberIds),
      ]);

    const attByMember = new Map<string, { present: number; absent: number; total: number }>();
    for (const a of memberAttendances) {
      const curr = attByMember.get(a.memberId) || { present: 0, absent: 0, total: 0 };
      curr.total += 1;
      if (a.status === "present" || a.status === "late") curr.present += 1;
      if (a.status === "absent" || a.status === "excused") curr.absent += 1;
      attByMember.set(a.memberId, curr);
    }

    const reviewsByMember = new Map<string, typeof memberReviews>();
    for (const r of memberReviews) {
      const list = reviewsByMember.get(r.memberId) || [];
      list.push(r);
      reviewsByMember.set(r.memberId, list);
    }

    const meta = extractGroupScheduleMeta(group.schedule);

    // Apply privacy filtering per role + enrich with attendance, NEW client label & evolution badge
    const shapedRoster = rawRoster.map((m) => {
      const att = attByMember.get(m.id) || { present: 0, absent: 0, total: 0 };
      const revs = reviewsByMember.get(m.id) || [];
      const latestRev = revs[0];

      const prog = computeSwimmerSuiviProgression(latestRev?.skills || null, revs.length);
      const isNewClient = computeIsNewClientSwimmer({
        memberId: m.id,
        level: m.level,
        totalAttendances: att.total,
        isMultiGroup: m.isMultiGroup,
        movedMemberIds,
        newClientMemberIds,
      });

      return {
        id: m.id,
        swimId: m.swimId,
        fullName: m.fullName,
        // Assistants do not see personal phone numbers
        phone: role === "assistant" ? null : m.phone,
        category: m.category,
        level: latestRev?.recommendedLevel || m.level,
        baseLevel: m.level,
        formula: m.formula,
        duration: m.duration,
        cardCode: m.cardCode,
        cardStatus: m.cardStatus,
        paymentStatus: m.paymentStatus,
        subscriptionStart: m.subscriptionStart,
        subscriptionEnd: m.subscriptionEnd,
        isMultiGroup: m.isMultiGroup,
        isNewClient,
        totalPresences: att.present,
        totalAbsences: att.absent,
        attendanceRate: att.total > 0 ? Math.round((att.present / att.total) * 100) : 100,
        reviewCount: revs.length,
        lastReviewDate: latestRev ? latestRev.createdAt.toISOString() : null,
        avgSkillScore: prog.avgSkillScore,
        badgeKey: prog.badgeKey,
        badgeLabel: prog.badgeLabel,
        badgeAsset: prog.badgeAsset,
        stageKey: prog.stageKey,
        stageLabel: prog.stageLabel,
        stageAsset: prog.stageAsset,
        unlockedBadges: prog.unlockedBadges,
      };
    });

    const staffList =
      group.staff.length > 0
        ? group.staff.map((s) => ({
            id: s.id,
            coachId: s.coach.id,
            coachName: s.coach.name,
            phone: role === "assistant" ? null : s.coach.phone,
            role: s.role,
          }))
        : [
            {
              id: `lead-${group.id}`,
              coachId: coach.id,
              coachName: group.coachName || coach.name,
              phone: role === "assistant" ? null : coach.phone,
              role: "lead",
            },
          ];

    const upcomingSessions = sessions.map((s) => {
      const presentCount = s.attendances.filter(
        (a) => a.status === "present" || a.status === "late"
      ).length;
      const absentCount = s.attendances.filter(
        (a) => a.status === "absent" || a.status === "excused"
      ).length;
      return {
        id: s.id,
        groupId: group.id,
        groupName: group.name,
        category: group.category,
        level: group.level,
        sessionDate: s.sessionDate.toISOString().split("T")[0],
        startTime: s.startTime,
        endTime: computeEndTime(s.startTime, 60),
        pool: s.location || meta.pool,
        location: s.location || meta.pool,
        status: s.status,
        closedAt: s.closedAt ? s.closedAt.toISOString() : null,
        attendanceCount: presentCount,
        totalMembers: shapedRoster.length,
        attendanceStats: {
          present: presentCount,
          absent: absentCount,
          marked: s.attendances.length,
          total: shapedRoster.length,
        },
      };
    });

    const isViewOnly = role === "assistant";

    return NextResponse.json(
      {
        group: {
          id: group.id,
          name: group.name,
          category: group.category,
          level: group.level,
          schedule: group.schedule || "",
          scheduleDays: meta.scheduleDays,
          startTime: meta.startTime,
          endTime: meta.endTime,
          pool: meta.pool,
          slots: meta.slots,
          capacity: group.capacity,
          notes: group.notes,
          coachName: group.coachName || staffList[0]?.coachName || coach.name,
          swimmerCount: shapedRoster.length,
          activeMembersCount: shapedRoster.length,
          staff: staffList,
        },
        roster: shapedRoster,
        members: shapedRoster,
        staff: staffList,
        upcomingSessions,
        allBadges: AQA_SUIVI_BADGES,
        allStages: AQA_SUIVI_STAGES,
        isViewOnly,
        canEdit: !isViewOnly,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    logger.error("GET /api/coach/groups/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to load group details." },
      { status: 500, headers: corsHeaders }
    );
  }
}
