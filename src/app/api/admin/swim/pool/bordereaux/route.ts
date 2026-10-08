import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const BORDEREAUX_SETTING_KEY = "swim_pool_bordereaux";

const bordereauItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  referenceNumber: z.string(),
  date: z.string(),
  month: z.string(),
  year: z.string(),
  poolId: z.string(),
  memberIds: z.array(z.string()),
  customRows: z.array(
    z.object({
      id: z.string(),
      fullName: z.string(),
      groupOrNote: z.string().optional(),
      poolPriceDA: z.number(),
      month: z.string().optional(),
    })
  ).default([]),
  paymentStatus: z.enum(["unpaid", "paid"]).default("unpaid"),
  paidAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const saveBordereauxSchema = z.object({
  bordereaux: z.array(bordereauItemSchema),
});

export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: BORDEREAUX_SETTING_KEY },
    });

    if (!setting?.value) {
      return NextResponse.json({ bordereaux: [] });
    }

    const parsed = JSON.parse(setting.value);
    const validList = Array.isArray(parsed) ? parsed : [];
    return NextResponse.json({ bordereaux: validList });
  } catch (err: unknown) {
    logger.error("GET swim pool bordereaux error:", err);
    return NextResponse.json({ error: "Failed to fetch bordereaux" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = saveBordereauxSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid bordereaux payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { bordereaux } = parsed.data;

    await prisma.platformSetting.upsert({
      where: { key: BORDEREAUX_SETTING_KEY },
      create: {
        key: BORDEREAUX_SETTING_KEY,
        value: JSON.stringify(bordereaux),
      },
      update: {
        value: JSON.stringify(bordereaux),
      },
    });

    return NextResponse.json({ success: true, count: bordereaux.length });
  } catch (err: unknown) {
    logger.error("POST swim pool bordereaux error:", err);
    return NextResponse.json({ error: "Failed to save bordereaux" }, { status: 500 });
  }
}
