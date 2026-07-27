/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST as createQueueItem } from "./route";
import { POST as approveAction } from "./[id]/approve/route";
import { POST as rejectAction } from "./[id]/reject/route";
import { requireAdminSession, requireSuperAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
  requireSuperAdminSession: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn().mockResolvedValue({ id: "audit-1" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiActionQueue: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    client: {
      update: vi.fn(),
    },
    ledgerEntry: {
      create: vi.fn(),
    },
  },
}));

describe("AI Action Queue & Approval Flow API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });

    vi.mocked(requireSuperAdminSession).mockResolvedValue({
      session: { user: { id: "super-1", role: "super_admin" } } as any,
      error: null,
    });
  });

  describe("GET /api/admin/ai/queue", () => {
    it("should return list of queued AI action items", async () => {
      vi.mocked(prisma.aiActionQueue.findMany).mockResolvedValue([
        { id: "queue-1", actionType: "UPDATE_CLIENT_SEGMENT", status: "pending" },
      ] as any);

      const req = new NextRequest("http://localhost:3000/api/admin/ai/queue");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].actionType).toBe("UPDATE_CLIENT_SEGMENT");
    });
  });

  describe("POST /api/admin/ai/queue", () => {
    it("should enqueue a proposed AI action", async () => {
      vi.mocked(prisma.aiActionQueue.create).mockResolvedValue({
        id: "queue-1",
        actionType: "UPDATE_CLIENT_SEGMENT",
        status: "pending",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/ai/queue", {
        method: "POST",
        body: JSON.stringify({
          actionType: "UPDATE_CLIENT_SEGMENT",
          proposedPayload: { clientId: "c1", customerSegment: "VIP" },
          reasoning: "Client spent over 100,000 DA",
        }),
      });

      const res = await createQueueItem(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.actionType).toBe("UPDATE_CLIENT_SEGMENT");
    });
  });

  describe("POST /api/admin/ai/queue/[id]/approve", () => {
    it("should require super_admin session, execute payload mutation, and mark item approved", async () => {
      vi.mocked(prisma.aiActionQueue.findUnique).mockResolvedValue({
        id: "queue-1",
        actionType: "UPDATE_CLIENT_SEGMENT",
        proposedPayload: JSON.stringify({ clientId: "c1", customerSegment: "VIP" }),
        status: "pending",
      } as any);

      vi.mocked(prisma.aiActionQueue.update).mockResolvedValue({
        id: "queue-1",
        status: "approved",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/ai/queue/queue-1/approve", {
        method: "POST",
      });

      const res = await approveAction(req, { params: Promise.resolve({ id: "queue-1" }) });
      expect(res.status).toBe(200);

      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { customerSegment: "VIP" },
      });

      expect(prisma.aiActionQueue.update).toHaveBeenCalledWith({
        where: { id: "queue-1" },
        data: expect.objectContaining({
          status: "approved",
          reviewedBy: "super-1",
        }),
      });
    });
  });

  describe("POST /api/admin/ai/queue/[id]/reject", () => {
    it("should mark queued item as rejected", async () => {
      vi.mocked(prisma.aiActionQueue.findUnique).mockResolvedValue({
        id: "queue-1",
        actionType: "PROVISION_CREDITS",
        status: "pending",
      } as any);

      vi.mocked(prisma.aiActionQueue.update).mockResolvedValue({
        id: "queue-1",
        status: "rejected",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/ai/queue/queue-1/reject", {
        method: "POST",
      });

      const res = await rejectAction(req, { params: Promise.resolve({ id: "queue-1" }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(prisma.aiActionQueue.update).toHaveBeenCalledWith({
        where: { id: "queue-1" },
        data: expect.objectContaining({
          status: "rejected",
        }),
      });
    });
  });
});
