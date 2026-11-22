import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveCoachGroupIds } from "./coach-rbac";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findUnique: vi.fn(),
    },
    swimGroup: {
      findMany: vi.fn(),
    },
    swimGroupStaff: {
      findMany: vi.fn(),
    },
    swimReplacement: {
      findMany: vi.fn(),
    },
    swimSession: {
      findMany: vi.fn(),
    },
  },
}));

describe("resolveCoachGroupIds RBAC fail-closed behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array instead of all groups when a coach has no assignments", async () => {
    vi.mocked(prisma.swimGroup.findMany).mockResolvedValue([
      { id: "grp-1", coachName: "Other Coach" },
      { id: "grp-2", coachName: "Another Coach" },
    ] as never);
    vi.mocked(prisma.swimGroupStaff.findMany).mockResolvedValue([]);
    vi.mocked(prisma.swimReplacement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.swimSession.findMany).mockResolvedValue([]);

    const result = await resolveCoachGroupIds({
      coachId: "coach-unassigned",
      role: "coach",
      coachName: "New Coach",
    });

    expect(result).toEqual([]);
  });

  it("still grants all active groups for head_coach", async () => {
    vi.mocked(prisma.swimGroup.findMany).mockResolvedValue([
      { id: "grp-1" },
      { id: "grp-2" },
    ] as never);

    const result = await resolveCoachGroupIds({
      coachId: "coach-head",
      role: "head_coach",
    });

    expect(result).toEqual(["grp-1", "grp-2"]);
  });
});
