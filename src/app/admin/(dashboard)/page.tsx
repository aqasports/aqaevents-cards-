export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import DashboardClient from "./dashboard-client";

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfThisYear = new Date(now.getFullYear(), 0, 1);

  // 1. Fetch Basic Counts and Aggregates
  const [
    clientCount,
    activeClientCardsCount,
    todayRedemptions,
    totalCreditsSold,
    totalCreditsUsed,
    revenueTodayAggregate,
    revenueThisMonthAggregate,
    revenueThisYearAggregate,
    totalRevenueAggregate,
    newClientsThisMonth,
    inactiveCardsCount,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.card.count({
      where: {
        status: "active",
        clientId: { not: null },
      },
    }),
    prisma.redemption.count({
      where: {
        redeemedAt: {
          gte: startOfToday,
        },
      },
    }),
    prisma.ledgerEntry.aggregate({
      where: { type: "credit" },
      _sum: { delta: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { type: "debit" },
      _sum: { delta: true },
    }),
    prisma.invoice.aggregate({
      where: { status: "paid", paidAt: { gte: startOfToday } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { status: "paid", paidAt: { gte: startOfThisMonth } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { status: "paid", paidAt: { gte: startOfThisYear } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { status: "paid" },
      _sum: { amount: true },
    }),
    prisma.client.count({
      where: { createdAt: { gte: startOfThisMonth } },
    }),
    prisma.card.count({
      where: {
        OR: [
          { status: "voided" },
          { clientId: null },
        ],
      },
    }),
  ]);

  const creditsSold = Number((totalCreditsSold._sum.delta ?? 0).toFixed(2));
  const creditsUsed = Number(Math.abs(totalCreditsUsed._sum.delta ?? 0).toFixed(2));
  const creditsRemaining = Number((creditsSold - creditsUsed).toFixed(2));

  const revenueToday = revenueTodayAggregate._sum.amount ?? 0;
  const revenueThisMonth = revenueThisMonthAggregate._sum.amount ?? 0;
  const revenueThisYear = revenueThisYearAggregate._sum.amount ?? 0;
  const totalRevenue = totalRevenueAggregate._sum.amount ?? 0;

  // 2. Compute Activities metrics
  const popularActivities = await prisma.redemption.groupBy({
    by: ["activityId"],
    _count: { activityId: true },
    orderBy: {
      _count: { activityId: "desc" },
    },
    take: 1,
  });

  let popularActivityName = "None";
  if (popularActivities.length > 0) {
    const act = await prisma.activity.findUnique({
      where: { id: popularActivities[0].activityId },
      select: { name: true },
    });
    if (act) {
      popularActivityName = `${act.name} (${popularActivities[0]._count.activityId})`;
    }
  }

  const activeSessions = await prisma.activitySession.findMany({
    where: {
      active: true,
      capacity: { not: null, gt: 0 },
    },
    include: {
      _count: {
        select: { redemptions: true },
      },
    },
  });

  let totalBookings = 0;
  let totalCapacity = 0;
  for (const session of activeSessions) {
    totalBookings += session._count.redemptions;
    totalCapacity += session.capacity ?? 0;
  }
  const attendanceRate = totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;
  const utilizationRate = creditsSold > 0 ? Math.round((creditsUsed / creditsSold) * 100) : 0;

  // 3. Compute Clients metrics (efficient DB groupBy)
  const returningClientsGroups = await prisma.invoice.groupBy({
    by: ["clientId"],
    where: { status: "paid" },
    _count: { id: true },
    having: {
      id: {
        _count: { gt: 1 },
      },
    },
  });
  const returningClientsCount = returningClientsGroups.length;
  const lifetimeValue = clientCount > 0 ? Math.round(totalRevenue / clientCount) : 0;

  // 4. Fetch Recent Redemptions & Low Balance Clients for existing list UI
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

  const lowBalance = lowBalanceClients
    .map((client) => ({
      ...client,
      balance: Number(client.ledgerEntries.reduce((sum, e) => sum + e.delta, 0).toFixed(2)),
    }))
    .filter((client) => client.balance <= 1 && client.balance >= 0)
    .slice(0, 5);

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
      activeCards={activeClientCardsCount}
      todayRedemptions={todayRedemptions}
      creditsRemaining={creditsRemaining}
      creditsSold={creditsSold}
      creditsUsed={creditsUsed}
      lowBalance={serializedLowBalance}
      recentRedemptions={serializedRecentRedemptions}
      
      // New Executive Props
      revenueToday={revenueToday}
      revenueThisMonth={revenueThisMonth}
      revenueThisYear={revenueThisYear}
      popularActivityName={popularActivityName}
      attendanceRate={attendanceRate}
      utilizationRate={utilizationRate}
      inactiveCardsCount={inactiveCardsCount}
      newClientsThisMonth={newClientsThisMonth}
      returningClientsCount={returningClientsCount}
      lifetimeValue={lifetimeValue}
    />
  );
}
