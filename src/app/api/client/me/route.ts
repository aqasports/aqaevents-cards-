import { NextRequest, NextResponse } from "next/server";
import { requireClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { getClientEffectiveBalance } from "@/lib/organizations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { client, error } = await requireClientSession(request);
  if (error || !client) {
    return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fullClient = await prisma.client.findUnique({
      where: { id: client.id },
      include: {
        organization: {
          select: { id: true, name: true, useSharedPool: true },
        },
        cards: {
          select: { id: true, cardCode: true, publicToken: true, status: true, issuedAt: true },
        },
        ledgerEntries: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        redemptions: {
          orderBy: { redeemedAt: "desc" },
          take: 50,
          include: {
            activity: {
              select: { id: true, name: true, creditCost: true, imageUrl: true },
            },
          },
        },
      },
    });

    if (!fullClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const creditBalance = await getClientEffectiveBalance(fullClient.id);

    return NextResponse.json({
      client: {
        id: fullClient.id,
        fullName: fullClient.fullName,
        email: fullClient.email,
        phone: fullClient.phone,
        customerSegment: fullClient.customerSegment,
        organization: fullClient.organization,
      },
      creditBalance,
      cards: fullClient.cards,
      ledgerEntries: fullClient.ledgerEntries,
      redemptions: fullClient.redemptions,
    });
  } catch (err: unknown) {
    console.error("GET client/me error:", err);
    return NextResponse.json(
      { error: "Failed to fetch client profile" },
      { status: 500 }
    );
  }
}
