/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      findMany: vi.fn(),
    },
  },
}));

describe("Invoices Export API", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  it("should return JSON array of invoices by default", async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      { id: "inv-1", invoiceCode: "INV-101", amount: 19000, status: "paid" },
    ] as any);

    const req = new NextRequest("http://localhost:3000/api/admin/invoices/export");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].invoiceCode).toBe("INV-101");
  });

  it("should return formatted CSV file when format=csv", async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      {
        id: "inv-1",
        invoiceCode: "INV-101",
        amount: 19000,
        status: "paid",
        category: "package",
        paidAt: new Date("2026-06-01T10:00:00Z"),
        createdAt: new Date("2026-06-01T09:00:00Z"),
        client: { fullName: "John Doe" },
        organization: null,
      },
    ] as any);

    const req = new NextRequest("http://localhost:3000/api/admin/invoices/export?format=csv");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("InvoiceCode,ClientOrOrg,Category,AmountDA,Status,PaidAt,CreatedAt");
    expect(text).toContain('INV-101,"John Doe","package",19000,paid,2026-06-01T10:00:00.000Z,2026-06-01T09:00:00.000Z');
  });
});
