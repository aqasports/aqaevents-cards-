/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { requireAdminSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findMany: vi.fn(),
      findBySlug: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("Organizations Main API Handler (GET & POST /api/admin/organizations)", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(requireAdminSession).mockResolvedValue({
      session: { user: { id: "admin-1", role: "admin" } } as any,
      error: null,
    });
  });

  describe("GET /api/admin/organizations", () => {
    it("should return unauthorized error if session check fails", async () => {
      vi.mocked(requireAdminSession).mockResolvedValue({
        session: null,
        error: { status: 401, json: () => Promise.resolve({ error: "Unauthorized" }) } as any,
      });

      const res = await GET(new NextRequest("http://localhost:3000/api/admin/organizations"));
      expect(res.status).toBe(401);
    });

    it("should return list of organizations on success", async () => {
      const mockOrgs = [
        {
          id: "org-1",
          name: "Acme Corp",
          slug: "acme-corp",
          creditRate: 1500,
          sharedCreditPool: 100,
          useSharedPool: true,
          _count: { clients: 5, invoices: 2 },
        },
      ];
      vi.mocked(prisma.organization.findMany).mockResolvedValue(mockOrgs as any);

      const res = await GET(new NextRequest("http://localhost:3000/api/admin/organizations"));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual(mockOrgs);
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    });

    it("should handle error when database query fails", async () => {
      vi.mocked(prisma.organization.findMany).mockRejectedValue(new Error("Database connection lost"));

      const res = await GET(new NextRequest("http://localhost:3000/api/admin/organizations"));
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.error).toContain("Failed to fetch organizations: Database connection lost");
    });
  });

  describe("POST /api/admin/organizations", () => {
    it("should create organization with valid input", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.organization.create).mockResolvedValue({
        id: "org-new",
        name: "Tech Corp",
        slug: "tech-corp",
        creditRate: 1800,
        sharedCreditPool: 50,
        useSharedPool: true,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/organizations", {
        method: "POST",
        body: JSON.stringify({
          name: "Tech Corp",
          creditRate: 1800,
          sharedCreditPool: 50,
          useSharedPool: true,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Tech Corp");
    });

    it("should return 400 if validation fails or slug exists", async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({ id: "org-existing", slug: "tech-corp" } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/organizations", {
        method: "POST",
        body: JSON.stringify({
          name: "Tech Corp",
          slug: "tech-corp",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Organization slug "tech-corp" already exists');
    });
  });
});
