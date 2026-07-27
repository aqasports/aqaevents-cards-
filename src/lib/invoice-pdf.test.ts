/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateInvoicePdfBuffer } from "./invoice-pdf";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    invoice: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Invoice PDF Generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate clean PDF/HTML buffer containing invoice code, client info, and item rows", async () => {
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      id: "inv-1",
      invoiceCode: "INV-2026-001",
      amount: 19000,
      status: "paid",
      category: "package",
      items: JSON.stringify([{ description: "10 Credits Package", quantity: 1, amount: 19000 }]),
      createdAt: new Date("2026-06-01"),
      paidAt: new Date("2026-06-01"),
      client: { fullName: "Jane Doe", email: "jane@aqa.dz", phone: "+213555123" },
      organization: null,
    } as any);

    const buffer = await generateInvoicePdfBuffer("inv-1");

    expect(buffer).toBeInstanceOf(Buffer);
    const htmlString = buffer.toString("utf-8");

    expect(htmlString).toContain("INV-2026-001");
    expect(htmlString).toContain("Jane Doe");
    expect(htmlString).toContain("10 Credits Package");
    expect(htmlString).toContain("19 000 DA");
  });
});
