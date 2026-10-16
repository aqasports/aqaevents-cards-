import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canManageTechReview } from "@/lib/coach-rbac";
import { logAdminAction } from "@/lib/audit";
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

const reviewSchema = z.object({
  kind: z.enum(["assessment", "observation"]).default("assessment"),
  sessionId: z.string().optional().nullable(),
  skills: z
    .array(
      z.object({
        key: z.string().optional(),
        skillKey: z.string().optional(),
        label: z.string().optional(),
        score: z.number().int().min(1).max(4),
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
  strengths: z.string().optional().nullable(),
  evaluatorNotes: z.string().optional().nullable(),
  improvements: z.string().optional().nullable(),
  nextGoals: z.string().optional().nullable(),
  recommendedLevel: z.string().optional().nullable(),
  overallLevel: z.string().optional().nullable(),
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
        { error: "Invalid review format." },
        { status: 400, headers: corsHeaders }
      );
    }

    const normalizedSkills = parsed.data.skills
      ? parsed.data.skills.map((s) => ({
          key: s.key || s.skillKey || "skill",
          skillKey: s.skillKey || s.key || "skill",
          label: s.label,
          score: s.score,
        }))
      : null;

    const finalStrengths =
      parsed.data.strengths || parsed.data.evaluatorNotes || null;
    const finalRecommendedLevel =
      parsed.data.recommendedLevel ||
      parsed.data.overallLevel ||
      parsed.data.badgeKey ||
      null;

    const review = await prisma.swimTechReview.create({
      data: {
        memberId,
        coachId: coach.id,
        sessionId: parsed.data.sessionId || null,
        kind: parsed.data.kind,
        skills: normalizedSkills ? JSON.stringify(normalizedSkills) : null,
        metrics: parsed.data.metrics
          ? JSON.stringify(parsed.data.metrics)
          : null,
        strengths: finalStrengths,
        improvements: parsed.data.improvements || null,
        nextGoals: parsed.data.nextGoals || null,
        recommendedLevel: finalRecommendedLevel,
        status: "final",
      },
    });

    await logAdminAction(
      null,
      "COACH_TECH_REVIEW_CREATED",
      memberId,
      JSON.stringify({ coachId: coach.id, reviewId: review.id })
    );

    return NextResponse.json(
      { success: true, review },
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

