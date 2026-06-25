import { prisma } from "@/lib/prisma";
import { ReportingRepository } from "./repository";
import { BillingRepository } from "../invoices/repository";
import { CardsRepository } from "../cards/repository";

export class ReportingService {
  private reportingRepo = new ReportingRepository();
  private billingRepo = new BillingRepository();
  private cardsRepo = new CardsRepository();

  async getAuditLogs() {
    return this.reportingRepo.findAuditMany({
      include: {
        user: { select: { name: true, role: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getSummaryReport() {
    const [
      totalRedemptions,
      creditsSoldAgg,
      creditsUsedAgg,
      activeClientCards,
    ] = await Promise.all([
      this.billingRepo.countRedemption(),
      prisma.ledgerEntry.aggregate({
        where: { type: "credit" },
        _sum: { delta: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: { type: "debit" },
        _sum: { delta: true },
      }),
      this.cardsRepo.findMany({
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

    const totalClientsWithCards = (activeClientCards as any[]).filter((card: any) => {
      if (!card.client) return false;
      const balance = card.client.ledgerEntries.reduce((sum: number, e: any) => sum + e.delta, 0);
      return balance > 0;
    }).length;

    return {
      totalRedemptions,
      totalCreditsSold: creditsSoldAgg._sum.delta ?? 0,
      totalCreditsUsed: Math.abs(creditsUsedAgg._sum.delta ?? 0),
      totalClientsWithCards,
    };
  }

  async getAnalytics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const credits = await prisma.ledgerEntry.findMany({
      where: {
        type: "credit",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        delta: true,
        createdAt: true,
      },
    });

    const redemptions = await this.billingRepo.findRedemptionMany({
      where: {
        redeemedAt: { gte: thirtyDaysAgo },
      },
      select: {
        creditsUsed: true,
        redeemedAt: true,
      },
    });

    const dataByDate: Record<string, { date: string; sales: number; redemptions: number }> = {};

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dataByDate[dateStr] = { date: dateStr, sales: 0, redemptions: 0 };
    }

    for (const c of credits) {
      const dateStr = c.createdAt.toISOString().split("T")[0];
      if (dataByDate[dateStr]) {
        dataByDate[dateStr].sales += c.delta;
      }
    }

    for (const r of redemptions) {
      const dateStr = r.redeemedAt.toISOString().split("T")[0];
      if (dataByDate[dateStr]) {
        dataByDate[dateStr].redemptions += r.creditsUsed;
      }
    }

    return Object.values(dataByDate).sort((a, b) => a.date.localeCompare(b.date));
  }
}
