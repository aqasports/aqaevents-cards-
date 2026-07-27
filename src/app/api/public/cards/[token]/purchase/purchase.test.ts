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
    client: {
      findUnique: vi.fn(),
    },
    publicPurchaseRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    notificationLog: {
      create: vi.fn(),
    },
  },
}));

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

  it("should return confirmation_required when requesting package purchase", async () => {
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

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: "client-1",
      fullName: "Test Client",
      phone: "+213555123456",
    } as any);

    vi.mocked(prisma.publicPurchaseRequest.create).mockResolvedValue({
      id: "req-1",
      cardId: "card-1",
      clientId: "client-1",
      type: "package",
      status: "pending_confirmation",
      confirmationCode: "123456",
      expiresAt: new Date(Date.now() + 600000),
      createdAt: new Date(),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/public/cards/token-123/purchase", {
      method: "POST",
      body: JSON.stringify({ type: "package", packageId: "pkg-1" }),
    });

    const res = await POST(request, { params: Promise.resolve({ token: "token-123" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("confirmation_required");
    expect(body.requestId).toBe("req-1");
  });

  it("should return confirmation_required when purchasing product", async () => {
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

    vi.mocked(prisma.client.findUnique).mockResolvedValue({
      id: "client-1",
      fullName: "Test Client",
      email: "test@example.com",
    } as any);

    vi.mocked(prisma.publicPurchaseRequest.create).mockResolvedValue({
      id: "req-2",
      cardId: "card-1",
      clientId: "client-1",
      type: "product",
      status: "pending_confirmation",
      confirmationCode: "654321",
      expiresAt: new Date(Date.now() + 600000),
      createdAt: new Date(),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/public/cards/token-123/purchase", {
      method: "POST",
      body: JSON.stringify({ type: "product", productId: "prod-1" }),
    });

    const res = await POST(request, { params: Promise.resolve({ token: "token-123" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("confirmation_required");
    expect(body.requestId).toBe("req-2");
  });
});
