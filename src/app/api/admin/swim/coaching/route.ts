import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/api-auth";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { getFlag, setFlag } from "@/lib/feature-flags";
import {
  AQA_HONOR_BADGES,
  AQA_STROKE_BAR_DEFS,
  AQA_SUIVI_BADGES,
  AQA_SUIVI_STAGES,
  aggregateSwimmerCumulativeBilan,
  computeSwimmerSuiviProgression,
} from "@/lib/swim-skills";
import {
  decideHonorNominationByAdmin,
  listHonorNominationsForAdmin,
} from "@/lib/swim-honors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
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

    // 5. Fetch Recent Sessions with Attendance and Ratings
    const recentSessions = await prisma.swimSession.findMany({
      include: {
        group: { select: { id: true, name: true, category: true } },
        plannedCoach: { select: { id: true, name: true } },
        actualCoach: { select: { id: true, name: true } },
        attendances: {
          select: { status: true },
        },
      },
      orderBy: { sessionDate: "desc" },
      take: 25,
    });

    const sessionIds = recentSessions.map((s) => s.id);
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
          // ignore malformed details
        }
      }
    }

    // 6. Fetch Sample Swimmers with Suivi Progression
    const swimmers = await prisma.swimMember.findMany({
      where: { groupStatus: { not: "rejected" } },
      select: {
        id: true,
        swimId: true,
        fullName: true,
        phone: true,
        category: true,
        level: true,
        formula: true,
        groupId: true,
        group: { select: { id: true, name: true } },
        attendances: {
          select: { status: true },
        },
        techReviews: {
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            skills: true,
            recommendedLevel: true,
            strengths: true,
            createdAt: true,
          },
        },
      },
      orderBy: { fullName: "asc" },
      take: 100,
    });

    // 7. Fetch Platform Settings for Coach App
    const settings = await prisma.platformSetting.findMany({
      where: {
        key: { startsWith: "coach_app_" },
      },
    });

    const settingsMap = new Map<string, string>();
    for (const s of settings) {
      settingsMap.set(s.key, s.value);
    }

    const isAppEnabled = await getFlag("coach_app_enabled", true);
    const appConfig = {
      enabled: isAppEnabled,
      announcement: settingsMap.get("coach_app_announcement") || "",
      reminderMinutes: parseInt(settingsMap.get("coach_app_reminder_minutes") || "10", 10),
    };

    // 8. Fetch Honor Nominations (Swimmer of the Month & Swimmer of the Year)
    const { lockStatus: honorLockStatus, nominations: honorNominations } =
      await listHonorNominationsForAdmin();

    // 9. Compute KPIs
    const totalStaffCount = coaches.length;
    const coachesWithApp = coaches.filter((c) => c.account?.loginEnabled).length;
    const pendingAbsencesCount = absences.filter((a) => a.status === "pending").length;
    const pendingReplacementsCount = replacements.filter((r) => r.status === "proposed").length;
    const totalSwimmersCount = swimmers.length;
    const pendingHonorsCount = honorNominations.filter((n) => n.status === "pending").length;

    return NextResponse.json({
      kpis: {
        totalStaffCount,
        coachesWithApp,
        pendingAbsencesCount,
        pendingReplacementsCount,
        totalSwimmersCount,
        pendingHonorsCount,
      },
      appConfig,
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
      recentSessions: recentSessions.map((s) => {
        const presentCount = s.attendances.filter(
          (a) => a.status === "present" || a.status === "late"
        ).length;
        const absentCount = s.attendances.filter(
          (a) => a.status === "absent" || a.status === "excused"
        ).length;
        const totalMarked = presentCount + absentCount;
        const rating = ratingBySessionId.get(s.id);

        return {
          id: s.id,
          groupName: s.group.name,
          category: s.group.category,
          sessionDate: s.sessionDate.toISOString().split("T")[0],
          startTime: s.startTime,
          coachName: s.actualCoach?.name || s.plannedCoach?.name || "Non assigné",
          presentCount,
          absentCount,
          totalMarked,
          ratingStars: rating?.stars ?? null,
          ratingNotes: rating?.notes ?? null,
          ratedByCoachName: rating?.coachName ?? null,
        };
      }),
      swimmers: swimmers.map((m) => {
        const presences = m.attendances.filter(
          (a) => a.status === "present" || a.status === "late"
        ).length;
        const absencesCount = m.attendances.filter(
          (a) => a.status === "absent" || a.status === "excused"
        ).length;
        const total = presences + absencesCount;
        const attendanceRate = total > 0 ? Math.round((presences / total) * 100) : 100;
        const latestRev = m.techReviews[0];
        const prog = computeSwimmerSuiviProgression(
          latestRev?.skills || null,
          m.techReviews.length
        );
        const bilan = aggregateSwimmerCumulativeBilan(m.techReviews);

        return {
          id: m.id,
          swimId: m.swimId,
          fullName: m.fullName,
          phone: m.phone,
          category: m.category,
          level: latestRev?.recommendedLevel || m.level,
          groupName: m.group?.name || "Sans groupe",
          totalPresences: presences,
          totalAbsences: absencesCount,
          attendanceRate,
          reviewCount: m.techReviews.length,
          avgSkillScore: prog.avgSkillScore,
          badgeKey: prog.badgeKey,
          badgeLabel: prog.badgeLabel,
          badgeAsset: prog.badgeAsset,
          stageKey: prog.stageKey,
          stageLabel: prog.stageLabel,
          stageAsset: prog.stageAsset,
          bars: bilan.bars,
          lastTouchedBar: bilan.lastTouchedBar,
          totalDistanceMeters: bilan.totalDistanceMeters,
          record50m: bilan.record50m,
          recordApnea: bilan.recordApnea,
          weightKg: bilan.weightKg,
          heightCm: bilan.heightCm,
          wordFromCoach: bilan.wordFromCoach,
        };
      }),
      honorLockStatus,
      honorNominations,
      honorBadges: AQA_HONOR_BADGES,
      strokeBarDefs: AQA_STROKE_BAR_DEFS,
      suiviStages: AQA_SUIVI_STAGES,
      suiviBadges: AQA_SUIVI_BADGES,
    });
  } catch (err) {
    logger.error("GET /api/admin/swim/coaching error:", err);
    return NextResponse.json(
      { error: "Failed to fetch coaching data." },
      { status: 500 }
    );
  }
}

const adminCoachingActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("UPDATE_APP_CONFIG"),
    enabled: z.boolean(),
    announcement: z.string().optional(),
    reminderMinutes: z.number().int().min(5).max(60).optional(),
  }),
  z.object({
    action: z.literal("DECIDE_ABSENCE"),
    absenceId: z.string(),
    status: z.enum(["approved", "rejected"]),
  }),
  z.object({
    action: z.literal("AWARD_SWIMMER_BADGE"),
    memberId: z.string(),
    badgeKey: z.string(),
    recommendedLevel: z.string().optional(),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal("DECIDE_HONOR_NOMINATION"),
    requestId: z.string(),
    decision: z.enum(["approved", "rejected"]),
  }),
]);

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await req.json();
    const parsed = adminCoachingActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid action payload.", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (payload.action === "UPDATE_APP_CONFIG") {
      await setFlag("coach_app_enabled", payload.enabled);

      if (payload.announcement !== undefined) {
        await prisma.platformSetting.upsert({
          where: { key: "coach_app_announcement" },
          create: { key: "coach_app_announcement", value: payload.announcement },
          update: { value: payload.announcement },
        });
      }

      if (payload.reminderMinutes !== undefined) {
        await prisma.platformSetting.upsert({
          where: { key: "coach_app_reminder_minutes" },
          create: {
            key: "coach_app_reminder_minutes",
            value: payload.reminderMinutes.toString(),
          },
          update: { value: payload.reminderMinutes.toString() },
        });
      }

      await logAdminAction(
        session.user.id,
        "ADMIN_COACH_APP_CONFIG_UPDATED",
        "coach_app",
        JSON.stringify(payload)
      );

      return NextResponse.json({ success: true, message: "Paramètres mis à jour." });
    }

    if (payload.action === "DECIDE_ABSENCE") {
      const absence = await prisma.swimCoachAbsence.findUnique({
        where: { id: payload.absenceId },
      });

      if (!absence) {
        return NextResponse.json({ error: "Absence not found" }, { status: 404 });
      }

      await prisma.swimCoachAbsence.update({
        where: { id: payload.absenceId },
        data: {
          status: payload.status,
          decidedAt: new Date(),
          decidedByAdminId: session.user.id,
        },
      });

      await logAdminAction(
        session.user.id,
        `ADMIN_ABSENCE_${payload.status.toUpperCase()}`,
        payload.absenceId,
        JSON.stringify({ coachId: absence.coachId })
      );

      return NextResponse.json({ success: true, status: payload.status });
    }

    if (payload.action === "DECIDE_HONOR_NOMINATION") {
      try {
        const result = await decideHonorNominationByAdmin({
          requestId: payload.requestId,
          decision: payload.decision,
          adminId: session.user.id,
        });

        return NextResponse.json({
          success: result.success,
          status: payload.decision,
          message: result.message,
        });
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Erreur lors de la decision" },
          { status: 400 }
        );
      }
    }

    if (payload.action === "AWARD_SWIMMER_BADGE") {
      const swimmer = await prisma.swimMember.findUnique({
        where: { id: payload.memberId },
      });

      if (!swimmer) {
        return NextResponse.json({ error: "Swimmer not found" }, { status: 404 });
      }

      const badgeDef = AQA_SUIVI_BADGES.find((b) => b.key === payload.badgeKey);
      if (!badgeDef) {
        return NextResponse.json({ error: "Invalid badge key" }, { status: 400 });
      }

      const skillsMap: Record<string, unknown> = {
        _meta: {
          awardedBadgeKey: badgeDef.key,
          recommendedLevel: payload.recommendedLevel || badgeDef.label,
          adminAwarded: true,
          adminId: session.user.id,
        },
      };

      await prisma.swimTechReview.create({
        data: {
          memberId: payload.memberId,
          coachId: null,
          validatedById: session.user.id,
          validatedAt: new Date(),
          skills: JSON.stringify(skillsMap),
          recommendedLevel: payload.recommendedLevel || badgeDef.label,
          strengths: payload.notes || `Badge ${badgeDef.label} attribué par la direction AQA.`,
        },
      });

      if (payload.recommendedLevel && payload.recommendedLevel.trim().length > 0) {
        await prisma.swimMember.update({
          where: { id: payload.memberId },
          data: { level: payload.recommendedLevel.trim() },
        });
      }

      await logAdminAction(
        session.user.id,
        "ADMIN_SWIMMER_BADGE_AWARDED",
        swimmer.fullName,
        JSON.stringify({ memberId: swimmer.id, badgeKey: badgeDef.key })
      );

      return NextResponse.json({
        success: true,
        message: `Badge ${badgeDef.label} validé pour ${swimmer.fullName}.`,
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err) {
    logger.error("POST /api/admin/swim/coaching error:", err);
    return NextResponse.json(
      { error: "Failed to process coaching command." },
      { status: 500 }
    );
  }
}
