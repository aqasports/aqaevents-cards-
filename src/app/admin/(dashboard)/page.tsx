import { prisma } from "@/lib/prisma";
import DashboardClient from "./dashboard-client";

export default async function AdminDashboardPage() {
  const [clientCount, activeClientCards, todayRedemptions, totalCreditsSold] =
    await Promise.all([
      prisma.client.count(),
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
      prisma.redemption.count({
        where: {
          redeemedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.ledgerEntry.aggregate({
        where: { type: "credit" },
        _sum: { delta: true },
      }),
    ]);

  const activeCards = activeClientCards.filter((card) => {
    if (!card.client) return false;
    const balance = card.client.ledgerEntries.reduce((sum, e) => sum + e.delta, 0);
    return balance > 0;
  }).length;

  const totalCreditsUsed = await prisma.ledgerEntry.aggregate({
    where: { type: "debit" },
    _sum: { delta: true },
  });

  const recentRedemptions = await prisma.redemption.findMany({
    include: {
      client: { select: { fullName: true, id: true } },
      activity: { select: { name: true } },
    },
    orderBy: { redeemedAt: "desc" },
    take: 8,
  });

  const lowBalanceClients = await prisma.client.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      ledgerEntries: {
        select: { delta: true },
      },
      cards: {
        where: { status: "active" },
        take: 1,
        select: { cardCode: true },
      },
    },
  });

  // Compute balances in memory
  const lowBalance = lowBalanceClients
    .map((client) => ({
      ...client,
      balance: client.ledgerEntries.reduce((sum, e) => sum + e.delta, 0),
    }))
    .filter((client) => client.balance <= 1 && client.balance >= 0)
    .slice(0, 5);

  const creditsSold = totalCreditsSold._sum.delta ?? 0;
  const creditsUsed = Math.abs(totalCreditsUsed._sum.delta ?? 0);
  const creditsRemaining = creditsSold - creditsUsed;

  const serializedLowBalance = lowBalance.map((client) => ({
    id: client.id,
    fullName: client.fullName,
    balance: client.balance,
    cards: client.cards.map((card) => ({
      cardCode: card.cardCode,
    })),
  }));

  const serializedRecentRedemptions = recentRedemptions.map((item) => ({
    id: item.id,
    creditsUsed: item.creditsUsed,
    redeemedAt: item.redeemedAt.toISOString(),
    client: {
      id: item.client.id,
      fullName: item.client.fullName,
    },
    activity: {
      name: item.activity.name,
    },
  }));

  return (
    <DashboardClient
      clientCount={clientCount}
      activeCards={activeCards}
      todayRedemptions={todayRedemptions}
      creditsRemaining={creditsRemaining}
      creditsSold={creditsSold}
      creditsUsed={creditsUsed}
      lowBalance={serializedLowBalance}
      recentRedemptions={serializedRecentRedemptions}
    />
  );
}
