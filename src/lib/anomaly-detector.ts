import { prisma } from "./prisma";

export interface AnomalyItem {
  type: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  detectedAt: Date;
}

export async function detectBusinessAnomalies(): Promise<AnomalyItem[]> {
  const anomalies: AnomalyItem[] = [];

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Rule 1: High manual ledger credit additions in last 7 days
  const recentCreditsSum = await prisma.ledgerEntry.aggregate({
    where: {
      type: "CREDIT",
      createdAt: { gte: sevenDaysAgo },
    },
    _sum: { amount: true },
  });

  const manualCreditTotal = recentCreditsSum._sum.amount ?? 0;
  if (manualCreditTotal > 50000) {
    anomalies.push({
      type: "HIGH_MANUAL_CREDIT",
      severity: "high",
      title: "High Manual Credit Additions",
      description: `Sum of manual credit additions in the last 7 days reached ${manualCreditTotal.toLocaleString("fr-DZ")} DA (threshold: 50,000 DA).`,
      detectedAt: now,
    });
  }

  // Rule 2: High overdue accounts receivable (>60 days old unpaid invoices)
  const overdueInvoicesSum = await prisma.invoice.aggregate({
    where: {
      status: { not: "paid" },
      createdAt: { lte: sixtyDaysAgo },
    },
    _sum: { amount: true },
  });

  const overdueTotal = overdueInvoicesSum._sum.amount ?? 0;
  if (overdueTotal > 100000) {
    anomalies.push({
      type: "HIGH_OVERDUE_AR",
      severity: "medium",
      title: "High Overdue Accounts Receivable",
      description: `Overdue unpaid invoices (>60 days old) total ${overdueTotal.toLocaleString("fr-DZ")} DA (threshold: 100,000 DA).`,
      detectedAt: now,
    });
  }

  // Rule 3: Low check-in volume
  const activeClients = await prisma.client.count({
    where: { archived: false },
  });

  const recentCheckIns = await prisma.checkIn.count({
    where: {
      scannedAt: { gte: sevenDaysAgo },
    },
  });

  if (activeClients > 10 && recentCheckIns < 5) {
    anomalies.push({
      type: "LOW_CHECKIN_VOLUME",
      severity: "low",
      title: "Low Check-In Activity",
      description: `Only ${recentCheckIns} check-in(s) recorded in the last 7 days despite having ${activeClients} active clients.`,
      detectedAt: now,
    });
  }

  return anomalies;
}
