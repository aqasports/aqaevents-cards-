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
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    client: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    card: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    ledgerEntry: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Organization Bulk Provisioning POST API", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  it("should return 404 if Organization does not exist", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/admin/organizations/org-1/provision", {
      method: "POST",
      body: JSON.stringify({
        employees: [{ fullName: "Employee One", initialCredits: 10 }],
      }),
    });

    const res = await POST(request, { params: Promise.resolve({ id: "org-1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 400 if shared pool balance is insufficient", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: "org-1",
      name: "Acme Corp",
      sharedCreditPool: 15, // Only 15 available
    } as any);

    const request = new NextRequest("http://localhost:3000/api/admin/organizations/org-1/provision", {
      method: "POST",
      body: JSON.stringify({
        grantInitialCreditsFromPool: true,
        employees: [
          { fullName: "Employee One", initialCredits: 10 },
          { fullName: "Employee Two", initialCredits: 10 }, // Total 20 requested
        ],
      }),
    });

    const res = await POST(request, { params: Promise.resolve({ id: "org-1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Insufficient organization shared credit pool");
  });

  it("should successfully provision employees, generate cards, and grant credits from pool", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: "org-1",
      name: "Acme Corp",
      sharedCreditPool: 100,
    } as any);

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const mockTx = {
        organization: {
          update: vi.fn().mockResolvedValue({ id: "org-1" }),
        },
        client: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(({ data }) =>
            Promise.resolve({ id: `client-${data.fullName}`, ...data })
          ),
          update: vi.fn(),
        },
        card: {
          findFirst: vi.fn().mockResolvedValue(null),
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(({ data }) =>
            Promise.resolve({ id: `card-${data.clientId}`, ...data })
          ),
        },
        ledgerEntry: {
          create: vi.fn().mockResolvedValue({ id: "ledger-1" }),
        },
      };
      return await callback(mockTx as any);
    });

    const request = new NextRequest("http://localhost:3000/api/admin/organizations/org-1/provision", {
      method: "POST",
      body: JSON.stringify({
        grantInitialCreditsFromPool: true,
        employees: [
          { fullName: "Alice Smith", email: "alice@acme.com", initialCredits: 10 },
          { fullName: "Bob Jones", email: "bob@acme.com", initialCredits: 15 },
        ],
      }),
    });

    const res = await POST(request, { params: Promise.resolve({ id: "org-1" }) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      createdCount: 2,
      updatedCount: 0,
      totalCreditsGranted: 25,
      cardsGenerated: 2,
    });
  });
});
