/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCreditRate, setCreditRate, clearCreditRateCache } from "./settings";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    platformSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("settings utils (credit rate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCreditRateCache();
  });

  it("should return fallback 1900 if setting row does not exist", async () => {
    vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue(null);

    const rate = await getCreditRate();
    expect(rate).toBe(1900);
  });

  it("should return seeded value from PlatformSetting when present", async () => {
    vi.mocked(prisma.platformSetting.findUnique).mockResolvedValue({
      key: "credit_rate_da",
      value: "2500",
      updatedAt: new Date(),
    } as any);

    const rate = await getCreditRate();
    expect(rate).toBe(2500);
  });

  it("should update rate via setCreditRate and refresh cache", async () => {
    vi.mocked(prisma.platformSetting.upsert).mockResolvedValue({
      key: "credit_rate_da",
      value: "3000",
      updatedAt: new Date(),
    } as any);

    await setCreditRate(3000);

    expect(prisma.platformSetting.upsert).toHaveBeenCalledWith({
      where: { key: "credit_rate_da" },
      create: { key: "credit_rate_da", value: "3000" },
      update: { value: "3000" },
    });

    // Subsequent call uses in-memory cache without hitting DB
    const rate = await getCreditRate();
    expect(rate).toBe(3000);
    expect(prisma.platformSetting.findUnique).not.toHaveBeenCalled();
  });
});
