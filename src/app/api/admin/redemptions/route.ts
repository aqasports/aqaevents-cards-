import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/api-auth";
import { getClientBalance } from "@/lib/balance";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { sendSimulatedNotification } from "@/lib/notifications";
import { syncClientCRM } from "@/lib/crm";

const redeemSchema = z.object({
  clientId: z.string(),
  activityId: z.string(),
  sessionId: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const body = await request.json();
  const parsed = redeemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const activity = await prisma.activity.findUnique({
    where: { id: parsed.data.activityId },
  });

  if (!activity || !activity.active) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
    include: { cards: { where: { status: "active" }, take: 1 } },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Calculate balance inside the transaction to prevent concurrent race conditions
      const aggregate = await tx.ledgerEntry.aggregate({
        where: { clientId: client.id },
        _sum: { delta: true },
      });
      
      const currentBalance = aggregate._sum.delta ?? 0;
      if (currentBalance < activity.creditCost) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const redemption = await tx.redemption.create({
        data: {
          clientId: client.id,
          activityId: activity.id,
          sessionId: parsed.data.sessionId,
          creditsUsed: activity.creditCost,
          staffId: session.user.id,
          notes: parsed.data.notes,
        },
        include: {
          activity: true,
          session: true,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          clientId: client.id,
          cardId: client.cards[0]?.id,
          redemptionId: redemption.id,
          delta: -activity.creditCost,
          type: "debit",
          reason: `Redeemed ${activity.name}`,
          createdById: session.user.id,
        },
      });

      return redemption;
    });

    await syncClientCRM(client.id);

    const newBalance = await getClientBalance(client.id);

    // 1. Audit Log Action
    await logAdminAction(
      session.user.id,
      "REDEEM_ACTIVITY",
      `Client ${client.fullName}`,
      `Redeemed activity "${activity.name}" for ${client.fullName}. Credits deducted: -${activity.creditCost}. New Balance: ${newBalance} credits.`
    );

    // 2. Simulated SMS/Email Notification
    const notificationMessage = `Hello ${client.fullName}, activity "${activity.name}" was successfully redeemed. -${activity.creditCost} credits applied. Your remaining balance is: ${newBalance} credits.`;

    if (client.phone) {
      await sendSimulatedNotification(
        client.id,
        "sms",
        client.phone,
        `AQA Sports: ${notificationMessage}`
      );
    }

    if (client.email) {
      await sendSimulatedNotification(
        client.id,
        "email",
        client.email,
        notificationMessage,
        "AQA Sports Event Activity Redeemed"
      );
    }

    return NextResponse.json({ redemption: result, balance: newBalance });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      const currentBalance = await getClientBalance(client.id);
      return NextResponse.json(
        { error: "Insufficient balance", balance: currentBalance, required: activity.creditCost },
        { status: 400 },
      );
    }
    throw err;
  }
}

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const redemptions = await prisma.redemption.findMany({
    include: {
      client: { select: { fullName: true, id: true } },
      activity: true,
      session: true,
      staff: { select: { name: true } },
    },
    orderBy: { redeemedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(redemptions);
}
