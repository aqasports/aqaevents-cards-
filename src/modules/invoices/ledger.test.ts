/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BillingService } from "./service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  isSqlite: true,
  prisma: {
    ledgerEntry: {
      update: vi.fn(),
      findUnique: vi.fn(),
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
    vi.clearAllMocks();
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
    vi.mocked(prisma.ledgerEntry.update).mockResolvedValue(updatedEntry as any);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    await billingService.updateLedgerEntry("ledger-1", { delta: 10, reason: "Adjusted deposit" }, "admin-123");

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-123",
        action: "UPDATE_LEDGER_ENTRY",
        target: "John Doe",
      }),
    });
  });

  it("should call createAudit with DELETE_LEDGER_ENTRY action when deleting a ledger entry", async () => {
    const existingEntry = {
      id: "ledger-2",
      clientId: "client-2",
      delta: -2,
      reason: "Manual correction",
      type: "debit",
    };

    vi.mocked(prisma.ledgerEntry.findUnique).mockResolvedValue(existingEntry as any);
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ id: "client-2", fullName: "Jane Smith" } as any);
    vi.mocked(prisma.ledgerEntry.delete).mockResolvedValue(existingEntry as any);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

    await billingService.deleteLedgerEntry("ledger-2", "admin-456");

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-456",
        action: "DELETE_LEDGER_ENTRY",
        target: "Jane Smith",
      }),
    });
  });
});
