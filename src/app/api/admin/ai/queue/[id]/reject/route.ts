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

    const updated = await prisma.aiActionQueue.update({
      where: { id },
      data: {
        status: "rejected",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await logAdminAction(
      session.user.id,
      "REJECT_AI_ACTION",
      `Rejected AI action ${queueItem.actionType} (Queue ID: ${id})`
    );

    return NextResponse.json({
      success: true,
      message: "AI action rejected successfully",
      queueItem: updated,
    });
  } catch (err: unknown) {
    logger.error("POST reject AI action error:", err);
    const details = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to reject AI action: ${details}` },
      { status: 500 }
    );
  }
}
