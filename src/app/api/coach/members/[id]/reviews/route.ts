import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canManageTechReview } from "@/lib/coach-rbac";
import { logAdminAction } from "@/lib/audit";
import {
  aggregateSwimmerCumulativeBilan,
  StrokeBarKey,
  SwimmerStrokeBars,
} from "@/lib/swim-skills";
import {
  HonorBadgeType,
  submitSwimmerHonorNomination,
} from "@/lib/swim-honors";
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

const barsSchema = z.object({
  basics: z.number().min(0).max(200).default(0),
  crawl: z.number().min(0).max(200).default(0),
  backstroke: z.number().min(0).max(200).default(0),
  breaststroke: z.number().min(0).max(200).default(0),
  butterfly: z.number().min(0).max(200).default(0),
});

const reviewSchema = z.object({
  clientMutationId: z.string().optional().nullable(),
  memberId: z.string().optional().nullable(),
  kind: z.enum(["assessment", "observation"]).default("assessment"),
  sessionId: z.string().optional().nullable(),
  bars: barsSchema.optional().nullable(),
  lastTouchedBar: z
    .enum(["basics", "crawl", "backstroke", "breaststroke", "butterfly"])
    .optional()
    .nullable(),
  sessionVolumeMeters: z.number().min(0).max(50000).optional().nullable(),
  volume: z.number().min(0).max(50000).optional().nullable(),
  observation: z.string().optional().nullable(),
  record50m: z.number().min(0).max(1000).optional().nullable(),
  recordApnea: z.number().min(0).max(1000).optional().nullable(),
  weightKg: z.number().min(0).max(300).optional().nullable(),
  heightCm: z.number().min(0).max(260).optional().nullable(),
  wordFromCoach: z.string().optional().nullable(),
  honorRequestType: z
    .enum(["swimmer_of_the_month", "swimmer_of_the_year"])
    .optional()
    .nullable(),
  skillsJson: z.record(z.string(), z.unknown()).optional().nullable(),
  skills: z
    .array(
      z.object({
        key: z.string().optional(),
        skillKey: z.string().optional(),
        label: z.string().optional(),
        score: z.number().int().min(1).max(5),
      })
    )
    .optional(),
  metrics: z
    .array(
      z.object({
        key: z.string(),
        value: z.number(),
        unit: z.string(),
      })
    )
    .optional(),
  chrono25mFreestyle: z.number().optional().nullable(),
  chrono50mFreestyle: z.number().optional().nullable(),
  maxDistanceMeters: z.number().optional().nullable(),
  generalNotes: z.string().optional().nullable(),
  strengths: z.string().optional().nullable(),
  evaluatorNotes: z.string().optional().nullable(),
  improvements: z.string().optional().nullable(),
  nextGoals: z.string().optional().nullable(),
  recommendedLevel: z.string().optional().nullable(),
  overallLevel: z.string().optional().nullable(),
  awardedBadgeKey: z.string().optional().nullable(),
  badgeKey: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, coach, role } = await requireCoachSession(req);
  if (error || !coach) return error;

  const { id: memberId } = await params;

  try {
    const authCheck = await canManageTechReview(
      { coachId: coach.id, role, coachName: coach.name },
      memberId
    );
    if (!authCheck.allowed) {
      return NextResponse.json(
        { error: authCheck.reason || "Forbidden" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid review format.", issues: parsed.error.issues },
        { status: 400, headers: corsHeaders }
      );
    }

    const data = parsed.data;

    // Fetch existing reviews to preserve stored records, physical data, and cumulative distance
    const existingReviews = await prisma.swimTechReview.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { skills: true, metrics: true, strengths: true },
    });
    const cumulative = aggregateSwimmerCumulativeBilan(existingReviews);

    const bars: SwimmerStrokeBars = data.bars
      ? {
          basics: Math.round(data.bars.basics),
          crawl: Math.round(data.bars.crawl),
          backstroke: Math.round(data.bars.backstroke),
          breaststroke: Math.round(data.bars.breaststroke),
          butterfly: Math.round(data.bars.butterfly),
        }
      : cumulative.bars;

    const lastTouchedBar: StrokeBarKey =
      data.lastTouchedBar || cumulative.lastTouchedBar || "basics";

    // Volume rule: only appears in crawl or other bars after basics has 1% or above; no volume for basic level swimmer
    const canHaveVolume =
      bars.basics >= 1 &&
      (lastTouchedBar !== "basics" ||
        bars.crawl > 0 ||
        bars.backstroke > 0 ||
        bars.breaststroke > 0 ||
        bars.butterfly > 0);

    const rawVolume =
      data.sessionVolumeMeters ?? data.volume ?? data.maxDistanceMeters ?? null;
    const sessionVolumeMeters =
      canHaveVolume && rawVolume !== null && rawVolume > 0
        ? Math.round(rawVolume)
        : null;

    // Stored records & physical data (carried forward if not explicitly changed)
    const record50m =
      data.record50m ?? data.chrono50mFreestyle ?? cumulative.record50m ?? null;
    const recordApnea = data.recordApnea ?? cumulative.recordApnea ?? null;
    const weightKg = data.weightKg ?? cumulative.weightKg ?? null;
    const heightCm = data.heightCm ?? cumulative.heightCm ?? null;
    const wordFromCoach =
      data.wordFromCoach !== undefined
        ? data.wordFromCoach?.trim() || null
        : cumulative.wordFromCoach;
    const observation =
      data.observation?.trim() ||
      data.generalNotes?.trim() ||
      data.strengths?.trim() ||
      data.evaluatorNotes?.trim() ||
      null;

    const chosenBadgeKey =
      data.awardedBadgeKey?.trim() || data.badgeKey?.trim() || null;

    const honorType: HonorBadgeType | null =
      data.honorRequestType ||
      (chosenBadgeKey === "swimmer_of_the_month" ||
      chosenBadgeKey === "swimmer_of_the_year"
        ? chosenBadgeKey
        : null);

    const newTotalDistanceMeters =
      cumulative.totalDistanceMeters + (sessionVolumeMeters || 0);

    // If coach triggered Swimmer of the Month or Swimmer of the Year, send ERP nomination request & enforce lock
    if (honorType) {
      const honorResult = await submitSwimmerHonorNomination({
        honorType,
        memberId,
        coachId: coach.id,
        coachName: coach.name,
        bars,
        totalDistanceMeters: newTotalDistanceMeters,
        record50m,
        recordApnea,
        weightKg,
        heightCm,
        wordFromCoach,
        observation,
      });

      if (!honorResult.allowed) {
        return NextResponse.json(
          {
            error:
              honorResult.reason ||
              "Ce badge honorifique est verrouille pour la periode en cours.",
            code: "HONOR_BADGE_LOCKED",
            locked: honorResult.locked,
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Build skillsJson payload combining 5-bar 0-200% model, optional legacy skills, and _meta
    const skillsPayload: Record<string, unknown> = {
      ...(data.skillsJson || {}),
      bars,
      lastTouchedBar,
      _meta: {
        bars,
        lastTouchedBar,
        sessionVolumeMeters,
        totalDistanceMeters: newTotalDistanceMeters,
        observation,
        record50m,
        recordApnea,
        weightKg,
        heightCm,
        wordFromCoach,
        awardedBadgeKey:
          honorType ? null : chosenBadgeKey, // Honor badge is awarded upon ERP admin approval
        honorRequestType: honorType,
        recommendedLevel:
          data.recommendedLevel ||
          data.overallLevel ||
          (honorType ? null : chosenBadgeKey) ||
          null,
        chrono25mFreestyle: data.chrono25mFreestyle ?? null,
        chrono50mFreestyle: record50m,
        maxDistanceMeters: sessionVolumeMeters,
      },
    };

    if (data.skills && data.skills.length > 0) {
      for (const s of data.skills) {
        const k = s.key || s.skillKey || "skill";
        skillsPayload[k] = s.score;
      }
    }

    const finalRecommendedLevel =
      data.recommendedLevel ||
      data.overallLevel ||
      (!honorType ? chosenBadgeKey : null) ||
      null;

    const review = await prisma.swimTechReview.create({
      data: {
        memberId,
        coachId: coach.id,
        sessionId: data.sessionId || null,
        kind: data.kind,
        skills: JSON.stringify(skillsPayload),
        metrics: data.metrics ? JSON.stringify(data.metrics) : null,
        strengths: observation || wordFromCoach || null,
        improvements: data.improvements || null,
        nextGoals: wordFromCoach || data.nextGoals || null,
        recommendedLevel: finalRecommendedLevel,
        status: "final",
      },
    });

    if (finalRecommendedLevel && finalRecommendedLevel.trim().length > 0) {
      await prisma.swimMember.update({
        where: { id: memberId },
        data: { level: finalRecommendedLevel.trim() },
      });
    }

    await logAdminAction(
      null,
      "COACH_TECH_REVIEW_CREATED",
      memberId,
      JSON.stringify({
        coachId: coach.id,
        reviewId: review.id,
        bars,
        sessionVolumeMeters,
        totalDistanceMeters: newTotalDistanceMeters,
        honorRequestType: honorType,
      })
    );

    return NextResponse.json(
      {
        success: true,
        review,
        totalDistanceMeters: newTotalDistanceMeters,
        honorNominationSubmitted: Boolean(honorType),
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    logger.error("POST /api/coach/members/[id]/reviews error:", err);
    return NextResponse.json(
      { error: "Failed to record technical review." },
      { status: 500, headers: corsHeaders }
    );
  }
}
