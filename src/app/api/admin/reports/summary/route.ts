import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const [
    totalRedemptions,
    creditsSoldAgg,
    creditsUsedAgg,
    activeClientCards,
  ] = await Promise.all([
    prisma.redemption.count(),
    prisma.ledgerEntry.aggregate({
      where: { type: "credit" },
      _sum: { delta: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { type: "debit" },
      _sum: { delta: true },
    }),
    prisma.card.findMany({
      where: {
        status: "active",
        clientId: { not: null },
      },
      select: {
        client: {
          select: {
            ledgerEntries: {
              select: { delta: true },
            },
          },
        },
      },
    }),
  ]);

  const totalClientsWithCards = activeClientCards.filter((card) => {
    if (!card.client) return false;
    const balance = card.client.ledgerEntries.reduce((sum, e) => sum + e.delta, 0);
    return balance > 0;
  }).length;

  return NextResponse.json({
    totalRedemptions,
    totalCreditsSold: creditsSoldAgg._sum.delta ?? 0,
    totalCreditsUsed: Math.abs(creditsUsedAgg._sum.delta ?? 0),
    totalClientsWithCards,
  });
}
