import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const queueItem = await prisma.aiActionQueue.findUnique({
      where: { id },
    });

    if (!queueItem) {
      return NextResponse.json(
        { error: "AI action queue item not found" },
        { status: 404 }
      );
    }

    if (queueItem.status !== "pending") {
      return NextResponse.json(
        { error: `Item is already ${queueItem.status}` },
        { status: 400 }
      );
    }

    const payload = JSON.parse(queueItem.proposedPayload || "{}");

    // Execute action based on actionType
    if (queueItem.actionType === "UPDATE_CLIENT_SEGMENT") {
      if (payload.clientId && payload.customerSegment) {
        await prisma.client.update({
          where: { id: payload.clientId },
          data: { customerSegment: payload.customerSegment },
        });
      }
    } else if (queueItem.actionType === "PROVISION_CREDITS") {
      if (payload.clientId && payload.amount) {
        await prisma.ledgerEntry.create({
          data: {
            clientId: payload.clientId,
            type: "CREDIT",
            delta: Number(payload.amount),
            reason: payload.description || "AI Proposed Credit Provisioning",
          },
        });
      }
    }

    const now = new Date();
    const updated = await prisma.aiActionQueue.update({
      where: { id },
      data: {
        status: "approved",
        reviewedBy: session.user.id,
        reviewedAt: now,
        executedAt: now,
      },
    });

    await logAdminAction(
      session.user.id,
      "APPROVE_AI_ACTION",
      `Approved AI action ${queueItem.actionType} (Queue ID: ${id})`
    );

    return NextResponse.json({
      success: true,
      message: "AI action approved and executed successfully",
      queueItem: updated,
    });
  } catch (err: unknown) {
    logger.error("POST approve AI action error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to approve AI action: ${details}` },
      { status: 500 }
    );
  }
}
