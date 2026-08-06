import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const allocateSchema = z.object({
  clientId: z.string().min(1, "Employee ID is required"),
  amount: z.number().positive("Amount must be positive"),
  reason: z.string().min(1, "Reason is required").default("Pool allocation"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminSession();
  if (error || !session) return error;

  const { id: orgId } = await params;

  try {
    const body = await request.json();
    const { clientId, amount, reason } = allocateSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, sharedCreditPool: true, useSharedPool: true },
      });

      if (!org) {
        throw new Error("Organization not found");
      }

      if (!org.useSharedPool) {
        throw new Error("Organization does not use shared pool mode. Enable it first.");
      }

      if (org.sharedCreditPool < amount) {
        throw new Error(
          `Insufficient pool balance. Available: ${org.sharedCreditPool}, requested: ${amount}`
        );
      }

      const client = await tx.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          fullName: true,
          organizationId: true,
          cards: {
            where: { status: "active" },
            select: { id: true, cardCode: true },
            take: 1,
          },
        },
      });

      if (!client || client.organizationId !== orgId) {
        throw new Error("Employee not found or does not belong to this organization");
      }

      if (client.cards.length === 0) {
        throw new Error(
          `Employee ${client.fullName} has no active card. Link a card first.`
        );
      }

      const card = client.cards[0];

      await tx.organization.update({
        where: { id: orgId },
        data: { sharedCreditPool: { decrement: amount } },
      });

      await tx.ledgerEntry.create({
        data: {
          clientId: client.id,
          cardId: card.id,
          delta: amount,
          type: "B2B_GRANT",
          reason: `Pool allocation: ${reason}`,
          createdById: session.user.id,
        },
      });

      return {
        newPoolBalance: org.sharedCreditPool - amount,
        allocatedAmount: amount,
        employeeName: client.fullName,
        cardCode: card.cardCode,
      };
    });

    await logAdminAction(
      session.user.id,
      "ALLOCATE_POOL_CREDITS",
      `${result.allocatedAmount} credits`,
      `Allocated ${result.allocatedAmount} credits from pool to ${result.employeeName} (${result.cardCode}) in org ${orgId}. Reason: ${reason}`
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    logger.error("POST pool allocate error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to allocate credits" },
      { status: 400 }
    );
  }
}
