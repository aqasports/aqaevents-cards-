import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { sendSimulatedNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: sessionId } = await params;

  try {
    let waitlistId: string | undefined;

    try {
      const body = await request.json();
      waitlistId = body.waitlistId;
    } catch {
      // Body is optional
    }

    let targetEntry;

    if (waitlistId) {
      targetEntry = await prisma.sessionWaitlist.findUnique({
        where: { id: waitlistId },
        include: { client: true, session: { include: { activity: true } } },
      });
    } else {
      targetEntry = await prisma.sessionWaitlist.findFirst({
        where: {
          sessionId,
          status: "waiting",
        },
        orderBy: { createdAt: "asc" },
        include: { client: true, session: { include: { activity: true } } },
      });
    }

    if (!targetEntry) {
      return NextResponse.json(
        { error: "No pending waitlist entry available to promote" },
        { status: 400 }
      );
    }

    const updated = await prisma.sessionWaitlist.update({
      where: { id: targetEntry.id },
      data: { status: "promoted" },
      include: { client: true },
    });

    const recipient = targetEntry.client.email || targetEntry.client.phone || "";
    const type = targetEntry.client.email ? "EMAIL" : "SMS";
    const activityName = targetEntry.session.activity.name;

    await sendSimulatedNotification(
      targetEntry.client.id,
      type === "EMAIL" ? "email" : "sms",
      recipient,
      `A spot has opened up for ${activityName}! Your waitlist spot has been promoted.`,
      "Good News! AQA Session Spot Open"
    );

    return NextResponse.json({
      success: true,
      message: "Waitlist client promoted successfully",
      waitlist: updated,
    });
  } catch (err: unknown) {
    logger.error("POST admin session promote error:", err);
    return NextResponse.json(
      { error: "Failed to promote waitlist client" },
      { status: 500 }
    );
  }
}
