import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { getClientBalance, getClientBalances } from "@/lib/balance";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const token = request.nextUrl.searchParams.get("token");
  const cardCode = request.nextUrl.searchParams.get("code");
  const query = request.nextUrl.searchParams.get("query");

  if (!token && !cardCode && !query) {
    return NextResponse.json(
      { error: "Provide token, code, or query param" },
      { status: 400 },
    );
  }

  // Helper function to return single result format
  const getSingleResult = async (
    card: { id: string; cardCode: string; publicToken: string; status: string } | null,
    client: { id: string; fullName: string; email: string | null; phone: string | null; notes?: string | null },
  ) => {
    const balance = await getClientBalance(client.id);
    return NextResponse.json({
      matchType: "single",
      card,
      client,
      balance,
    });
  };

  // 1. If explicit token is provided
  if (token) {
    const card = await prisma.card.findFirst({
      where: { publicToken: token, status: "active" },
      include: { client: true },
    });
    if (!card || !card.client) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    return getSingleResult(card, card.client);
  }

  // 2. If explicit cardCode is provided
  if (cardCode) {
    const card = await prisma.card.findFirst({
      where: { cardCode, status: "active" },
      include: { client: true },
    });
    if (!card || !card.client) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    return getSingleResult(card, card.client);
  }

  // 3. General query (token, code, or client name)
  if (query) {
    const trimmedQuery = query.trim();

    // Check if it looks like a token
    if (trimmedQuery.length > 20) {
      const card = await prisma.card.findFirst({
        where: { publicToken: trimmedQuery, status: "active" },
        include: { client: true },
      });
      if (card && card.client) {
        return getSingleResult(card, card.client);
      }
    }

    // Try finding by cardCode exact match
    const cardByCode = await prisma.card.findFirst({
      where: { cardCode: trimmedQuery, status: "active" },
      include: { client: true },
    });
    if (cardByCode && cardByCode.client) {
      return getSingleResult(cardByCode, cardByCode.client);
    }

    // Search by client name
    const clients = await prisma.client.findMany({
      where: {
        fullName: {
          contains: trimmedQuery,
        },
      },
      include: {
        cards: {
          where: { status: "active" },
          take: 1,
        },
      },
      take: 20, // safety cap
    });

    if (clients.length === 0) {
      return NextResponse.json({ error: "No client or card found matching that query" }, { status: 404 });
    }

    if (clients.length === 1) {
      const singleClient = clients[0];
      return getSingleResult(singleClient.cards[0] || null, singleClient);
    }

    // Multiple clients found
    const clientIds = clients.map((c) => c.id);
    const balancesMap = await getClientBalances(clientIds);

    const matches = clients.map((c) => ({
      card: c.cards[0] || null,
      client: { id: c.id, fullName: c.fullName, email: c.email, phone: c.phone },
      balance: balancesMap.get(c.id) ?? 0,
    }));

    return NextResponse.json({
      matchType: "multiple",
      matches,
    });
  }

  return NextResponse.json({ error: "Invalid search" }, { status: 400 });
}
