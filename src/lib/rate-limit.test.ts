/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkAndIncrement } from "./rate-limit";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    rateLimitBucket: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((cb: any) => cb(prisma)),
  },
}));

describe("checkAndIncrement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new bucket on first hit and return limited: false", async () => {
    vi.mocked(prisma.rateLimitBucket.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.rateLimitBucket.create).mockResolvedValue({} as any);

    const result = await checkAndIncrement("test-key-1", { windowMs: 60000, max: 5 });

    expect(result.limited).toBe(false);
    expect(prisma.rateLimitBucket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: "test-key-1",
        count: 1,
      }),
    });
  });

  it("should return limited: true if bucket is locked until future", async () => {
    const lockUntil = new Date(Date.now() + 30000);
    vi.mocked(prisma.rateLimitBucket.findUnique).mockResolvedValue({
      key: "test-key-2",
      count: 10,
      windowStart: new Date(),
      lockUntil,
    } as any);

    const result = await checkAndIncrement("test-key-2", { windowMs: 60000, max: 5 });

    expect(result.limited).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("should return limited: true when count exceeds max threshold", async () => {
    vi.mocked(prisma.rateLimitBucket.findUnique).mockResolvedValue({
      key: "test-key-3",
      count: 5, // at max
      windowStart: new Date(),
      lockUntil: null,
    } as any);

    vi.mocked(prisma.rateLimitBucket.update).mockResolvedValue({} as any);

    const result = await checkAndIncrement("test-key-3", { windowMs: 60000, max: 5, lockoutMs: 900000 });

    expect(result.limited).toBe(true);
    expect(result.retryAfterSeconds).toBe(900); // 15 mins
    expect(prisma.rateLimitBucket.update).toHaveBeenCalledWith({
      where: { key: "test-key-3" },
      data: expect.objectContaining({
        count: 6,
        lockUntil: expect.any(Date),
      }),
    });
  });
});
