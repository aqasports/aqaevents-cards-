/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as handleSignup } from "./route";
import { POST as handleDemands } from "../demands/route";
import { POST as handleProposals } from "../proposals/route";
import { prisma } from "@/lib/prisma";
import { verifyCaptcha } from "@/lib/captcha";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    package: {
      findUnique: vi.fn(),
    },
    cardDemand: {
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    activityProposal: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/captcha", () => ({
  verifyCaptcha: vi.fn(),
}));

describe("Marketing Consent and Lead Attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyCaptcha).mockResolvedValue({ success: true } as any);
  });

  it("should persist marketing consent and UTM parameters during public signup", async () => {
    vi.mocked(prisma.package.findUnique).mockResolvedValue({
      id: "pkg-1",
      name: "Starter Package",
      price: 19000,
      totalCredits: 10,
      active: true,
    } as any);

    vi.mocked(prisma.cardDemand.create).mockResolvedValue({
      id: "demand-1",
      name: "Alice Smith",
    } as any);

    vi.mocked(prisma.cardDemand.aggregate).mockResolvedValue({
      _sum: { price: 19000 },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/public/signup", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Alice Smith",
        email: "alice@example.com",
        phone: "+213555000",
        packageId: "pkg-1",
        marketingConsent: true,
        utmSource: "facebook",
        utmMedium: "cpc",
        utmCampaign: "summer_sale",
        referrer: "https://facebook.com",
      }),
    });

    const res = await handleSignup(req);
    expect(res.status).toBe(201);

    expect(prisma.cardDemand.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Alice Smith",
        marketingConsent: true,
        utmSource: "facebook",
        utmMedium: "cpc",
        utmCampaign: "summer_sale",
        referrer: "https://facebook.com",
      }),
    });
  });

  it("should persist marketing consent and UTM parameters during demand creation", async () => {
    vi.mocked(prisma.package.findUnique).mockResolvedValue({
      id: "pkg-1",
      price: 19000,
      name: "Starter",
      totalCredits: 10,
    } as any);

    vi.mocked(prisma.cardDemand.create).mockResolvedValue({ id: "demand-2" } as any);
    vi.mocked(prisma.cardDemand.aggregate).mockResolvedValue({ _sum: { price: 19000 } } as any);

    const req = new NextRequest("http://localhost:3000/api/public/demands", {
      method: "POST",
      body: JSON.stringify({
        name: "Bob Jones",
        phone: "+213555111",
        creditType: "package",
        packageId: "pkg-1",
        marketingConsent: true,
        utmSource: "google",
        utmMedium: "search",
        utmCampaign: "brand_campaign",
      }),
    });

    const res = await handleDemands(req);
    expect(res.status).toBe(201);

    expect(prisma.cardDemand.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Bob Jones",
        marketingConsent: true,
        utmSource: "google",
        utmMedium: "search",
        utmCampaign: "brand_campaign",
      }),
    });
  });

  it("should persist marketing consent and UTM parameters during activity proposal creation", async () => {
    vi.mocked(prisma.activityProposal.create).mockResolvedValue({ id: "prop-1" } as any);

    const req = new NextRequest("http://localhost:3000/api/public/proposals", {
      method: "POST",
      body: JSON.stringify({
        title: "Night Kayaking Session",
        description: "Guided night paddle along the coast",
        userName: "Charlie Brown",
        userPhone: "+213555222",
        marketingConsent: true,
        utmSource: "instagram",
        utmMedium: "story",
        utmCampaign: "night_paddle",
      }),
    });

    const res = await handleProposals(req);
    expect(res.status).toBe(201);

    expect(prisma.activityProposal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Night Kayaking Session",
        marketingConsent: true,
        utmSource: "instagram",
        utmMedium: "story",
        utmCampaign: "night_paddle",
      }),
    });
  });
});
