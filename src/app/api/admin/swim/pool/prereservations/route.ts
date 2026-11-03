import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const PRERESERVATIONS_SETTING_KEY = "swim_pool_prereservations";

const preReservationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  referenceNumber: z.string(),
  date: z.string(),
  month: z.string(),
  year: z.string(),
  poolId: z.string(),
  status: z.enum(["draft", "confirmed"]).default("draft"),
  confirmedAt: z.string().optional(),
  placeOverrides: z.record(z.string(), z.number()).default({}),
  slotMemberNames: z.record(z.string(), z.array(z.string())).default({}),
  selectedReservationIds: z.array(z.string()).default([]),
  showNamesInPreview: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const savePreReservationsSchema = z.object({
  preReservations: z.array(preReservationItemSchema),
});

export async function GET() {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: PRERESERVATIONS_SETTING_KEY },
    });

    if (!setting?.value) {
      return NextResponse.json({ preReservations: [] });
    }

    const parsed = JSON.parse(setting.value);
    const validList = Array.isArray(parsed) ? parsed : [];
    return NextResponse.json({ preReservations: validList });
  } catch (err: unknown) {
    logger.error("GET swim pool pre-reservations error:", err);
    return NextResponse.json({ error: "Failed to fetch pre-reservations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = savePreReservationsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid pre-reservations payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { preReservations } = parsed.data;

    await prisma.platformSetting.upsert({
      where: { key: PRERESERVATIONS_SETTING_KEY },
      create: {
        key: PRERESERVATIONS_SETTING_KEY,
        value: JSON.stringify(preReservations),
      },
      update: {
        value: JSON.stringify(preReservations),
      },
    });

    return NextResponse.json({ success: true, count: preReservations.length });
  } catch (err: unknown) {
    logger.error("POST swim pool pre-reservations error:", err);
    return NextResponse.json({ error: "Failed to save pre-reservations" }, { status: 500 });
  }
}
