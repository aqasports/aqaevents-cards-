/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEffectiveCreditRateForClient, getClientEffectiveBalance } from "./organizations";
import { prisma } from "./prisma";
import { getCreditRate } from "./settings";

vi.mock("./prisma", () => ({
  prisma: {
    client: {
      findUnique: vi.fn(),
    },
    ledgerEntry: {
      aggregate: vi.fn(),
    },
  },
}));

vi.mock("./settings", () => ({
  getCreditRate: vi.fn().mockResolvedValue(1900),
}));

describe("organizations helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEffectiveCreditRateForClient", () => {
    it("should return organization credit rate if set", async () => {
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: "client-1",
        organization: { creditRate: 1500 },
      } as any);

      const rate = await getEffectiveCreditRateForClient("client-1");
      expect(rate).toBe(1500);
      expect(getCreditRate).not.toHaveBeenCalled();
    });

    it("should fall back to getCreditRate if org has no custom credit rate", async () => {
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: "client-1",
        organization: { creditRate: null },
      } as any);

      const rate = await getEffectiveCreditRateForClient("client-1");
      expect(rate).toBe(1900);
      expect(getCreditRate).toHaveBeenCalled();
    });

    it("should fall back to getCreditRate if client has no organization", async () => {
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: "client-1",
        organization: null,
      } as any);

      const rate = await getEffectiveCreditRateForClient("client-1");
      expect(rate).toBe(1900);
      expect(getCreditRate).toHaveBeenCalled();
    });
  });

  describe("getClientEffectiveBalance", () => {
    it("should return shared pool balance if org useSharedPool is true", async () => {
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: "client-1",
        organization: { useSharedPool: true, sharedCreditPool: 150.5 },
      } as any);

      const res = await getClientEffectiveBalance("client-1");
      expect(res).toEqual({ balance: 150.5, source: "shared_pool" });
    });

    it("should return individual ledger balance if org useSharedPool is false or client has no org", async () => {
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: "client-1",
        organization: null,
      } as any);

      vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({
        _sum: { delta: 25 },
      } as any);

      const res = await getClientEffectiveBalance("client-1");
      expect(res).toEqual({ balance: 25, source: "individual" });
    });
  });
});
