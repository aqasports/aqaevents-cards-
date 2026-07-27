/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getBusinessOverviewMetrics,
  getClientInsights,
  getTopPerformingActivities,
  getRecentAuditLogs,
} from "./ai-tools";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    client: {
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    ledgerEntry: {
      aggregate: vi.fn(),
    },
    redemption: {
      count: vi.fn(),
    },
    invoice: {
      aggregate: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

describe("Read-Only AI Analytics Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBusinessOverviewMetrics", () => {
    it("should return aggregated high-level business metrics", async () => {
      vi.mocked(prisma.client.count).mockResolvedValue(42);
      vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({ _sum: { delta: 500 } } as any);
      vi.mocked(prisma.redemption.count).mockResolvedValue(120);
      vi.mocked(prisma.invoice.aggregate).mockResolvedValue({ _sum: { amount: 950000 } } as any);

      const metrics = await getBusinessOverviewMetrics();

      expect(metrics.activeClientsCount).toBe(42);
      expect(metrics.totalCreditsIssued).toBe(500);
      expect(metrics.totalRedemptionsCount).toBe(120);
      expect(metrics.totalRevenueDA).toBe(950000);
    });
  });

  describe("getClientInsights", () => {
    it("should return detailed client profile and balance calculation", async () => {
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: "c1",
        fullName: "Jane Doe",
        email: "jane@aqa.dz",
        customerSegment: "VIP",
        ledgerEntries: [
          { type: "CREDIT", delta: 10 },
          { type: "DEBIT", delta: -3 },
        ],
        redemptions: [],
      } as any);

      const insights = await getClientInsights("c1");

      expect(insights).not.toBeNull();
      expect(insights?.client.fullName).toBe("Jane Doe");
      expect(insights?.balance).toBe(7); // 10 - 3
    });
  });

  describe("getTopPerformingActivities", () => {
    it("should rank activities by redemption count", async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([
        { id: "act-1", name: "Kayaking", creditCost: 2, _count: { redemptions: 50 } },
        { id: "act-2", name: "Hiking", creditCost: 1, _count: { redemptions: 80 } },
      ] as any);

      const top = await getTopPerformingActivities(2);

      expect(top[0].name).toBe("Hiking");
      expect(top[0].redemptionsCount).toBe(80);
      expect(top[1].name).toBe("Kayaking");
    });
  });

  describe("getRecentAuditLogs", () => {
    it("should fetch recent audit logs ordered by date", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        { id: "log-1", action: "UPDATE_LEDGER_ENTRY" },
      ] as any);

      const logs = await getRecentAuditLogs(10);
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("UPDATE_LEDGER_ENTRY");
    });
  });
});
