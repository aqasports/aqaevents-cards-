import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAdminAction } from "@/lib/audit";
import { nanoid } from "nanoid";
import { generatePublicToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const allocateCreditsSchema = z.object({
  action: z.enum(["allocate_individual", "toggle_shared_pool", "request_credits"]),
  clientId: z.string().optional(),
  creditAmount: z.number().positive().finite().optional(),
  useSharedPool: z.boolean().optional(),
  requestedCredits: z.number().int().positive().max(10000).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const { session, organizationId, error } = await requireOrgSession();
  if (error) return error;
  if (!session || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { sharedCreditPool: true, useSharedPool: true, creditRate: true },
    });

    const recentAllocations = await prisma.ledgerEntry.findMany({
      where: {
        client: { organizationId },
        type: "ORG_POOL_ALLOCATION",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        client: { select: { fullName: true, id: true } },
      },
    });

    const pendingRequests = await prisma.publicPurchaseRequest.findMany({
      where: {
        client: { organizationId },
        status: "pending_confirmation",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      organization: org,
      recentAllocations,
      pendingRequests,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch credit details" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, organizationId, role, error } = await requireOrgSession(["OWNER", "HR_MANAGER"]);
  if (error) return error;
  if (!session || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const validated = allocateCreditsSchema.parse(body);

    if (validated.action === "allocate_individual") {
      if (!validated.clientId || !validated.creditAmount) {
        return NextResponse.json({ error: "clientId and creditAmount are required for allocation" }, { status: 400 });
      }

      const client = await prisma.client.findFirst({
        where: { id: validated.clientId, organizationId },
        include: { cards: { where: { status: "active" }, take: 1 } },
      });

      if (!client) {
        return NextResponse.json({ error: "Employee not found in organization" }, { status: 404 });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Atomically check and deduct from sharedCreditPool to prevent concurrent overdraft
        const deducted = await tx.organization.updateMany({
          where: {
            id: organizationId,
            sharedCreditPool: { gte: validated.creditAmount! },
          },
          data: { sharedCreditPool: { decrement: validated.creditAmount! } },
        });
        if (deducted.count === 0) {
          throw new Error("Insufficient organization credit pool balance");
        }

        // Add ledger entry for client card
        const entry = await tx.ledgerEntry.create({
          data: {
            clientId: client.id,
            cardId: client.cards[0]?.id || null,
            delta: validated.creditAmount!,
            type: "ORG_POOL_ALLOCATION",
            reason: validated.notes || "Corporate pool allocation to employee",
          },
        });

        return entry;
      });

      await logAdminAction(
        null,
        "ALLOCATE_POOL_CREDITS",
        client.fullName,
        `Allocated ${validated.creditAmount} credits from pool to ${client.fullName} (orgUserId: ${session.user.id}, orgId: ${organizationId})`
      );

      return NextResponse.json({ success: true, entry: result });
    }

    if (validated.action === "toggle_shared_pool") {
      if (validated.useSharedPool === undefined) {
        return NextResponse.json({ error: "useSharedPool status is required" }, { status: 400 });
      }

      const updated = await prisma.organization.update({
        where: { id: organizationId },
        data: { useSharedPool: validated.useSharedPool },
      });

      await logAdminAction(
        null,
        "TOGGLE_SHARED_POOL",
        organizationId,
        `Set org shared pool mode to ${validated.useSharedPool} (orgUserId: ${session.user.id}, orgId: ${organizationId})`
      );

      return NextResponse.json({ success: true, organization: updated });
    }

    if (validated.action === "request_credits") {
      if (!validated.requestedCredits) {
        return NextResponse.json({ error: "requestedCredits is required" }, { status: 400 });
      }

      // Find an employee or primary contact client in org
      const client = await prisma.client.findFirst({
        where: { organizationId },
      });

      if (!client) {
        return NextResponse.json({ error: "No employee accounts exist in organization to associate request" }, { status: 400 });
      }

      let card = await prisma.card.findFirst({
        where: { clientId: client.id },
      });

      if (!card) {
        card = await prisma.card.create({
          data: {
            clientId: client.id,
            organizationId,
            publicToken: generatePublicToken(),
            cardCode: `AQA-CORP-${nanoid(6).toUpperCase()}`,
            status: "active",
          },
        });
      }

      const purchaseReq = await prisma.publicPurchaseRequest.create({
        data: {
          cardId: card.id,
          clientId: client.id,
          type: "custom",
          payload: JSON.stringify({
            organizationId,
            requestedCredits: validated.requestedCredits,
            requestedByRole: role,
            notes: validated.notes || null,
          }),
          status: "pending_confirmation",
          confirmationCode: `CORP-${nanoid(6).toUpperCase()}`,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      await logAdminAction(
        null,
        "REQUEST_CORPORATE_CREDITS",
        organizationId,
        `Submitted request for ${validated.requestedCredits} credits for staff review (orgUserId: ${session.user.id}, orgId: ${organizationId})`
      );

      return NextResponse.json({ success: true, request: purchaseReq }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Credit action failed" }, { status: 400 });
  }
}
