/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as validatePromo } from "./validate/route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaignPromo: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Public Promo Validation API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate and return discounted price for active promo code", async () => {
    vi.mocked(prisma.campaignPromo.findUnique).mockResolvedValue({
      id: "promo-1",
      code: "WELCOME10",
      discountType: "percentage",
      discountValue: 10,
      active: true,
      maxUses: 100,
      usesCount: 0,
      validFrom: new Date("2026-01-01"),
      validUntil: null,
    } as any);

    const req = new NextRequest("http://localhost:3000/api/public/promo/validate", {
      method: "POST",
      body: JSON.stringify({
        code: "welcome10",
        originalPrice: 20000,
      }),
    });

    const res = await validatePromo(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discountAmount).toBe(2000);
    expect(body.finalPrice).toBe(18000);
    expect(body.promo.code).toBe("WELCOME10");
  });

  it("should return 400 with error if promo code is invalid", async () => {
    vi.mocked(prisma.campaignPromo.findUnique).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/public/promo/validate", {
      method: "POST",
      body: JSON.stringify({
        code: "INVALID_CODE",
        originalPrice: 20000,
      }),
    });

    const res = await validatePromo(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBe("PROMO_NOT_FOUND");
    expect(body.finalPrice).toBe(20000);
  });
});
