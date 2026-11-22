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
        where: { type: { in: ["credit", "CREDIT"] } },
        _sum: { delta: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: { type: { in: ["debit", "DEBIT"] } },
        _sum: { delta: true },
      }),
      this.cardsRepo.findMany({
        where: {
          status: "active",
          clientId: { not: null },
        },
        select: {
          clientId: true,
        },
      }),
    ]);

    const cardClientIds = (activeClientCards as Array<{ clientId: string | null }>)
      .map((card) => card.clientId)
      .filter((id): id is string => Boolean(id));
    const uniqueClientIds = Array.from(new Set(cardClientIds));

    let totalClientsWithCards = 0;
    if (uniqueClientIds.length > 0) {
      const balances = await prisma.ledgerEntry.groupBy({
        by: ["clientId"],
        where: { clientId: { in: uniqueClientIds } },
        _sum: { delta: true },
      });
      const positiveClients = new Set(
        balances
          .filter((b) => Math.round((b._sum.delta ?? 0) * 100) / 100 > 0)
          .map((b) => b.clientId)
      );
      totalClientsWithCards = cardClientIds.filter((id) =>
        positiveClients.has(id)
      ).length;
    }

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
