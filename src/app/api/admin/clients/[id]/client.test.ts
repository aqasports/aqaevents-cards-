import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "./route";
import { requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
  requireSuperAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ledgerEntry: {
      count: vi.fn(),
    },
    redemption: {
      deleteMany: vi.fn(),
    },
    card: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    client: {
      delete: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Clients DELETE API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.client.update).mockResolvedValue({ id: "client-1" } as any);
    vi.mocked(prisma.card.updateMany).mockResolvedValue({ count: 1 } as any);
  });

  it("should return 401/403 if unauthorized or not super_admin", async () => {
    vi.mocked(requireSuperAdminSession).mockResolvedValue({
      session: null,
      error: { status: 403 } as any,
    });

    const request = new NextRequest("http://localhost:3000/api/admin/clients/client-1", {
      method: "DELETE",
    });

    const res = await DELETE(request, { params: Promise.resolve({ id: "client-1" }) });
    expect(res.status).toBe(403);
  });

  it("should delete client even if financial ledger history exists", async () => {
    vi.mocked(requireSuperAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "super_admin" } } as any,
      error: null,
    });

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: "client-1",
      fullName: "John Doe",
    } as any);

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const mockTx = {
        ledgerEntry: {
          count: vi.fn().mockResolvedValue(3), // 3 transactions
        },
        redemption: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        card: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        client: {
          delete: vi.fn().mockResolvedValue({ id: "client-1" }),
        },
      };
      return await callback(mockTx as any);
    });

    const request = new NextRequest("http://localhost:3000/api/admin/clients/client-1", {
      method: "DELETE",
    });

    const res = await DELETE(request, { params: Promise.resolve({ id: "client-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("should successfully delete client and linked records", async () => {
    vi.mocked(requireSuperAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "super_admin" } } as any,
      error: null,
    });

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: "client-1",
      fullName: "John Doe",
    } as any);

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const mockTx = {
        redemption: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        card: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        client: {
          delete: vi.fn().mockResolvedValue({ id: "client-1" }),
        },
      };
      return await callback(mockTx as any);
    });

    const request = new NextRequest("http://localhost:3000/api/admin/clients/client-1", {
      method: "DELETE",
    });

    const res = await DELETE(request, { params: Promise.resolve({ id: "client-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
