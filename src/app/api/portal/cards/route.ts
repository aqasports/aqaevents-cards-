import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAdminAction } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const manageCardSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("link"),
    cardId: z.string().min(1),
    clientId: z.string().min(1),
  }),
  z.object({
    action: z.literal("unlink"),
    cardId: z.string().min(1),
  }),
]);

export async function GET() {
  const { session, organizationId, error } = await requireOrgSession();
  if (error) return error;
  if (!session || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const cards = await prisma.card.findMany({
      where: {
        OR: [
          { organizationId },
          { client: { organizationId } }
        ]
      },
      orderBy: { cardCode: "asc" },
      select: {
        id: true,
        cardCode: true,
        publicToken: true,
        status: true,
        issuedAt: true,
        clientId: true,
        organizationId: true,
        client: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(cards);
  } catch (err: any) {
    logger.error("[portal-cards] Failed to fetch cards:", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch cards" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, organizationId, role, error } = await requireOrgSession(["OWNER", "HR_MANAGER"]);
  if (error) return error;
  if (!session || !organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const validated = manageCardSchema.parse(body);

    if (validated.action === "link") {
      const card = await prisma.card.findUnique({
        where: { id: validated.cardId },
      });

      if (!card || card.organizationId !== organizationId) {
        return NextResponse.json({ error: "Card not found or does not belong to this organization" }, { status: 404 });
      }

      if (card.clientId) {
        return NextResponse.json({ error: "Card is already linked to a client" }, { status: 400 });
      }

      const client = await prisma.client.findUnique({
        where: { id: validated.clientId },
      });

      if (!client || client.organizationId !== organizationId) {
        return NextResponse.json({ error: "Client not found or does not belong to this organization" }, { status: 404 });
      }

      const updatedCard = await prisma.card.update({
        where: { id: validated.cardId },
        data: { clientId: validated.clientId },
      });

      await logAdminAction(
        session.user.id,
        "PORTAL_LINK_CARD",
        updatedCard.cardCode,
        `Linked card ${updatedCard.cardCode} to client ${client.fullName} in portal (${role})`
      );

      return NextResponse.json(updatedCard);
    } else if (validated.action === "unlink") {
      const card = await prisma.card.findUnique({
        where: { id: validated.cardId },
        include: { client: true },
      });

      if (!card) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
      }

      const belongsToOrg = card.organizationId === organizationId || card.client?.organizationId === organizationId;
      if (!belongsToOrg) {
        return NextResponse.json({ error: "Card does not belong to this organization" }, { status: 403 });
      }

      const updatedCard = await prisma.card.update({
        where: { id: validated.cardId },
        data: { clientId: null },
      });

      await logAdminAction(
        session.user.id,
        "PORTAL_UNLINK_CARD",
        updatedCard.cardCode,
        `Unlinked card ${updatedCard.cardCode} in portal (${role})`
      );

      return NextResponse.json(updatedCard);
    }
  } catch (err: any) {
    logger.error("[portal-cards] Failed to manage card:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message || "Failed to manage card" }, { status: 400 });
  }
}
