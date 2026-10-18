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
import {
  SWIM_SKILLS_CATALOG_V1,
  AQA_SUIVI_BADGES,
  AQA_SUIVI_STAGES,
  AQA_HONOR_BADGES,
  AQA_STROKE_BAR_DEFS,
  aggregateSwimmerCumulativeBilan,
  computeSwimmerSuiviProgression,
} from "@/lib/swim-skills";
import { getCurrentHonorLockStatus } from "@/lib/swim-honors";
import { decodeMemberGroupIds } from "@/lib/swim-groups";
import {
  computeIsNewClientSwimmer,
  loadCoachSwimmerBootstrapData,
} from "@/lib/swim-coach-notifications";
import { getFlag } from "@/lib/feature-flags";
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

    // 2. Materialize sessions for the upcoming 7 days on-demand (fast gate)
    const now = new Date();
    const today = toMidnightUTC(now);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (groupIds.length > 0) {
      const existingCount = await prisma.swimSession.count({
        where: {
          groupId: { in: groupIds },
          sessionDate: { gte: today, lte: nextWeek },
        },
      });
      if (existingCount === 0) {
        await ensureSessions(groupIds, today, nextWeek);
      }
    }

    // 3. Fetch groups, sessions, replacements, absences, active coaches, swimmers, app flag, and honor status in parallel
    const [groups, sessions, allReplacements, myAbsences, allCoaches, rawSwimmers, rawSettings, isAppEnabled, honorLockStatus] =
      await Promise.all([
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
            OR: [
              { groupId: { in: groupIds } },
              { actualCoachId: coach.id },
              {
                replacements: {
                  some: {
                    substituteCoachId: coach.id,
                    status: { in: ["accepted", "assigned"] },
                  },
                },
              },
            ],
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
            replacements: {
              select: {
                id: true,
                status: true,
                originalCoachId: true,
                substituteCoachId: true,
              },
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
        groupIds.length > 0
          ? prisma.swimMember.findMany({
              where: {
                OR: [
                  { groupId: { in: groupIds } },
                  { notes: { contains: "[GROUPS:" } },
                ],
                groupStatus: { not: "rejected" },
              },
              select: {
                id: true,
                swimId: true,
                fullName: true,
                phone: true,
                category: true,
                level: true,
                formula: true,
                groupId: true,
                notes: true,
                group: { select: { id: true, name: true } },
                attendances: {
                  select: { status: true },
                },
                techReviews: {
                  orderBy: { createdAt: "desc" },
                  take: 5,
                  select: {
                    skills: true,
                    metrics: true,
                    strengths: true,
                    recommendedLevel: true,
                    createdAt: true,
                  },
                },
              },
              orderBy: { fullName: "asc" },
              take: 350,
            })
          : Promise.resolve([]),
        prisma.platformSetting.findMany({
          where: {
            key: { startsWith: "coach_app_" },
          },
        }),
        getFlag("coach_app_enabled", true),
        getCurrentHonorLockStatus(),
      ]);

    // 4. Hydrate session ratings stored in AuditLog
    const sessionIds = sessions.map((s) => s.id);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ratingLogs =
      sessionIds.length > 0
        ? await prisma.auditLog.findMany({
            where: {
              action: "COACH_SESSION_RATING",
              target: { in: sessionIds },
              createdAt: { gte: thirtyDaysAgo },
            },
            orderBy: { createdAt: "desc" },
            take: sessionIds.length * 2,
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

    // Normalize attendances to strictly binary PRESENT / ABSENT
    const shapedSessions = sessions.map((s) => {
      const presentCount = s.attendances.filter(
        (a) => a.status === "present" || a.status === "late"
      ).length;
      const absentCount = s.attendances.filter(
        (a) => a.status === "absent" || a.status === "excused"
      ).length;
      const totalMarked = presentCount + absentCount;
      const meta = extractGroupScheduleMeta(s.group.schedule);
      const endTime = computeEndTime(s.startTime, 60);
      const pool = s.location || meta.pool || "Piscine AQA";
      const totalMembers = s.group._count.swimmers || groupCountById.get(s.groupId) || 0;
      const sessionRating = ratingBySessionId.get(s.id) || null;

      const isCoveredByOtherCoach =
        (s.actualCoachId && s.actualCoachId !== coach.id) ||
        s.replacements?.some(
          (r) =>
            r.originalCoachId === coach.id &&
            r.substituteCoachId &&
            r.substituteCoachId !== coach.id &&
            (r.status === "accepted" || r.status === "assigned")
        );

      const isCoveringForAnotherCoach =
        s.actualCoachId === coach.id &&
        s.replacements?.some(
          (r) =>
            r.substituteCoachId === coach.id &&
            r.originalCoachId !== coach.id &&
            (r.status === "accepted" || r.status === "assigned")
        );

      let canEditSession = false;
      if (s.status === "cancelled") {
        canEditSession = false;
      } else if (role === "head_coach") {
        canEditSession = true;
      } else if (role === "assistant") {
        canEditSession = false;
      } else if (isCoveredByOtherCoach) {
        canEditSession = false;
      } else if (s.actualCoachId === coach.id) {
        canEditSession = true;
      } else {
        canEditSession = true;
      }

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
        isReplacement: Boolean(isCoveringForAnotherCoach),
        canEdit: canEditSession,
        isViewOnly: !canEditSession,
        closedAt: s.closedAt ? s.closedAt.toISOString() : null,
        attendanceCount: presentCount,
        totalMembers,
        attendanceStats: {
          present: presentCount,
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
          phone: role === "assistant" ? null : s.coach.phone,
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
      .filter(
        (r) =>
          r.status === "proposed" &&
          (r.substituteCoachId === coach.id || role === "head_coach")
      )
      .map(shapeReplacement);

    const activeReplacements = allReplacements
      .filter((r) => r.status !== "proposed" || r.originalCoachId === coach.id)
      .map(shapeReplacement);

    // Filter rawSwimmers so multi-group candidates belong to at least one of this coach's groupIds
    const groupIdSet = new Set(groupIds);
    const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
    const scopedRawSwimmers = rawSwimmers.filter((m) => {
      if (m.groupId && groupIdSet.has(m.groupId)) return true;
      const assignedIds = decodeMemberGroupIds(m.notes, m.groupId);
      return assignedIds.some((gid) => groupIdSet.has(gid));
    });

    const scopedMemberIds = scopedRawSwimmers.map((m) => m.id);
    const attendanceCountByMemberId = new Map<string, number>();
    const multiGroupMemberIds = new Set<string>();

    for (const m of scopedRawSwimmers) {
      const presences = m.attendances.filter(
        (a) => a.status === "present" || a.status === "late"
      ).length;
      const absences = m.attendances.filter(
        (a) => a.status === "absent" || a.status === "excused"
      ).length;
      attendanceCountByMemberId.set(m.id, presences + absences);

      const assignedGroupIds = decodeMemberGroupIds(m.notes, m.groupId);
      if (assignedGroupIds.length > 1) {
        multiGroupMemberIds.add(m.id);
      }
    }

    // Consolidated single batched query for AuditLog and new members
    const { movedMemberIds, newClientMemberIds, coachNotifications } =
      await loadCoachSwimmerBootstrapData({
        groupIds,
        scopedMemberIds,
        attendanceCountByMemberId,
        multiGroupMemberIds,
      });

    // Shape all swimmers with Suivi progression, 5-bar model, cumulative volume, NEW client status, and binary attendance counts
    const shapedSwimmers = scopedRawSwimmers.map((m) => {
      const presences = m.attendances.filter(
        (a) => a.status === "present" || a.status === "late"
      ).length;
      const absences = m.attendances.filter(
        (a) => a.status === "absent" || a.status === "excused"
      ).length;
      const totalAtt = presences + absences;
      const attendanceRate = totalAtt > 0 ? Math.round((presences / totalAtt) * 100) : 100;

      const assignedGroupIds = decodeMemberGroupIds(m.notes, m.groupId);
      const isMultiGroup = assignedGroupIds.length > 1;

      const isNewClient = computeIsNewClientSwimmer({
        memberId: m.id,
        level: m.level,
        totalAttendances: totalAtt,
        isMultiGroup,
        movedMemberIds,
        newClientMemberIds,
      });

      const latestRev = m.techReviews[0];
      const prog = computeSwimmerSuiviProgression(
        latestRev?.skills || null,
        m.techReviews.length
      );
      const cumulative = aggregateSwimmerCumulativeBilan(m.techReviews);

      const matchedCoachGroupId =
        assignedGroupIds.find((gid) => groupIdSet.has(gid)) || m.groupId;
      const resolvedGroupName =
        (matchedCoachGroupId && groupNameById.get(matchedCoachGroupId)) ||
        m.group?.name ||
        "Groupe AQA";

      return {
        id: m.id,
        memberId: m.id,
        swimId: m.swimId,
        fullName: m.fullName,
        phone: role === "assistant" ? null : m.phone,
        category: m.category,
        level: latestRev?.recommendedLevel || m.level || "Starter",
        groupId: matchedCoachGroupId,
        groupName: resolvedGroupName,
        gender: m.category === "femme" ? "female" : "male",
        formula: m.formula,
        active: true,
        isNewClient,
        isMultiGroup,
        totalPresences: presences,
        totalAbsences: absences,
        attendanceRate,
        reviewCount: m.techReviews.length,
        avgSkillScore: prog.avgSkillScore,
        bars: cumulative.bars,
        lastTouchedBar: cumulative.lastTouchedBar,
        totalDistanceMeters: cumulative.totalDistanceMeters,
        record50m: cumulative.record50m,
        recordApnea: cumulative.recordApnea,
        weightKg: cumulative.weightKg,
        heightCm: cumulative.heightCm,
        wordFromCoach: cumulative.wordFromCoach,
        badgeKey: prog.badgeKey,
        badgeLabel: prog.badgeLabel,
        badgeAsset: prog.badgeAsset,
        stageKey: prog.stageKey,
        stageLabel: prog.stageLabel,
        stageAsset: prog.stageAsset,
        unlockedBadges: prog.unlockedBadges,
      };
    });

    // App command settings from AQA Swim Admin + Honor Lock Status
    const settingsMap = new Map<string, string>();
    for (const s of rawSettings) {
      settingsMap.set(s.key, s.value);
    }
    const appConfig = {
      enabled: isAppEnabled,
      announcement: settingsMap.get("coach_app_announcement") || "",
      reminderMinutes: parseInt(settingsMap.get("coach_app_reminder_minutes") || "10", 10),
    };

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
        swimmers: shapedSwimmers,
        sessions: shapedSessions,
        todaySessions: todaySessions.length > 0 ? todaySessions : shapedSessions.slice(0, 6),
        actualTodaySessions: todaySessions,
        pendingReplacements: pendingRequests,
        pendingRequests,
        activeReplacements,
        coachNotifications,
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
        progressionBadges: AQA_SUIVI_BADGES,
        honorBadges: AQA_HONOR_BADGES,
        strokeBarDefs: AQA_STROKE_BAR_DEFS,
        honorLockStatus,
        suiviStages: AQA_SUIVI_STAGES,
        appConfig,
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
