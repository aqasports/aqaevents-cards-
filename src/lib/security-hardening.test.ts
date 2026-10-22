/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { signClientToken, verifyClientToken, requireClientSession } from "./client-auth";
import { GET as getPublicSwimMember } from "@/app/api/public/swim/member/[swimId]/route";
import { POST as postAdminBackup } from "@/app/api/admin/backup/route";
import { POST as postSwimPayment } from "@/app/api/admin/swim/payments/route";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminSession, requireAdminSession } from "@/lib/api-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    card: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    swimMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    swimGroup: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    swimPayment: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    swimApneaPack: { findMany: vi.fn().mockResolvedValue([]) },
    swimApneaPresence: { findMany: vi.fn().mockResolvedValue([]) },
    swimApneaRecord: { findMany: vi.fn().mockResolvedValue([]) },
    swimLead: { findMany: vi.fn().mockResolvedValue([]) },
    swimCard: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    ledgerEntry: { findMany: vi.fn().mockResolvedValue([]) },
    redemption: { findMany: vi.fn().mockResolvedValue([]) },
    invoice: { findMany: vi.fn().mockResolvedValue([]) },
    package: { findMany: vi.fn().mockResolvedValue([]) },
    activity: { findMany: vi.fn().mockResolvedValue([]) },
    activitySession: { findMany: vi.fn().mockResolvedValue([]) },
    activityExpense: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}) },
    adminUser: { findMany: vi.fn().mockResolvedValue([]) },
    notificationLog: { findMany: vi.fn().mockResolvedValue([]) },
    product: { findMany: vi.fn().mockResolvedValue([]) },
    cardDemand: { findMany: vi.fn().mockResolvedValue([]) },
    activityProposal: { findMany: vi.fn().mockResolvedValue([]) },
    rateLimitBucket: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/api-auth", () => ({
  requireSuperAdminSession: vi.fn(),
  requireAdminSession: vi.fn(),
}));

describe("Security Hardening Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("P0-2: Signed Client Tokens & Direct Public Card Token Access", () => {
    it("signs and verifies a valid client token", () => {
      const token = signClientToken("client-abc");
      const verified = verifyClientToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.clientId).toBe("client-abc");
    });

    it("rejects forged unsigned cli_<clientId>_<ts> tokens", async () => {
      expect(verifyClientToken("cli_client-abc_1700000000000")).toBeNull();
      expect(verifyClientToken("cli_client-abc_1700000000000_deadbeef")).toBeNull();

      const req = new NextRequest("http://localhost:3000/api/client/me", {
        headers: { authorization: "Bearer cli_client-abc_1700000000000" },
      });
      const res = await requireClientSession(req);
      expect(res.client).toBeNull();
      expect(res.error?.status).toBe(401);
    });

    it("allows viewing client profile via direct card publicToken URL without login", async () => {
      vi.mocked(prisma.card.findUnique).mockResolvedValueOnce({
        clientId: "client-url-1",
        status: "active",
      } as any);
      vi.mocked(prisma.client.findUnique).mockResolvedValueOnce({
        id: "client-url-1",
        fullName: "Nadia Mansouri",
        archived: false,
        cards: [],
      } as any);

      const req = new NextRequest("http://localhost:3000/api/client/me?token=pub_tok_32chars_xyz");
      const res = await requireClientSession(req);
      expect(res.error).toBeNull();
      expect(res.client?.id).toBe("client-url-1");
    });
  });

  describe("P0-3: Public Swim Member Endpoint Hardening", () => {
    it("masks swimmer phone, strips email and notes, and strips raw swimmers from groups", async () => {
      vi.mocked(prisma.swimMember.findUnique).mockResolvedValueOnce({
        id: "m1",
        swimId: "SWM-123456",
        fullName: "Amine Khelil",
        phone: "0550123456",
        email: "amine@secret.dz",
        notes: "[GROUPS:g1] internal secret note",
        level: "beginner",
        category: "homme",
        formula: "G10",
        duration: "3m",
        priceDA: 24000,
        dateOfStart: new Date("2026-10-01T00:00:00Z"),
        groupId: "g1",
        card: { id: "c1", cardCode: "SWM-123456", publicToken: "tok1", status: "active" },
        payments: [],
        group: {
          id: "g1",
          name: "G1",
          level: "G10",
          schedule: "Lundi 18:00",
          notes: "[SOLID] coach private note",
          swimmers: [
            { id: "m1", swimId: "SWM-123456", fullName: "Amine Khelil", groupStatus: "accepted" },
            { id: "m2", swimId: "SWM-999999", fullName: "Karim OtherLastName", groupStatus: "accepted" },
          ],
        },
      } as any);

      vi.mocked(prisma.swimGroup.findMany).mockResolvedValueOnce([
        {
          id: "g1",
          name: "G1",
          level: "G10",
          schedule: "Lundi 18:00",
          notes: "[SOLID] coach private note",
          swimmers: [
            { id: "m1", swimId: "SWM-123456", fullName: "Amine Khelil", groupStatus: "accepted" },
            { id: "m2", swimId: "SWM-999999", fullName: "Karim OtherLastName", groupStatus: "accepted" },
          ],
        } as any,
      ]);

      const req = new NextRequest("http://localhost:3000/api/public/swim/member/SWM-123456");
      const res = await getPublicSwimMember(req, { params: Promise.resolve({ swimId: "SWM-123456" }) });
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.phone).toBe("055****56");
      expect(body.email).toBeNull();
      expect(body.notes).toBeUndefined();
      expect(body.groups[0].swimmers).toBeUndefined();
      expect(body.groups[0].notes).toBeUndefined();
    });
  });

  describe("P1-2: Backup Endpoint Auth Enforcement", () => {
    it("rejects unauthenticated requests even if an arbitrary Authorization header is present", async () => {
      vi.mocked(requireSuperAdminSession).mockResolvedValueOnce({
        session: null,
        error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as any,
      });

      const req = new NextRequest("http://localhost:3000/api/admin/backup", {
        method: "POST",
        headers: { Authorization: "Bearer anything_forged" },
      });
      const res = await postAdminBackup(req);
      expect(res.status).toBe(401);
    });
  });

  describe("P2: Swim Payment Validation", () => {
    it("rejects negative or non-numeric swim payment amounts", async () => {
      vi.mocked(requireAdminSession).mockResolvedValueOnce({
        session: { user: { id: "admin-1", role: "super_admin" } } as any,
        error: null,
      });

      const req = new NextRequest("http://localhost:3000/api/admin/swim/payments", {
        method: "POST",
        body: JSON.stringify({ memberId: "m1", amount: -5000 }),
      });
      const res = await postSwimPayment(req);
      expect(res.status).toBe(400);
    });
  });
});
