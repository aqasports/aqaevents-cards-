import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { canEditAttendance } from "@/lib/coach-rbac";
import { logAdminAction } from "@/lib/audit";
import {
  aggregateSwimmerCumulativeBilan,
  StrokeBarKey,
  SwimmerStrokeBars,
} from "@/lib/swim-skills";
import {
  HonorBadgeType,
  submitSwimmerHonorNomination,
} from "@/lib/swim-honors";
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
    .transform((v) => (v.trim().toLowerCase() === "absent" ? "absent" : "present"))
    .pipe(z.enum(["present", "absent"])),
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
  rating: z.number().int().min(1).max(5).default(5),
  intensity: z.string().optional().nullable(),
  focus: z.string().optional().nullable(),
  discipline: z.number().int().min(1).max(5).optional().nullable(),
  waterTempC: z.number().optional().nullable(),
  summary: z.string().optional().nullable(),
});

const barsSchema = z.object({
  basics: z.number().min(0).max(200).default(0),
  crawl: z.number().min(0).max(200).default(0),
  backstroke: z.number().min(0).max(200).default(0),
  breaststroke: z.number().min(0).max(200).default(0),
  butterfly: z.number().min(0).max(200).default(0),
});

const quickEvolutionSchema = z.object({
  memberId: z.string(),
  bars: barsSchema.optional().nullable(),
  lastTouchedBar: z
    .enum(["basics", "crawl", "backstroke", "breaststroke", "butterfly"])
    .optional()
    .nullable(),
  sessionVolumeMeters: z.number().min(0).max(50000).optional().nullable(),
  volume: z.number().min(0).max(50000).optional().nullable(),
  observation: z.string().optional().nullable(),
  record50m: z.number().min(0).max(1000).optional().nullable(),
  recordApnea: z.number().min(0).max(1000).optional().nullable(),
  weightKg: z.number().min(0).max(300).optional().nullable(),
  heightCm: z.number().min(0).max(260).optional().nullable(),
  wordFromCoach: z.string().optional().nullable(),
  badgeKey: z.string().optional().nullable(),
  honorRequestType: z
    .enum(["swimmer_of_the_month", "swimmer_of_the_year"])
    .optional()
    .nullable(),
  recommendedLevel: z.string().optional().nullable(),
  starScore: z.number().int().min(1).max(5).optional().nullable(),
  note: z.string().optional().nullable(),
});

const attendancePayloadSchema = z.object({
  clientMutationId: z.string().optional().nullable(),
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

    // Never accept evaluating future sessions or sessions before at least 1 hour after session start time
    if (role !== "head_coach") {
      const sessionDateStr = session.sessionDate.toISOString().split("T")[0];
      const [startH, startM] = session.startTime.split(":").map(Number);
      const sessionStart = new Date(sessionDateStr);
      sessionStart.setHours(startH || 0, startM || 0, 0, 0);
      const oneHourAfterStart = new Date(sessionStart.getTime() + 60 * 60 * 1000);
      const now = new Date();

      if (now < oneHourAfterStart) {
        return NextResponse.json(
          {
            error:
              "L'evaluation de la seance n'est autorisee qu'au moins 1 heure apres le debut de la seance.",
            code: "SESSION_NOT_READY_FOR_EVALUATION",
            unlocksAt: oneHourAfterStart.toISOString(),
          },
          { status: 400, headers: corsHeaders }
        );
      }
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

    // Fetch existing reviews for quickEvolutions members to carry forward stored records & bars
    const evoMemberIds = Array.from(new Set(quickEvolutions.map((e) => e.memberId)));
    const existingEvoReviews =
      evoMemberIds.length > 0
        ? await prisma.swimTechReview.findMany({
            where: { memberId: { in: evoMemberIds } },
            orderBy: { createdAt: "desc" },
            select: {
              memberId: true,
              skills: true,
              metrics: true,
              strengths: true,
            },
          })
        : [];

    const reviewsByMember = new Map<
      string,
      Array<{ skills: string | null; metrics: string | null; strengths: string | null }>
    >();
    for (const r of existingEvoReviews) {
      const list = reviewsByMember.get(r.memberId) || [];
      list.push(r);
      reviewsByMember.set(r.memberId, list);
    }

    // Validate honor nominations before running transaction
    const honorRequestsToSubmit: Array<{
      honorType: HonorBadgeType;
      memberId: string;
      bars: SwimmerStrokeBars;
      totalDistanceMeters: number;
      record50m: number | null;
      recordApnea: number | null;
      weightKg: number | null;
      heightCm: number | null;
      wordFromCoach: string | null;
      observation: string | null;
    }> = [];

    for (const evo of quickEvolutions) {
      const chosenBadge = evo.badgeKey?.trim() || null;
      const honorType: HonorBadgeType | null =
        evo.honorRequestType ||
        (chosenBadge === "swimmer_of_the_month" || chosenBadge === "swimmer_of_the_year"
          ? chosenBadge
          : null);

      if (honorType) {
        const cumulative = aggregateSwimmerCumulativeBilan(
          reviewsByMember.get(evo.memberId) || []
        );
        const bars: SwimmerStrokeBars = evo.bars
          ? {
              basics: Math.round(evo.bars.basics),
              crawl: Math.round(evo.bars.crawl),
              backstroke: Math.round(evo.bars.backstroke),
              breaststroke: Math.round(evo.bars.breaststroke),
              butterfly: Math.round(evo.bars.butterfly),
            }
          : cumulative.bars;
        const lastTouchedBar: StrokeBarKey =
          evo.lastTouchedBar || cumulative.lastTouchedBar || "basics";
        const canHaveVolume =
          bars.basics >= 1 &&
          (lastTouchedBar !== "basics" ||
            bars.crawl > 0 ||
            bars.backstroke > 0 ||
            bars.breaststroke > 0 ||
            bars.butterfly > 0);
        const rawVol = evo.sessionVolumeMeters ?? evo.volume ?? null;
        const vol =
          canHaveVolume && rawVol !== null && rawVol > 0 ? Math.round(rawVol) : 0;

        honorRequestsToSubmit.push({
          honorType,
          memberId: evo.memberId,
          bars,
          totalDistanceMeters: cumulative.totalDistanceMeters + vol,
          record50m: evo.record50m ?? cumulative.record50m,
          recordApnea: evo.recordApnea ?? cumulative.recordApnea,
          weightKg: evo.weightKg ?? cumulative.weightKg,
          heightCm: evo.heightCm ?? cumulative.heightCm,
          wordFromCoach:
            evo.wordFromCoach !== undefined
              ? evo.wordFromCoach?.trim() || null
              : cumulative.wordFromCoach,
          observation: evo.observation?.trim() || evo.note?.trim() || null,
        });
      }
    }

    for (const hReq of honorRequestsToSubmit) {
      const res = await submitSwimmerHonorNomination({
        ...hReq,
        coachId: coach.id,
        coachName: coach.name,
      });
      if (!res.allowed) {
        return NextResponse.json(
          {
            error:
              res.reason ||
              "Ce badge honorifique est verrouille pour la periode en cours.",
            code: "HONOR_BADGE_LOCKED",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

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
        const hasBars =
          evo.bars &&
          (evo.bars.basics > 0 ||
            evo.bars.crawl > 0 ||
            evo.bars.backstroke > 0 ||
            evo.bars.breaststroke > 0 ||
            evo.bars.butterfly > 0);
        const hasBilanData =
          hasBars ||
          (evo.sessionVolumeMeters && evo.sessionVolumeMeters > 0) ||
          (evo.volume && evo.volume > 0) ||
          (evo.observation && evo.observation.trim().length > 0) ||
          (evo.note && evo.note.trim().length > 0) ||
          evo.record50m != null ||
          evo.recordApnea != null ||
          evo.weightKg != null ||
          evo.heightCm != null ||
          (evo.wordFromCoach && evo.wordFromCoach.trim().length > 0) ||
          (evo.badgeKey && evo.badgeKey.trim().length > 0) ||
          evo.honorRequestType != null ||
          (evo.recommendedLevel && evo.recommendedLevel.trim().length > 0) ||
          (evo.starScore && evo.starScore > 0);

        if (!hasBilanData) {
          continue;
        }

        const cumulative = aggregateSwimmerCumulativeBilan(
          reviewsByMember.get(evo.memberId) || []
        );

        const bars: SwimmerStrokeBars = evo.bars
          ? {
              basics: Math.round(evo.bars.basics),
              crawl: Math.round(evo.bars.crawl),
              backstroke: Math.round(evo.bars.backstroke),
              breaststroke: Math.round(evo.bars.breaststroke),
              butterfly: Math.round(evo.bars.butterfly),
            }
          : cumulative.bars;

        const lastTouchedBar: StrokeBarKey =
          evo.lastTouchedBar || cumulative.lastTouchedBar || "basics";

        const canHaveVolume =
          bars.basics >= 1 &&
          (lastTouchedBar !== "basics" ||
            bars.crawl > 0 ||
            bars.backstroke > 0 ||
            bars.breaststroke > 0 ||
            bars.butterfly > 0);

        const rawVol = evo.sessionVolumeMeters ?? evo.volume ?? null;
        const sessionVolumeMeters =
          canHaveVolume && rawVol !== null && rawVol > 0
            ? Math.round(rawVol)
            : null;

        const record50m = evo.record50m ?? cumulative.record50m ?? null;
        const recordApnea = evo.recordApnea ?? cumulative.recordApnea ?? null;
        const weightKg = evo.weightKg ?? cumulative.weightKg ?? null;
        const heightCm = evo.heightCm ?? cumulative.heightCm ?? null;
        const wordFromCoach =
          evo.wordFromCoach !== undefined
            ? evo.wordFromCoach?.trim() || null
            : cumulative.wordFromCoach;
        const observation =
          evo.observation?.trim() || evo.note?.trim() || null;

        const chosenBadgeKey = evo.badgeKey?.trim() || null;
        const isHonorRequest =
          evo.honorRequestType != null ||
          chosenBadgeKey === "swimmer_of_the_month" ||
          chosenBadgeKey === "swimmer_of_the_year";
        const honorType: HonorBadgeType | null =
          evo.honorRequestType ||
          (chosenBadgeKey === "swimmer_of_the_month" ||
          chosenBadgeKey === "swimmer_of_the_year"
            ? chosenBadgeKey
            : null);

        const totalDistanceMeters =
          cumulative.totalDistanceMeters + (sessionVolumeMeters || 0);

        const skillsPayload = JSON.stringify({
          bars,
          lastTouchedBar,
          ...(evo.starScore ? { water_comfort_immersion: evo.starScore } : {}),
          _meta: {
            bars,
            lastTouchedBar,
            sessionVolumeMeters,
            totalDistanceMeters,
            observation,
            record50m,
            recordApnea,
            weightKg,
            heightCm,
            wordFromCoach,
            awardedBadgeKey: isHonorRequest ? null : chosenBadgeKey,
            honorRequestType: honorType,
            recommendedLevel:
              evo.recommendedLevel || (!isHonorRequest ? chosenBadgeKey : null) || null,
            chrono50mFreestyle: record50m,
            maxDistanceMeters: sessionVolumeMeters,
          },
        });

        await tx.swimTechReview.create({
          data: {
            memberId: evo.memberId,
            coachId: coach.id,
            sessionId,
            kind: "observation",
            skills: skillsPayload,
            strengths: observation || wordFromCoach || null,
            nextGoals: wordFromCoach || null,
            recommendedLevel:
              evo.recommendedLevel || (!isHonorRequest ? chosenBadgeKey : null) || null,
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
        honorNominationsCount: honorRequestsToSubmit.length,
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
        honorNominationsCount: honorRequestsToSubmit.length,
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
