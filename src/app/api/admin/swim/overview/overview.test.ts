/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getOverview } from "./route";
import { GET as getCards } from "../cards/route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    swimMember: {
      findMany: vi.fn(),
    },
    swimLead: {
      findMany: vi.fn(),
    },
    swimGroup: {
      findMany: vi.fn(),
    },
    swimCard: {
      findMany: vi.fn(),
    },
  },
}));

describe("AQA Swim Overview Batched API Endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  it("should return unauthorized error if admin session is invalid", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const req = new NextRequest("http://localhost:3000/api/admin/swim/overview");
    const res = await getOverview(req);
    expect(res.status).toBe(401);
  });

  it("should return consolidated members, leads, groups, and cards in one single batched call", async () => {
    // 1. Mock members
    (vi.mocked(prisma.swimMember.findMany) as any).mockImplementation(async (args?: any) => {
      // If querying secondary multi-group members
      if (args?.where?.notes?.contains === "[GROUPS:") {
        return [
          {
            id: "m-multi",
            groupId: "g-1",
            notes: "[GROUPS: g-1, g-2]",
          },
        ] as any;
      }

      // Default members query
      return [
        {
          id: "m-1",
          swimId: "SWM-000001",
          fullName: "Karim Benchikh",
          phone: "0550112233",
          groupId: "g-1",
          group: {
            id: "g-1",
            name: "Homme Mardi 19h",
            coachName: "Walid",
            schedule: "Mardi 19:00 - 20:00",
            category: "homme",
            active: true,
          },
          card: {
            id: "c-1",
            cardCode: "SWM-000001",
            publicToken: "tok-1",
            status: "active",
          },
          payments: [
            {
              id: "p-1",
              amount: 15000,
              method: "cash",
              notes: "Paid in full",
              paidAt: new Date("2026-09-01").toISOString(),
            },
          ],
        },
        {
          id: "m-2",
          swimId: "SWM-000002",
          fullName: "Inactive Group Member",
          phone: "0550998877",
          groupId: "g-inactive",
          group: {
            id: "g-inactive",
            name: "Old Group",
            coachName: "None",
            schedule: "Dimanche 10:00",
            category: "homme",
            active: false,
          },
          card: null,
          payments: [],
        },
      ] as any;
    });

    // 2. Mock leads
    vi.mocked(prisma.swimLead.findMany).mockResolvedValue([
      {
        id: "lead-1",
        fullName: "Yacine Larbi",
        phone: "0770112233",
        status: "pending",
        notes: "Demande Pack Natation Pro [EQUIPMENT: GOGGLES_PRO, CAP_SILICONE]",
        createdAt: new Date().toISOString(),
      },
    ] as any);

    // 3. Mock groups
    vi.mocked(prisma.swimGroup.findMany).mockResolvedValue([
      {
        id: "g-1",
        name: "Homme Mardi 19h",
        category: "homme",
        level: "G10",
        coachName: "Walid",
        schedule: "Mardi 19:00 - 20:00 Bassin Olympique",
        capacity: 10,
        active: true,
        notes: "[SOLID] Group reserved",
        _count: { swimmers: 8 },
      },
      {
        id: "g-2",
        name: "Homme Jeudi 20h",
        category: "homme",
        level: "G10",
        coachName: "Walid",
        schedule: "Jeudi 20:00 - 21:00 Azal",
        capacity: 10,
        active: true,
        notes: "",
        _count: { swimmers: 4 },
      },
    ] as any);

    // 4. Mock cards
    vi.mocked(prisma.swimCard.findMany).mockResolvedValue([
      {
        id: "c-1",
        cardCode: "SWM-000001",
        publicToken: "tok-1",
        status: "active",
        issuedAt: new Date().toISOString(),
        member: {
          fullName: "Karim Benchikh",
          swimId: "SWM-000001",
        },
      },
    ] as any);

    const req = new NextRequest("http://localhost:3000/api/admin/swim/overview");
    const res = await getOverview(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    // Verify consolidated payload structure
    expect(body).toHaveProperty("members");
    expect(body).toHaveProperty("leads");
    expect(body).toHaveProperty("groups");
    expect(body).toHaveProperty("cards");

    // Member enrichments
    expect(body.members).toHaveLength(2);
    expect(body.members[0].effectiveGroup.name).toBe("Homme Mardi 19h");
    expect(body.members[0].effectivelyUnassigned).toBe(false);
    expect(body.members[1].effectiveGroup).toBeNull();
    expect(body.members[1].effectivelyUnassigned).toBe(true);

    // Lead details enrichment
    expect(body.leads).toHaveLength(1);
    expect(body.leads[0].details).toBeDefined();

    // Group enrichments: multi-group count + legacy location cleanup + solid notes
    expect(body.groups).toHaveLength(2);
    expect(body.groups[0].schedule).toContain("Azal");
    expect(body.groups[0].isSolid).toBe(true);
    expect(body.groups[1]._count.swimmers).toBe(5); // 4 + 1 secondary from m-multi

    // Cards enrichment: fast URL generation without heavy QR string
    expect(body.cards).toHaveLength(1);
    expect(body.cards[0].url).toContain("/swim/card/tok-1");
    expect(body.cards[0].qrDataUrl).toBe("");
  });
});

describe("AQA Swim Cards API - Selective QR Code Generation", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  it("should skip QR code dataURL generation when includeQr is not set", async () => {
    vi.mocked(prisma.swimCard.findMany).mockResolvedValue([
      {
        id: "c-100",
        cardCode: "SWM-000100",
        publicToken: "tok-fast",
        status: "active",
        issuedAt: new Date().toISOString(),
        member: null,
      },
    ] as any);

    const req = new NextRequest("http://localhost:3000/api/admin/swim/cards?filter=all");
    const res = await getCards(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].qrDataUrl).toBe("");
  });

  it("should generate QR code dataURL when includeQr=true is explicitly requested", async () => {
    vi.mocked(prisma.swimCard.findMany).mockResolvedValue([
      {
        id: "c-101",
        cardCode: "SWM-000101",
        publicToken: "tok-qr",
        status: "blank",
        issuedAt: new Date().toISOString(),
        member: null,
      },
    ] as any);

    const req = new NextRequest("http://localhost:3000/api/admin/swim/cards?filter=all&includeQr=true");
    const res = await getCards(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
