import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canEditAttendance, canManageTechReview } from "@/lib/coach-rbac";
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

const syncPayloadSchema = z.object({
  attendances: z
    .array(
      z.object({
        sessionId: z.string(),
        memberId: z.string(),
        status: z
          .string()
          .transform((v) => (v.trim().toLowerCase() === "absent" ? "absent" : "present"))
          .pipe(z.enum(["present", "absent"])),
        method: z.enum(["manual", "qr"]).default("manual"),
        isGuest: z.boolean().default(false),
        note: z.string().optional().nullable(),
        clientMutationId: z.string(),
      })
    )
    .default([]),
  reviews: z
    .array(
      z.object({
        memberId: z.string(),
        sessionId: z.string().optional().nullable(),
        kind: z.enum(["assessment", "observation"]).default("assessment"),
        skills: z.string().optional().nullable(),
        metrics: z.string().optional().nullable(),
        strengths: z.string().optional().nullable(),
        improvements: z.string().optional().nullable(),
        nextGoals: z.string().optional().nullable(),
        recommendedLevel: z.string().optional().nullable(),
        clientMutationId: z.string(),
      })
    )
    .default([]),
  mutations: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        payload: z.record(z.string(), z.unknown()),
        createdAt: z.string().optional(),
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
        { status: 400, headers: corsHeaders }
      );
    }

    const attendancesList = [...parsed.data.attendances];
    const reviewsList = [...parsed.data.reviews];

    // Also unpack generic mutations array sent by Flutter OfflineSyncManager
    for (const mut of parsed.data.mutations) {
      if (mut.type === "ATTENDANCE_BATCH" && mut.payload) {
        const sessionId = String(mut.payload.sessionId || "");
        const records = Array.isArray(mut.payload.records) ? mut.payload.records : [];
        for (const r of records) {
          if (r && typeof r === "object" && "memberId" in r && "status" in r) {
            const rawStatus = String((r as Record<string, unknown>).status || "present")
              .trim()
              .toLowerCase();
            const validStatus: "present" | "absent" =
              rawStatus === "absent" ? "absent" : "present";
            attendancesList.push({
              sessionId,
              memberId: String((r as Record<string, unknown>).memberId),
              status: validStatus,
              method: "manual",
              isGuest: Boolean((r as Record<string, unknown>).isGuest),
              note: ((r as Record<string, unknown>).note ||
                (r as Record<string, unknown>).notes ||
                null) as string | null,
              clientMutationId: `${mut.id}-${String((r as Record<string, unknown>).memberId)}`,
            });
          }
        }
      } else if (mut.type === "TECH_REVIEW" && mut.payload) {
        const memberId = String(mut.payload.memberId || "");
        if (memberId) {
          reviewsList.push({
            memberId,
            sessionId: (mut.payload.sessionId as string) || null,
            kind: "assessment",
            skills: mut.payload.skills ? JSON.stringify(mut.payload.skills) : null,
            metrics: mut.payload.metrics ? JSON.stringify(mut.payload.metrics) : null,
            strengths:
              ((mut.payload.strengths || mut.payload.evaluatorNotes) as string) || null,
            improvements: (mut.payload.improvements as string) || null,
            nextGoals: (mut.payload.nextGoals as string) || null,
            recommendedLevel:
              ((mut.payload.recommendedLevel || mut.payload.overallLevel) as string) || null,
            clientMutationId: mut.id,
          });
        }
      }
    }

    const attendanceResults: Array<{ id: string; success: boolean; error?: string }> = [];
    const reviewResults: Array<{ id: string; success: boolean; error?: string }> = [];

    // Process attendance items
    for (const item of attendancesList) {
      if (item.memberId.startsWith("guest-")) {
        attendanceResults.push({ id: item.clientMutationId, success: true });
        continue;
      }
      try {
        const session = await prisma.swimSession.findUnique({
          where: { id: item.sessionId },
        });

        if (!session) {
          attendanceResults.push({
            id: item.clientMutationId,
            success: false,
            error: "Session not found.",
          });
          continue;
        }

        const authCheck = await canEditAttendance(
          { coachId: coach.id, role, coachName: coach.name },
          session
        );
        if (!authCheck.allowed) {
          attendanceResults.push({
            id: item.clientMutationId,
            success: false,
            error: authCheck.reason,
          });
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
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Sync failed";
        attendanceResults.push({ id: item.clientMutationId, success: false, error: msg });
      }
    }

    // Process review items
    for (const item of reviewsList) {
      try {
        const authCheck = await canManageTechReview(
          { coachId: coach.id, role, coachName: coach.name },
          item.memberId
        );
        if (!authCheck.allowed) {
          reviewResults.push({
            id: item.clientMutationId,
            success: false,
            error: authCheck.reason,
          });
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
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Sync failed";
        reviewResults.push({ id: item.clientMutationId, success: false, error: msg });
      }
    }

    return NextResponse.json(
      {
        attendances: attendanceResults,
        reviews: reviewResults,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    logger.error("POST /api/coach/sync error:", err);
    return NextResponse.json(
      { error: "Batch sync failed." },
      { status: 500, headers: corsHeaders }
    );
  }
}

