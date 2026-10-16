import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canEditAttendance } from "@/lib/coach-rbac";
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

const attendanceRecordSchema = z.object({
  memberId: z.string(),
  status: z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.enum(["present", "absent", "late", "excused"])),
  method: z
    .string()
    .optional()
    .transform((v) => (v?.toLowerCase() === "qr" ? "qr" : "manual")),
  isGuest: z.boolean().default(false),
  guestName: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  clientMutationId: z.string().optional().nullable(),
});

const sessionRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  intensity: z.string().optional().nullable(),
  focus: z.string().optional().nullable(),
  discipline: z.number().int().min(1).max(5).optional().nullable(),
  waterTempC: z.number().optional().nullable(),
  summary: z.string().optional().nullable(),
});

const quickEvolutionSchema = z.object({
  memberId: z.string(),
  badgeKey: z.string().optional().nullable(),
  recommendedLevel: z.string().optional().nullable(),
  starScore: z.number().int().min(1).max(4).optional().nullable(),
  note: z.string().optional().nullable(),
});

const attendancePayloadSchema = z.object({
  records: z.array(attendanceRecordSchema),
  closeSession: z.boolean().default(true),
  sessionRating: sessionRatingSchema.optional().nullable(),
  quickEvolutions: z.array(quickEvolutionSchema).optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, coach, role } = await requireCoachSession(req);
  if (error || !coach) return error;

  const { id: sessionId } = await params;

  try {
    const session = await prisma.swimSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404, headers: corsHeaders }
      );
    }

    const authCheck = await canEditAttendance(
      { coachId: coach.id, role, coachName: coach.name },
      session
    );

    if (!authCheck.allowed) {
      return NextResponse.json(
        { error: authCheck.reason || "Forbidden" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const parsed = attendancePayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid attendance payload format." },
        { status: 400, headers: corsHeaders }
      );
    }

    const allRecords = parsed.data.records;
    const walkInGuests = allRecords
      .filter((r) => r.memberId.startsWith("guest-"))
      .map((r) => ({
        tempId: r.memberId,
        name: r.guestName || r.note || r.notes || "Nageur Invite",
        status: r.status,
      }));

    // Filter to valid DB member candidates (non-walk-in fake IDs)
    const dbRecords = allRecords.filter((r) => !r.memberId.startsWith("guest-"));
    const candidateMemberIds = Array.from(new Set(dbRecords.map((r) => r.memberId)));
    const existingMembers =
      candidateMemberIds.length > 0
        ? await prisma.swimMember.findMany({
            where: { id: { in: candidateMemberIds } },
            select: { id: true },
          })
        : [];
    const validMemberIdSet = new Set(existingMembers.map((m) => m.id));
    const validRecords = dbRecords.filter((r) => validMemberIdSet.has(r.memberId));

    const quickEvolutions = (parsed.data.quickEvolutions || []).filter((e) =>
      validMemberIdSet.has(e.memberId)
    );

    // Perform upsert inside a single transaction
    await prisma.$transaction(async (tx) => {
      for (const rec of validRecords) {
        const finalNote = rec.note ?? rec.notes ?? null;
        await tx.swimAttendance.upsert({
          where: {
            sessionId_memberId: {
              sessionId,
              memberId: rec.memberId,
            },
          },
          create: {
            sessionId,
            memberId: rec.memberId,
            status: rec.status,
            method: rec.method || "manual",
            isGuest: rec.isGuest,
            note: finalNote,
            clientMutationId: rec.clientMutationId || null,
            markedByCoachId: coach.id,
          },
          update: {
            status: rec.status,
            method: rec.method || "manual",
            isGuest: rec.isGuest,
            note: finalNote,
            markedByCoachId: coach.id,
            clientMutationId: rec.clientMutationId || undefined,
          },
        });
      }

      for (const evo of quickEvolutions) {
        if (!evo.note && !evo.recommendedLevel && !evo.badgeKey && !evo.starScore) {
          continue;
        }
        const skillsPayload = evo.starScore
          ? JSON.stringify([
              { key: "session_mastery", score: evo.starScore },
            ])
          : null;
        await tx.swimTechReview.create({
          data: {
            memberId: evo.memberId,
            coachId: coach.id,
            sessionId,
            kind: "observation",
            skills: skillsPayload,
            strengths: evo.note || null,
            recommendedLevel: evo.recommendedLevel || evo.badgeKey || null,
            status: "final",
          },
        });
      }

      if (parsed.data.closeSession) {
        await tx.swimSession.update({
          where: { id: sessionId },
          data: {
            status: "held",
            closedAt: new Date(),
            actualCoachId: coach.id,
          },
        });
      }
    });

    if (parsed.data.sessionRating) {
      await logAdminAction(
        null,
        "COACH_SESSION_RATING",
        sessionId,
        JSON.stringify({
          ...parsed.data.sessionRating,
          coachId: coach.id,
          coachName: coach.name,
          walkInGuests,
          ratedAt: new Date().toISOString(),
        })
      );
    }

    await logAdminAction(
      null,
      "COACH_ATTENDANCE_SUBMITTED",
      sessionId,
      JSON.stringify({
        coachId: coach.id,
        recordsCount: validRecords.length,
        walkInGuestsCount: walkInGuests.length,
        quickEvolutionsCount: quickEvolutions.length,
        hasRating: Boolean(parsed.data.sessionRating),
        sessionId,
      })
    );

    return NextResponse.json(
      {
        success: true,
        recordsCount: validRecords.length,
        walkInGuestsCount: walkInGuests.length,
        quickEvolutionsCount: quickEvolutions.length,
        closed: parsed.data.closeSession,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    logger.error("PUT /api/coach/sessions/[id]/attendance error:", err);
    return NextResponse.json(
      { error: "Failed to record attendance." },
      { status: 500, headers: corsHeaders }
    );
  }
}

