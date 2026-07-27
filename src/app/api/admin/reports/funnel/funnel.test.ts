/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cardDemand: {
      findMany: vi.fn(),
    },
  },
}));

describe("Ads Manager Funnel Report API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  it("should calculate total demands, accepted demands, conversion rate, and revenue by UTM source and campaign", async () => {
    vi.mocked(prisma.cardDemand.findMany).mockResolvedValue([
      {
        id: "d1",
        status: "accepted",
        price: 19000,
        utmSource: "facebook",
        utmCampaign: "summer_sale",
      },
      {
        id: "d2",
        status: "pending",
        price: 19000,
        utmSource: "facebook",
        utmCampaign: "summer_sale",
      },
      {
        id: "d3",
        status: "accepted",
        price: 38000,
        utmSource: "google",
        utmCampaign: "brand_search",
      },
      {
        id: "d4",
        status: "rejected",
        price: 19000,
        utmSource: "google",
        utmCampaign: "brand_search",
      },
    ] as any);

    const req = new NextRequest("http://localhost:3000/api/admin/reports/funnel");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.summary.totalDemands).toBe(4);
    expect(body.summary.acceptedDemands).toBe(2);
    expect(body.summary.conversionRate).toBe(50);
    expect(body.summary.totalRevenueGenerated).toBe(19000 + 38000); // 57,000 DA

    expect(body.breakdownBySource).toHaveLength(2);
    const fbSource = body.breakdownBySource.find((s: any) => s.source === "facebook");
    expect(fbSource.total).toBe(2);
    expect(fbSource.accepted).toBe(1);
    expect(fbSource.conversionRate).toBe(50);
    expect(fbSource.revenue).toBe(19000);
  });
});
