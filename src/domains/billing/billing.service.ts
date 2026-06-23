import { prisma } from "@/lib/prisma";
import { getClientBalance } from "@/lib/balance";
import { logAdminAction } from "@/lib/audit";
import { sendSimulatedNotification } from "@/lib/notifications";
import { syncClientCRM } from "@/lib/crm";
import { BillingRepository } from "./billing.repository";
import { ClientsRepository } from "../clients/clients.repository";
import { ReportingRepository } from "../reporting/reporting.repository";
import { Prisma } from "@prisma/client";

export class BillingService {
  private billingRepo = new BillingRepository();
  private clientsRepo = new ClientsRepository();
  private reportingRepo = new ReportingRepository();

  private generateInvoiceCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "INV-";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private async uniqueInvoiceCode(tx: Prisma.TransactionClient): Promise<string> {
    let code = this.generateInvoiceCode();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.billingRepo.findInvoiceUnique({ where: { invoiceCode: code } }, tx);
      if (!existing) return code;
      code = this.generateInvoiceCode();
    }
  }

  // Invoice Workflows with Financial Stats
  async getInvoicesWithStats(search?: string, status?: string) {
    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { invoiceCode: { contains: search, mode: "insensitive" as const } },
        { client: { fullName: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    const invoices = await this.billingRepo.findInvoiceMany({
      where,
      include: {
        client: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const [totals] = await prisma.$queryRaw<
      { total_invoiced: number; paid_amount: number; unpaid_amount: number; refunded_amount: number }[]
    >`
      SELECT
        COALESCE(SUM(amount), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END), 0) as unpaid_amount,
        COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) as refunded_amount
      FROM "Invoice"
    `;

    const [expenseTotals] = await prisma.$queryRaw<{ total_expenses: number }[]>`
      SELECT COALESCE(SUM(amount), 0) as total_expenses FROM "ActivityExpense"
    `;

    const paidAmount = Number(totals.paid_amount);
    const expenses = Number(expenseTotals.total_expenses);

    return {
      invoices,
      stats: {
        totalInvoiced: Number(totals.total_invoiced),
        paidRevenue: paidAmount,
        unpaidOutstanding: Number(totals.unpaid_amount),
        refundedAmount: Number(totals.refunded_amount),
        totalExpenses: expenses,
        netProfit: paidAmount - expenses,
      },
    };
  }

  async getInvoice(id: string) {
    return this.billingRepo.findInvoiceUnique({
      where: { id },
      include: { client: { select: { id: true, fullName: true, phone: true, email: true } } },
    });
  }

  async createInvoiceWithCredits(
    data: {
      clientId: string;
      amount: number;
      category: "package" | "custom" | "adhoc";
      items: string;
      notes?: string;
      status: "paid" | "unpaid";
      packageId?: string;
      creditDelta?: number;
      creditReason?: string;
    },
    adminId: string
  ) {
    const client = await this.clientsRepo.findUnique({
      where: { id: data.clientId },
      include: { cards: { where: { status: "active" }, take: 1 } },
    });

    if (!client) throw new Error("Client not found");

    const result = await prisma.$transaction(async (tx) => {
      const invoiceCode = await this.uniqueInvoiceCode(tx);

      const invoice = await this.billingRepo.createInvoice(
        {
          data: {
            clientId: data.clientId,
            invoiceCode,
            amount: data.amount,
            category: data.category,
            items: data.items,
            notes: data.notes ?? null,
            status: data.status,
            paidAt: data.status === "paid" ? new Date() : null,
          },
        },
        tx
      );

      let ledgerEntry = null;
      if (data.creditDelta && data.creditDelta !== 0 && data.category !== "adhoc") {
        let pkgIdVal: string | null = null;
        if (data.packageId) {
          const pkg = await this.billingRepo.findPackageUnique({ where: { id: data.packageId } }, tx);
          if (pkg) pkgIdVal = pkg.id;
        }

        ledgerEntry = await this.billingRepo.createLedger(
          {
            data: {
              clientId: data.clientId,
              cardId: client.cards[0]?.id ?? null,
              packageId: pkgIdVal,
              delta: data.creditDelta,
              type: data.creditDelta > 0 ? "credit" : "debit",
              reason: data.creditReason ?? `Invoice ${invoiceCode}: ${data.items}`,
              createdById: adminId,
            },
          },
          tx
        );
      }

      return { invoice, ledgerEntry };
    });

    await syncClientCRM(data.clientId);
    const balance = await getClientBalance(data.clientId);

    return { ...result, balance };
  }

  async updateInvoiceWithCredits(
    id: string,
    data: {
      status?: "paid" | "unpaid" | "refunded";
      notes?: string | null;
      amount?: number;
      category?: "package" | "custom" | "adhoc";
      items?: string;
      createdAt?: string;
      paidAt?: string | null;
    },
    adminId: string
  ) {
    const invoice = await this.billingRepo.findInvoiceUnique({
      where: { id },
      include: {
        client: { include: { cards: { where: { status: "active" }, take: 1 } } },
      },
    });

    if (!invoice) throw new Error("Invoice not found");

    const updateData: any = {};
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.items !== undefined) updateData.items = data.items;
    if (data.createdAt !== undefined) updateData.createdAt = new Date(data.createdAt);
    if (data.paidAt !== undefined) updateData.paidAt = data.paidAt ? new Date(data.paidAt) : null;

    const result = await prisma.$transaction(async (tx) => {
      if (data.status) {
        updateData.status = data.status;
        if (data.status === "paid" && invoice.status !== "paid") {
          if (data.paidAt === undefined) {
            updateData.paidAt = new Date();
          }
        } else if (data.status === "unpaid") {
          updateData.paidAt = null;
        }

        // Refund reversal logic
        if (data.status === "refunded" && invoice.status === "paid" && invoice.category !== "adhoc") {
          const matchingEntry = await tx.ledgerEntry.findFirst({
            where: {
              clientId: invoice.clientId,
              reason: { contains: invoice.invoiceCode },
            },
            orderBy: { createdAt: "desc" },
          });

          if (matchingEntry && matchingEntry.delta > 0) {
            await tx.ledgerEntry.create({
              data: {
                clientId: invoice.clientId,
                cardId: invoice.client.cards[0]?.id ?? null,
                delta: -matchingEntry.delta,
                type: "debit",
                reason: `Refund: Invoice ${invoice.invoiceCode} reversed`,
                createdById: adminId,
              },
            });
          }
        }
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: updateData,
        include: {
          client: { select: { id: true, fullName: true, phone: true, email: true } },
        },
      });

      return updated;
    });

    await syncClientCRM(invoice.clientId);
    const balance = await getClientBalance(invoice.clientId);

    return { invoice: result, balance };
  }

  async deleteInvoice(id: string) {
    const invoice = await this.billingRepo.findInvoiceUnique({ where: { id } });
    if (!invoice) throw new Error("Invoice not found");

    await this.billingRepo.deleteInvoice({ where: { id } });
    await syncClientCRM(invoice.clientId);
    return { success: true };
  }

  // Package Workflows
  async getPackages() {
    return this.billingRepo.findPackageMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { ledgerEntries: true } },
      },
    });
  }

  async getPackage(id: string) {
    return this.billingRepo.findPackageUnique({ where: { id } });
  }

  async createPackage(
    data: { name: string; creditAmount: number; bonusCredits: number; sortOrder: number },
    adminId?: string
  ) {
    const totalCredits = data.creditAmount + data.bonusCredits;
    const price = data.creditAmount * 1900; // Calculated price

    const pkg = await this.billingRepo.createPackage({
      data: {
        name: data.name,
        creditAmount: data.creditAmount,
        bonusCredits: data.bonusCredits,
        totalCredits,
        price,
        sortOrder: data.sortOrder,
      },
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "CREATE_PACKAGE",
          target: `Package "${pkg.name}"`,
          details: `Created package "${pkg.name}" (${pkg.creditAmount} credits + ${pkg.bonusCredits} bonus, price: ${pkg.price} DA).`,
        },
      });
    }

    return pkg;
  }

  async updatePackage(
    id: string,
    data: { name?: string; creditAmount?: number; bonusCredits?: number; sortOrder?: number; active?: boolean },
    adminId?: string
  ) {
    const existing = await this.billingRepo.findPackageUnique({ where: { id } });
    if (!existing) throw new Error("Package not found");

    const creditAmount = data.creditAmount !== undefined ? data.creditAmount : existing.creditAmount;
    const bonusCredits = data.bonusCredits !== undefined ? data.bonusCredits : existing.bonusCredits;

    const totalCredits = creditAmount + bonusCredits;
    const price = creditAmount * 1900;

    const pkg = await this.billingRepo.updatePackage({
      where: { id },
      data: {
        name: data.name,
        creditAmount: data.creditAmount,
        bonusCredits: data.bonusCredits,
        totalCredits,
        price,
        sortOrder: data.sortOrder,
        active: data.active,
      },
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "UPDATE_PACKAGE",
          target: `Package "${pkg.name}"`,
          details: `Updated package "${pkg.name}" (Credits: ${pkg.creditAmount} + ${pkg.bonusCredits} bonus, price: ${pkg.price} DA, active: ${pkg.active}).`,
        },
      });
    }

    return pkg;
  }

  async deletePackage(id: string, adminId?: string) {
    // Soft delete for packages by setting active = false
    const pkg = await this.billingRepo.updatePackage({
      where: { id },
      data: { active: false },
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "ARCHIVE_PACKAGE",
          target: `Package "${pkg.name}"`,
          details: `Archived package "${pkg.name}" (marked active = false).`,
        },
      });
    }

    return pkg;
  }

  // Ledger Entry Details & Mutation Workflows
  async getLedgerDetails(id: string) {
    return this.billingRepo.findLedgerUnique({
      where: { id },
      include: {
        client: { select: { fullName: true, id: true } },
        createdBy: { select: { name: true } },
      },
    });
  }

  async updateLedgerEntry(id: string, data: { delta?: number; reason?: string }) {
    const entry = await this.billingRepo.findLedgerUnique({ where: { id } });
    if (!entry) throw new Error("Ledger entry not found");


    // Let's use direct prisma update for safety
    const result = await prisma.ledgerEntry.update({
      where: { id },
      data: {
        delta: data.delta !== undefined ? data.delta : entry.delta,
        reason: data.reason !== undefined ? data.reason : entry.reason,
        type: data.delta !== undefined ? (data.delta > 0 ? "credit" : "debit") : entry.type,
      },
    });

    return result;
  }

  async deleteLedgerEntry(id: string) {
    const entry = await prisma.ledgerEntry.findUnique({ where: { id } });
    if (!entry) throw new Error("Ledger entry not found");

    await prisma.ledgerEntry.delete({ where: { id } });
    return { success: true };
  }

  async rechargeCredits(
    clientId: string,
    data: {
      packageId?: string;
      customAmount?: number;
      reason?: string;
      invoice?: {
        amount: number;
        category: "package" | "custom" | "adhoc";
        items: string;
        notes?: string;
        status: "paid" | "unpaid";
      };
    },
    adminId: string
  ) {
    const client = await this.clientsRepo.findUnique({
      where: { id: clientId },
      include: { cards: { where: { status: "active" }, take: 1 } },
    });

    if (!client) throw new Error("Client not found");

    let delta = data.customAmount ?? 0;
    let packageId: string | undefined;
    let reason = data.reason;
    let pkgData: { name: string; creditAmount: number; bonusCredits: number; totalCredits: number; price: number } | null = null;

    if (data.packageId) {
      const pkg = await this.billingRepo.findPackageUnique({ where: { id: data.packageId } });
      if (!pkg) throw new Error("Package not found");
      delta = pkg.totalCredits;
      packageId = pkg.id;
      pkgData = pkg;
      reason = reason ?? `Package: ${pkg.name} (${pkg.creditAmount} paid + ${pkg.bonusCredits} bonus)`;
    }

    if (delta === 0) {
      throw new Error("Provide packageId or a non-zero customAmount");
    }

    const { entry, invoice } = await prisma.$transaction(async (tx) => {
      const ledger = await tx.ledgerEntry.create({
        data: {
          clientId,
          cardId: client.cards[0]?.id || null,
          packageId: packageId || null,
          delta,
          type: delta > 0 ? "credit" : "debit",
          reason: reason || (delta > 0 ? "Manual credit addition" : "Manual debit adjustment"),
          createdById: adminId,
        },
      });

      let inv = null;
      if (data.invoice) {
        const { amount, category, items, notes, status } = data.invoice;
        const code = await this.uniqueInvoiceCode(tx);
        inv = await tx.invoice.create({
          data: {
            clientId,
            invoiceCode: code,
            amount,
            category,
            items,
            notes: notes ?? null,
            status,
            paidAt: status === "paid" ? new Date() : null,
          },
        });
      } else if (pkgData) {
        const code = await this.uniqueInvoiceCode(tx);
        inv = await tx.invoice.create({
          data: {
            clientId,
            invoiceCode: code,
            amount: pkgData.price,
            category: "package",
            items: `${pkgData.name} Package — ${pkgData.creditAmount} credits + ${pkgData.bonusCredits} bonus (${pkgData.totalCredits} total)`,
            notes: reason ?? null,
            status: "paid",
            paidAt: new Date(),
          },
        });
      }

      return { entry: ledger, invoice: inv };
    });

    await syncClientCRM(clientId);
    const balance = await getClientBalance(clientId);

    await this.reportingRepo.createAudit({
      data: {
        userId: adminId,
        action: "RECHARGE_CLIENT",
        target: `Client ${client.fullName}`,
        details: `Recharged ${client.fullName} with ${delta} credits. Reason: ${reason}. New Balance: ${balance} credits.`,
      },
    });

    const notificationMessage = `Hello ${client.fullName}, a balance adjustment of ${delta > 0 ? `+${delta}` : delta} credits has been applied to your AQA Sports event card. Your current balance is: ${balance} credits.`;

    if (client.phone) {
      await sendSimulatedNotification(clientId, "sms", client.phone, `AQA Sports: ${notificationMessage}`);
    }

    if (client.email) {
      await sendSimulatedNotification(clientId, "email", client.email, notificationMessage, "AQA Sports Event Card Balance Update");
    }

    return { entry, invoice, balance };
  }

  // Redemption Workflows
  async getRedemptions() {
    return this.billingRepo.findRedemptionMany({
      include: {
        client: { select: { fullName: true, id: true } },
        activity: true,
        session: true,
        staff: { select: { name: true } },
      },
      orderBy: { redeemedAt: "desc" },
      take: 100,
    });
  }

  async createRedemption(
    clientId: string,
    activityId: string,
    data: {
      sessionId?: string;
      notes?: string;
    },
    adminId: string
  ) {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity || !activity.active) {
      throw new Error("ACTIVITY_NOT_FOUND");
    }

    const client = await this.clientsRepo.findUnique({
      where: { id: clientId },
      include: { cards: { where: { status: "active" }, take: 1 } },
    });

    if (!client) throw new Error("CLIENT_NOT_FOUND");

    const result = await prisma.$transaction(async (tx) => {
      const currentBalance = await this.billingRepo.sumLedgerDelta(client.id, tx);
      if (currentBalance < activity.creditCost) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const redemption = await tx.redemption.create({
        data: {
          clientId: client.id,
          activityId: activity.id,
          sessionId: data.sessionId || null,
          creditsUsed: activity.creditCost,
          staffId: adminId,
          notes: data.notes || null,
        },
        include: {
          activity: true,
          session: true,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          clientId: client.id,
          cardId: client.cards[0]?.id || null,
          redemptionId: redemption.id,
          delta: -activity.creditCost,
          type: "debit",
          reason: `Redeemed ${activity.name}`,
          createdById: adminId,
        },
      });

      return redemption;
    });

    await syncClientCRM(client.id);
    const newBalance = await getClientBalance(client.id);

    await this.reportingRepo.createAudit({
      data: {
        userId: adminId,
        action: "REDEEM_ACTIVITY",
        target: `Client ${client.fullName}`,
        details: `Redeemed activity "${activity.name}" for ${client.fullName}. Credits deducted: -${activity.creditCost}. New Balance: ${newBalance} credits.`,
      },
    });

    const notificationMessage = `Hello ${client.fullName}, activity "${activity.name}" was successfully redeemed. -${activity.creditCost} credits applied. Your remaining balance is: ${newBalance} credits.`;

    if (client.phone) {
      await sendSimulatedNotification(client.id, "sms", client.phone, `AQA Sports: ${notificationMessage}`);
    }

    if (client.email) {
      await sendSimulatedNotification(client.id, "email", client.email, notificationMessage, "AQA Sports Event Activity Redeemed");
    }

    return { redemption: result, balance: newBalance };
  }

  async deleteRedemption(id: string, adminId: string) {
    const redemption = await this.billingRepo.findRedemptionUnique({
      where: { id },
      include: {
        client: true,
        activity: true,
      },
    });

    if (!redemption) throw new Error("Redemption not found");

    await prisma.redemption.delete({ where: { id } });
    await syncClientCRM(redemption.clientId);

    const newBalance = await getClientBalance(redemption.clientId);

    await this.reportingRepo.createAudit({
      data: {
        userId: adminId,
        action: "DELETE_REDEMPTION",
        target: `Client ${redemption.client.fullName}`,
        details: `Deleted redemption of "${redemption.activity.name}" for ${redemption.client.fullName}. Credits restored: +${redemption.creditsUsed}. New Balance: ${newBalance} credits.`,
      },
    });

    return { success: true, balance: newBalance };
  }
}
