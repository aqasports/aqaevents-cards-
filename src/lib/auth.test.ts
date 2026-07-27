/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "./prisma";
import {
  hashPassword,
  verifyPassword,
  getFailedAttempts,
  isLockedOut,
  recordFailedAttempt,
  resetAttempts,
  getLockoutTimeRemaining,
} from "./auth";

vi.mock("./prisma", () => ({
  prisma: {
    rateLimitBucket: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((cb: any) => cb(prisma)),
  },
}));

describe("auth utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("password hashing", () => {
    it("should hash a password and verify it correctly", async () => {
      const password = "my-secure-password";
      const hash = await hashPassword(password);
      expect(hash).not.toBe(password);
      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword("wrong-password", hash)).toBe(false);
    });
  });

  describe("brute force protection", () => {
    it("should start with 0 failed attempts and not locked out", async () => {
      vi.mocked(prisma.rateLimitBucket.findUnique).mockResolvedValue(null);
      expect(await getFailedAttempts("test@example.com")).toBe(0);
      expect(await isLockedOut("test@example.com")).toBe(false);
    });

    it("should report locked out if lockUntil is in the future", async () => {
      vi.mocked(prisma.rateLimitBucket.findUnique).mockResolvedValue({
        key: "login-email:test@example.com",
        count: 5,
        windowStart: new Date(),
        lockUntil: new Date(Date.now() + 600000), // 10 mins in future
      } as any);

      expect(await isLockedOut("test@example.com")).toBe(true);
      const remaining = await getLockoutTimeRemaining("test@example.com");
      expect(remaining).toBeGreaterThan(500);
      expect(remaining).toBeLessThanOrEqual(600);
    });

    it("should record failed attempt by updating database bucket", async () => {
      vi.mocked(prisma.rateLimitBucket.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.rateLimitBucket.upsert).mockResolvedValue({} as any);

      await recordFailedAttempt("test@example.com");

      expect(prisma.rateLimitBucket.upsert).toHaveBeenCalledWith({
        where: { key: "login-email:test@example.com" },
        create: expect.objectContaining({ count: 1 }),
        update: expect.objectContaining({ count: 1 }),
      });
    });

    it("should reset attempts by deleting bucket row", async () => {
      vi.mocked(prisma.rateLimitBucket.delete).mockResolvedValue({} as any);

      await resetAttempts("test@example.com");

      expect(prisma.rateLimitBucket.delete).toHaveBeenCalledWith({
        where: { key: "login-email:test@example.com" },
      });
    });
  });
});
