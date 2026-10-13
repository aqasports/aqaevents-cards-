import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canManageTechReview } from "@/lib/coach-rbac";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  kind: z.enum(["assessment", "observation"]).default("assessment"),
  sessionId: z.string().optional(),
  skills: z
    .array(
      z.object({
        key: z.string(),
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
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  nextGoals: z.string().optional(),
  recommendedLevel: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, coach, role } = await requireCoachSession(req);
  if (error || !coach) return error;

  const { id: memberId } = await params;

  try {
    const authCheck = await canManageTechReview({ coachId: coach.id, role }, memberId);
    if (!authCheck.allowed) {
      return NextResponse.json(
        { error: authCheck.reason || "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid review format." },
        { status: 400 }
      );
    }

    const review = await prisma.swimTechReview.create({
      data: {
        memberId,
        coachId: coach.id,
        sessionId: parsed.data.sessionId || null,
        kind: parsed.data.kind,
        skills: parsed.data.skills ? JSON.stringify(parsed.data.skills) : null,
        metrics: parsed.data.metrics ? JSON.stringify(parsed.data.metrics) : null,
        strengths: parsed.data.strengths || null,
        improvements: parsed.data.improvements || null,
        nextGoals: parsed.data.nextGoals || null,
        recommendedLevel: parsed.data.recommendedLevel || null,
        status: "final",
      },
    });

    await logAdminAction(
      null,
      "COACH_TECH_REVIEW_CREATED",
      memberId,
      JSON.stringify({ coachId: coach.id, reviewId: review.id })
    );

    return NextResponse.json({ success: true, review });
  } catch (err) {
    logger.error("POST /api/coach/members/[id]/reviews error:", err);
    return NextResponse.json(
      { error: "Failed to record technical review." },
      { status: 500 }
    );
  }
}
