/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
  requireSuperAdminSession: vi.fn(),
  requireOrgSession: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/balance", () => ({
  getClientBalance: vi.fn().mockResolvedValue(10),
}));

vi.mock("@/lib/prisma", () => ({
  isSqlite: true,
  prisma: {
    $transaction: vi.fn(),
    swimMember: { findUnique: vi.fn(), update: vi.fn() },
    swimPayment: { create: vi.fn() },
    organization: { updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    client: { findFirst: vi.fn(), findUnique: vi.fn() },
    ledgerEntry: { create: vi.fn(), aggregate: vi.fn() },
    redemption: { findMany: vi.fn() },
    activity: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { POST as postSwimPayment } from "@/app/api/admin/swim/payments/route";
import { POST as postPortalCredits } from "@/app/api/portal/credits/route";
import { POST as postBulkRefundSession } from "@/app/api/admin/sessions/[id]/refund-all/route";
import { POST as postInvoice } from "@/app/api/admin/invoices/route";
import { POST as postRedemption } from "@/app/api/admin/redemptions/route";
import {
  requireAdminSession,
  requireSuperAdminSession,
  requireOrgSession,
} from "@/lib/api-auth";
import { logAdminAction } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

describe("Wave 2A Financial Hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects swim use_side_pocket overdraft instead of clamping balance to 0", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "staff" } } as any,
      error: null,
    });

    const updateMember = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
      cb({
        swimMember: {
          findUnique: vi.fn().mockResolvedValue({
            id: "member-1",
            swimId: "SWM-001",
            fullName: "Nabil",
            formula: "G10",
            duration: "1m",
            priceDA: 6000,
            paymentStatus: "unpaid",
            dateOfStart: new Date("2026-10-01T00:00:00Z"),
            notes: "[SIDE_POCKET:1000]",
            payments: [],
          }),
          update: updateMember,
        },
        swimPayment: { create: vi.fn() },
      })
    );

    const req = new NextRequest("http://localhost:3000/api/admin/swim/payments", {
      method: "POST",
      body: JSON.stringify({
        memberId: "member-1",
        amount: 2500,
        action: "use_side_pocket",
        sidePocketAmount: 2500,
      }),
    });

    const res = await postSwimPayment(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Insufficient side pocket balance");
    expect(updateMember).not.toHaveBeenCalled();
  });

  it("rejects zero settle swim payment amounts", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "staff" } } as any,
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/admin/swim/payments", {
      method: "POST",
      body: JSON.stringify({
        memberId: "member-1",
        amount: 0,
        action: "settle",
      }),
    });

    const res = await postSwimPayment(req);
    expect(res.status).toBe(400);
  });

  it("enforces atomic pool decrement and records null AuditLog.userId on portal/credits", async () => {
    vi.mocked(requireOrgSession).mockResolvedValue({
      session: { user: { id: "org-user-1" } } as any,
      organizationId: "org-1",
      role: "OWNER",
      user: { id: "org-user-1", organizationId: "org-1", active: true, role: "OWNER" },
      error: null,
    });

    vi.mocked(prisma.client.findFirst).mockResolvedValue({
      id: "emp-1",
      fullName: "Emp One",
      organizationId: "org-1",
      cards: [{ id: "card-1" }],
    } as any);

    // 1. Overdraft blocked by conditional updateMany count: 0
    const ledgerCreate = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
      cb({
        organization: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
        ledgerEntry: { create: ledgerCreate },
      })
    );

    const failReq = new NextRequest("http://localhost:3000/api/portal/credits", {
      method: "POST",
      body: JSON.stringify({
        action: "allocate_individual",
        clientId: "emp-1",
        creditAmount: 25,
      }),
    });

    const failRes = await postPortalCredits(failReq);
    expect(failRes.status).toBe(400);
    expect(ledgerCreate).not.toHaveBeenCalled();

    // 2. Success passes null userId to logAdminAction to avoid FK violation
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (cb: any) =>
      cb({
        organization: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        ledgerEntry: { create: vi.fn().mockResolvedValue({ id: "leg-1", delta: 5 }) },
      })
    );

    const okReq = new NextRequest("http://localhost:3000/api/portal/credits", {
      method: "POST",
      body: JSON.stringify({
        action: "allocate_individual",
        clientId: "emp-1",
        creditAmount: 5,
      }),
    });

    const okRes = await postPortalCredits(okReq);
    expect(okRes.status).toBe(200);
    expect(logAdminAction).toHaveBeenCalledWith(
      null,
      "ALLOCATE_POOL_CREDITS",
      "Emp One",
      expect.stringContaining("orgUserId: org-user-1")
    );
  });

  it("rejects staff users from bulk-refunding an entire session", async () => {
    vi.mocked(requireSuperAdminSession).mockResolvedValue({
      session: null,
      error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) as any,
    });

    const req = new NextRequest("http://localhost:3000/api/admin/sessions/sess-1/refund-all", {
      method: "POST",
    });

    const res = await postBulkRefundSession(req, { params: Promise.resolve({ id: "sess-1" }) });
    expect(res.status).toBe(403);
  });

  it("rejects staff users creating invoices with creditDelta magnitude above 50", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "staff-1", role: "staff" } } as any,
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/admin/invoices", {
      method: "POST",
      body: JSON.stringify({
        clientId: "client-1",
        amount: 50000,
        category: "custom",
        items: "Large Recharge",
        creditDelta: 100,
      }),
    });

    const res = await postInvoice(req);
    expect(res.status).toBe(403);
  });

  it("rejects negative creditsUsed on POST /api/admin/redemptions", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "super_admin" } } as any,
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/api/admin/redemptions", {
      method: "POST",
      body: JSON.stringify({
        clientId: "client-1",
        activityId: "act-1",
        creditsUsed: -5,
      }),
    });

    const res = await postRedemption(req);
    expect(res.status).toBe(400);
  });
});
