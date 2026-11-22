/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./prisma";
import { getCreditRate } from "./settings";

export async function syncClientCRM(clientId: string, prismaTx?: any) {
  const db = prismaTx || prisma;

  // Resilience check for mocked prisma transaction clients in tests
  if (!db.invoice || !db.redemption || !db.client || !db.activity) {
    return;
  }

  const readClient = () =>
    typeof db.client.findUnique === "function"
      ? db.client.findUnique({ where: { id: clientId }, select: { createdAt: true } })
      : Promise.resolve(null);

  let invoiceAggregate: any;
  let lastRedemption: any;
  let redemptionsByActivity: any[];
  let creditRate: number;
  let client: { createdAt: Date } | null;

  // Parallelize reads on top-level prisma client; keep sequential inside interactive transactions
  if (!prismaTx) {
    [invoiceAggregate, lastRedemption, redemptionsByActivity, creditRate, client] = await Promise.all([
      db.invoice.aggregate({
        where: { clientId, status: "paid" },
        _sum: { amount: true },
      }),
      db.redemption.findFirst({
        where: { clientId },
        orderBy: { redeemedAt: "desc" },
      }),
      db.redemption.groupBy({
        by: ["activityId"],
        where: { clientId },
        _count: { activityId: true },
        orderBy: { _count: { activityId: "desc" } },
        take: 1,
      }),
      getCreditRate(db),
      readClient(),
    ]);
  } else {
    invoiceAggregate = await db.invoice.aggregate({
      where: { clientId, status: "paid" },
      _sum: { amount: true },
    });
    lastRedemption = await db.redemption.findFirst({
      where: { clientId },
      orderBy: { redeemedAt: "desc" },
    });
    redemptionsByActivity = await db.redemption.groupBy({
      by: ["activityId"],
      where: { clientId },
      _count: { activityId: true },
      orderBy: { _count: { activityId: "desc" } },
      take: 1,
    });
    creditRate = await getCreditRate(db);
    client = await readClient();
  }

  if (typeof db.client.findUnique === "function" && !client) {
    return;
  }

  const totalSpent = Math.round(invoiceAggregate._sum.amount ?? 0);
  const lastActivityDate = lastRedemption?.redeemedAt ?? null;

  let favoriteActivityName: string | null = null;
  if (redemptionsByActivity.length > 0) {
    const act = await db.activity.findUnique({
      where: { id: redemptionsByActivity[0].activityId },
      select: { name: true },
    });
    favoriteActivityName = act?.name ?? null;
  }

  const vipThreshold = 20 * creditRate; // Default 38,000 DA
  const highValueThreshold = 10 * creditRate; // Default 19,000 DA

  let customerSegment = "Standard";
  if (totalSpent >= vipThreshold) {
    customerSegment = "VIP";
  } else if (totalSpent >= highValueThreshold) {
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
