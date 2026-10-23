/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "./route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAdminAction: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    swimMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("AQA Swim Perks API Endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  it("returns 401 if not authenticated as admin", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const req = new NextRequest("http://localhost:3000/api/admin/swim/perks");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("filters to premium members and computes perk stats", async () => {
    const mockMembers = [
      {
        id: "mem-1",
        swimId: "SWM-001001",
        fullName: "Karim Benali",
        phone: "0555112233",
        duration: "3m", // Silver
        formula: "G10",
        notes: null,
        payments: [],
        group: { id: "grp-1", name: "Groupe A", coachName: "Samy", schedule: "Dim 18h" },
      },
      {
        id: "mem-2",
        swimId: "SWM-001002",
        fullName: "Yacine Cherif",
        phone: "0555445566",
        duration: "6m", // Gold
        formula: "MAX5",
        notes: null,
        payments: [],
        group: { id: "grp-2", name: "Groupe B", coachName: "Amine", schedule: "Mar 19h", active: true },
      },
      {
        id: "mem-3",
        swimId: "SWM-001003",
        fullName: "Starter Client",
        phone: "0555778899",
        duration: "1m", // Starter (should NOT appear in premium)
        formula: "G10",
        notes: null,
        payments: [],
        group: { id: "grp-3", name: "Groupe Starter", active: true },
      },
      {
        id: "mem-4",
        swimId: "SWM-001004",
        fullName: "Unassigned Client",
        phone: "0555000000",
        duration: "3m", // Has 3m duration but unassigned to any group -> NEVER give formula/tier
        formula: "Silver",
        notes: null,
        payments: [],
        group: null,
      },
    ];

    vi.mocked(prisma.swimMember.findMany).mockResolvedValue(mockMembers as any);

    const req = new NextRequest("http://localhost:3000/api/admin/swim/perks");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.members.length).toBe(2); // Only assigned Silver & Gold (unassigned mem-4 is excluded)
    expect(json.stats.totalSubscribers).toBe(2);
    expect(json.stats.silverCount).toBe(1);
    expect(json.stats.goldCount).toBe(1);
    expect(json.stats.diamondCount).toBe(0);

    // Silver has 1 perk, Gold has 3 perks -> total 4 perks
    expect(json.stats.totalPerks).toBe(4);
    expect(json.stats.deliveredPerks).toBe(0);
    expect(json.stats.pendingPerks).toBe(4);
  });

  it("updates perk delivery status via PATCH", async () => {
    const mockMember = {
      id: "mem-1",
      swimId: "SWM-001001",
      fullName: "Karim Benali",
      phone: "0555112233",
      duration: "3m",
      formula: "G10",
      notes: null,
      payments: [],
      group: { id: "grp-1", name: "Groupe A", active: true },
    };

    vi.mocked(prisma.swimMember.findUnique).mockResolvedValue(mockMember as any);
    vi.mocked(prisma.swimMember.update).mockResolvedValue({
      ...mockMember,
      notes: "[PERKS:updated]",
    } as any);

    const req = new NextRequest("http://localhost:3000/api/admin/swim/perks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: "mem-1",
        perkId: "video_analysis",
        status: "delivered",
        deliveredBy: "Coach Samy",
        notes: "Video transmise",
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.progress.delivered).toBe(1);
    expect(json.progress.percent).toBe(100);
    expect(json.perks[0].status).toBe("delivered");
    expect(json.perks[0].deliveredBy).toBe("Coach Samy");
  });
});
