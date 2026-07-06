/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activity: {
      findUnique: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    activitySession: {
      count: vi.fn().mockResolvedValue(1),
      findFirst: vi.fn().mockResolvedValue({ id: "session-1", sessionDate: new Date(), location: null }),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/balance", () => ({
  getClientBalance: vi.fn().mockResolvedValue(10),
}));

import "@/modules/subscribers";

describe("Redemptions POST API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock behavior
    vi.mocked(prisma.activitySession.count).mockResolvedValue(1);
    vi.mocked(prisma.activitySession.findFirst).mockResolvedValue({ id: "session-1", sessionDate: new Date(), location: null } as any);
  });

  it("should return 401 if unauthorized", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      session: null,
      error: { status: 401 } as any,
    });

    const request = new NextRequest("http://localhost:3000/api/admin/redemptions", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(request);
    expect(res.status).toBe(401);
  });

  it("should return 404 if activity is not found", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1" } } as any,
      error: null,
    });

    vi.mocked(prisma.activity.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/admin/redemptions", {
      method: "POST",
      body: JSON.stringify({
        clientId: "client-1",
        activityId: "activity-nonexistent",
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(404);
  });

  it("should return 400 if client has insufficient balance", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1" } } as any,
      error: null,
    });

    vi.mocked(prisma.activity.findUnique).mockResolvedValue({
      id: "act-1",
      active: true,
      creditCost: 3,
      name: "Rock Climbing",
    } as any);

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: "client-1",
      fullName: "John Doe",
      cards: [{ id: "card-1" }],
    } as any);

    // Mock transaction to simulate balance check throwing INSUFFICIENT_BALANCE
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const mockTx = {
        ledgerEntry: {
          aggregate: vi.fn().mockResolvedValue({
            _sum: { delta: 2 }, // Only 2 credits, but cost is 3
          }),
        },
      };
      return await callback(mockTx as any);
    });

    const request = new NextRequest("http://localhost:3000/api/admin/redemptions", {
      method: "POST",
      body: JSON.stringify({
        clientId: "client-1",
        activityId: "act-1",
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Insufficient balance");
  });

  it("should successfully redeem activity if balance is sufficient", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1" } } as any,
      error: null,
    });

    vi.mocked(prisma.activity.findUnique).mockResolvedValue({
      id: "act-1",
      active: true,
      creditCost: 1,
      name: "Kayaking",
    } as any);

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: "client-1",
      fullName: "John Doe",
      cards: [{ id: "card-1" }],
    } as any);

    const mockRedemption = { id: "redempt-1", clientId: "client-1", activityId: "act-1" };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const mockTx = {
        ledgerEntry: {
          aggregate: vi.fn().mockResolvedValue({
            _sum: { delta: 5 }, // 5 credits
          }),
          create: vi.fn(),
        },
        redemption: {
          create: vi.fn().mockResolvedValue(mockRedemption),
        },
      };
      return await callback(mockTx as any);
    });

    const request = new NextRequest("http://localhost:3000/api/admin/redemptions", {
      method: "POST",
      body: JSON.stringify({
        clientId: "client-1",
        activityId: "act-1",
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.redemption).toEqual(mockRedemption);
  });

  it("should successfully redeem activity for a kid (0.7 credits)", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1" } } as any,
      error: null,
    });

    vi.mocked(prisma.activity.findUnique).mockResolvedValue({
      id: "act-1",
      active: true,
      creditCost: 1,
      name: "Kayaking",
    } as any);

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: "client-1",
      fullName: "John Doe",
      cards: [{ id: "card-1" }],
    } as any);

    const mockRedemption = { id: "redempt-1", clientId: "client-1", activityId: "act-1", creditsUsed: 0.7 };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const mockTx = {
        ledgerEntry: {
          aggregate: vi.fn().mockResolvedValue({
            _sum: { delta: 5 }, // 5 credits
          }),
          create: vi.fn(),
        },
        redemption: {
          create: vi.fn().mockResolvedValue(mockRedemption),
        },
      };
      return await callback(mockTx as any);
    });

    const request = new NextRequest("http://localhost:3000/api/admin/redemptions", {
      method: "POST",
      body: JSON.stringify({
        clientId: "client-1",
        activityId: "act-1",
        creditsUsed: 0.7,
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.redemption).toEqual(mockRedemption);
  });
});
