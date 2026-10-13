import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canEditAttendance, canManageTechReview } from "@/lib/coach-rbac";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const syncPayloadSchema = z.object({
  attendances: z
    .array(
      z.object({
        sessionId: z.string(),
        memberId: z.string(),
        status: z.enum(["present", "absent", "late", "excused"]),
        method: z.enum(["manual", "qr"]).default("manual"),
        isGuest: z.boolean().default(false),
        note: z.string().optional(),
        clientMutationId: z.string(),
      })
    )
    .default([]),
  reviews: z
    .array(
      z.object({
        memberId: z.string(),
        sessionId: z.string().optional(),
        kind: z.enum(["assessment", "observation"]).default("assessment"),
        skills: z.string().optional(),
        metrics: z.string().optional(),
        strengths: z.string().optional(),
        improvements: z.string().optional(),
        nextGoals: z.string().optional(),
        recommendedLevel: z.string().optional(),
        clientMutationId: z.string(),
      })
    )
    .default([]),
});

export async function POST(req: NextRequest) {
  const { error, coach, role } = await requireCoachSession(req);
  if (error || !coach) return error;

  try {
    const body = await req.json();
    const parsed = syncPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid sync payload format." },
        { status: 400 }
      );
    }

    const attendanceResults: Array<{ id: string; success: boolean; error?: string }> = [];
    const reviewResults: Array<{ id: string; success: boolean; error?: string }> = [];

    // Process attendance items
    for (const item of parsed.data.attendances) {
      try {
        const session = await prisma.swimSession.findUnique({
          where: { id: item.sessionId },
        });

        if (!session) {
          attendanceResults.push({ id: item.clientMutationId, success: false, error: "Session not found." });
          continue;
        }

        const authCheck = await canEditAttendance({ coachId: coach.id, role }, session);
        if (!authCheck.allowed) {
          attendanceResults.push({ id: item.clientMutationId, success: false, error: authCheck.reason });
          continue;
        }

        await prisma.swimAttendance.upsert({
          where: {
            sessionId_memberId: {
              sessionId: item.sessionId,
              memberId: item.memberId,
            },
          },
          create: {
            sessionId: item.sessionId,
            memberId: item.memberId,
            status: item.status,
            method: item.method,
            isGuest: item.isGuest,
            note: item.note || null,
            clientMutationId: item.clientMutationId,
            markedByCoachId: coach.id,
          },
          update: {
            status: item.status,
            method: item.method,
            isGuest: item.isGuest,
            note: item.note || null,
            markedByCoachId: coach.id,
            clientMutationId: item.clientMutationId,
          },
        });

        attendanceResults.push({ id: item.clientMutationId, success: true });
      } catch (e: any) {
        attendanceResults.push({ id: item.clientMutationId, success: false, error: e?.message || "Sync failed" });
      }
    }

    // Process review items
    for (const item of parsed.data.reviews) {
      try {
        const authCheck = await canManageTechReview({ coachId: coach.id, role }, item.memberId);
        if (!authCheck.allowed) {
          reviewResults.push({ id: item.clientMutationId, success: false, error: authCheck.reason });
          continue;
        }

        await prisma.swimTechReview.upsert({
          where: { clientMutationId: item.clientMutationId },
          create: {
            memberId: item.memberId,
            coachId: coach.id,
            sessionId: item.sessionId || null,
            kind: item.kind,
            skills: item.skills || null,
            metrics: item.metrics || null,
            strengths: item.strengths || null,
            improvements: item.improvements || null,
            nextGoals: item.nextGoals || null,
            recommendedLevel: item.recommendedLevel || null,
            clientMutationId: item.clientMutationId,
            status: "final",
          },
          update: {
            skills: item.skills || null,
            metrics: item.metrics || null,
            strengths: item.strengths || null,
            improvements: item.improvements || null,
            nextGoals: item.nextGoals || null,
            recommendedLevel: item.recommendedLevel || null,
          },
        });

        reviewResults.push({ id: item.clientMutationId, success: true });
      } catch (e: any) {
        reviewResults.push({ id: item.clientMutationId, success: false, error: e?.message || "Sync failed" });
      }
    }

    return NextResponse.json({
      attendances: attendanceResults,
      reviews: reviewResults,
    });
  } catch (err) {
    logger.error("POST /api/coach/sync error:", err);
    return NextResponse.json(
      { error: "Batch sync failed." },
      { status: 500 }
    );
  }
}
