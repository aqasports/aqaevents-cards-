import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/api-auth";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const replacementSchema = z.object({
  sessionId: z.string(),
  substituteCoachId: z.string(),
  absenceId: z.string().optional(),
  note: z.string().optional(),
  status: z.enum(["proposed", "assigned"]).default("assigned"),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const body = await req.json();
    const parsed = replacementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid replacement data format." },
        { status: 400 }
      );
    }

    const { sessionId, substituteCoachId, absenceId, note, status } = parsed.data;

    const swimSession = await prisma.swimSession.findUnique({
      where: { id: sessionId },
    });

    if (!swimSession) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    const replacement = await prisma.$transaction(async (tx) => {
      const rec = await tx.swimReplacement.create({
        data: {
          sessionId,
          substituteCoachId,
          absenceId: absenceId || null,
          originalCoachId: swimSession.actualCoachId || swimSession.plannedCoachId,
          status,
          note: note || null,
          requestedByAdminId: session.user.id,
          respondedAt: status === "assigned" ? new Date() : null,
        },
      });

      if (status === "assigned") {
        await tx.swimSession.update({
          where: { id: sessionId },
          data: {
            actualCoachId: substituteCoachId,
          },
        });
      }

      return rec;
    });

    await logAdminAction(
      session.user.id,
      "ADMIN_REPLACEMENT_CREATED",
      sessionId,
      JSON.stringify({ substituteCoachId, status })
    );

    return NextResponse.json({ success: true, replacement });
  } catch (err) {
    logger.error("POST /api/admin/swim/coaching/replacements error:", err);
    return NextResponse.json(
      { error: "Failed to create replacement." },
      { status: 500 }
    );
  }
}
