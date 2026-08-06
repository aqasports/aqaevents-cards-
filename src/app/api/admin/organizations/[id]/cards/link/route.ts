import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const linkCardSchema = z.object({
  cardId: z.string().min(1, "Card ID is required"),
  clientId: z.string().min(1, "Employee ID is required"),
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
    const { cardId, clientId } = linkCardSchema.parse(body);

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { id: true, cardCode: true, clientId: true, organizationId: true, status: true },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    if (card.organizationId !== orgId) {
      return NextResponse.json({ error: "Card does not belong to this organization" }, { status: 403 });
    }

    if (card.clientId) {
      return NextResponse.json({ error: "Card is already linked to an employee. Unlink it first." }, { status: 400 });
    }

    if (card.status !== "active") {
      return NextResponse.json({ error: "Card is not active" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, fullName: true, organizationId: true },
    });

    if (!client || client.organizationId !== orgId) {
      return NextResponse.json({ error: "Employee not found or does not belong to this organization" }, { status: 404 });
    }

    const updated = await prisma.card.update({
      where: { id: cardId },
      data: { clientId },
      select: {
        id: true,
        cardCode: true,
        publicToken: true,
        status: true,
        clientId: true,
        organizationId: true,
        client: { select: { id: true, fullName: true, email: true } },
      },
    });

    await logAdminAction(
      session.user.id,
      "LINK_ORG_CARD",
      card.cardCode,
      `Linked card ${card.cardCode} to employee ${client.fullName} in org ${orgId}`
    );

    return NextResponse.json(updated);
  } catch (err: unknown) {
    logger.error("POST link org card error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to link card" },
      { status: 500 }
    );
  }
}
