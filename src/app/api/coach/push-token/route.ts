import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoachSession } from "@/lib/coach-auth";
import { coachPushTokenRequestSchema } from "@/lib/coach-contract";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { error, sessionId, coach } = await requireCoachSession(req);
  if (error) return error;
  if (!sessionId || !coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = coachPushTokenRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid push token payload." },
        { status: 400 }
      );
    }

    await prisma.coachAuthSession.update({
      where: { id: sessionId },
      data: {
        pushToken: parsed.data.pushToken,
        ...(parsed.data.platform ? { platform: parsed.data.platform } : {}),
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      registered: Boolean(parsed.data.pushToken),
    });
  } catch (err) {
    logger.error("POST /api/coach/push-token error:", err);
    return NextResponse.json(
      { error: "Failed to update push token." },
      { status: 500 }
    );
  }
}
