import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: vi.fn(),
    },
    card: {
      findUnique: vi.fn(),
    },
    activity: {
      findUnique: vi.fn(),
    },
    activitySession: {
      findFirst: vi.fn(),
    },
    redemption: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    checkIn: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/balance", () => ({
  getClientBalance: vi.fn().mockResolvedValue(10),
}));

describe("Public Check-In POST API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockClub = { id: "club-1", isActive: true };
  const mockCard = {
    id: "card-1",
    status: "active",
    publicToken: "token-1",
    cardCode: "AQA-1111-2222",
    client: {
      id: "client-1",
      fullName: "Jane Doe",
      archived: false,
      ledgerEntries: [],
    },
  };
  const mockActivity = {
    id: "act-1",
    name: "Kayaking",
    clubId: "club-1",
    requiresCheck: true,
    active: true,
  };

  it("should match redemption even if sessionId is null when terminal requests a session", async () => {
    vi.mocked(prisma.club.findUnique).mockResolvedValue(mockClub as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
    vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);
    vi.mocked(prisma.activitySession.findFirst).mockResolvedValue({
      id: "session-1",
      clubId: "club-1",
      active: true,
      activityId: "act-1",
      activity: mockActivity,
    } as any);

    // Mock findFirst for redemption to return a redemption that has no session (sessionId: null)
    const mockRedemption = { id: "red-1", clientId: "client-1", activityId: "act-1", sessionId: null };
    vi.mocked(prisma.redemption.findFirst).mockResolvedValue(mockRedemption as any);

    // No existing check-in
    vi.mocked(prisma.checkIn.findFirst).mockResolvedValue(null);

    // Mock check-in creation
    const mockCreatedCheckIn = { id: "ci-1", scannedAt: new Date() };
    vi.mocked(prisma.checkIn.create).mockResolvedValue(mockCreatedCheckIn as any);

    const request = new NextRequest("http://localhost:3000/api/public/checkin/token-1", {
      method: "POST",
      body: JSON.stringify({
        scannedValue: "card-token",
        activityId: "act-1",
        sessionId: "session-1", // terminal is scanning for a specific session
      }),
    });

    const res = await POST(request, { params: Promise.resolve({ clubToken: "token-1" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("SUCCESS");
    expect(body.client.name).toBe("Jane D.");
    expect(body.activity.name).toBe("Kayaking");
    expect(vi.mocked(prisma.redemption.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: "client-1",
          activityId: "act-1",
          OR: [{ sessionId: "session-1" }, { sessionId: null }],
        }),
      })
    );
  });

  it("should return DUPLICATE if check-in has already been recorded for this redemption", async () => {
    vi.mocked(prisma.club.findUnique).mockResolvedValue(mockClub as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
    vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);
    vi.mocked(prisma.activitySession.findFirst).mockResolvedValue({
      id: "session-1",
      clubId: "club-1",
      active: true,
      activityId: "act-1",
      activity: mockActivity,
    } as any);

    const mockRedemption = { id: "red-1", clientId: "client-1", activityId: "act-1", sessionId: "session-1" };
    vi.mocked(prisma.redemption.findFirst).mockResolvedValue(mockRedemption as any);

    // Existing check-in exists
    const mockExistingCheckIn = { id: "ci-1", scannedAt: new Date("2026-07-08T20:00:00.000Z") };
    vi.mocked(prisma.checkIn.findFirst).mockResolvedValue(mockExistingCheckIn as any);

    const request = new NextRequest("http://localhost:3000/api/public/checkin/token-1", {
      method: "POST",
      body: JSON.stringify({
        scannedValue: "card-token",
        activityId: "act-1",
        sessionId: "session-1",
      }),
    });

    const res = await POST(request, { params: Promise.resolve({ clubToken: "token-1" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("DUPLICATE");
    expect(body.originalCheckedInAt).toBe("2026-07-08T20:00:00.000Z");
    expect(body.client.name).toBe("Jane D.");
  });

  it("should return NOT_REDEEMED if no redemption is found for the client/activity", async () => {
    vi.mocked(prisma.club.findUnique).mockResolvedValue(mockClub as any);
    vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
    vi.mocked(prisma.activity.findUnique).mockResolvedValue(mockActivity as any);
    vi.mocked(prisma.activitySession.findFirst).mockResolvedValue({
      id: "session-1",
      clubId: "club-1",
      active: true,
      activityId: "act-1",
      activity: mockActivity,
    } as any);

    // No redemption found
    vi.mocked(prisma.redemption.findFirst).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/public/checkin/token-1", {
      method: "POST",
      body: JSON.stringify({
        scannedValue: "card-token",
        activityId: "act-1",
        sessionId: "session-1",
      }),
    });

    const res = await POST(request, { params: Promise.resolve({ clubToken: "token-1" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("NOT_REDEEMED");
  });
});
