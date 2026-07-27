/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireSuperAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: {
      count: vi.fn(),
    },
    ledgerEntry: {
      aggregate: vi.fn(),
    },
    redemption: {
      count: vi.fn(),
    },
    invoice: {
      aggregate: vi.fn(),
    },
  },
}));

describe("AI Tool Query API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(requireSuperAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "super_admin" } } as any,
      error: null,
    });
  });

  it("should execute registered tool and return result", async () => {
    vi.mocked(prisma.client.count).mockResolvedValue(100);
    vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({ _sum: { amount: 1500 } } as any);
    vi.mocked(prisma.redemption.count).mockResolvedValue(400);
    vi.mocked(prisma.invoice.aggregate).mockResolvedValue({ _sum: { amount: 2000000 } } as any);

    const req = new NextRequest("http://localhost:3000/api/admin/ai/query", {
      method: "POST",
      body: JSON.stringify({
        toolName: "getBusinessOverviewMetrics",
        args: {},
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.activeClientsCount).toBe(100);
  });

  it("should return 400 for unknown toolName", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/ai/query", {
      method: "POST",
      body: JSON.stringify({
        toolName: "deleteDatabase",
        args: {},
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("Unknown toolName");
  });
});
