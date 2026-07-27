/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    card: {
      findUnique: vi.fn(),
    },
    publicPurchaseRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/modules/invoices/service", () => {
  class MockBillingService {
    createInvoiceWithCredits = vi.fn().mockResolvedValue({
      invoice: { id: "inv-100", amount: 1900 },
      balance: 10,
    });
  }
  return {
    BillingService: MockBillingService,
  };
});

import { POST } from "../confirm/route";

describe("Public Purchase Confirm POST API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully confirm a purchase request with correct code", async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: "card-1",
      clientId: "client-1",
      status: "active",
    } as any);

    vi.mocked(prisma.publicPurchaseRequest.findUnique).mockResolvedValue({
      id: "req-1",
      cardId: "card-1",
      clientId: "client-1",
      type: "package",
      payload: JSON.stringify({
        clientId: "client-1",
        amount: 1900,
        category: "package",
        items: "Solo Package",
        status: "unpaid",
      }),
      status: "pending_confirmation",
      confirmationCode: "123456",
      expiresAt: new Date(Date.now() + 600000),
      createdAt: new Date(),
    } as any);

    vi.mocked(prisma.publicPurchaseRequest.update).mockResolvedValue({} as any);

    const request = new NextRequest("http://localhost:3000/api/public/cards/token-123/purchase/confirm", {
      method: "POST",
      body: JSON.stringify({ requestId: "req-1", confirmationCode: "123456" }),
    });

    const res = await POST(request, { params: Promise.resolve({ token: "token-123" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.invoice.id).toBe("inv-100");
  });

  it("should fail when confirmation code is wrong", async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: "card-1",
      clientId: "client-1",
      status: "active",
    } as any);

    vi.mocked(prisma.publicPurchaseRequest.findUnique).mockResolvedValue({
      id: "req-1",
      cardId: "card-1",
      clientId: "client-1",
      type: "package",
      payload: JSON.stringify({}),
      status: "pending_confirmation",
      confirmationCode: "123456",
      expiresAt: new Date(Date.now() + 600000),
      createdAt: new Date(),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/public/cards/token-123/purchase/confirm", {
      method: "POST",
      body: JSON.stringify({ requestId: "req-1", confirmationCode: "999999" }),
    });

    const res = await POST(request, { params: Promise.resolve({ token: "token-123" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid confirmation code");
  });

  it("should fail when confirmation code is expired", async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: "card-1",
      clientId: "client-1",
      status: "active",
    } as any);

    vi.mocked(prisma.publicPurchaseRequest.findUnique).mockResolvedValue({
      id: "req-1",
      cardId: "card-1",
      clientId: "client-1",
      type: "package",
      payload: JSON.stringify({}),
      status: "pending_confirmation",
      confirmationCode: "123456",
      expiresAt: new Date(Date.now() - 1000), // expired 1 sec ago
      createdAt: new Date(Date.now() - 700000),
    } as any);

    vi.mocked(prisma.publicPurchaseRequest.update).mockResolvedValue({} as any);

    const request = new NextRequest("http://localhost:3000/api/public/cards/token-123/purchase/confirm", {
      method: "POST",
      body: JSON.stringify({ requestId: "req-1", confirmationCode: "123456" }),
    });

    const res = await POST(request, { params: Promise.resolve({ token: "token-123" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Confirmation code has expired");
  });

  it("should fail when request is already confirmed", async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: "card-1",
      clientId: "client-1",
      status: "active",
    } as any);

    vi.mocked(prisma.publicPurchaseRequest.findUnique).mockResolvedValue({
      id: "req-1",
      cardId: "card-1",
      clientId: "client-1",
      type: "package",
      payload: JSON.stringify({}),
      status: "confirmed",
      confirmationCode: "123456",
      expiresAt: new Date(Date.now() + 600000),
      createdAt: new Date(),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/public/cards/token-123/purchase/confirm", {
      method: "POST",
      body: JSON.stringify({ requestId: "req-1", confirmationCode: "123456" }),
    });

    const res = await POST(request, { params: Promise.resolve({ token: "token-123" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Purchase request has already been confirmed");
  });
});
