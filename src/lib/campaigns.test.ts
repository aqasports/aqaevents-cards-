/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateAndApplyPromoCode, incrementPromoUses } from "./campaigns";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    campaignPromo: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Campaign Promo Helper Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateAndApplyPromoCode", () => {
    it("should calculate percentage discount correctly", async () => {
      vi.mocked(prisma.campaignPromo.findUnique).mockResolvedValue({
        id: "promo-1",
        code: "SUMMER20",
        discountType: "percentage",
        discountValue: 20, // 20%
        active: true,
        maxUses: 100,
        usesCount: 10,
        validFrom: new Date("2026-01-01"),
        validUntil: new Date("2026-12-31"),
      } as any);

      // 10,000 DA * 20% = 2,000 DA discount -> finalPrice = 8,000 DA
      const result = await validateAndApplyPromoCode("summer20", 10000);

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(2000);
      expect(result.finalPrice).toBe(8000);
    });

    it("should calculate fixed DA discount correctly", async () => {
      vi.mocked(prisma.campaignPromo.findUnique).mockResolvedValue({
        id: "promo-2",
        code: "AQA500",
        discountType: "fixed",
        discountValue: 500,
        active: true,
        maxUses: null,
        usesCount: 5,
        validFrom: new Date("2026-01-01"),
        validUntil: null,
      } as any);

      // 5,000 DA - 500 DA = 4,500 DA
      const result = await validateAndApplyPromoCode("AQA500", 5000);

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(500);
      expect(result.finalPrice).toBe(4500);
    });

    it("should reject invalid/non-existent promo code", async () => {
      vi.mocked(prisma.campaignPromo.findUnique).mockResolvedValue(null);

      const result = await validateAndApplyPromoCode("INVALID", 10000);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("PROMO_NOT_FOUND");
      expect(result.discountAmount).toBe(0);
      expect(result.finalPrice).toBe(10000);
    });

    it("should reject expired promo code", async () => {
      vi.mocked(prisma.campaignPromo.findUnique).mockResolvedValue({
        id: "promo-3",
        code: "EXPIRED",
        discountType: "fixed",
        discountValue: 1000,
        active: true,
        validFrom: new Date("2025-01-01"),
        validUntil: new Date("2025-12-31"), // Past date
      } as any);

      const result = await validateAndApplyPromoCode("EXPIRED", 10000);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("PROMO_EXPIRED");
    });

    it("should reject promo code when usage limit is reached", async () => {
      vi.mocked(prisma.campaignPromo.findUnique).mockResolvedValue({
        id: "promo-4",
        code: "LIMITED",
        discountType: "percentage",
        discountValue: 50,
        active: true,
        maxUses: 5,
        usesCount: 5, // Reached max
      } as any);

      const result = await validateAndApplyPromoCode("LIMITED", 10000);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("PROMO_USAGE_LIMIT_REACHED");
    });
  });

  describe("incrementPromoUses", () => {
    it("should increment uses count for specified promo", async () => {
      vi.mocked(prisma.campaignPromo.update).mockResolvedValue({ id: "promo-1", usesCount: 11 } as any);

      await incrementPromoUses("promo-1");

      expect(prisma.campaignPromo.update).toHaveBeenCalledWith({
        where: { id: "promo-1" },
        data: { usesCount: { increment: 1 } },
      });
    });
  });
});
