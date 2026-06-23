/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getClientBalance, getClientBalances } from "./balance";
import { prisma } from "./prisma";

// Mock the prisma client module
vi.mock("./prisma", () => {
  return {
    prisma: {
      ledgerEntry: {
        aggregate: vi.fn(),
        groupBy: vi.fn(),
      },
    },
  };
});

describe("balance utils", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getClientBalance", () => {
    it("should return the sum of ledger deltas for a client", async () => {
      vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({
        _sum: { delta: 12 },
      } as any);

      const balance = await getClientBalance("client-1");
      expect(balance).toBe(12);
      expect(prisma.ledgerEntry.aggregate).toHaveBeenCalledWith({
        where: { clientId: "client-1" },
        _sum: { delta: true },
      });
    });

    it("should return 0 if no entries exist (sum is null)", async () => {
      vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({
        _sum: { delta: null },
      } as any);

      const balance = await getClientBalance("client-2");
      expect(balance).toBe(0);
    });
  });

  describe("getClientBalances", () => {
    it("should return an empty map if no clientIds are provided", async () => {
      const balances = await getClientBalances([]);
      expect(balances.size).toBe(0);
      expect(prisma.ledgerEntry.groupBy).not.toHaveBeenCalled();
    });

    it("should return a map of balances for multiple clients", async () => {
      vi.mocked(prisma.ledgerEntry.groupBy).mockResolvedValue([
        { clientId: "client-1", _sum: { delta: 10 } },
        { clientId: "client-2", _sum: { delta: -5 } },
      ] as any);

      const balances = await getClientBalances(["client-1", "client-2"]);
      expect(balances.size).toBe(2);
      expect(balances.get("client-1")).toBe(10);
      expect(balances.get("client-2")).toBe(-5);
      expect(prisma.ledgerEntry.groupBy).toHaveBeenCalledWith({
        by: ["clientId"],
        where: { clientId: { in: ["client-1", "client-2"] } },
        _sum: { delta: true },
      });
    });
  });
});
