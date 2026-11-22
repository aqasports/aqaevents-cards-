/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BillingService } from "./service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  isSqlite: true,
  prisma: {
    $transaction: vi.fn((cb: any) => cb({
      invoice: {
        update: vi.fn(),
        delete: vi.fn(),
      },
      ledgerEntry: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
    })),
    invoice: {
      findUnique: vi.fn(),
    },
    redemption: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/crm", () => ({
  syncClientCRM: vi.fn(),
}));

vi.mock("@/lib/balance", () => ({
  getClientBalance: vi.fn().mockResolvedValue(10),
}));

describe("BillingService Invoice Audit Logging", () => {
  let billingService: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    billingService = new BillingService();
  });

  it("should call createAudit with UPDATE_INVOICE_STATUS when marking invoice as paid", async () => {
    const existingInvoice = {
      id: "inv-1",
      clientId: "client-1",
      invoiceCode: "INV-1001",
      amount: 1900,
      status: "unpaid",
      category: "package",
      notes: JSON.stringify({ type: "package", credits: 5 }),
      items: "Solo Package",
      client: { cards: [{ id: "card-1" }] },
    };

    const updatedInvoice = {
      ...existingInvoice,
      status: "paid",
    };

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(existingInvoice as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        ledgerEntry: { create: vi.fn().mockResolvedValue({}) },
        invoice: { update: vi.fn().mockResolvedValue(updatedInvoice) },
      });
    });
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    await billingService.updateInvoiceWithCredits("inv-1", { status: "paid" }, "admin-1");

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-1",
        action: "UPDATE_INVOICE_STATUS",
        target: "Invoice INV-1001",
      }),
    });
  });

  it("should call createAudit with UPDATE_INVOICE_STATUS when marking invoice as refunded", async () => {
    const existingInvoice = {
      id: "inv-2",
      clientId: "client-1",
      invoiceCode: "INV-1002",
      amount: 1900,
      status: "paid",
      category: "package",
      items: "Solo Package",
      client: { cards: [{ id: "card-1" }] },
    };

    const updatedInvoice = {
      ...existingInvoice,
      status: "refunded",
    };

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(existingInvoice as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        ledgerEntry: {
          findFirst: vi.fn().mockResolvedValue({ id: "leg-1", delta: 5 }),
          create: vi.fn().mockResolvedValue({}),
        },
        invoice: { update: vi.fn().mockResolvedValue(updatedInvoice) },
      });
    });
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    await billingService.updateInvoiceWithCredits("inv-2", { status: "refunded" }, "admin-1");

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-1",
        action: "UPDATE_INVOICE_STATUS",
        target: "Invoice INV-1002",
      }),
    });
  });

  it("should call createAudit with UPDATE_INVOICE_STATUS when marking invoice as unpaid", async () => {
    const existingInvoice = {
      id: "inv-3",
      clientId: "client-1",
      invoiceCode: "INV-1003",
      amount: 1900,
      status: "paid",
      category: "package",
      items: "Solo Package",
      client: { cards: [{ id: "card-1" }] },
    };

    const updatedInvoice = {
      ...existingInvoice,
      status: "unpaid",
    };

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(existingInvoice as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        ledgerEntry: {
          findFirst: vi.fn().mockResolvedValue({ id: "leg-1", delta: 5 }),
          create: vi.fn().mockResolvedValue({}),
        },
        invoice: { update: vi.fn().mockResolvedValue(updatedInvoice) },
      });
    });
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    await billingService.updateInvoiceWithCredits("inv-3", { status: "unpaid" }, "admin-1");

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-1",
        action: "UPDATE_INVOICE_STATUS",
        target: "Invoice INV-1003",
      }),
    });
  });

  it("should call createAudit with DELETE_INVOICE when deleting an invoice", async () => {
    const existingInvoice = {
      id: "inv-4",
      clientId: "client-1",
      invoiceCode: "INV-1004",
      amount: 3500,
      status: "paid",
      category: "sale",
      notes: JSON.stringify({ type: "sale", paymentMethod: "card", creditsDeducted: 1 }),
      items: "Goggles",
      client: { cards: [{ id: "card-1" }] },
    };

    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(existingInvoice as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        ledgerEntry: { create: vi.fn().mockResolvedValue({}) },
        invoice: { delete: vi.fn().mockResolvedValue(existingInvoice) },
      });
    });
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    await billingService.deleteInvoice("inv-4", "admin-1");

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-1",
        action: "DELETE_INVOICE",
        target: "Invoice INV-1004",
      }),
    });
  });

  it("should skip duplicate credit creation when concurrent tx re-read shows invoice is already paid", async () => {
    const stalePreTxInvoice = {
      id: "inv-5",
      clientId: "client-1",
      invoiceCode: "INV-1005",
      amount: 1900,
      status: "unpaid",
      category: "package",
      notes: JSON.stringify({ type: "package", credits: 5 }),
      items: "Solo Package",
      client: { cards: [{ id: "card-1" }] },
    };

    const alreadyPaidInTx = {
      ...stalePreTxInvoice,
      status: "paid",
    };

    const ledgerCreate = vi.fn();
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(stalePreTxInvoice as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        invoice: {
          findUnique: vi.fn().mockResolvedValue(alreadyPaidInTx),
          update: vi.fn().mockResolvedValue(alreadyPaidInTx),
        },
        ledgerEntry: { create: ledgerCreate },
      });
    });

    await billingService.updateInvoiceWithCredits("inv-5", { status: "paid" }, "admin-1");
    expect(ledgerCreate).not.toHaveBeenCalled();
  });

  it("should fall back to notes.credits when refunding a paid legacy package/custom invoice without invoiceCode in ledger reason", async () => {
    const legacyPaidInvoice = {
      id: "inv-6",
      clientId: "client-1",
      invoiceCode: "INV-1006",
      amount: 3800,
      status: "paid",
      category: "package",
      notes: JSON.stringify({ type: "package", credits: 8 }),
      items: "Duo Package",
      client: { cards: [{ id: "card-1" }] },
    };

    const ledgerCreate = vi.fn().mockResolvedValue({});
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(legacyPaidInvoice as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        invoice: {
          findUnique: vi.fn().mockResolvedValue(legacyPaidInvoice),
          update: vi.fn().mockResolvedValue({ ...legacyPaidInvoice, status: "refunded" }),
        },
        ledgerEntry: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: ledgerCreate,
        },
      });
    });

    await billingService.updateInvoiceWithCredits("inv-6", { status: "refunded" }, "admin-1");

    expect(ledgerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: "client-1",
        delta: -8,
        type: "debit",
      }),
    });
  });

  it("should skip creating a refund ledger entry when deleting a walk-in sentinel redemption", async () => {
    const walkinRedemption = {
      id: "red-walkin-1",
      clientId: "sentinel-1",
      creditsUsed: 2,
      client: { id: "sentinel-1", email: "__walkin__@system.aqa", fullName: "Walk-in Attendees" },
      activity: { name: "Kayaking" },
    };

    const ledgerCreate = vi.fn();
    vi.mocked(prisma.redemption.findUnique).mockResolvedValue(walkinRedemption as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        redemption: {
          findUnique: vi.fn().mockResolvedValue({ id: "red-walkin-1" }),
          delete: vi.fn().mockResolvedValue(walkinRedemption),
        },
        ledgerEntry: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: ledgerCreate,
        },
        checkIn: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      });
    });

    await billingService.deleteRedemption("red-walkin-1", "admin-1");
    expect(ledgerCreate).not.toHaveBeenCalled();
  });
});
