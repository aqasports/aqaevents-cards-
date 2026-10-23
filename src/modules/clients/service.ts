import { prisma, isSqlite } from "@/lib/prisma";
import { getClientBalances, getClientBalance } from "@/lib/balance";
import { generateCardCode, generatePublicToken } from "@/lib/tokens";
import { sendSimulatedNotification } from "@/lib/notifications";
import { syncClientCRM } from "@/lib/crm";
import { logger } from "@/lib/logger";
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
      where.OR = [
        {
          fullName: {
            contains: search,
            ...(isSqlite ? {} : { mode: "insensitive" as const }),
          },
        },
      ];
    }

    if (archived === "true") {
      where.archived = true;
    } else if (archived === "all") {
      // Do not filter on archived
    } else {
      // Default: only active (unarchived) clients
      where.archived = false;
    }

    const clientSelect = {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      notes: true,
      leadSource: true,
      customerSegment: true,
      totalSpent: true,
      lastActivityDate: true,
      favoriteActivity: true,
      archived: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
      cards: {
        where: { status: "active" as const },
        take: 1,
        orderBy: { issuedAt: "desc" as const },
      },
    };

    const clients = await this.clientsRepo.findMany({
      where,
      select: clientSelect,
      orderBy: { createdAt: "desc" },
      take: limit ?? 500,
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
    try {
      const clientSelect = {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        notes: true,
        leadSource: true,
        customerSegment: true,
        totalSpent: true,
        lastActivityDate: true,
        favoriteActivity: true,
        archived: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        cards: {
          select: {
            id: true,
            cardCode: true,
            publicToken: true,
            status: true,
            issuedAt: true,
            revokedAt: true,
          },
          orderBy: { issuedAt: "desc" as const },
        },
        invoices: {
          select: {
            id: true,
            invoiceCode: true,
            amount: true,
            category: true,
            items: true,
            status: true,
            paidAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" as const },
        },
        ledgerEntries: {
          select: {
            id: true,
            delta: true,
            reason: true,
            createdAt: true,
            package: {
              select: { id: true, name: true },
            },
            createdBy: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" as const },
        },
        redemptions: {
          select: {
            id: true,
            redeemedAt: true,
            creditsUsed: true,
            notes: true,
            activity: {
              select: { id: true, name: true },
            },
            session: {
              select: { id: true, startTime: true },
            },
            staff: { select: { name: true } },
            checkIns: {
              select: { id: true, scannedAt: true, status: true },
              orderBy: { scannedAt: "desc" as const },
              take: 1,
            },
          },
          orderBy: { redeemedAt: "desc" as const },
        },
      };

      const client = await this.clientsRepo.findUnique({
        where: { id },
        select: clientSelect,
      });

      if (!client) return null;

      const balance = await getClientBalance(id).catch(() => 0);
      return { ...client, balance };
    } catch (err) {
      logger.error("Primary getClient query failed, executing fallback query:", err);
      const basicClient = await this.clientsRepo.findUnique({
        where: { id },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          cards: {
            select: {
              id: true,
              cardCode: true,
              publicToken: true,
              status: true,
            },
          },
        },
      });

      if (!basicClient) return null;

      const balance = await getClientBalance(id).catch(() => 0);
      return {
        ...basicClient,
        leadSource: null,
        customerSegment: null,
        totalSpent: 0,
        lastActivityDate: null,
        favoriteActivity: null,
        archived: false,
        archivedAt: null,
        invoices: [],
        ledgerEntries: [],
        redemptions: [],
        balance,
      };
    }
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
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            notes: true,
            leadSource: true,
            createdAt: true,
            updatedAt: true,
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
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        notes: true,
        leadSource: true,
        customerSegment: true,
        totalSpent: true,
        lastActivityDate: true,
        favoriteActivity: true,
        archived: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
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
        // If financial ledger history exists, anonymize PII + archive instead of destroying ledger/invoices
        const ledgerCount =
          typeof prisma.ledgerEntry?.count === "function"
            ? await prisma.ledgerEntry.count({ where: { clientId: id } })
            : 0;

        if (ledgerCount > 0) {
          await prisma.$transaction(async (tx) => {
            if (typeof (tx as any).notificationLog?.deleteMany === "function") {
              await (tx as any).notificationLog.deleteMany({ where: { clientId: id } });
            }
            if (typeof (tx as any).card?.updateMany === "function") {
              await (tx as any).card.updateMany({
                where: { clientId: id },
                data: { status: "voided" },
              });
            }
            if (typeof (tx as any).client?.update === "function") {
              await (tx as any).client.update({
                where: { id },
                data: {
                  fullName: `Anonymized Client (${id.slice(-6)})`,
                  phone: `anon_${id}`,
                  email: null,
                  notes: "[ANONYMIZED - FINANCIAL HISTORY PRESERVED]",
                  archived: true,
                  archivedAt: new Date(),
                },
              });
            }
          });

          await this.reportingRepo.createAudit({
            data: {
              userId: adminId,
              action: "ANONYMIZE_CLIENT_FORCE",
              target: `Client ${client.fullName} (ID: ${id})`,
              details: `Anonymized client PII and voided cards while preserving ${ledgerCount} financial ledger record(s) and invoices.`,
            },
          });

          return { success: true, action: "anonymized" };
        }

        // No ledger history: delete non-financial related records safely
        await prisma.$transaction(async (tx) => {
          if (typeof (tx as any).notificationLog?.deleteMany === "function") {
            await (tx as any).notificationLog.deleteMany({ where: { clientId: id } });
          }
          if (typeof (tx as any).invoice?.deleteMany === "function") {
            await (tx as any).invoice.deleteMany({ where: { clientId: id } });
          }
          if (typeof (tx as any).redemption?.deleteMany === "function") {
            await (tx as any).redemption.deleteMany({ where: { clientId: id } });
          }
          if (typeof (tx as any).card?.deleteMany === "function") {
            await (tx as any).card.deleteMany({ where: { clientId: id } });
          }
          await tx.client.delete({ where: { id } });
        });

        await this.reportingRepo.createAudit({
          data: {
            userId: adminId,
            action: "DELETE_CLIENT_FORCE",
            target: `Client ${client.fullName} (ID: ${id})`,
            details: `Permanently force-deleted client with zero ledger entries.`,
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
