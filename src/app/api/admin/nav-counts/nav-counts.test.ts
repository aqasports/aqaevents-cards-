/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getNavCounts } from "./route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      findMany: vi.fn(),
    },
    cardDemand: {
      count: vi.fn(),
    },
    activityProposal: {
      count: vi.fn(),
    },
    checkIn: {
      count: vi.fn(),
    },
    swimLead: {
      count: vi.fn(),
    },
  },
}));

describe("GET /api/admin/nav-counts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "super_admin" } } as any,
      error: null,
    });
  });

  it("returns 401 when admin session is missing", async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost:3000/api/admin/nav-counts");
    const res = await getNavCounts(req);
    expect(res.status).toBe(401);
  });

  it("returns consolidated counts for all 5 navigation badges in a single call", async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      { notes: JSON.stringify({ type: "package" }) },
      { notes: JSON.stringify({ type: "custom" }) },
      { notes: JSON.stringify({ type: "other" }) },
      { notes: "invalid-json" },
    ] as any);
    vi.mocked(prisma.cardDemand.count).mockResolvedValue(4);
    vi.mocked(prisma.activityProposal.count).mockResolvedValue(2);
    vi.mocked(prisma.checkIn.count).mockResolvedValue(7);
    vi.mocked(prisma.swimLead.count).mockResolvedValue(5);

    const since = "2026-09-27T00:00:00.000Z";
    const req = new NextRequest(
      `http://localhost:3000/api/admin/nav-counts?since=${encodeURIComponent(since)}`
    );
    const res = await getNavCounts(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      invoices: 2,
      demands: 4,
      proposals: 2,
      checkIns: 7,
      swim: 5,
    });
    expect(prisma.checkIn.count).toHaveBeenCalledWith({
      where: {
        status: "SUCCESS",
        scannedAt: {
          gt: new Date(since),
        },
      },
    });
  });

  it("skips checkIn query and returns 0 when since parameter is omitted or invalid", async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.cardDemand.count).mockResolvedValue(0);
    vi.mocked(prisma.activityProposal.count).mockResolvedValue(0);
    vi.mocked(prisma.swimLead.count).mockResolvedValue(1);

    const req = new NextRequest(
      "http://localhost:3000/api/admin/nav-counts?since=not-a-date"
    );
    const res = await getNavCounts(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      invoices: 0,
      demands: 0,
      proposals: 0,
      checkIns: 0,
      swim: 1,
    });
    expect(prisma.checkIn.count).not.toHaveBeenCalled();
  });
});
