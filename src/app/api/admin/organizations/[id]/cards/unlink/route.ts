import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const unlinkCardSchema = z.object({
  cardId: z.string().min(1, "Card ID is required"),
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
    const { cardId } = unlinkCardSchema.parse(body);

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: {
        id: true,
        cardCode: true,
        clientId: true,
        organizationId: true,
        client: { select: { fullName: true, organizationId: true } },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const belongsToOrg =
      card.organizationId === orgId ||
      card.client?.organizationId === orgId;

    if (!belongsToOrg) {
      return NextResponse.json({ error: "Card does not belong to this organization" }, { status: 403 });
    }

    const previousOwner = card.client?.fullName ?? "unassigned";

    const updated = await prisma.card.update({
      where: { id: cardId },
      data: { clientId: null },
      select: {
        id: true,
        cardCode: true,
        publicToken: true,
        status: true,
        clientId: true,
        organizationId: true,
      },
    });

    await logAdminAction(
      session.user.id,
      "UNLINK_ORG_CARD",
      card.cardCode,
      `Unlinked card ${card.cardCode} from employee ${previousOwner} in org ${orgId}`
    );

    return NextResponse.json(updated);
  } catch (err: unknown) {
    logger.error("POST unlink org card error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to unlink card" },
      { status: 500 }
    );
  }
}
