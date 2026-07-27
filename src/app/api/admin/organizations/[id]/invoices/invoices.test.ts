/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveCreditRateForClient } from "@/lib/organizations";
import { logAdminAction } from "@/lib/audit";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/organizations", () => ({
  getEffectiveCreditRateForClient: vi.fn().mockResolvedValue(2000),
}));

vi.mock("@/lib/audit", () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Organization Invoices API", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  describe("GET /api/admin/organizations/[id]/invoices", () => {
    it("should return list of invoices for the organization", async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        { id: "inv-1", invoiceCode: "INV-100", amount: 50000, organizationId: "org-1" },
      ] as any);

      const request = new NextRequest("http://localhost:3000/api/admin/organizations/org-1/invoices");
      const res = await GET(request, { params: Promise.resolve({ id: "org-1" }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].invoiceCode).toBe("INV-100");
    });
  });

  describe("POST /api/admin/organizations/[id]/invoices", () => {
    it("should return 404 if Organization is not found", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/admin/organizations/org-1/invoices", {
        method: "POST",
        body: JSON.stringify({ totalCreditsPurchased: 50 }),
      });

      const res = await POST(request, { params: Promise.resolve({ id: "org-1" }) });
      expect(res.status).toBe(404);
    });

    it("should return 400 if Organization has no member clients", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Acme Corp",
        clients: [],
      } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/organizations/org-1/invoices", {
        method: "POST",
        body: JSON.stringify({ totalCreditsPurchased: 50 }),
      });

      const res = await POST(request, { params: Promise.resolve({ id: "org-1" }) });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("no member clients");
    });

    it("should return 400 if neither customAmount nor totalCreditsPurchased is provided", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Acme Corp",
        clients: [{ id: "client-1" }],
      } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/organizations/org-1/invoices", {
        method: "POST",
        body: JSON.stringify({ items: "Test invoice" }),
      });

      const res = await POST(request, { params: Promise.resolve({ id: "org-1" }) });
      expect(res.status).toBe(400);
    });

    it("should create consolidated invoice, update shared credit pool, and log audit action", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: "org-1",
        name: "Acme Corp",
        clients: [{ id: "client-1" }],
      } as any);

      vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null);
      vi.mocked(getEffectiveCreditRateForClient).mockResolvedValue(2000);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const mockTx = {
          invoice: {
            create: vi.fn().mockImplementation(({ data }) =>
              Promise.resolve({ id: "inv-999", ...data })
            ),
          },
          organization: {
            update: vi.fn().mockResolvedValue({ id: "org-1" }),
          },
        };
        return await callback(mockTx as any);
      });

      const request = new NextRequest("http://localhost:3000/api/admin/organizations/org-1/invoices", {
        method: "POST",
        body: JSON.stringify({
          totalCreditsPurchased: 50, // 50 * 2000 = 100,000 DA
          items: "50 B2B Credits Package",
        }),
      });

      const res = await POST(request, { params: Promise.resolve({ id: "org-1" }) });
      expect(res.status).toBe(201);
      const body = await res.json();

      expect(body.amount).toBe(100000);
      expect(body.organizationId).toBe("org-1");
      expect(logAdminAction).toHaveBeenCalledWith(
        "admin-1",
        "CREATE_ORG_INVOICE",
        expect.stringContaining("Org Acme Corp"),
        expect.stringContaining("100000 DA"),
        expect.any(String)
      );
    });
  });
});
