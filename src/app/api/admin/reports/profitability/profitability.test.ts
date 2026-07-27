/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { calculateSessionProfitability } from "@/lib/profitability";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getCreditRate } from "@/lib/settings";
import { getEffectiveCreditRateForClient } from "@/lib/organizations";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({
  getCreditRate: vi.fn(),
}));

vi.mock("@/lib/organizations", () => ({
  getEffectiveCreditRateForClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activitySession: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Profitability Engine & Report API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });

    vi.mocked(getCreditRate).mockResolvedValue(1900);
    vi.mocked(getEffectiveCreditRateForClient).mockResolvedValue(1900);
  });

  describe("calculateSessionProfitability", () => {
    it("should calculate gross revenue, variable expenses, coach payout, and net profit", async () => {
      vi.mocked(prisma.activitySession.findUnique).mockResolvedValue({
        id: "session-1",
        activity: { creditCost: 2 },
        checkIns: [{ clientId: "c1" }, { clientId: "c2" }, { clientId: "c3" }], // 3 checkins * 2 credits * 1900 = 11,400 DA
        sessionExpenses: [{ amount: 1400 }, { amount: 1000 }], // 2,400 DA
        coach: { defaultPayRate: 3000, commissionRate: 0.1 }, // payout = 3000 + (11400 * 0.1) = 4,140 DA
        equipmentUsages: [],
      } as any);

      const result = await calculateSessionProfitability("session-1");

      // grossRevenue = 11,400 DA
      // variableExpenses = 2,400 DA
      // coachPayout = 4,140 DA
      // netProfit = 11400 - 2400 - 4140 = 4,860 DA
      // margin = round((4860 / 11400) * 100) = 43%
      expect(result.grossRevenue).toBe(11400);
      expect(result.variableExpenses).toBe(2400);
      expect(result.coachPayout).toBe(4140);
      expect(result.netProfit).toBe(4860);
      expect(result.profitMarginPercent).toBe(43);
    });
  });

  describe("GET /api/admin/reports/profitability", () => {
    it("should return overall aggregated report and identify best session and most profitable activity", async () => {
      vi.mocked(prisma.activitySession.findMany).mockResolvedValue([
        {
          id: "session-1",
          activityId: "act-kayak",
          activity: { name: "Kayak Excursion", creditCost: 2 },
          checkIns: [{}, {}, {}],
          sessionExpenses: [{ amount: 2000 }],
          coach: { defaultPayRate: 3000, commissionRate: 0 },
          equipmentUsages: [],
          sessionDate: new Date("2026-06-01"),
        },
        {
          id: "session-2",
          activityId: "act-climbing",
          activity: { name: "Rock Climbing", creditCost: 3 },
          checkIns: [{}, {}, {}, {}], // 4 * 3 * 1900 = 22,800 DA
          sessionExpenses: [{ amount: 3000 }],
          coach: { defaultPayRate: 4000, commissionRate: 0 },
          equipmentUsages: [],
          sessionDate: new Date("2026-06-02"),
        },
      ] as any);

      const req = new NextRequest("http://localhost:3000/api/admin/reports/profitability?startDate=2026-06-01");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.summary.sessionCount).toBe(2);
      expect(body.summary.totalRevenue).toBe(11400 + 22800); // 34,200
      expect(body.bestSession.id).toBe("session-2");
      expect(body.mostProfitableActivity.name).toBe("Rock Climbing");
    });
  });
});
