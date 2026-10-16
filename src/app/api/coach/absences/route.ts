import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { resolveCoachGroupIds } from "@/lib/coach-rbac";
import { ensureSessions, toMidnightUTC } from "@/lib/swim-sessions";
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

function normalizeAbsenceReason(raw: string | undefined | null): "sick" | "personal" | "training" | "other" {
  const val = (raw || "").trim().toLowerCase();
  if (val.includes("sick") || val.includes("med") || val.includes("malad") || val.includes("sant")) {
    return "sick";
  }
  if (val.includes("pers") || val.includes("fam")) {
    return "personal";
  }
  if (val.includes("train") || val.includes("form") || val.includes("comp") || val.includes("stage")) {
    return "training";
  }
  return "other";
}

const absenceInputSchema = z.object({
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reason: z.string().optional(),
  details: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  substituteCoachId: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { error, coach, role } = await requireCoachSession(req);
  if (error || !coach) return error;

  try {
    const absences = await prisma.swimCoachAbsence.findMany({
      where: role === "head_coach" ? {} : { coachId: coach.id },
      include: {
        coach: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    return NextResponse.json({ absences }, { headers: corsHeaders });
  } catch (err) {
    logger.error("GET /api/coach/absences error:", err);
    return NextResponse.json(
      { error: "Failed to load absences." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error, coach, role } = await requireCoachSession(req);
  if (error || !coach) return error;

  try {
    const body = await req.json();
    const parsed = absenceInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid absence data format." },
        { status: 400, headers: corsHeaders }
      );
    }

    const rawStart = parsed.data.startsAt || parsed.data.startDate;
    const rawEnd = parsed.data.endsAt || parsed.data.endDate || rawStart;

    if (!rawStart || !rawEnd) {
      return NextResponse.json(
        { error: "Start and end dates are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const startsAtDate = new Date(
      rawStart.includes("T") ? rawStart : `${rawStart}T00:00:00.000Z`
    );
    const endsAtDate = new Date(
      rawEnd.includes("T") ? rawEnd : `${rawEnd}T23:59:59.999Z`
    );

    if (Number.isNaN(startsAtDate.getTime()) || Number.isNaN(endsAtDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date values." },
        { status: 400, headers: corsHeaders }
      );
    }

    const normalizedReason = normalizeAbsenceReason(parsed.data.reason);
    const detailsText = parsed.data.details || parsed.data.notes || null;

    const absence = await prisma.swimCoachAbsence.create({
      data: {
        coachId: coach.id,
        startsAt: startsAtDate,
        endsAt: endsAtDate,
        reason: normalizedReason,
        details: detailsText,
        status: "pending",
      },
    });

    // Automatically materialize and create SwimReplacement proposals for affected sessions
    const groupIds = await resolveCoachGroupIds({
      coachId: coach.id,
      role,
      coachName: coach.name,
    });

    const startDay = toMidnightUTC(startsAtDate);
    const endDay = toMidnightUTC(endsAtDate);
    if (groupIds.length > 0) {
      await ensureSessions(groupIds, startDay, endDay);
    }

    // Resolve target substitute coach (explicitly chosen colleague or fallback to another active coach)
    let targetSubstituteId = parsed.data.substituteCoachId || null;
    if (!targetSubstituteId) {
      const colleague = await prisma.coach.findFirst({
        where: {
          active: true,
          id: { not: coach.id },
        },
        orderBy: { createdAt: "asc" },
      });
      targetSubstituteId = colleague?.id || null;
    }

    const affectedSessions = parsed.data.sessionId
      ? await prisma.swimSession.findMany({
          where: { id: parsed.data.sessionId },
        })
      : await prisma.swimSession.findMany({
          where: {
            groupId: { in: groupIds },
            sessionDate: { gte: startDay, lte: endDay },
            status: "scheduled",
          },
          take: 12,
        });

    const createdReplacements: string[] = [];
    for (const sess of affectedSessions) {
      const existingRep = await prisma.swimReplacement.findFirst({
        where: {
          sessionId: sess.id,
          status: { in: ["proposed", "accepted", "assigned"] },
        },
      });
      if (!existingRep) {
        const rep = await prisma.swimReplacement.create({
          data: {
            sessionId: sess.id,
            originalCoachId: coach.id,
            substituteCoachId: targetSubstituteId,
            status: "proposed",
            requestedByCoachId: coach.id,
            note: detailsText || `Absence declaree (${normalizedReason})`,
          },
        });
        createdReplacements.push(rep.id);
      }
    }

    await logAdminAction(
      null,
      "COACH_ABSENCE_DECLARED",
      coach.id,
      JSON.stringify({
        absenceId: absence.id,
        reason: absence.reason,
        replacementsCreated: createdReplacements.length,
      })
    );

    return NextResponse.json(
      {
        success: true,
        absence,
        replacementsCreated: createdReplacements.length,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    logger.error("POST /api/coach/absences error:", err);
    return NextResponse.json(
      { error: "Failed to submit absence declaration." },
      { status: 500, headers: corsHeaders }
    );
  }
}

