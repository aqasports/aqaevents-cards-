import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const absenceSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.enum(["sick", "personal", "training", "other"]),
  details: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { error, coach } = await requireCoachSession(req);
  if (error || !coach) return error;

  try {
    const absences = await prisma.swimCoachAbsence.findMany({
      where: { coachId: coach.id },
      orderBy: { startsAt: "desc" },
    });

    return NextResponse.json({ absences });
  } catch (err) {
    logger.error("GET /api/coach/absences error:", err);
    return NextResponse.json(
      { error: "Failed to load absences." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error, coach } = await requireCoachSession(req);
  if (error || !coach) return error;

  try {
    const body = await req.json();
    const parsed = absenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid absence data format." },
        { status: 400 }
      );
    }

    const absence = await prisma.swimCoachAbsence.create({
      data: {
        coachId: coach.id,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        reason: parsed.data.reason,
        details: parsed.data.details || null,
        status: "pending",
      },
    });

    await logAdminAction(
      null,
      "COACH_ABSENCE_DECLARED",
      coach.id,
      JSON.stringify({ absenceId: absence.id, reason: absence.reason })
    );

    return NextResponse.json({ success: true, absence });
  } catch (err) {
    logger.error("POST /api/coach/absences error:", err);
    return NextResponse.json(
      { error: "Failed to submit absence declaration." },
      { status: 500 }
    );
  }
}
