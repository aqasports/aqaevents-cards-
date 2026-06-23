import { prisma } from "@/lib/prisma";
import { getClientBalances, getClientBalance } from "@/lib/balance";
import { generateCardCode, generatePublicToken } from "@/lib/tokens";
import { sendSimulatedNotification } from "@/lib/notifications";
import { syncClientCRM } from "@/lib/crm";
import { ClientsRepository } from "./clients.repository";
import { CardsRepository } from "../cards/cards.repository";
import { BillingRepository } from "../billing/billing.repository";
import { ReportingRepository } from "../reporting/reporting.repository";

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

      let card = null;
      if (data.preCardCode) {
        const existing = await this.cardsRepo.findUnique(
          {
            where: { cardCode: data.preCardCode.trim().toUpperCase() },
          },
          tx
        );
        if (!existing) {
          throw new Error(`Card code "${data.preCardCode}" not found. Generate it first from the Print page.`);
        }
        if (existing.clientId) {
          throw new Error(`Card ${data.preCardCode} is already assigned to another client.`);
        }
        card = await this.cardsRepo.update(
          {
            where: { id: existing.id },
            data: { clientId: client.id },
          },
          tx
        );
      } else if (data.issueCard) {
        card = await this.cardsRepo.create(
          {
            data: {
              clientId: client.id,
              publicToken: generatePublicToken(),
              cardCode: generateCardCode(),
            },
          },
          tx
        );
      }

      if (data.packageId) {
        const pkg = await this.billingRepo.findPackageUnique({ where: { id: data.packageId } }, tx);
        if (!pkg) {
          throw new Error("Package not found");
        }

        await this.billingRepo.createLedger(
          {
            data: {
              clientId: client.id,
              cardId: card?.id || null,
              packageId: pkg.id,
              delta: pkg.totalCredits,
              type: "credit",
              reason: `Package: ${pkg.name} (${pkg.creditAmount} paid + ${pkg.bonusCredits} bonus)`,
              createdById: adminId,
            },
          },
          tx
        );

        let invoiceCode = this.generateInvoiceCode();
        let codeExists = await this.billingRepo.findInvoiceUnique({ where: { invoiceCode } }, tx);
        while (codeExists) {
          invoiceCode = this.generateInvoiceCode();
          codeExists = await this.billingRepo.findInvoiceUnique({ where: { invoiceCode } }, tx);
        }

        await this.billingRepo.createInvoice(
          {
            data: {
              clientId: client.id,
              invoiceCode,
              amount: pkg.price,
              category: "package",
              items: `${pkg.name} Package — ${pkg.creditAmount} credits + ${pkg.bonusCredits} bonus (${pkg.totalCredits} total) · New client signup`,
              status: "paid",
              paidAt: new Date(),
            },
          },
          tx
        );
      }

      await syncClientCRM(client.id, tx);

      return { client, card };
    });

    const finalBalance = await getClientBalance(result.client.id);

    // Audit logs
    await this.reportingRepo.createAudit({
      data: {
        userId: adminId,
        action: "CREATE_CLIENT",
        target: `Client ${result.client.fullName}`,
        details: `Created client ${result.client.fullName} (${result.client.email || "No email"}). Card code: ${result.card?.cardCode || "None"}. Initial Balance: ${finalBalance} credits.`,
      },
    });

    // Send notifications
    if (result.client.email) {
      await sendSimulatedNotification(
        result.client.id,
        "email",
        result.client.email,
        `Welcome to AQA Sports, ${result.client.fullName}! Your prepaid card is now active. Card Code: ${result.card?.cardCode || "None"}. Scan the QR code to track your activity balance online anytime.`,
        "Welcome to AQA Sports!"
      );
    }

    if (result.client.phone) {
      await sendSimulatedNotification(
        result.client.id,
        "sms",
        result.client.phone,
        `AQA Sports: Welcome ${result.client.fullName}! Your event card is active. Code: ${result.card?.cardCode || "None"}. Initial Balance: ${finalBalance} credits.`
      );

      if (data.packageId) {
        await sendSimulatedNotification(
          result.client.id,
          "sms",
          result.client.phone,
          `AQA Sports: Recharge successful. Loaded package credits. Your current balance is: ${finalBalance} activities.`
        );
      }
    }

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
