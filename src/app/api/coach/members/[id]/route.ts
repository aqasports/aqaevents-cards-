import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canManageTechReview } from "@/lib/coach-rbac";
import {
  AQA_BIOMECHANICAL_DOMAINS,
  AQA_HONOR_BADGES,
  AQA_STROKE_BAR_DEFS,
  AQA_SUIVI_BADGES,
  AQA_SUIVI_STAGES,
  aggregateSwimmerCumulativeBilan,
  computeSwimmerSuiviProgression,
  getSkillsForCategory,
  SWIM_SKILLS_CATALOG_V1,
} from "@/lib/swim-skills";
import { getCurrentHonorLockStatus } from "@/lib/swim-honors";
import { decodeMemberGroupIds } from "@/lib/swim-groups";
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

function buildSkillLabelLookup(category: string): Map<string, string> {
  const map = new Map<string, string>();
  const catCatalog = getSkillsForCategory(category);
  for (const s of catCatalog.skills) {
    map.set(s.key, s.labelFr || s.label);
  }
  for (const domain of AQA_BIOMECHANICAL_DOMAINS) {
    for (const item of domain.items) {
      map.set(item.key, item.labelFr || item.label);
    }
  }
  return map;
}

function normalizeBinaryAttendanceStatus(rawStatus: string): "PRESENT" | "ABSENT" {
  const norm = (rawStatus || "").trim().toLowerCase();
  if (norm === "present" || norm === "late") {
    return "PRESENT";
  }
  return "ABSENT";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, coach, role } = await requireCoachSession(req);
  if (error || !coach) return error;

  const { id: memberId } = await params;

  try {
    const [member, honorLockStatus] = await Promise.all([
      prisma.swimMember.findUnique({
        where: { id: memberId },
        include: {
          card: { select: { cardCode: true, status: true } },
          group: { select: { id: true, name: true, category: true, level: true } },
          attendances: {
            take: 50,
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
      }),
      getCurrentHonorLockStatus(),
    ]);

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

    const skillLabelMap = buildSkillLabelLookup(member.category);

    // Strictly Binary Attendance (PRESENT vs ABSENT only)
    const binaryAttendances = member.attendances.map((a) => {
      const binaryStatus = normalizeBinaryAttendanceStatus(a.status);
      return {
        id: a.id,
        date: a.session.sessionDate.toISOString().split("T")[0],
        time: a.session.startTime,
        status: binaryStatus,
        rawStatus: binaryStatus.toLowerCase(),
        method: a.method,
        note: a.note,
      };
    });

    const presentCount = binaryAttendances.filter((a) => a.status === "PRESENT").length;
    const absentCount = binaryAttendances.filter((a) => a.status === "ABSENT").length;
    const totalAtt = presentCount + absentCount;
    const attendanceRate =
      totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 100;

    const shapedReviews = member.techReviews.map((r) => {
      let parsedSkillsPayload: unknown = null;
      let rawMetrics: Array<{ key: string; value: number; unit: string }> = [];

      if (r.skills) {
        try {
          parsedSkillsPayload = JSON.parse(r.skills);
        } catch {
          parsedSkillsPayload = null;
        }
      }

      if (r.metrics) {
        try {
          const mParsed = JSON.parse(r.metrics);
          if (Array.isArray(mParsed)) {
            rawMetrics = mParsed;
          } else if (mParsed && typeof mParsed === "object") {
            const mObj = mParsed as Record<string, unknown>;
            if (Number(mObj.time25mSec || mObj.chrono25mFreestyle) > 0) {
              rawMetrics.push({
                key: "chrono25mFreestyle",
                value: Number(mObj.time25mSec || mObj.chrono25mFreestyle),
                unit: "s",
              });
            }
            if (Number(mObj.time50mSec || mObj.chrono50mFreestyle || mObj.record50m) > 0) {
              rawMetrics.push({
                key: "chrono50mFreestyle",
                value: Number(mObj.time50mSec || mObj.chrono50mFreestyle || mObj.record50m),
                unit: "s",
              });
            }
            if (Number(mObj.maxDistanceM || mObj.maxDistanceMeters || mObj.sessionVolumeMeters) > 0) {
              rawMetrics.push({
                key: "maxDistanceMeters",
                value: Number(mObj.maxDistanceM || mObj.maxDistanceMeters || mObj.sessionVolumeMeters),
                unit: "m",
              });
            }
          }
        } catch {
          rawMetrics = [];
        }
      }

      // Build unified skillsJson object with _meta for progression calculation
      const skillsJsonRecord: Record<string, unknown> = {};
      const normalizedSkillsList: Array<{
        key: string;
        skillKey: string;
        label: string;
        score: number;
      }> = [];

      if (Array.isArray(parsedSkillsPayload)) {
        for (const item of parsedSkillsPayload) {
          if (item && typeof item === "object") {
            const rec = item as Record<string, unknown>;
            const k = String(rec.key || rec.skillKey || "skill");
            if (k === "_meta") {
              skillsJsonRecord._meta = rec;
              continue;
            }
            const score = Math.max(1, Math.min(5, Number(rec.score) || 1));
            const label = String(rec.label || skillLabelMap.get(k) || k);
            normalizedSkillsList.push({ key: k, skillKey: k, label, score });
            skillsJsonRecord[k] = score;
          }
        }
      } else if (parsedSkillsPayload && typeof parsedSkillsPayload === "object") {
        const obj = parsedSkillsPayload as Record<string, unknown>;
        for (const [k, v] of Object.entries(obj)) {
          if (k === "_meta" && v && typeof v === "object") {
            skillsJsonRecord._meta = v;
            continue;
          }
          if (k === "bars" && v && typeof v === "object") {
            skillsJsonRecord.bars = v;
            continue;
          }
          if (k === "lastTouchedBar" && typeof v === "string") {
            skillsJsonRecord.lastTouchedBar = v;
            continue;
          }
          if (typeof v === "number" || typeof v === "string") {
            const score = Math.max(1, Math.min(5, Number(v) || 1));
            const label = skillLabelMap.get(k) || k;
            normalizedSkillsList.push({ key: k, skillKey: k, label, score });
            skillsJsonRecord[k] = score;
          } else if (v && typeof v === "object" && !Array.isArray(v)) {
            skillsJsonRecord[k] = v;
            const nested = v as Record<string, unknown>;
            for (const [subKey, subVal] of Object.entries(nested)) {
              const score = Math.max(1, Math.min(5, Number(subVal) || 1));
              const label = skillLabelMap.get(subKey) || subKey;
              normalizedSkillsList.push({
                key: subKey,
                skillKey: subKey,
                label,
                score,
              });
            }
          }
        }
      }

      const existingMeta =
        skillsJsonRecord._meta && typeof skillsJsonRecord._meta === "object"
          ? (skillsJsonRecord._meta as Record<string, unknown>)
          : {};

      const findMetricVal = (keys: string[]): number | null => {
        for (const m of rawMetrics) {
          if (keys.includes(m.key) && Number(m.value) > 0) {
            return Number(m.value);
          }
        }
        return null;
      };

      const matchedBadgeFromRecommended = r.recommendedLevel
        ? AQA_SUIVI_BADGES.find(
            (b) =>
              b.key.toLowerCase() === r.recommendedLevel?.toLowerCase() ||
              b.label.toLowerCase() === r.recommendedLevel?.toLowerCase()
          )
        : undefined;

      skillsJsonRecord._meta = {
        ...existingMeta,
        awardedBadgeKey:
          existingMeta.awardedBadgeKey || matchedBadgeFromRecommended?.key || null,
        recommendedLevel: existingMeta.recommendedLevel || r.recommendedLevel || null,
        chrono25mFreestyle:
          existingMeta.chrono25mFreestyle ??
          findMetricVal(["chrono25mFreestyle", "time25mSec", "time_25m_free"]),
        chrono50mFreestyle:
          existingMeta.chrono50mFreestyle ??
          existingMeta.record50m ??
          findMetricVal(["chrono50mFreestyle", "record50m", "time50mSec", "time_50m_free"]),
        maxDistanceMeters:
          existingMeta.maxDistanceMeters ??
          existingMeta.sessionVolumeMeters ??
          findMetricVal(["maxDistanceMeters", "sessionVolumeMeters", "maxDistanceM", "continuous_distance"]),
      };

      const revProg = computeSwimmerSuiviProgression(skillsJsonRecord, 1);
      const overallLevel =
        revProg.meta.recommendedLevel ||
        r.recommendedLevel ||
        revProg.badgeLabel ||
        member.level ||
        "Starter";
      const evaluatorNotes = revProg.meta.observation || r.strengths || "";

      return {
        id: r.id,
        memberId: r.memberId,
        coachId: r.coachId,
        coachName: r.coach?.name ?? "Coach AQA",
        sessionId: r.sessionId,
        kind: r.kind,
        skills: normalizedSkillsList,
        skillsJson: skillsJsonRecord,
        bars: revProg.bars,
        lastTouchedBar: revProg.lastTouchedBar,
        categoryAverages: revProg.categoryAverages,
        avgSkillScore: revProg.avgSkillScore,
        badgeKey: revProg.badgeKey,
        badgeLabel: revProg.badgeLabel,
        badgeAsset: revProg.badgeAsset,
        stageKey: revProg.stageKey,
        stageLabel: revProg.stageLabel,
        stageAsset: revProg.stageAsset,
        meta: revProg.meta,
        metrics: rawMetrics,
        generalNotes: evaluatorNotes,
        strengths: r.strengths,
        evaluatorNotes,
        improvements: r.improvements,
        nextGoals: r.nextGoals,
        recommendedLevel: overallLevel,
        overallLevel,
        createdAt: r.createdAt.toISOString(),
      };
    });

    const latestSkillsJson = shapedReviews[0]?.skillsJson ?? null;
    const progression = computeSwimmerSuiviProgression(
      latestSkillsJson,
      shapedReviews.length
    );

    const cumulativeBilan = aggregateSwimmerCumulativeBilan(
      shapedReviews.map((r) => ({
        skills: r.skillsJson,
        metrics: r.metrics,
        strengths: r.strengths,
      }))
    );

    // Combine unlocked badges across all historical reviews as well
    const allUnlockedSet = new Set<string>(progression.unlockedBadges);
    for (const rev of shapedReviews) {
      if (rev.badgeKey) {
        const bMatch = AQA_SUIVI_BADGES.find((b) => b.key === rev.badgeKey);
        if (bMatch) {
          for (const b of AQA_SUIVI_BADGES) {
            if (b.order <= bMatch.order) {
              allUnlockedSet.add(b.key);
            }
          }
        }
      }
    }
    const unlockedBadges = AQA_SUIVI_BADGES.filter((b) => allUnlockedSet.has(b.key)).map(
      (b) => b.key
    );

    const earnedBadges = AQA_SUIVI_BADGES.map((b) => ({
      ...b,
      unlocked: unlockedBadges.includes(b.key),
    }));

    const latestRecommendedLevel =
      progression.meta.recommendedLevel ||
      shapedReviews[0]?.recommendedLevel ||
      member.level;

    const mergedLatestMeta = {
      ...progression.meta,
      bars: cumulativeBilan.bars,
      lastTouchedBar: cumulativeBilan.lastTouchedBar,
      totalDistanceMeters: cumulativeBilan.totalDistanceMeters,
      lastSessionVolumeMeters: cumulativeBilan.lastSessionVolumeMeters,
      record50m: cumulativeBilan.record50m,
      recordApnea: cumulativeBilan.recordApnea,
      weightKg: cumulativeBilan.weightKg,
      heightCm: cumulativeBilan.heightCm,
      wordFromCoach: cumulativeBilan.wordFromCoach,
      observation: cumulativeBilan.latestObservation,
    };

    const movedMemberIds = await getMovedSwimmerIds([member.id]);
    const assignedGroupIds = decodeMemberGroupIds(member.notes, member.groupId);
    const isMultiGroup = assignedGroupIds.length > 1;
    const isNewClient = computeIsNewClientSwimmer({
      memberId: member.id,
      totalAttendances: totalAtt,
      isMultiGroup,
      movedMemberIds,
    });

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
          isNewClient,
          isMultiGroup,
          totalPresences: presentCount,
          totalAbsences: absentCount,
          attendanceRate,
          reviewCount: shapedReviews.length,
          avgSkillScore: progression.avgSkillScore,
          categoryAverages: progression.categoryAverages,
          bars: cumulativeBilan.bars,
          lastTouchedBar: cumulativeBilan.lastTouchedBar,
          totalDistanceMeters: cumulativeBilan.totalDistanceMeters,
          lastSessionVolumeMeters: cumulativeBilan.lastSessionVolumeMeters,
          record50m: cumulativeBilan.record50m,
          recordApnea: cumulativeBilan.recordApnea,
          weightKg: cumulativeBilan.weightKg,
          heightCm: cumulativeBilan.heightCm,
          wordFromCoach: cumulativeBilan.wordFromCoach,
          latestObservation: cumulativeBilan.latestObservation,
          badgeKey: progression.badgeKey,
          badgeLabel: progression.badgeLabel,
          badgeLabelEn: progression.badgeLabelEn,
          badgeLabelAr: progression.badgeLabelAr,
          badgeAsset: progression.badgeAsset,
          stageKey: progression.stageKey,
          stageLabel: progression.stageLabel,
          stageLabelEn: progression.stageLabelEn,
          stageLabelAr: progression.stageLabelAr,
          stageAsset: progression.stageAsset,
          unlockedBadges,
          latestMeta: mergedLatestMeta,
        },
        bars: cumulativeBilan.bars,
        lastTouchedBar: cumulativeBilan.lastTouchedBar,
        totalDistanceMeters: cumulativeBilan.totalDistanceMeters,
        bilan: cumulativeBilan,
        honorLockStatus,
        honorBadges: AQA_HONOR_BADGES,
        strokeBarDefs: AQA_STROKE_BAR_DEFS,
        stageKey: progression.stageKey,
        stageLabel: progression.stageLabel,
        stageAsset: progression.stageAsset,
        badgeKey: progression.badgeKey,
        badgeLabel: progression.badgeLabel,
        badgeAsset: progression.badgeAsset,
        unlockedBadges,
        categoryAverages: progression.categoryAverages,
        latestMeta: mergedLatestMeta,
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
        allStages: AQA_SUIVI_STAGES,
        allBadges: AQA_SUIVI_BADGES,
        progressionBadges: AQA_SUIVI_BADGES,
        earnedBadges,
        biomechanicalDomains: AQA_BIOMECHANICAL_DOMAINS,
        skillsCatalog: SWIM_SKILLS_CATALOG_V1,
        categorySkillsCatalog: getSkillsForCategory(member.category),
        attendanceSummary: {
          present: presentCount,
          absent: absentCount,
          total: totalAtt,
          attendanceRate,
        },
        recentAttendances: binaryAttendances,
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
