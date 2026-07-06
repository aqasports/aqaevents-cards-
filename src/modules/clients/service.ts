import { prisma } from "@/lib/prisma";
import { getClientBalances, getClientBalance } from "@/lib/balance";
import { generateCardCode, generatePublicToken } from "@/lib/tokens";
import { sendSimulatedNotification } from "@/lib/notifications";
import { syncClientCRM } from "@/lib/crm";
import { ClientsRepository } from "./repository";
import { CardsRepository } from "../cards/repository";
import { BillingRepository } from "../invoices/repository";
import { ReportingRepository } from "../reports/repository";
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

  async getClients(search?: string, limit?: number, archived?: string) {
    const where: any = {};

    if (search) {
      where.OR = [{ fullName: { contains: search, mode: "insensitive" as const } }];
    }

    if (archived === "true") {
      where.archived = true;
    } else if (archived === "all") {
      // Do not filter on archived
    } else {
      // Default: only active (unarchived) clients
      where.archived = false;
    }

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
      archived: client.archived,
      archivedAt: client.archivedAt,
    }));
  }

  async getClient(id: string) {
    const client = await this.clientsRepo.findUnique({
      where: { id },
      include: {
        cards: { orderBy: { issuedAt: "desc" } },
        invoices: { orderBy: { createdAt: "desc" } },
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
    adminId: string | null
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

  async deleteClient(id: string, adminId: string, options?: { force?: boolean; deleteRelated?: boolean }) {
    const client = await this.clientsRepo.findUnique({ where: { id } });
    if (!client) throw new Error("Client not found");

    if (options?.force) {
      if (options.deleteRelated) {
        // Delete all related records first to bypass foreign key constraints safely
        await prisma.$transaction(async (tx) => {
          await tx.notificationLog.deleteMany({ where: { clientId: id } });
          await tx.ledgerEntry.deleteMany({ where: { clientId: id } });
          await tx.invoice.deleteMany({ where: { clientId: id } });
          await tx.redemption.deleteMany({ where: { clientId: id } });
          await tx.card.deleteMany({ where: { clientId: id } });
          await tx.client.delete({ where: { id } });
        });

        await this.reportingRepo.createAudit({
          data: {
            userId: adminId,
            action: "DELETE_CLIENT_FORCE",
            target: `Client ${client.fullName} (ID: ${id})`,
            details: `Permanently force-deleted client and all related records (invoices, ledger history, redemptions, cards, notifications).`,
          },
        });

        return { success: true, action: "deleted" };
      } else {
        // Delete directly. Since schema onDelete: Restrict is applied, this will fail if they have related records
        await this.clientsRepo.delete({ where: { id } });

        await this.reportingRepo.createAudit({
          data: {
            userId: adminId,
            action: "DELETE_CLIENT_FORCE",
            target: `Client ${client.fullName} (ID: ${id})`,
            details: `Force-deleted client directly without related records.`,
          },
        });

        return { success: true, action: "deleted" };
      }
    } else {
      // Default: Soft delete / Archive
      await this.clientsRepo.update({
        where: { id },
        data: {
          archived: true,
          archivedAt: new Date(),
        },
      });

      // Void any active cards this client has
      await prisma.card.updateMany({
        where: { clientId: id, status: "active" },
        data: { status: "voided" },
      });

      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "ARCHIVE_CLIENT",
          target: `Client ${client.fullName} (ID: ${id})`,
          details: `Soft-deleted/Archived client and voided all active cards.`,
        },
      });

      return { success: true, action: "archived" };
    }
  }

  async unarchiveClient(id: string, adminId: string) {
    const client = await this.clientsRepo.findUnique({ where: { id } });
    if (!client) throw new Error("Client not found");

    await this.clientsRepo.update({
      where: { id },
      data: {
        archived: false,
        archivedAt: null,
      },
    });

    await this.reportingRepo.createAudit({
      data: {
        userId: adminId,
        action: "UNARCHIVE_CLIENT",
        target: `Client ${client.fullName} (ID: ${id})`,
        details: `Restored/Unarchived client.`,
      },
    });

    return { success: true };
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
            data: { clientId, issuedAt: new Date() },
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
