import { prisma } from "@/lib/prisma";
import { generatePublicToken, getEventCardUrl } from "@/lib/tokens";
import { CardsRepository } from "./repository";
import { BillingRepository } from "../invoices/repository";
import QRCode from "qrcode";
import { Prisma } from "@prisma/client";

export class CardsService {
  private cardsRepo = new CardsRepository();
  private billingRepo = new BillingRepository();

  private async nextCardCode(tx: Prisma.TransactionClient): Promise<string> {
    const latest = await this.cardsRepo.findFirst(
      {
        where: { cardCode: { startsWith: "AQA-" } },
        orderBy: { cardCode: "desc" },
      },
      tx
    );

    let nextNum = 1;
    if (latest) {
      const parts = latest.cardCode.split("-");
      const num = parseInt(parts[1] ?? "0", 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    return `AQA-${String(nextNum).padStart(6, "0")}`;
  }

  async lookupCardByCode(code: string) {
    const cleanCode = code.trim().toUpperCase();
    const card = await this.cardsRepo.findFirst({
      where: { cardCode: cleanCode, status: "active" },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!card) return null;

    let balance = 0;
    if (card.clientId) {
      balance = await this.billingRepo.sumLedgerDelta(card.clientId);
    }

    return {
      id: card.id,
      cardCode: card.cardCode,
      status: card.status,
      clientId: card.clientId,
      client: card.client,
      balance,
    };
  }

  async searchCards(options: { token?: string | null; cardCode?: string | null; query?: string | null }) {
    const { token, cardCode, query } = options;

    const getSingleResult = async (card: any, client: any) => {
      const balance = await this.billingRepo.sumLedgerDelta(client.id);
      return {
        matchType: "single",
        card,
        client,
        balance,
      };
    };

    if (token) {
      const card = await this.cardsRepo.findFirst({
        where: { publicToken: token, status: "active" },
        include: { client: true },
      });
      if (!card || !card.client) return null;
      return getSingleResult(card, card.client);
    }

    if (cardCode) {
      const card = await this.cardsRepo.findFirst({
        where: { cardCode, status: "active" },
        include: { client: true },
      });
      if (!card || !card.client) return null;
      return getSingleResult(card, card.client);
    }

    if (query) {
      const trimmedQuery = query.trim();

      if (trimmedQuery.length > 20) {
        const card = await this.cardsRepo.findFirst({
          where: { publicToken: trimmedQuery, status: "active" },
          include: { client: true },
        });
        if (card && card.client) {
          return getSingleResult(card, card.client);
        }
      }

      const cardByCode = await this.cardsRepo.findFirst({
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
            mode: "insensitive" as const,
          },
        },
        include: {
          cards: {
            where: { status: "active" },
            take: 1,
          },
        },
        take: 20,
      });

      if (clients.length === 0) return null;

      if (clients.length === 1) {
        const singleClient = clients[0];
        return getSingleResult(singleClient.cards[0] || null, singleClient);
      }

      const matches = await Promise.all(
        clients.map(async (c) => {
          const balance = await this.billingRepo.sumLedgerDelta(c.id);
          return {
            card: c.cards[0] || null,
            client: { id: c.id, fullName: c.fullName, email: c.email, phone: c.phone },
            balance,
          };
        })
      );

      return {
        matchType: "multiple",
        matches,
      };
    }

    return null;
  }

  async exportCardsWithQrs(options: { clientIds?: string[]; qrSize?: number; mode?: "client" | "blank" | "all" }) {
    const { clientIds = [], qrSize = 400, mode = "client" } = options;

    let whereClause: any = { status: "active" };

    if (mode === "blank") {
      whereClause = { status: "active", clientId: null };
    } else if (mode === "client") {
      whereClause = {
        status: "active",
        clientId: { not: null },
        ...(clientIds.length > 0 ? { clientId: { in: clientIds } } : {}),
      };
    }

    const cards = await this.cardsRepo.findMany({
      where: whereClause,
      include: { client: { select: { fullName: true } } },
      orderBy: { cardCode: "asc" },
    });

    const items = await Promise.all(
      cards.map(async (card: any) => {
        const url = getEventCardUrl(card.publicToken);
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: qrSize,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" },
        });

        return {
          cardId: card.id,
          cardCode: card.cardCode,
          clientName: card.client?.fullName ?? null,
          isBlank: !card.clientId,
          url,
          qrDataUrl,
        };
      })
    );

    return items;
  }

  async getPublicCardByToken(token: string) {
    const card = await this.cardsRepo.findUnique({
      where: { publicToken: token },
      include: {
        client: {
          include: {
            redemptions: {
              include: {
                activity: true,
                session: true,
              },
              orderBy: { redeemedAt: "desc" },
              take: 50,
            },
            ledgerEntries: {
              include: { package: true },
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        },
      },
    });

    if (!card || card.status !== "active" || !card.clientId || !card.client) {
      return null;
    }

    const { getFirstName } = require("@/lib/tokens");
    const balance = await this.billingRepo.sumLedgerDelta(card.clientId);

    const history = card.client.redemptions.map((redemption: any) => ({
      activity: redemption.activity.name,
      date: redemption.session?.sessionDate ?? redemption.redeemedAt,
      creditsUsed: redemption.creditsUsed,
      redeemedAt: redemption.redeemedAt,
      location: redemption.session?.location ?? null,
    }));

    const credits = card.client.ledgerEntries
      .filter((entry: any) => entry.delta > 0)
      .map((entry: any) => ({
        label: entry.package?.name ?? entry.reason ?? "Credit added",
        amount: entry.delta,
        date: entry.createdAt,
      }));

    return {
      cardCode: card.cardCode,
      clientFirstName: getFirstName(card.client.fullName),
      balance,
      credits,
      history,
    };
  }

  async generatePrebatch(count: number, qrSize: number = 400) {
    const created: Array<{ id: string; cardCode: string; publicToken: string; url: string; qrDataUrl: string }> = [];

    await prisma.$transaction(
      async (tx) => {
        for (let i = 0; i < count; i++) {
          const cardCode = await this.nextCardCode(tx);
          const publicToken = generatePublicToken();

          const card = await this.cardsRepo.create(
            {
              data: {
                clientId: null,
                publicToken,
                cardCode,
                status: "active",
              },
            },
            tx
          );

          const url = getEventCardUrl(publicToken);
          const qrDataUrl = await QRCode.toDataURL(url, {
            width: qrSize,
            margin: 1,
            color: { dark: "#0f172a", light: "#ffffff" },
          });

          created.push({ id: card.id, cardCode, publicToken, url, qrDataUrl });
        }
      },
      { timeout: 60000 }
    );

    return created;
  }
}
