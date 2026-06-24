/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    card: {
      findUnique: vi.fn(),
    },
    package: {
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/domains/billing/billing.service", () => {
  class MockBillingService {
    rechargeCredits = vi.fn().mockResolvedValue({
      invoice: { id: "inv-1", amount: 1900 },
      balance: 10,
    });
    createInvoiceWithCredits = vi.fn().mockImplementation(async (data) => {
      if (data.category === "package" || data.category === "custom") {
        return {
          invoice: { id: "inv-1", amount: data.amount },
          balance: 10,
        };
      }
      return {
        invoice: { id: "inv-2", amount: data.amount },
        balance: 10,
      };
    });
  }
  return {
    BillingService: MockBillingService,
  };
});

import { POST } from "./route";

describe("Public Purchase POST API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if card is not found or inactive", async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/public/cards/token-123/purchase", {
      method: "POST",
      body: JSON.stringify({ type: "package", packageId: "pkg-1" }),
    });

    const res = await POST(request, { params: Promise.resolve({ token: "token-123" }) });
    expect(res.status).toBe(404);
  });

  it("should successfully purchase a package on credit", async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: "card-1",
      clientId: "client-1",
      status: "active",
    } as any);

    vi.mocked(prisma.package.findUnique).mockResolvedValue({
      id: "pkg-1",
      active: true,
      price: 1900,
      name: "Solo",
      creditAmount: 1,
      bonusCredits: 0,
      totalCredits: 1,
    } as any);

    const request = new NextRequest("http://localhost:3000/api/public/cards/token-123/purchase", {
      method: "POST",
      body: JSON.stringify({ type: "package", packageId: "pkg-1" }),
    });

    const res = await POST(request, { params: Promise.resolve({ token: "token-123" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.invoice.id).toBe("inv-1");
  });

  it("should successfully purchase a product on credit", async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: "card-1",
      clientId: "client-1",
      status: "active",
    } as any);

    vi.mocked(prisma.product.findUnique).mockResolvedValue({
      id: "prod-1",
      name: "Pro Swimming Goggles",
      price: 3500,
      active: true,
    } as any);

    const request = new NextRequest("http://localhost:3000/api/public/cards/token-123/purchase", {
      method: "POST",
      body: JSON.stringify({ type: "product", productId: "prod-1" }),
    });

    const res = await POST(request, { params: Promise.resolve({ token: "token-123" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.invoice.id).toBe("inv-2");
  });

  it("should successfully demand custom credit", async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: "card-1",
      clientId: "client-1",
      status: "active",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/public/cards/token-123/purchase", {
      method: "POST",
      body: JSON.stringify({ type: "custom", customCredits: 5 }),
    });

    const res = await POST(request, { params: Promise.resolve({ token: "token-123" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.invoice.id).toBe("inv-1");
  });
});
