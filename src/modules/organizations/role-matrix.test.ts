import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireOrgSession } from "@/lib/api-auth";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationUser: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Corporate Portal Role Matrix & Session Guard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return 401 if no session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await requireOrgSession();
    expect(result.session).toBeNull();
    expect(result.error?.status).toBe(401);
  });

  it("should return 401 if user has no organizationId in session", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", role: "OWNER" },
    });

    const result = await requireOrgSession();
    expect(result.session).toBeNull();
    expect(result.error?.status).toBe(401);
  });

  it("should return 401 if OrganizationUser is inactive", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", organizationId: "org-100", role: "HR_MANAGER" },
    });
    vi.mocked(prisma.organizationUser.findUnique).mockResolvedValue({
      id: "user-1",
      organizationId: "org-100",
      role: "HR_MANAGER",
      active: false,
    } as any);

    const result = await requireOrgSession();
    expect(result.session).toBeNull();
    expect(result.error?.status).toBe(401);
  });

  it("should return 403 if role is not allowed for the action", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-viewer", organizationId: "org-100", role: "VIEWER" },
    });
    vi.mocked(prisma.organizationUser.findUnique).mockResolvedValue({
      id: "user-viewer",
      organizationId: "org-100",
      role: "VIEWER",
      active: true,
    } as any);

    // HR_MANAGER or OWNER action
    const result = await requireOrgSession(["OWNER", "HR_MANAGER"]);
    expect(result.session).toBeNull();
    expect(result.error?.status).toBe(403);
  });

  it("should grant access for valid OWNER role", async () => {
    const mockSession = {
      user: { id: "user-owner", organizationId: "org-100", role: "OWNER" },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationUser.findUnique).mockResolvedValue({
      id: "user-owner",
      organizationId: "org-100",
      role: "OWNER",
      active: true,
    } as any);

    const result = await requireOrgSession(["OWNER"]);
    expect(result.error).toBeNull();
    expect(result.organizationId).toBe("org-100");
    expect(result.role).toBe("OWNER");
  });

  it("should grant access for valid HR_MANAGER role", async () => {
    const mockSession = {
      user: { id: "user-hr", organizationId: "org-100", role: "HR_MANAGER" },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.organizationUser.findUnique).mockResolvedValue({
      id: "user-hr",
      organizationId: "org-100",
      role: "HR_MANAGER",
      active: true,
    } as any);

    const result = await requireOrgSession(["HR_MANAGER", "OWNER"]);
    expect(result.error).toBeNull();
    expect(result.organizationId).toBe("org-100");
    expect(result.role).toBe("HR_MANAGER");
  });
});
