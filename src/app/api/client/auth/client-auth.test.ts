/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as requestMagicLink } from "./magic-link/route";
import { POST as verifyMagicPin } from "./verify/route";
import { GET as getClientMe } from "../me/route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    rateLimitBucket: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    ledgerEntry: {
      aggregate: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notifications", () => ({
  sendSimulatedNotification: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Client Self-Service Portal Auth & Profile API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/client/auth/magic-link", () => {
    it("should generate magic PIN and send notification for existing client", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue({
        id: "client-1",
        fullName: "Sarah Connor",
        email: "sarah@aqa.dz",
        phone: "+213555999",
      } as any);

      vi.mocked(prisma.rateLimitBucket.upsert).mockResolvedValue({} as any);

      const req = new NextRequest("http://localhost:3000/api/client/auth/magic-link", {
        method: "POST",
        body: JSON.stringify({ phoneOrEmail: "sarah@aqa.dz" }),
      });

      const res = await requestMagicLink(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(prisma.rateLimitBucket.upsert).toHaveBeenCalled();
    });
  });

  describe("POST /api/client/auth/verify", () => {
    it("should verify correct PIN and return client profile token and balance", async () => {
      vi.mocked(prisma.client.findFirst).mockResolvedValue({
        id: "client-1",
        fullName: "Sarah Connor",
        email: "sarah@aqa.dz",
      } as any);

      vi.mocked(prisma.rateLimitBucket.findUnique).mockResolvedValue({
        key: "magic_pin:client-1",
        count: 123456,
        lockUntil: new Date(Date.now() + 10 * 60 * 1000), // valid
      } as any);

      vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({ _sum: { amount: 10 } } as any);

      const req = new NextRequest("http://localhost:3000/api/client/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          phoneOrEmail: "sarah@aqa.dz",
          pin: "123456",
        }),
      });

      const res = await verifyMagicPin(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.token).toContain("cli_client-1_");
      expect(body.client.fullName).toBe("Sarah Connor");
    });
  });

  describe("GET /api/client/me", () => {
    it("should return client profile details when authorized with client token", async () => {
      vi.mocked(prisma.client.findUnique).mockResolvedValue({
        id: "client-1",
        fullName: "Sarah Connor",
        email: "sarah@aqa.dz",
        cards: [{ id: "card-1", cardCode: "AQA-111111" }],
        ledgerEntries: [],
        redemptions: [],
      } as any);

      vi.mocked(prisma.ledgerEntry.aggregate).mockResolvedValue({ _sum: { amount: 15 } } as any);

      const req = new NextRequest("http://localhost:3000/api/client/me", {
        headers: {
          authorization: "Bearer cli_client-1_123456789",
        },
      });

      const res = await getClientMe(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.client.fullName).toBe("Sarah Connor");
      expect(body.cards).toHaveLength(1);
    });
  });
});
