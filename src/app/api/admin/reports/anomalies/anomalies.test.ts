/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ledgerEntry: {
      aggregate: vi.fn(),
    },
    invoice: {
      aggregate: vi.fn(),
    },
    client: {
      count: vi.fn(),
    },
    checkIn: {
      count: vi.fn(),
    },
  },
}));

describe("Business Anomalies API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  it("should return list of detected anomalies", async () => {
    vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({ _sum: { delta: 80000 } } as any);
    vi.mocked(prisma.invoice.aggregate).mockResolvedValue({ _sum: { amount: 0 } } as any);
    vi.mocked(prisma.client.count).mockResolvedValue(5);
    vi.mocked(prisma.checkIn.count).mockResolvedValue(10);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.anomalies[0].type).toBe("HIGH_MANUAL_CREDIT");
  });
});
