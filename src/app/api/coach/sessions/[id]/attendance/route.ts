import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canEditAttendance } from "@/lib/coach-rbac";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const attendancePayloadSchema = z.object({
  records: z.array(
    z.object({
      memberId: z.string(),
      status: z.enum(["present", "absent", "late", "excused"]),
      method: z.enum(["manual", "qr"]).default("manual"),
      isGuest: z.boolean().default(false),
      note: z.string().optional(),
      clientMutationId: z.string().optional(),
    })
  ),
  closeSession: z.boolean().default(true),
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
        { status: 404 }
      );
    }

    const authCheck = await canEditAttendance(
      { coachId: coach.id, role },
      session
    );

    if (!authCheck.allowed) {
      return NextResponse.json(
        { error: authCheck.reason || "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = attendancePayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid attendance payload format." },
        { status: 400 }
      );
    }

    const records = parsed.data.records;

    // Perform upsert inside a single transaction
    await prisma.$transaction(async (tx) => {
      for (const rec of records) {
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
            method: rec.method,
            isGuest: rec.isGuest,
            note: rec.note || null,
            clientMutationId: rec.clientMutationId || null,
            markedByCoachId: coach.id,
          },
          update: {
            status: rec.status,
            method: rec.method,
            isGuest: rec.isGuest,
            note: rec.note || null,
            markedByCoachId: coach.id,
            clientMutationId: rec.clientMutationId || undefined,
          },
        });
      }

      if (parsed.data.closeSession) {
        await tx.swimSession.update({
          where: { id: sessionId },
          data: {
            status: "held",
            closedAt: new Date(),
          },
        });
      }
    });

    await logAdminAction(
      null,
      "COACH_ATTENDANCE_SUBMITTED",
      sessionId,
      JSON.stringify({
        coachId: coach.id,
        recordsCount: records.length,
        sessionId,
      })
    );

    return NextResponse.json({
      success: true,
      recordsCount: records.length,
      closed: parsed.data.closeSession,
    });
  } catch (err) {
    logger.error("PUT /api/coach/sessions/[id]/attendance error:", err);
    return NextResponse.json(
      { error: "Failed to record attendance." },
      { status: 500 }
    );
  }
}
