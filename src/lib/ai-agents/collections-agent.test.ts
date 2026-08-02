import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollectionsAgent } from "./collections-agent";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      findMany: vi.fn(),
    },
    aiActionQueue: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("CollectionsAgent", () => {
  let agent: CollectionsAgent;

  beforeEach(() => {
    vi.resetAllMocks();
    agent = new CollectionsAgent();
  });

  it("should create a SEND_PAYMENT_REMINDER proposal for an overdue invoice", async () => {
    const overdueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    const mockInvoice = {
      id: "inv-101",
      invoiceCode: "INV-2026-001",
      amount: 45000,
      status: "unpaid",
      dueDate: overdueDate,
      createdAt: overdueDate,
      organizationId: "org-1",
      client: { fullName: "Acme Employee", email: "acme@example.com" },
      organization: { name: "Acme Corp", contactEmail: "billing@acme.com" },
    };

    vi.mocked(prisma.invoice.findMany).mockResolvedValue([mockInvoice as any]);
    vi.mocked(prisma.aiActionQueue.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.aiActionQueue.create).mockResolvedValue({
      id: "prop-1",
      actionType: "SEND_PAYMENT_REMINDER",
      status: "pending",
    } as any);

    const result = await agent.runCollectionsCheck();

    expect(result.proposalsCreated).toBe(1);
    expect(result.skippedInvoices).toBe(0);
    expect(prisma.aiActionQueue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionType: "SEND_PAYMENT_REMINDER",
        organizationId: "org-1",
        targetEntityId: "inv-101",
        status: "pending",
      }),
    });
  });

  it("should skip creating duplicate pending proposals for the same invoice", async () => {
    const mockInvoice = {
      id: "inv-102",
      invoiceCode: "INV-2026-002",
      amount: 30000,
      status: "unpaid",
      dueDate: new Date(),
      createdAt: new Date(),
      organizationId: null,
      client: { fullName: "Jane Doe" },
    };

    vi.mocked(prisma.invoice.findMany).mockResolvedValue([mockInvoice as any]);
    vi.mocked(prisma.aiActionQueue.findFirst).mockResolvedValue({
      id: "existing-prop",
      actionType: "SEND_PAYMENT_REMINDER",
      status: "pending",
    } as any);

    const result = await agent.runCollectionsCheck();

    expect(result.proposalsCreated).toBe(0);
    expect(result.skippedInvoices).toBe(1);
    expect(prisma.aiActionQueue.create).not.toHaveBeenCalled();
  });
});
