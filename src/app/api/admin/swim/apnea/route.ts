import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  APNEA_EXTRA_SESSION_PRICE_DA,
  APNEA_PACK_PRICE_DA,
  APNEA_PACK_SESSIONS,
  APNEA_PACK_WITH_FINS_PRICE_DA,
  APNEA_STATIC_GOAL_SECONDS,
  getApneaExtrasPrice,
  getApneaPackPrice,
  getBestApneaRecords,
  summarizeApneaPacks,
  toApneaSessionDay,
  validateApneaRecordValue,
} from "@/lib/swim-apnea";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/swim/apnea
 *
 * Single batched read for the whole AQA Apnea tab: members (apnea category or
 * holding an apnea pack), their pack/presence/record summaries, coach
 * terminals and the active coach list. Loaded once per page visit (no polling).
 */
export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const [members, terminals, coaches] = await Promise.all([
      prisma.swimMember.findMany({
        where: {
          OR: [{ category: "apnea" }, { apneaPacks: { some: {} } }],
        },
        select: {
          id: true,
          swimId: true,
          fullName: true,
          phone: true,
          paymentStatus: true,
          apneaPacks: { orderBy: { startedAt: "asc" } },
          apneaPresences: { orderBy: { sessionDate: "desc" } },
          apneaRecords: { orderBy: { recordedAt: "desc" } },
          payments: { select: { amount: true } },
        },
        orderBy: { fullName: "asc" },
      }),
      prisma.swimApneaTerminal.findMany({
        orderBy: { createdAt: "desc" },
        include: { coach: { select: { id: true, name: true, active: true } } },
      }),
      prisma.coach.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const rows = members.map((m) => {
      const summary = summarizeApneaPacks(m.apneaPacks, m.apneaPresences);
      const best = getBestApneaRecords(m.apneaRecords);
      const totalPaid = m.payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        id: m.id,
        swimId: m.swimId,
        fullName: m.fullName,
        phone: m.phone,
        paymentStatus: m.paymentStatus,
        packs: m.apneaPacks.map((p) => ({
          id: p.id,
          sessionsTotal: p.sessionsTotal,
          extraSessions: p.extraSessions,
          withFins: p.withFins,
          priceDA: p.priceDA,
          startedAt: p.startedAt.toISOString(),
        })),
        ...summary,
        totalPaidDA: totalPaid,
        bestStaticSeconds: best.staticSeconds,
        bestDynamicMeters: best.dynamicMeters,
        lastPresenceDate: m.apneaPresences[0]?.sessionDate.toISOString() ?? null,
        todayStatus:
          m.apneaPresences.find(
            (p) => p.sessionDate.getTime() === toApneaSessionDay().getTime()
          )?.status ?? null,
        recentRecords: m.apneaRecords.slice(0, 20).map((r) => ({
          id: r.id,
          kind: r.kind,
          value: r.value,
          recordedAt: r.recordedAt.toISOString(),
        })),
      };
    });

    return NextResponse.json({
      constants: {
        packSessions: APNEA_PACK_SESSIONS,
        packPriceDA: APNEA_PACK_PRICE_DA,
        packWithFinsPriceDA: APNEA_PACK_WITH_FINS_PRICE_DA,
        extraSessionPriceDA: APNEA_EXTRA_SESSION_PRICE_DA,
        staticGoalSeconds: APNEA_STATIC_GOAL_SECONDS,
      },
      members: rows,
      terminals: terminals.map((t) => ({
        id: t.id,
        coachId: t.coachId,
        coachName: t.coach.name,
        token: t.token,
        active: t.active,
        createdAt: t.createdAt.toISOString(),
      })),
      coaches,
    });
  } catch (err) {
    logger.error("GET admin swim apnea error:", err);
    return NextResponse.json({ error: "Failed to load apnea data" }, { status: 500 });
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_pack"),
    memberId: z.string().min(1),
    withFins: z.boolean(),
    extraSessions: z.number().int().min(0).max(20).optional(),
  }),
  z.object({
    action: z.literal("add_extras"),
    packId: z.string().min(1),
    count: z.number().int().min(1).max(20),
  }),
  z.object({
    action: z.literal("mark_presence"),
    memberId: z.string().min(1),
    status: z.enum(["present", "absent"]),
    date: z.string().optional(),
  }),
  z.object({
    action: z.literal("clear_presence"),
    memberId: z.string().min(1),
    date: z.string().optional(),
  }),
  z.object({
    action: z.literal("add_record"),
    memberId: z.string().min(1),
    kind: z.enum(["static", "dynamic"]),
    value: z.number().int(),
    recordedAt: z.string().optional(),
  }),
  z.object({
    action: z.literal("delete_record"),
    recordId: z.string().min(1),
  }),
  z.object({
    action: z.literal("create_terminal"),
    coachId: z.string().min(1),
  }),
  z.object({
    action: z.literal("revoke_terminal"),
    terminalId: z.string().min(1),
  }),
]);

function parseDate(value: string | undefined): Date | null {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * POST /api/admin/swim/apnea
 * Staff actions for the apnea tab. Never touches SwimPayment, ledger or any
 * member pricing field: payments stay managed by the existing swim payment flow.
 */
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const body = parsed.data;

    switch (body.action) {
      case "create_pack": {
        const member = await prisma.swimMember.findUnique({
          where: { id: body.memberId },
          select: { id: true },
        });
        if (!member) return NextResponse.json({ error: "Swimmer not found" }, { status: 404 });
        const extras = body.extraSessions ?? 0;
        const pack = await prisma.swimApneaPack.create({
          data: {
            memberId: member.id,
            withFins: body.withFins,
            extraSessions: extras,
            sessionsTotal: APNEA_PACK_SESSIONS + extras,
            priceDA: getApneaPackPrice(body.withFins) + getApneaExtrasPrice(extras),
          },
        });
        return NextResponse.json({ pack }, { status: 201 });
      }

      case "add_extras": {
        const pack = await prisma.swimApneaPack.findUnique({ where: { id: body.packId } });
        if (!pack) return NextResponse.json({ error: "Pack not found" }, { status: 404 });
        const updated = await prisma.swimApneaPack.update({
          where: { id: pack.id },
          data: {
            extraSessions: pack.extraSessions + body.count,
            sessionsTotal: pack.sessionsTotal + body.count,
            priceDA: pack.priceDA + getApneaExtrasPrice(body.count),
          },
        });
        return NextResponse.json({ pack: updated });
      }

      case "mark_presence": {
        const date = parseDate(body.date);
        if (!date) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
        const sessionDate = toApneaSessionDay(date);
        const presence = await prisma.swimApneaPresence.upsert({
          where: { memberId_sessionDate: { memberId: body.memberId, sessionDate } },
          create: { memberId: body.memberId, sessionDate, status: body.status },
          update: { status: body.status, markedAt: new Date() },
        });
        return NextResponse.json({ presence });
      }

      case "clear_presence": {
        const date = parseDate(body.date);
        if (!date) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
        await prisma.swimApneaPresence.deleteMany({
          where: { memberId: body.memberId, sessionDate: toApneaSessionDay(date) },
        });
        return NextResponse.json({ ok: true });
      }

      case "add_record": {
        const problem = validateApneaRecordValue(body.kind, body.value);
        if (problem) return NextResponse.json({ error: problem }, { status: 400 });
        const recordedAt = parseDate(body.recordedAt);
        if (!recordedAt) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
        const record = await prisma.swimApneaRecord.create({
          data: {
            memberId: body.memberId,
            kind: body.kind,
            value: body.value,
            recordedAt,
          },
        });
        return NextResponse.json({ record }, { status: 201 });
      }

      case "delete_record": {
        await prisma.swimApneaRecord.deleteMany({ where: { id: body.recordId } });
        return NextResponse.json({ ok: true });
      }

      case "create_terminal": {
        const coach = await prisma.coach.findUnique({
          where: { id: body.coachId },
          select: { id: true, active: true },
        });
        if (!coach || !coach.active) {
          return NextResponse.json({ error: "Coach not found or inactive" }, { status: 404 });
        }
        // One active terminal per coach: generating a new link revokes the previous one.
        await prisma.swimApneaTerminal.updateMany({
          where: { coachId: coach.id, active: true },
          data: { active: false },
        });
        const terminal = await prisma.swimApneaTerminal.create({
          data: { coachId: coach.id, token: nanoid(24) },
        });
        return NextResponse.json({ terminal }, { status: 201 });
      }

      case "revoke_terminal": {
        await prisma.swimApneaTerminal.updateMany({
          where: { id: body.terminalId },
          data: { active: false },
        });
        return NextResponse.json({ ok: true });
      }
    }
  } catch (err) {
    logger.error("POST admin swim apnea error:", err);
    return NextResponse.json({ error: "Failed to process apnea action" }, { status: 500 });
  }
}
