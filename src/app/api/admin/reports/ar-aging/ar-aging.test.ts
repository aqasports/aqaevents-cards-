/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      findMany: vi.fn(),
    },
  },
}));

describe("Accounts Receivable Aging API", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  it("should categorize unpaid invoices into aging buckets (current, 31-60, 61-90, 90+)", async () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      {
        id: "inv-1",
        invoiceCode: "INV-001",
        amount: 10000,
        status: "unpaid",
        createdAt: new Date(now - 10 * day), // 10 days old -> current
        client: { id: "c1", fullName: "John Doe" },
        organization: null,
      },
      {
        id: "inv-2",
        invoiceCode: "INV-002",
        amount: 25000,
        status: "pending",
        createdAt: new Date(now - 45 * day), // 45 days old -> 31-60
        client: { id: "c2", fullName: "Jane Smith" },
        organization: null,
      },
      {
        id: "inv-3",
        invoiceCode: "INV-003",
        amount: 50000,
        status: "unpaid",
        createdAt: new Date(now - 100 * day), // 100 days old -> 90+
        client: null,
        organization: { id: "org-1", name: "Acme Corp" },
      },
    ] as any);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();

    expect(body.summary.totalUnpaid).toBe(85000);
    expect(body.summary.currentAmount).toBe(10000);
    expect(body.summary.thirtyToSixtyAmount).toBe(25000);
    expect(body.summary.overNinetyAmount).toBe(50000);

    expect(body.agingBuckets.current).toHaveLength(1);
    expect(body.agingBuckets.thirtyToSixty).toHaveLength(1);
    expect(body.agingBuckets.overNinety).toHaveLength(1);
    expect(body.byEntity).toHaveLength(3);
  });
});
