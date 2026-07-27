/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./prisma";

export async function getBusinessOverviewMetrics() {
  const activeClientsCount = await prisma.client.count({
    where: { archived: false },
  });

  const creditSum = await prisma.ledgerEntry.aggregate({
    where: { type: "CREDIT" },
    _sum: { delta: true },
  });

  const totalRedemptionsCount = await prisma.redemption.count();

  const revenueSum = await prisma.invoice.aggregate({
    where: { status: "paid" },
    _sum: { amount: true },
  });

  return {
    activeClientsCount,
    totalCreditsIssued: creditSum._sum.delta ?? 0,
    totalRedemptionsCount,
    totalRevenueDA: revenueSum._sum.amount ?? 0,
  };
}

export async function getClientInsights(clientId: string) {
  if (!clientId) throw new Error("clientId is required");

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      organization: { select: { name: true } },
      ledgerEntries: { orderBy: { createdAt: "desc" }, take: 10 },
      redemptions: {
        orderBy: { redeemedAt: "desc" },
        take: 10,
        include: { activity: { select: { name: true } } },
      },
    },
  });

  if (!client) return null;

  const creditsSum = client.ledgerEntries
    .filter((e) => e.type === "CREDIT")
    .reduce((sum, e) => sum + e.delta, 0);

  const debitsSum = client.ledgerEntries
    .filter((e) => e.type === "DEBIT")
    .reduce((sum, e) => sum + Math.abs(e.delta), 0);

  const balance = creditsSum - debitsSum;

  return {
    client: {
      id: client.id,
      fullName: client.fullName,
      email: client.email,
      phone: client.phone,
      customerSegment: client.customerSegment,
      organizationName: client.organization?.name ?? null,
    },
    balance,
    recentLedgerEntries: client.ledgerEntries,
    recentRedemptions: client.redemptions,
  };
}

export async function getTopPerformingActivities(limit: number = 10) {
  const takeLimit = Math.min(50, Math.max(1, limit));

  const activities = await prisma.activity.findMany({
    where: { active: true },
    include: {
      _count: {
        select: { redemptions: true },
      },
    },
  });

  const sorted = activities
    .map((act) => ({
      id: act.id,
      name: act.name,
      creditCost: act.creditCost,
      redemptionsCount: act._count.redemptions,
      estimatedRevenue: Math.round(act._count.redemptions * act.creditCost * 1900),
    }))
    .sort((a, b) => b.redemptionsCount - a.redemptionsCount)
    .slice(0, takeLimit);

  return sorted;
}

export async function getRecentAuditLogs(limit: number = 50) {
  const takeLimit = Math.min(100, Math.max(1, limit));

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: takeLimit,
  });

  return logs;
}

export const AI_TOOL_REGISTRY: Record<string, (args: any) => Promise<any>> = {
  getBusinessOverviewMetrics: async () => getBusinessOverviewMetrics(),
  getClientInsights: async (args) => getClientInsights(args?.clientId),
  getTopPerformingActivities: async (args) => getTopPerformingActivities(args?.limit),
  getRecentAuditLogs: async (args) => getRecentAuditLogs(args?.limit),
};
