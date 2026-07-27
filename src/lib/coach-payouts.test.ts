import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateCoachPayout } from "./coach-payouts";

vi.mock("./settings", () => ({
  getCreditRate: vi.fn().mockResolvedValue(1900),
}));

describe("coach payout calculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate base pay and commission correctly", async () => {
    const session = {
      coach: {
        defaultPayRate: 3000,
        commissionRate: 0.1, // 10%
      },
      activity: {
        creditCost: 2, // 2 credits per check-in = 3,800 DA
      },
      checkIns: [{}, {}, {}, {}, {}], // 5 check-ins -> revenue = 5 * 2 * 1900 = 19,000 DA
    };

    const result = await calculateCoachPayout(session);

    // basePay = 3000
    // commission = 19000 * 0.1 = 1900
    // totalPayout = 4900
    expect(result).toEqual({
      basePay: 3000,
      commission: 1900,
      totalPayout: 4900,
    });
  });

  it("should respect coachPayOverride over defaultPayRate", async () => {
    const session = {
      coachPayOverride: 5000,
      coach: {
        defaultPayRate: 3000,
        commissionRate: 0.05,
      },
      activity: {
        creditCost: 1,
      },
      checkIns: [{}, {}], // 2 check-ins * 1900 = 3800 DA -> commission = 190 DA
    };

    const result = await calculateCoachPayout(session);

    expect(result).toEqual({
      basePay: 5000,
      commission: 190,
      totalPayout: 5190,
    });
  });

  it("should handle session without coach assigned", async () => {
    const session = {
      coach: null,
      activity: {
        creditCost: 1,
      },
      checkIns: [{}],
    };

    const result = await calculateCoachPayout(session);

    expect(result).toEqual({
      basePay: 0,
      commission: 0,
      totalPayout: 0,
    });
  });
});
