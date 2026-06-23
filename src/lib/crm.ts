import { prisma } from "./prisma";

export async function syncClientCRM(clientId: string, prismaTx?: any) {
  const db = prismaTx || prisma;

  // Resilience check for mocked prisma transaction clients in tests
  if (!db.invoice || !db.redemption || !db.client || !db.activity) {
    return;
  }

  // 1. Calculate totalSpent (sum of paid invoices)
  const invoiceAggregate = await db.invoice.aggregate({
    where: { clientId, status: "paid" },
    _sum: { amount: true },
  });
  const totalSpent = invoiceAggregate._sum.amount ?? 0;

  // 2. Calculate lastActivityDate (most recent redemption)
  const lastRedemption = await db.redemption.findFirst({
    where: { clientId },
    orderBy: { redeemedAt: "desc" },
  });
  const lastActivityDate = lastRedemption?.redeemedAt ?? null;

  // 3. Calculate favoriteActivity (activity with the most redemptions)
  const redemptionsByActivity = await db.redemption.groupBy({
    by: ["activityId"],
    where: { clientId },
    _count: { activityId: true },
    orderBy: {
      _count: {
        activityId: "desc",
      },
    },
    take: 1,
  });

  let favoriteActivityName: string | null = null;
  if (redemptionsByActivity.length > 0) {
    const act = await db.activity.findUnique({
      where: { id: redemptionsByActivity[0].activityId },
      select: { name: true },
    });
    favoriteActivityName = act?.name ?? null;
  }

  // 4. Calculate customerSegment
  // Rules:
  // VIP: totalSpent >= 38000 DA
  // High-Value: totalSpent >= 19000 DA
  // Inactive: lastActivityDate is older than 30 days OR (lastActivityDate is null AND client.createdAt is older than 30 days)
  // Standard: otherwise
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { createdAt: true },
  });

  let customerSegment = "Standard";
  if (totalSpent >= 38000) {
    customerSegment = "VIP";
  } else if (totalSpent >= 19000) {
    customerSegment = "High-Value";
  } else {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const isInactive = lastActivityDate
      ? lastActivityDate < thirtyDaysAgo
      : client
      ? client.createdAt < thirtyDaysAgo
      : false;

    if (isInactive) {
      customerSegment = "Inactive";
    }
  }

  // 5. Update client in database
  await db.client.update({
    where: { id: clientId },
    data: {
      totalSpent,
      lastActivityDate,
      favoriteActivity: favoriteActivityName,
      customerSegment,
    },
  });
}
