import { prisma } from "@/lib/prisma";
import { getClientBalances, getClientBalance } from "@/lib/balance";
import { generateCardCode, generatePublicToken } from "@/lib/tokens";
import { sendSimulatedNotification } from "@/lib/notifications";
import { syncClientCRM } from "@/lib/crm";
import { ClientsRepository } from "./clients.repository";
import { CardsRepository } from "../cards/cards.repository";
import { BillingRepository } from "../billing/billing.repository";
import { ReportingRepository } from "../reporting/reporting.repository";
import { eventBus, EVENTS } from "@/lib/events";

export class ClientsService {
  private clientsRepo = new ClientsRepository();
  private cardsRepo = new CardsRepository();
  private billingRepo = new BillingRepository();
  private reportingRepo = new ReportingRepository();

  private generateInvoiceCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "INV-";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async getClients(search?: string, limit?: number) {
    const where = search
      ? {
          OR: [{ fullName: { contains: search, mode: "insensitive" as const } }],
        }
      : undefined;

    const clients = await this.clientsRepo.findMany({
      where,
      include: {
        cards: {
          where: { status: "active" },
          take: 1,
          orderBy: { issuedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const balances = await getClientBalances(clients.map((c: any) => c.id));

    return clients.map((client: any) => ({
      id: client.id,
      fullName: client.fullName,
      email: client.email,
      phone: client.phone,
      balance: balances.get(client.id) ?? 0,
      card: client.cards[0] ?? null,
      createdAt: client.createdAt,
      leadSource: client.leadSource,
      customerSegment: client.customerSegment,
      totalSpent: client.totalSpent,
      lastActivityDate: client.lastActivityDate,
      favoriteActivity: client.favoriteActivity,
    }));
  }

  async getClient(id: string) {
    const client = await this.clientsRepo.findUnique({
      where: { id },
      include: {
        cards: { orderBy: { issuedAt: "desc" } },
        ledgerEntries: {
          include: {
            package: true,
            createdBy: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        redemptions: {
          include: {
            activity: true,
            session: true,
            staff: { select: { name: true } },
          },
          orderBy: { redeemedAt: "desc" },
        },
      },
    });

    if (!client) return null;

    const balance = await getClientBalance(id);
    return { ...client, balance };
  }

  async createClient(
    data: {
      fullName: string;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
      packageId?: string | null;
      issueCard: boolean;
      preCardCode?: string | null;
      leadSource?: string | null;
    },
    adminId: string
  ) {
    const result = await prisma.$transaction(async (tx) => {
      const client = await this.clientsRepo.create(
        {
          data: {
            fullName: data.fullName,
            email: data.email || null,
            phone: data.phone || null,
            notes: data.notes || null,
            leadSource: data.leadSource || null,
          },
        },
        tx
      );

      const eventPayload: any = {
        client,
        packageId: data.packageId,
        issueCard: data.issueCard,
        preCardCode: data.preCardCode,
        adminId,
        tx,
        postCommitActions: [],
      };

      await eventBus.emit(EVENTS.CLIENT_CREATED, eventPayload);

      return {
        client,
        card: eventPayload.card,
        postCommitActions: eventPayload.postCommitActions,
      };
    });

    if (result.postCommitActions) {
      for (const action of result.postCommitActions) {
        await action().catch((e: any) => console.error("Post-commit action error:", e));
      }
    }

    const finalBalance = await getClientBalance(result.client.id);

    return {
      ...result.client,
      balance: finalBalance,
      card: result.card,
    };
  }

  async updateClient(
    id: string,
    data: {
      fullName?: string;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
      leadSource?: string | null;
    },
    adminId: string
  ) {
    const client = await this.clientsRepo.update({
      where: { id },
      data: {
        fullName: data.fullName,
        email: data.email === "" ? null : data.email,
        phone: data.phone,
        notes: data.notes,
        leadSource: data.leadSource,
      },
    });

    await syncClientCRM(id);

    await this.reportingRepo.createAudit({
      data: {
        userId: adminId,
        action: "UPDATE_CLIENT",
        target: `Client ${client.fullName}`,
        details: `Updated client information for ${client.fullName} (email: ${client.email}, phone: ${client.phone}).`,
      },
    });

    return client;
  }

  async deleteClient(id: string, adminId: string) {
    const hasHistory = await prisma.$transaction(async (tx) => {
      const ledgerCount = await this.billingRepo.countLedger(
        {
          where: { clientId: id },
        },
        tx
      );

      if (ledgerCount > 0) {
        return true;
      }

      await this.billingRepo.deleteRedemptionMany(
        {
          where: { clientId: id },
        },
        tx
      );

      await this.cardsRepo.deleteMany(
        {
          where: { clientId: id },
        },
        tx
      );

      await this.clientsRepo.delete(
        {
          where: { id },
        },
        tx
      );

      return false;
    });

    if (hasHistory) {
      throw new Error("Cannot delete a client with financial ledger history. Archive them or update their status in notes instead.");
    }

    await this.reportingRepo.createAudit({
      data: {
        userId: adminId,
        action: "DELETE_CLIENT",
        target: `Client ID ${id}`,
        details: `Deleted client ID ${id} and all related non-financial records.`,
      },
    });

    return { ok: true };
  }

  async reissueCard(clientId: string, newCardCode?: string | null, adminId?: string) {
    const result = await prisma.$transaction(async (tx) => {
      const client = await this.clientsRepo.findUnique({ where: { id: clientId } }, tx);
      if (!client) throw new Error("Client not found");

      // Void active cards
      await tx.card.updateMany({
        where: { clientId, status: "active" },
        data: { status: "voided" },
      });

      let newCard = null;
      if (newCardCode) {
        const existing = await this.cardsRepo.findUnique(
          {
            where: { cardCode: newCardCode.trim().toUpperCase() },
          },
          tx
        );
        if (!existing) {
          throw new Error(`Card code "${newCardCode}" not found. Generate it first from the Print page.`);
        }
        if (existing.clientId) {
          throw new Error(`Card ${newCardCode} is already assigned to another client.`);
        }
        newCard = await this.cardsRepo.update(
          {
            where: { id: existing.id },
            data: { clientId },
          },
          tx
        );
      } else {
        newCard = await this.cardsRepo.create(
          {
            data: {
              clientId,
              publicToken: generatePublicToken(),
              cardCode: generateCardCode(),
            },
          },
          tx
        );
      }

      return { client, newCard };
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "REISSUE_CARD",
          target: `Client ${result.client.fullName}`,
          details: `Reissued card for client ${result.client.fullName}. New card code: ${result.newCard.cardCode}. Previous cards voided.`,
        },
      });
    }

    if (result.client.phone) {
      await sendSimulatedNotification(
        result.client.id,
        "sms",
        result.client.phone,
        `AQA Sports: Your card has been reissued. Your new card code is: ${result.newCard.cardCode}. All previous cards are voided. Your balance remains the same.`
      );
    }

    return result.newCard;
  }

  async getNotificationLogs(clientId: string) {
    return this.reportingRepo.findNotificationMany({
      where: { clientId },
      orderBy: { sentAt: "desc" },
    });
  }
}
