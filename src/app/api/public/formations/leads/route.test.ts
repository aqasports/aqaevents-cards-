/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { OPTIONS, POST } from "./route";
import { prisma } from "@/lib/prisma";
import { checkAndIncrement } from "@/lib/rate-limit";
import { parseSwimLeadNotes } from "@/lib/swim-lead-details";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    swimLead: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  checkAndIncrement: vi.fn().mockResolvedValue({ limited: false }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("Public Formations Leads API (/api/public/formations/leads)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAndIncrement).mockResolvedValue({ limited: false });
  });

  it("returns CORS headers on OPTIONS", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkAndIncrement).mockResolvedValueOnce({ limited: true, retryAfterSeconds: 60 });

    const req = new NextRequest("http://localhost:3000/api/public/formations/leads", {
      method: "POST",
      body: JSON.stringify({ fullName: "Karim", phone: "0550123456" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 400 when fullName or phone is missing or invalid", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/formations/leads", {
      method: "POST",
      body: JSON.stringify({ fullName: "A", phone: "123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(prisma.swimLead.create).not.toHaveBeenCalled();
  });

  it("creates a SwimLead with category formation and structured metadata", async () => {
    vi.mocked(prisma.swimLead.create).mockResolvedValue({
      id: "lead-form-1",
    } as any);

    const req = new NextRequest("http://localhost:3000/api/public/formations/leads", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Yacine Mansouri",
        phone: "0550 12 34 56",
        whatsapp: "0550 12 34 56",
        email: "yacine@example.com",
        age: 27,
        city: "Alger",
        formationSlug: "chasse-sous-marine",
        formationTitle: "Formation Chasse Sous-marine",
        swimLevel: "intermediate",
        apneaExperience: "initiation",
        spearfishingExperience: "none",
        hasGear: "partial",
        preferredSchedule: "weekend",
        channel: "instagram",
        notes: "Interesse par la session de week-end.",
        lang: "fr",
        utmSource: "ig",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");

    const body = await res.json();
    expect(body).toEqual({ success: true, leadId: "lead-form-1" });

    expect(prisma.swimLead.create).toHaveBeenCalledTimes(1);
    const createArg = vi.mocked(prisma.swimLead.create).mock.calls[0][0];
    expect(createArg.data.category).toBe("formation");
    expect(createArg.data.formula).toBe("Formation Chasse Sous-marine");
    expect(createArg.data.duration).toBe("chasse-sous-marine");
    expect(createArg.data.frequency).toBe("formation");
    expect(createArg.data.status).toBe("pending");
    expect(createArg.data.preferredDays).toBe("weekend");
    expect(createArg.data.utmSource).toBe("ig");

    const parsedDetails = parseSwimLeadNotes(createArg.data.notes);
    expect(parsedDetails.formation?.slug).toBe("chasse-sous-marine");
    expect(parsedDetails.formation?.title).toBe("Formation Chasse Sous-marine");
    expect(parsedDetails.formation?.swimLevel).toBe("intermediate");
    expect(parsedDetails.formation?.spearfishingExperience).toBe("none");
    expect(parsedDetails.formation?.hasGear).toBe("partial");
    expect(parsedDetails.demographics.city).toBe("Alger");
    expect(parsedDetails.demographics.age).toBe(27);
    expect(parsedDetails.userNotes).toBe("Interesse par la session de week-end.");
  });
});
