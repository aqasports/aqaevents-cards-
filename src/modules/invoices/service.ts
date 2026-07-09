import { prisma, isSqlite } from "@/lib/prisma";
import { getClientBalance } from "@/lib/balance";
import { sendSimulatedNotification } from "@/lib/notifications";
import { syncClientCRM } from "@/lib/crm";
import { BillingRepository } from "./repository";
import { ClientsRepository } from "../clients/repository";
import { ReportingRepository } from "../reports/repository";
import { Prisma } from "@prisma/client";
import { eventBus, EVENTS } from "@/lib/events";


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
        {
          invoiceCode: {
            contains: search,
            ...(isSqlite ? {} : { mode: "insensitive" as const }),
          },
        },
        {
          client: {
            fullName: {
              contains: search,
              ...(isSqlite ? {} : { mode: "insensitive" as const }),
            },
          },
        },
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
      category: "package" | "custom" | "adhoc" | "sale";
      items: string;
      notes?: string;
      status: "paid" | "unpaid";
      packageId?: string;
      creditDelta?: number;
      creditReason?: string;
    },
    adminId?: string | null
  ) {
    const client = await this.clientsRepo.findUnique({
      where: { id: data.clientId },
      include: { cards: { where: { status: "active" }, take: 1 } },
    });

    if (!client) throw new Error("Client not found");

    const shouldRecharge = data.creditDelta && data.creditDelta !== 0 && data.category !== "adhoc" && data.category !== "sale";
    const hasPackage = !!data.packageId && data.category !== "adhoc" && data.category !== "sale";

    if (shouldRecharge || hasPackage) {
      const result = await prisma.$transaction(async (tx) => {
        const eventPayload: any = {
          clientId: data.clientId,
          packageId: data.packageId,
          customAmount: data.creditDelta,
          reason: data.creditReason,
          invoice: {
            amount: data.amount,
            category: data.category,
            items: data.items,
            notes: data.notes,
            status: data.status,
          },
          adminId,
          tx,
          postCommitActions: [],
        };

        await eventBus.emit(EVENTS.PACKAGE_PURCHASED, eventPayload);

        return {
          invoice: eventPayload.invoiceResult,
          ledgerEntry: eventPayload.ledgerEntry,
          postCommitActions: eventPayload.postCommitActions,
        };
      });

      if (result.postCommitActions) {
        for (const action of result.postCommitActions) {
          await action().catch((e: any) => console.error("Post-commit action error:", e));
        }
      }

      const balance = await getClientBalance(data.clientId);
      return { invoice: result.invoice, ledgerEntry: result.ledgerEntry, balance };
    } else {
      const result = await prisma.$transaction(async (tx) => {
        let isCardPayment = false;
        let cardCreditsToDeduct = 0;
        if (data.category === "sale" && data.notes) {
          try {
            const parsed = JSON.parse(data.notes);
            if (parsed.type === "sale" && parsed.paymentMethod === "card") {
              isCardPayment = true;
              cardCreditsToDeduct = parsed.creditsDeducted ?? (Math.floor((data.amount / 1900) * 100) / 100);
            }
          } catch {
            // ignore
          }
        }

        if (isCardPayment && data.status === "paid") {
          const currentBalance = await getClientBalance(data.clientId, tx);
          if (currentBalance < cardCreditsToDeduct) {
            throw new Error(`Insufficient credit balance. Client has ${currentBalance.toFixed(2)} credits, but this sale requires ${cardCreditsToDeduct.toFixed(2)} credits.`);
          }
        }

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
        if (isCardPayment && data.status === "paid") {
          const activeCard = client.cards[0] ?? null;
          ledgerEntry = await tx.ledgerEntry.create({
            data: {
              clientId: data.clientId,
              cardId: activeCard?.id ?? null,
              delta: -cardCreditsToDeduct,
              type: "debit",
              reason: `Store Purchase: ${data.items} (Invoice ${invoiceCode})`,
              createdById: adminId,
            },
          });
        }

        return { invoice, ledgerEntry };
      });

      await syncClientCRM(data.clientId);
      const balance = await getClientBalance(data.clientId);

      return { ...result, balance };
    }
  }

  async updateInvoiceWithCredits(
    id: string,
    data: {
      status?: "paid" | "unpaid" | "refunded";
      notes?: string | null;
      amount?: number;
      category?: "package" | "custom" | "adhoc" | "sale";
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
    if (data.notes !== undefined) {
      if (invoice.notes && invoice.notes.startsWith("{") && invoice.notes.endsWith("}")) {
        try {
          const parsed = JSON.parse(invoice.notes);
          parsed.originalNotes = data.notes;
          updateData.notes = JSON.stringify(parsed);
        } catch {
          updateData.notes = data.notes;
        }
      } else {
        updateData.notes = data.notes;
      }
    }
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
          if (invoice.notes) {
            try {
              const metadata = JSON.parse(invoice.notes);
              if (metadata && (metadata.type === "package" || metadata.type === "custom")) {
                const activeCard = invoice.client.cards[0];
                await tx.ledgerEntry.create({
                  data: {
                    clientId: invoice.clientId,
                    cardId: activeCard?.id ?? null,
                    packageId: metadata.packageId || null,
                    delta: metadata.credits,
                    type: "credit",
                    reason: metadata.reason ?? `Approved Demand: ${invoice.items}`,
                    createdById: adminId,
                  },
                });
              } else if (metadata && metadata.type === "sale" && metadata.paymentMethod === "card") {
                const cardCreditsToDeduct = metadata.creditsDeducted ?? (Math.floor((invoice.amount / 1900) * 100) / 100);
                const currentBalance = await getClientBalance(invoice.clientId, tx);
                if (currentBalance < cardCreditsToDeduct) {
                  throw new Error(`Insufficient credit balance. Client has ${currentBalance.toFixed(2)} credits, but this sale requires ${cardCreditsToDeduct.toFixed(2)} credits.`);
                }
                const activeCard = invoice.client.cards[0];
                await tx.ledgerEntry.create({
                  data: {
                    clientId: invoice.clientId,
                    cardId: activeCard?.id ?? null,
                    delta: -cardCreditsToDeduct,
                    type: "debit",
                    reason: `Store Purchase: ${invoice.items} (Invoice ${invoice.invoiceCode})`,
                    createdById: adminId,
                  },
                });
              }
            } catch (e: any) {
              if (e instanceof Error && e.message.includes("Insufficient")) {
                throw e;
              }
              // Ignore other non-JSON notes parsing errors
            }
          }
        } else if (data.status === "unpaid") {
          updateData.paidAt = null;
        }

        // Refund reversal logic
        if (data.status === "refunded" && invoice.status === "paid") {
          if (invoice.category !== "adhoc" && invoice.category !== "sale") {
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
          } else if (invoice.category === "sale" && invoice.notes) {
            try {
              const parsed = JSON.parse(invoice.notes);
              if (parsed.type === "sale" && parsed.paymentMethod === "card") {
                const cardCreditsToRefund = parsed.creditsDeducted ?? (Math.floor((invoice.amount / 1900) * 100) / 100);
                const activeCard = invoice.client.cards[0];
                await tx.ledgerEntry.create({
                  data: {
                    clientId: invoice.clientId,
                    cardId: activeCard?.id ?? null,
                    delta: cardCreditsToRefund,
                    type: "credit",
                    reason: `Refund: Sale Invoice ${invoice.invoiceCode} returned`,
                    createdById: adminId,
                  },
                });
              }
            } catch {
              // ignore
            }
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

  async deleteInvoice(id: string, adminId?: string | null) {
    const invoice = await this.billingRepo.findInvoiceUnique({
      where: { id },
      include: {
        client: {
          include: {
            cards: {
              where: { status: "active" },
              take: 1
            }
          }
        }
      }
    });
    if (!invoice) throw new Error("Invoice not found");

    await prisma.$transaction(async (tx) => {
      if (invoice.category === "sale" && invoice.notes && invoice.status === "paid") {
        try {
          const parsed = JSON.parse(invoice.notes);
          if (parsed.type === "sale" && parsed.paymentMethod === "card") {
            const cardCreditsToRefund = parsed.creditsDeducted ?? (Math.floor((invoice.amount / 1900) * 100) / 100);
            const activeCard = invoice.client.cards[0] ?? null;
            await tx.ledgerEntry.create({
              data: {
                clientId: invoice.clientId,
                cardId: activeCard?.id ?? null,
                delta: cardCreditsToRefund,
                type: "credit",
                reason: `Cancelled Sale: Invoice ${invoice.invoiceCode} deleted`,
                createdById: adminId,
              },
            });
          }
        } catch {
          // ignore
        }
      }
      await tx.invoice.delete({ where: { id } });
    });

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
    adminId?: string | null
  ) {
    const client = await this.clientsRepo.findUnique({
      where: { id: clientId },
      include: { cards: { where: { status: "active" }, take: 1 } },
    });

    if (!client) throw new Error("Client not found");

    const result = await prisma.$transaction(async (tx) => {
      const eventPayload: any = {
        clientId,
        packageId: data.packageId,
        customAmount: data.customAmount,
        reason: data.reason,
        invoice: data.invoice,
        adminId,
        tx,
        postCommitActions: [],
      };

      await eventBus.emit(EVENTS.PACKAGE_PURCHASED, eventPayload);

      return {
        entry: eventPayload.ledgerEntry,
        invoice: eventPayload.invoiceResult,
        postCommitActions: eventPayload.postCommitActions,
      };
    });

    if (result.postCommitActions) {
      for (const action of result.postCommitActions) {
        await action().catch((e: any) => console.error("Post-commit action error:", e));
      }
    }

    const balance = await getClientBalance(clientId);

    return {
      entry: result.entry,
      invoice: result.invoice,
      balance,
    };
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
      bypassBalanceCheck?: boolean;
      creditsUsed?: number;
    },
    adminId: string
  ) {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity || !activity.active) {
      throw new Error("ACTIVITY_NOT_FOUND");
    }

    // Enforce that only activities with available (upcoming, active) events can be redeemed
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
    const upcomingSessionsCount = await prisma.activitySession.count({
      where: {
        activityId,
        active: true,
        sessionDate: { gte: tenHoursAgo },
      },
    });

    if (upcomingSessionsCount === 0) {
      throw new Error("NO_AVAILABLE_EVENTS");
    }

    if (data.sessionId) {
      const session = await prisma.activitySession.findFirst({
        where: {
          id: data.sessionId,
          activityId,
          active: true,
          sessionDate: { gte: tenHoursAgo },
        },
      });
      if (!session) {
        throw new Error("SESSION_NOT_AVAILABLE");
      }
    }

    const client = await this.clientsRepo.findUnique({
      where: { id: clientId },
      include: { cards: { where: { status: "active" }, take: 1 } },
    });

    if (!client) throw new Error("CLIENT_NOT_FOUND");

    const result = await prisma.$transaction(async (tx) => {
      const eventPayload: any = {
        client,
        activity,
        sessionId: data.sessionId,
        notes: data.notes,
        bypassBalanceCheck: data.bypassBalanceCheck,
        creditsUsed: data.creditsUsed,
        adminId,
        tx,
        postCommitActions: [],
      };

      await eventBus.emit(EVENTS.ACTIVITY_REDEEMED, eventPayload);

      return {
        redemption: eventPayload.redemptionResult,
        postCommitActions: eventPayload.postCommitActions,
      };
    });

    if (result.postCommitActions) {
      for (const action of result.postCommitActions) {
        await action().catch((e: any) => console.error("Post-commit action error:", e));
      }
    }

    const newBalance = await getClientBalance(client.id);

    return { redemption: result.redemption, balance: newBalance };
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

    const result = await prisma.$transaction(async (tx) => {
      await tx.redemption.delete({ where: { id } });

      const eventPayload: any = {
        clientId: redemption.clientId,
        redemption,
        adminId,
        tx,
        postCommitActions: [],
      };

      await eventBus.emit(EVENTS.REDEMPTION_DELETED, eventPayload);

      return {
        postCommitActions: eventPayload.postCommitActions,
      };
    });

    if (result.postCommitActions) {
      for (const action of result.postCommitActions) {
        await action().catch((e: any) => console.error("Post-commit action error:", e));
      }
    }

    const newBalance = await getClientBalance(redemption.clientId);

    return { success: true, balance: newBalance };
  }

  async bulkRefundSession(sessionId: string, adminId: string) {
    // Fetch all redemptions for this session
    const redemptions = await prisma.redemption.findMany({
      where: { sessionId },
      include: {
        client: true,
        activity: true,
      },
    });

    if (redemptions.length === 0) {
      return { refunded: 0, totalCreditsRestored: 0 };
    }

    let totalCreditsRestored = 0;

    for (const redemption of redemptions) {
      const result = await prisma.$transaction(async (tx) => {
        await tx.redemption.delete({ where: { id: redemption.id } });

        const eventPayload: any = {
          clientId: redemption.clientId,
          redemption,
          adminId,
          tx,
          postCommitActions: [],
        };

        await eventBus.emit(EVENTS.REDEMPTION_DELETED, eventPayload);

        return { postCommitActions: eventPayload.postCommitActions };
      });

      if (result.postCommitActions) {
        for (const action of result.postCommitActions) {
          await action().catch((e: any) => console.error("Post-commit action error:", e));
        }
      }

      totalCreditsRestored += redemption.creditsUsed;
    }

    await this.reportingRepo.createAudit({
      data: {
        userId: adminId,
        action: "BULK_REFUND_SESSION",
        target: `Session ${sessionId}`,
        details: `Bulk refunded ${redemptions.length} client(s), restoring ${totalCreditsRestored} credits.`,
      },
    });

    return { refunded: redemptions.length, totalCreditsRestored };
  }
}

export class ProductsService {
  private productsRepo = new BillingRepository();
  private reportingRepo = new ReportingRepository();

  async getProducts() {
    return this.productsRepo.findProductMany({
      orderBy: [
        { active: "desc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    });
  }

  async getAdvertisedProducts() {
    return this.productsRepo.findProductMany({
      where: { active: true, advertised: true },
      orderBy: [
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    });
  }

  async getProduct(id: string) {
    return this.productsRepo.findProductUnique({
      where: { id },
    });
  }

  async createProduct(
    data: {
      name: string;
      price: number;
      description?: string | null;
      imageUrl?: string | null;
      advertised?: boolean;
      sortOrder?: number;
    },
    adminId?: string | null
  ) {
    const sortOrder =
      data.sortOrder ??
      ((await this.productsRepo.countProduct({ where: { active: true } })) + 1);

    const product = await this.productsRepo.createProduct({
      data: {
        name: data.name,
        price: data.price,
        description: data.description,
        imageUrl: data.imageUrl,
        advertised: data.advertised ?? true,
        sortOrder,
      },
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "CREATE_PRODUCT",
          target: `Product ${product.name}`,
          details: `Created product "${product.name}" for ${product.price} DA. Advertised: ${product.advertised}.`,
        },
      });
    }

    return product;
  }

  async updateProduct(
    id: string,
    data: {
      name?: string;
      price?: number;
      description?: string | null;
      imageUrl?: string | null;
      advertised?: boolean;
      active?: boolean;
      sortOrder?: number;
    },
    adminId?: string | null
  ) {
    const product = await this.productsRepo.updateProduct({
      where: { id },
      data,
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "UPDATE_PRODUCT",
          target: `Product ${product.name}`,
          details: `Updated product "${product.name}".`,
        },
      });
    }

    return product;
  }

  async deleteProduct(id: string, adminId?: string | null) {
    // Soft delete by setting active = false
    const product = await this.productsRepo.updateProduct({
      where: { id },
      data: { active: false, advertised: false },
    });

    if (adminId) {
      await this.reportingRepo.createAudit({
        data: {
          userId: adminId,
          action: "DELETE_PRODUCT",
          target: `Product ${product.name}`,
          details: `Soft deleted/archived product "${product.name}".`,
        },
      });
    }

    return product;
  }
}
