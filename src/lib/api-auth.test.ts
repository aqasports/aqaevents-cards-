import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdminSession, requireSuperAdminSession } from "./api-auth";
import { getServerSession } from "next-auth";
import { prisma } from "./prisma";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("./prisma", () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(),
    },
  },
}));

describe("api-auth helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("requireAdminSession", () => {
    it("should return error if no session exists", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await requireAdminSession();
      expect(result.session).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(401);
    });

    it("should return error if user does not exist in DB (stale session)", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
      });
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(null);

      const result = await requireAdminSession();
      expect(result.session).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(401);
    });

    it("should return session if user is authenticated and exists in DB", async () => {
      const mockSession = { user: { id: "user-1", email: "test@example.com" } };
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({ id: "user-1" } as any);

      const result = await requireAdminSession();
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });
  });

  describe("requireSuperAdminSession", () => {
    it("should return error if user is not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await requireSuperAdminSession();
      expect(result.session).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(401);
    });

    it("should return error (403) if user is not a super_admin", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", role: "staff" },
      });
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({ id: "user-1" } as any);

      const result = await requireSuperAdminSession();
      expect(result.session).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(403);
    });

    it("should return session if user is a super_admin", async () => {
      const mockSession = { user: { id: "user-1", role: "super_admin" } };
      vi.mocked(getServerSession).mockResolvedValue(mockSession);
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({ id: "user-1" } as any);

      const result = await requireSuperAdminSession();
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });
  });
});
