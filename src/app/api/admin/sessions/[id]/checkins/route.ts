import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/sessions/[id]/checkins
// Admin: fetch all check-ins for a specific session
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  try {
    const checkIns = await prisma.clubCheckIn.findMany({
      where: { sessionId: id },
      select: {
        id: true,
        checkedAt: true,
        clientId: true,
        cardId: true,
        club: { select: { id: true, name: true } },
      },
      orderBy: { checkedAt: "asc" },
    });

    // Fetch client names
    const clientIds = [...new Set(checkIns.map((c: any) => c.clientId as string))];
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, fullName: true, phone: true },
    });
    const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, c]));

    // Fetch card codes
    const cardIds = [...new Set(checkIns.map((c: any) => c.cardId as string))];
    const cards = await prisma.card.findMany({
      where: { id: { in: cardIds } },
      select: { id: true, cardCode: true },
    });
    const cardMap = Object.fromEntries(cards.map((c: any) => [c.id, c]));

    const enriched = checkIns.map((ci: any) => ({
      ...ci,
      client: clientMap[ci.clientId] ?? null,
      card: cardMap[ci.cardId] ?? null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("GET session checkins error:", err);
    return NextResponse.json({ error: "Failed to fetch check-ins" }, { status: 500 });
  }
}
