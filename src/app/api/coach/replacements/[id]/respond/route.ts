import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const respondSchema = z.object({
  accept: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, coach } = await requireCoachSession(req);
  if (error || !coach) return error;

  const { id: replacementId } = await params;

  try {
    const replacement = await prisma.swimReplacement.findUnique({
      where: { id: replacementId },
      include: { session: true },
    });

    if (!replacement) {
      return NextResponse.json(
        { error: "Replacement request not found." },
        { status: 404 }
      );
    }

    if (replacement.substituteCoachId !== coach.id) {
      return NextResponse.json(
        { error: "Forbidden: This request was not addressed to you." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = respondSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid response format." },
        { status: 400 }
      );
    }

    const isAccepted = parsed.data.accept;

    await prisma.$transaction(async (tx) => {
      await tx.swimReplacement.update({
        where: { id: replacementId },
        data: {
          status: isAccepted ? "accepted" : "declined",
          respondedAt: new Date(),
        },
      });

      if (isAccepted) {
        await tx.swimSession.update({
          where: { id: replacement.sessionId },
          data: {
            actualCoachId: coach.id,
          },
        });
      }
    });

    await logAdminAction(
      null,
      isAccepted ? "COACH_REPLACEMENT_ACCEPTED" : "COACH_REPLACEMENT_DECLINED",
      replacementId,
      JSON.stringify({ coachId: coach.id, sessionId: replacement.sessionId })
    );

    return NextResponse.json({
      success: true,
      status: isAccepted ? "accepted" : "declined",
    });
  } catch (err) {
    logger.error("POST /api/coach/replacements/[id]/respond error:", err);
    return NextResponse.json(
      { error: "Failed to process replacement response." },
      { status: 500 }
    );
  }
}
