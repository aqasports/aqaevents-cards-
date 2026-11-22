import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const ALLOWED_CUSTOMER_SEGMENTS = ["Standard", "High-Value", "VIP", "Inactive"] as const;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSuperAdminSession();
  if (error || !session) return error;

  const { id } = await params;

  try {
    const txOutcome = await prisma.$transaction(async (tx) => {
      const queueItem = await tx.aiActionQueue.findUnique({
        where: { id },
      });

      if (!queueItem) {
        return { ok: false as const, status: 404, error: "AI action queue item not found" };
      }

      if (queueItem.status !== "pending") {
        return { ok: false as const, status: 400, error: `Item is already ${queueItem.status}` };
      }

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(queueItem.proposedPayload || "{}");
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          return { ok: false as const, status: 400, error: "Invalid proposed payload object" };
        }
      } catch {
        return { ok: false as const, status: 400, error: "Malformed JSON in proposed payload" };
      }

      if (queueItem.actionType === "UPDATE_CLIENT_SEGMENT") {
        const clientId = typeof payload.clientId === "string" ? payload.clientId.trim() : "";
        const segment = typeof payload.customerSegment === "string" ? payload.customerSegment : "";
        if (
          !clientId ||
          !ALLOWED_CUSTOMER_SEGMENTS.includes(segment as (typeof ALLOWED_CUSTOMER_SEGMENTS)[number])
        ) {
          return {
            ok: false as const,
            status: 400,
            error: "Invalid UPDATE_CLIENT_SEGMENT payload: valid clientId and customerSegment are required",
          };
        }
      } else if (queueItem.actionType === "PROVISION_CREDITS") {
        const clientId = typeof payload.clientId === "string" ? payload.clientId.trim() : "";
        const amount = Number(payload.amount);
        if (!clientId || !Number.isFinite(amount) || amount <= 0 || amount > 500) {
          return {
            ok: false as const,
            status: 400,
            error: "Invalid PROVISION_CREDITS payload: clientId and positive amount <= 500 are required",
          };
        }
      } else {
        return {
          ok: false as const,
          status: 400,
          error: `Unsupported AI action type: ${queueItem.actionType}`,
        };
      }

      const now = new Date();
      const claimed = await tx.aiActionQueue.updateMany({
        where: { id, status: "pending" },
        data: {
          status: "approved",
          reviewedBy: session.user.id,
          reviewedAt: now,
          executedAt: now,
        },
      });

      if (claimed.count === 0) {
        return { ok: false as const, status: 400, error: "Item has already been processed" };
      }

      if (queueItem.actionType === "UPDATE_CLIENT_SEGMENT") {
        await tx.client.update({
          where: { id: (payload.clientId as string).trim() },
          data: { customerSegment: payload.customerSegment as string },
        });
      } else if (queueItem.actionType === "PROVISION_CREDITS") {
        await tx.ledgerEntry.create({
          data: {
            clientId: (payload.clientId as string).trim(),
            type: "CREDIT",
            delta: Number(payload.amount),
            reason:
              typeof payload.description === "string" && payload.description.trim()
                ? payload.description.trim()
                : "AI Proposed Credit Provisioning",
            createdById: session.user.id,
          },
        });
      }

      const updated = await tx.aiActionQueue.findUnique({ where: { id } });

      return {
        ok: true as const,
        actionType: queueItem.actionType,
        queueItem: updated ?? {
          ...queueItem,
          status: "approved",
          reviewedBy: session.user.id,
          reviewedAt: now,
          executedAt: now,
        },
      };
    });

    if (!txOutcome.ok) {
      return NextResponse.json({ error: txOutcome.error }, { status: txOutcome.status });
    }

    await logAdminAction(
      session.user.id,
      "APPROVE_AI_ACTION",
      `Approved AI action ${txOutcome.actionType} (Queue ID: ${id})`
    );

    return NextResponse.json({
      success: true,
      message: "AI action approved and executed successfully",
      queueItem: txOutcome.queueItem,
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
