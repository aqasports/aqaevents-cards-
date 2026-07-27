/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getPdf } from "./route";
import { POST as emailPdf } from "../email/route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notifications", () => ({
  sendSimulatedNotification: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Invoice PDF & Email Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  describe("GET /api/admin/invoices/[id]/pdf", () => {
    it("should return application/pdf buffer for invoice", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
        id: "inv-1",
        invoiceCode: "INV-999",
        amount: 38000,
        status: "paid",
        category: "custom",
        items: [],
        client: { fullName: "Alice" },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/invoices/inv-1/pdf");
      const res = await getPdf(req, { params: Promise.resolve({ id: "inv-1" }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toContain('filename="invoice-INV-999.pdf"');
    });
  });

  describe("POST /api/admin/invoices/[id]/email", () => {
    it("should send email with invoice details and attachment info to client", async () => {
      vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
        id: "inv-1",
        invoiceCode: "INV-999",
        amount: 38000,
        status: "paid",
        category: "custom",
        items: [],
        client: { fullName: "Alice", email: "alice@aqa.dz" },
        organization: null,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/invoices/inv-1/email", {
        method: "POST",
      });

      const res = await emailPdf(req, { params: Promise.resolve({ id: "inv-1" }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.invoiceCode).toBe("INV-999");
    });
  });
});
