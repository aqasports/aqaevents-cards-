/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getCoaches, POST as createCoach } from "./route";
import { GET as getCoach, PATCH as updateCoach, DELETE as deleteCoach } from "./[id]/route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("Coaches API Endpoints", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  describe("GET /api/admin/coaches", () => {
    it("should return list of coaches", async () => {
      vi.mocked(prisma.coach.findMany).mockResolvedValue([
        { id: "coach-1", name: "Coach Alex", defaultPayRate: 4000, commissionRate: 0.1 },
      ] as any);

      const res = await getCoaches();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("Coach Alex");
    });
  });

  describe("POST /api/admin/coaches", () => {
    it("should return 400 if name is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/coaches", {
        method: "POST",
        body: JSON.stringify({ email: "alex@aqa.dz" }),
      });

      const res = await createCoach(req);
      expect(res.status).toBe(400);
    });

    it("should create coach successfully", async () => {
      vi.mocked(prisma.coach.create).mockResolvedValue({
        id: "coach-1",
        name: "Coach Alex",
        email: "alex@aqa.dz",
        defaultPayRate: 4000,
        commissionRate: 0.1,
        active: true,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/coaches", {
        method: "POST",
        body: JSON.stringify({
          name: "Coach Alex",
          email: "alex@aqa.dz",
          defaultPayRate: 4000,
          commissionRate: 0.1,
        }),
      });

      const res = await createCoach(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Coach Alex");
    });
  });

  describe("GET /api/admin/coaches/[id]", () => {
    it("should return coach details by id", async () => {
      vi.mocked(prisma.coach.findUnique).mockResolvedValue({ id: "coach-1", name: "Coach Alex" } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/coaches/coach-1");
      const res = await getCoach(req, { params: Promise.resolve({ id: "coach-1" }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe("Coach Alex");
    });
  });

  describe("PATCH /api/admin/coaches/[id]", () => {
    it("should update coach defaultPayRate and commissionRate", async () => {
      vi.mocked(prisma.coach.findUnique).mockResolvedValue({ id: "coach-1", name: "Coach Alex" } as any);
      vi.mocked(prisma.coach.update).mockResolvedValue({
        id: "coach-1",
        name: "Coach Alex",
        defaultPayRate: 5000,
        commissionRate: 0.15,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/coaches/coach-1", {
        method: "PATCH",
        body: JSON.stringify({ defaultPayRate: 5000, commissionRate: 0.15 }),
      });

      const res = await updateCoach(req, { params: Promise.resolve({ id: "coach-1" }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.defaultPayRate).toBe(5000);
    });
  });

  describe("DELETE /api/admin/coaches/[id]", () => {
    it("should delete coach by id", async () => {
      vi.mocked(prisma.coach.findUnique).mockResolvedValue({ id: "coach-1" } as any);
      vi.mocked(prisma.coach.delete).mockResolvedValue({ id: "coach-1" } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/coaches/coach-1", {
        method: "DELETE",
      });

      const res = await deleteCoach(req, { params: Promise.resolve({ id: "coach-1" }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
