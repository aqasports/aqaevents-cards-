import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getEventCardUrl } from "@/lib/tokens";

export async function POST(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const body = await request.json();
  const clientIds: string[] = body.clientIds ?? [];
  const qrSize: number = typeof body.qrSize === "number" ? Math.min(800, Math.max(100, body.qrSize)) : 400;
  const mode: "client" | "blank" | "all" = body.mode ?? "client";

  type CardWhere = NonNullable<Parameters<typeof prisma.card.findMany>[0]>["where"];
  let whereClause: CardWhere = { status: "active" };

  if (mode === "blank") {
    whereClause = { status: "active", clientId: null };
  } else if (mode === "client") {
    whereClause = {
      status: "active",
      clientId: { not: null },
      ...(clientIds.length > 0 ? { clientId: { in: clientIds } } : {}),
    };
  }


  const cards = await prisma.card.findMany({
    where: whereClause,
    include: { client: { select: { fullName: true } } },
    orderBy: { cardCode: "asc" },
  });

  const items = await Promise.all(
    cards.map(async (card) => {
      const url = getEventCardUrl(card.publicToken);
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: qrSize,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });

      return {
        cardId: card.id,
        cardCode: card.cardCode,
        clientName: card.client?.fullName ?? null,
        isBlank: !card.clientId,
        url,
        qrDataUrl,
      };
    }),
  );

  return NextResponse.json({ items, generatedAt: new Date().toISOString() });
}
