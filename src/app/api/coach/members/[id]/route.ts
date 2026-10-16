import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canManageTechReview } from "@/lib/coach-rbac";
import { getSkillsForCategory, SWIM_PROGRESSION_BADGES } from "@/lib/swim-skills";
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

  const { id: memberId } = await params;

  try {
    const member = await prisma.swimMember.findUnique({
      where: { id: memberId },
      include: {
        card: { select: { cardCode: true, status: true } },
        group: { select: { id: true, name: true, category: true, level: true } },
        attendances: {
          take: 40,
          orderBy: { markedAt: "desc" },
          include: {
            session: {
              select: { sessionDate: true, startTime: true },
            },
          },
        },
        techReviews: {
          orderBy: { createdAt: "desc" },
          include: {
            coach: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Swimmer not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    const editAuth = await canManageTechReview(
      { coachId: coach.id, role, coachName: coach.name },
      memberId
    );
    const canEdit = editAuth.allowed;

    const skillsCatalog = getSkillsForCategory(member.category);
    const skillLabelMap = new Map(
      skillsCatalog.skills.map((s) => [s.key, s.label])
    );

    const presentCount = member.attendances.filter(
      (a) => a.status === "present" || a.status === "late"
    ).length;
    const lateCount = member.attendances.filter((a) => a.status === "late").length;
    const excusedCount = member.attendances.filter((a) => a.status === "excused").length;
    const absentCount = member.attendances.filter((a) => a.status === "absent").length;
    const totalAtt = member.attendances.length;
    const attendanceRate =
      totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 100;

    let highestAvgScore = 0;

    const shapedReviews = member.techReviews.map((r) => {
      let rawSkills: Array<{ key?: string; skillKey?: string; label?: string; score?: number }> = [];
      let rawMetrics: Array<{ key: string; value: number; unit: string }> = [];

      if (r.skills) {
        try {
          rawSkills = JSON.parse(r.skills);
        } catch {
          rawSkills = [];
        }
      }
      if (r.metrics) {
        try {
          rawMetrics = JSON.parse(r.metrics);
        } catch {
          rawMetrics = [];
        }
      }

      const normalizedSkills = rawSkills.map((s) => {
        const k = s.key || s.skillKey || "skill";
        return {
          key: k,
          skillKey: k,
          label: s.label || skillLabelMap.get(k) || k,
          score: Number(s.score) || 1,
        };
      });

      if (normalizedSkills.length > 0) {
        const avg =
          normalizedSkills.reduce((acc, s) => acc + s.score, 0) /
          normalizedSkills.length;
        if (avg > highestAvgScore) {
          highestAvgScore = avg;
        }
      }

      const overallLevel = r.recommendedLevel || member.level || "Starter";
      const evaluatorNotes = r.strengths || "";

      return {
        id: r.id,
        memberId: r.memberId,
        coachId: r.coachId,
        coachName: r.coach?.name ?? "Coach AQA",
        sessionId: r.sessionId,
        kind: r.kind,
        skills: normalizedSkills,
        metrics: rawMetrics,
        strengths: r.strengths,
        evaluatorNotes,
        improvements: r.improvements,
        nextGoals: r.nextGoals,
        recommendedLevel: overallLevel,
        overallLevel,
        createdAt: r.createdAt.toISOString(),
      };
    });

    let currentBadge = SWIM_PROGRESSION_BADGES[0];
    for (const b of SWIM_PROGRESSION_BADGES) {
      if (highestAvgScore >= b.minScoreAvg) {
        currentBadge = b;
      }
    }

    const earnedBadges = SWIM_PROGRESSION_BADGES.map((b, idx) => ({
      ...b,
      unlocked:
        idx === 0 ||
        highestAvgScore >= b.minScoreAvg ||
        shapedReviews.some(
          (r) =>
            r.recommendedLevel.toLowerCase() === b.key.toLowerCase() ||
            r.recommendedLevel.toLowerCase() === b.label.toLowerCase()
        ),
    }));

    const latestRecommendedLevel =
      shapedReviews[0]?.recommendedLevel || member.level;

    return NextResponse.json(
      {
        member: {
          id: member.id,
          swimId: member.swimId,
          fullName: member.fullName,
          phone: role === "assistant" ? null : member.phone,
          category: member.category,
          level: latestRecommendedLevel,
          baseLevel: member.level,
          formula: member.formula,
          duration: member.duration,
          cardCode: member.card?.cardCode ?? null,
          groupId: member.group?.id ?? member.groupId ?? null,
          groupName: member.group?.name ?? "Non assigne",
          subscriptionStart: member.subscriptionStart,
          subscriptionEnd: member.subscriptionEnd,
          paymentStatus: member.paymentStatus,
          totalPresences: presentCount,
          totalAbsences: absentCount,
          attendanceRate,
          avgSkillScore: Number(highestAvgScore.toFixed(1)),
          badgeKey: currentBadge.key,
          badgeLabel: currentBadge.label,
          badgeAsset: currentBadge.assetName,
        },
        currentGroup: member.group
          ? {
              id: member.group.id,
              name: member.group.name,
              category: member.group.category,
              level: member.group.level,
            }
          : null,
        canEdit,
        isViewOnly: !canEdit,
        skillsCatalog,
        progressionBadges: SWIM_PROGRESSION_BADGES,
        earnedBadges,
        attendanceSummary: {
          present: presentCount,
          late: lateCount,
          excused: excusedCount,
          absent: absentCount,
          total: totalAtt,
          attendanceRate,
        },
        recentAttendances: member.attendances.map((a) => ({
          id: a.id,
          date: a.session.sessionDate.toISOString().split("T")[0],
          time: a.session.startTime,
          status: a.status,
          method: a.method,
          note: a.note,
        })),
        techReviews: shapedReviews,
        reviews: shapedReviews,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    logger.error("GET /api/coach/members/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to load swimmer profile." },
      { status: 500, headers: corsHeaders }
    );
  }
}

