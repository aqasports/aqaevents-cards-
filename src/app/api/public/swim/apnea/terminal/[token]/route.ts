import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { checkAndIncrement } from "@/lib/rate-limit";
import {
  getBestApneaRecords,
  summarizeApneaPacks,
  toApneaSessionDay,
  validateApneaRecordValue,
} from "@/lib/swim-apnea";

export const dynamic = "force-dynamic";

async function resolveTerminal(token: string) {
  if (!token || token.length < 16 || token.length > 64) return null;
  const terminal = await prisma.swimApneaTerminal.findUnique({
    where: { token },
    include: { coach: { select: { id: true, name: true, active: true } } },
  });
  if (!terminal || !terminal.active || !terminal.coach.active) return null;
  return terminal;
}

/**
 * GET /api/public/swim/apnea/terminal/[token]
 * Roster for the apnea coach terminal: members holding an apnea pack.
 * Exposes first-class operational data only (no phone, no payment info).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip =
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const { limited } = await checkAndIncrement(`apnea_terminal:${ip}`, {
    windowMs: 60_000,
    max: 60,
  });
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { token } = await params;
  try {
    const terminal = await resolveTerminal(token);
    if (!terminal) {
      return NextResponse.json({ error: "Terminal not found or revoked" }, { status: 404 });
    }

    const today = toApneaSessionDay();
    const members = await prisma.swimMember.findMany({
      where: { apneaPacks: { some: {} } },
      select: {
        id: true,
        swimId: true,
        fullName: true,
        apneaPacks: { select: { sessionsTotal: true, priceDA: true, withFins: true } },
        apneaPresences: { select: { status: true, sessionDate: true } },
        apneaRecords: { select: { kind: true, value: true, recordedAt: true } },
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({
      coach: { id: terminal.coach.id, name: terminal.coach.name },
      today: today.toISOString(),
      members: members.map((m) => {
        const summary = summarizeApneaPacks(m.apneaPacks, m.apneaPresences);
        const best = getBestApneaRecords(m.apneaRecords);
        return {
          id: m.id,
          swimId: m.swimId,
          fullName: m.fullName,
          hasFins: summary.hasFins,
          sessionsTotal: summary.sessionsTotal,
          sessionsAttended: summary.sessionsAttended,
          sessionsRemaining: summary.sessionsRemaining,
          bestStaticSeconds: best.staticSeconds,
          bestDynamicMeters: best.dynamicMeters,
          todayStatus:
            m.apneaPresences.find((p) => p.sessionDate.getTime() === today.getTime())?.status ??
            null,
        };
      }),
    });
  } catch (err) {
    logger.error("GET apnea terminal error:", err);
    return NextResponse.json({ error: "Failed to load terminal" }, { status: 500 });
  }
}

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("presence"),
    memberId: z.string().min(1),
    status: z.enum(["present", "absent"]),
  }),
  z.object({
    action: z.literal("record"),
    memberId: z.string().min(1),
    kind: z.enum(["static", "dynamic"]),
    value: z.number().int(),
    clientMutationId: z.string().min(8).max(64).optional(),
  }),
]);

/**
 * POST /api/public/swim/apnea/terminal/[token]
 * The coach terminal may only enter presence and records. Nothing else.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    const terminal = await resolveTerminal(token);
    if (!terminal) {
      return NextResponse.json({ error: "Terminal not found or revoked" }, { status: 404 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const body = parsed.data;

    const member = await prisma.swimMember.findFirst({
      where: { id: body.memberId, apneaPacks: { some: {} } },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Swimmer not found" }, { status: 404 });
    }

    if (body.action === "presence") {
      const sessionDate = toApneaSessionDay();
      const presence = await prisma.swimApneaPresence.upsert({
        where: { memberId_sessionDate: { memberId: member.id, sessionDate } },
        create: {
          memberId: member.id,
          sessionDate,
          status: body.status,
          coachId: terminal.coachId,
        },
        update: { status: body.status, coachId: terminal.coachId, markedAt: new Date() },
      });
      return NextResponse.json({ presence });
    }

    const problem = validateApneaRecordValue(body.kind, body.value);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    if (body.clientMutationId) {
      const existing = await prisma.swimApneaRecord.findUnique({
        where: { clientMutationId: body.clientMutationId },
      });
      if (existing) return NextResponse.json({ record: existing });
    }

    const record = await prisma.swimApneaRecord.create({
      data: {
        memberId: member.id,
        kind: body.kind,
        value: body.value,
        coachId: terminal.coachId,
        clientMutationId: body.clientMutationId ?? null,
      },
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    logger.error("POST apnea terminal error:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
