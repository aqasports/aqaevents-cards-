/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as joinWaitlist } from "./route";
import { GET as getWaitlist } from "@/app/api/admin/sessions/[id]/waitlist/route";
import { POST as promoteWaitlist } from "@/app/api/admin/sessions/[id]/promote/route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activitySession: {
      findUnique: vi.fn(),
    },
    client: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    sessionWaitlist: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notifications", () => ({
  sendSimulatedNotification: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Session Waitlist API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  describe("POST /api/public/sessions/[id]/waitlist", () => {
    it("should allow a client to join session waitlist", async () => {
      vi.mocked(prisma.activitySession.findUnique).mockResolvedValue({
        id: "sess-1",
        activity: { name: "Kayaking Session" },
      } as any);

      vi.mocked(prisma.client.findFirst).mockResolvedValue({
        id: "c1",
        email: "alice@aqa.dz",
      } as any);

      vi.mocked(prisma.sessionWaitlist.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.sessionWaitlist.create).mockResolvedValue({
        id: "w1",
        sessionId: "sess-1",
        clientId: "c1",
        status: "waiting",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/public/sessions/sess-1/waitlist", {
        method: "POST",
        body: JSON.stringify({ phoneOrEmail: "alice@aqa.dz" }),
      });

      const res = await joinWaitlist(req, { params: Promise.resolve({ id: "sess-1" }) });
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.waitlist.status).toBe("waiting");
    });
  });

  describe("GET /api/admin/sessions/[id]/waitlist", () => {
    it("should return waitlist entries for a session", async () => {
      vi.mocked(prisma.sessionWaitlist.findMany).mockResolvedValue([
        { id: "w1", status: "waiting", client: { fullName: "Alice" } },
      ] as any);

      const req = new NextRequest("http://localhost:3000/api/admin/sessions/sess-1/waitlist");
      const res = await getWaitlist(req, { params: Promise.resolve({ id: "sess-1" }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
    });
  });

  describe("POST /api/admin/sessions/[id]/promote", () => {
    it("should promote earliest waiting client", async () => {
      vi.mocked(prisma.sessionWaitlist.findFirst).mockResolvedValue({
        id: "w1",
        sessionId: "sess-1",
        clientId: "c1",
        status: "waiting",
        client: { email: "alice@aqa.dz" },
        session: { activity: { name: "Kayaking" } },
      } as any);

      vi.mocked(prisma.sessionWaitlist.update).mockResolvedValue({
        id: "w1",
        status: "promoted",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/sessions/sess-1/promote", {
        method: "POST",
      });

      const res = await promoteWaitlist(req, { params: Promise.resolve({ id: "sess-1" }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(prisma.sessionWaitlist.update).toHaveBeenCalledWith({
        where: { id: "w1" },
        data: { status: "promoted" },
        include: { client: true },
      });
    });
  });
});
