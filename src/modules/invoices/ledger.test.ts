/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BillingService } from "./service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  isSqlite: true,
  prisma: {
    ledgerEntry: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      aggregate: vi.fn().mockResolvedValue({ _sum: { delta: 0 } }),
      delete: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("BillingService Ledger Audit Logging", () => {
  let billingService: BillingService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.ledgerEntry.findFirst).mockResolvedValue(null as any);
    vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({ _sum: { delta: 0 } } as any);
    billingService = new BillingService();
  });

  it("should call createAudit with UPDATE_LEDGER_ENTRY action when updating a ledger entry", async () => {
    const existingEntry = {
      id: "ledger-1",
      clientId: "client-1",
      delta: 5,
      reason: "Initial deposit",
      type: "credit",
    };

    const updatedEntry = {
      ...existingEntry,
      delta: 10,
      reason: "Adjusted deposit",
    };

    vi.mocked(prisma.ledgerEntry.findUnique).mockResolvedValue(existingEntry as any);
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ id: "client-1", fullName: "John Doe" } as any);
    vi.mocked(prisma.ledgerEntry.create).mockResolvedValue(updatedEntry as any);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    await billingService.updateLedgerEntry("ledger-1", { delta: 10, reason: "Adjusted deposit" }, "admin-123");

    expect(prisma.ledgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: "client-1",
        delta: 5,
        type: "credit",
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-123",
        action: "UPDATE_LEDGER_ENTRY",
        target: "John Doe",
      }),
    });
  });

  it("should call createAudit with DELETE_LEDGER_ENTRY action and create a compensating reversal entry when deleting a ledger entry", async () => {
    const existingEntry = {
      id: "ledger-2",
      clientId: "client-2",
      delta: -2,
      reason: "Manual correction",
      type: "debit",
    };

    vi.mocked(prisma.ledgerEntry.findUnique).mockResolvedValue(existingEntry as any);
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ id: "client-2", fullName: "Jane Smith" } as any);
    vi.mocked(prisma.ledgerEntry.create).mockResolvedValue({} as any);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    await billingService.deleteLedgerEntry("ledger-2", "admin-456");

    expect(prisma.ledgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: "client-2",
        delta: 2,
        type: "credit",
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-456",
        action: "DELETE_LEDGER_ENTRY",
        target: "Jane Smith",
      }),
    });
  });

  it("should account for prior [ADJUSTMENT of ...] entries on repeated updateLedgerEntry calls", async () => {
    vi.mocked(prisma.ledgerEntry.findUnique).mockResolvedValue({
      id: "ledger-3",
      clientId: "client-3",
      delta: 10,
      reason: "Initial recharge",
      type: "credit",
    } as any);
    vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({ _sum: { delta: 5 } } as any);
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ id: "client-3", fullName: "Ali" } as any);
    vi.mocked(prisma.ledgerEntry.create).mockResolvedValue({ id: "adj-2" } as any);

    await billingService.updateLedgerEntry("ledger-3", { delta: 12 }, "admin-1");

    // Current effective delta is 10 + 5 = 15, so updating target to 12 creates -3 adjustment
    expect(prisma.ledgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: "client-3",
        delta: -3,
        type: "debit",
      }),
    });
  });

  it("should reject double-reversal on deleteLedgerEntry and reject reversing a [REVERSAL of ...] entry", async () => {
    vi.mocked(prisma.ledgerEntry.findUnique).mockResolvedValueOnce({
      id: "ledger-4",
      clientId: "client-4",
      delta: 5,
      reason: "Initial credit",
      type: "credit",
    } as any);
    vi.mocked(prisma.ledgerEntry.findFirst).mockResolvedValueOnce({ id: "rev-1" } as any);

    await expect(billingService.deleteLedgerEntry("ledger-4", "admin-1")).rejects.toThrow(
      "Ledger entry has already been reversed"
    );
    expect(prisma.ledgerEntry.create).not.toHaveBeenCalled();

    vi.mocked(prisma.ledgerEntry.findUnique).mockResolvedValueOnce({
      id: "rev-1",
      clientId: "client-4",
      delta: -5,
      reason: "[REVERSAL of ledger-4] Initial credit",
      type: "debit",
    } as any);

    await expect(billingService.deleteLedgerEntry("rev-1", "admin-1")).rejects.toThrow(
      "Ledger entry has already been reversed"
    );
    expect(prisma.ledgerEntry.create).not.toHaveBeenCalled();
  });
});
