import { describe, it, expect, vi, beforeEach } from "vitest";
import { logAdminAction } from "./audit";
import { prisma } from "./prisma";
import { logger } from "@/lib/logger";


// Mock the prisma module
vi.mock("./prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("logAdminAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully log an admin action", async () => {
    const mockCreate = vi.spyOn(prisma.auditLog, "create");
    mockCreate.mockResolvedValue({} as any);

    await logAdminAction("user-1", "RESET_DATA", "all", "Reset all operational data", "127.0.0.1");

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        action: "RESET_DATA",
        target: "all",
        details: "Reset all operational data",
        ipAddress: "127.0.0.1",
      },
    });
  });

  it("should handle error if database create fails", async () => {
    const mockCreate = vi.spyOn(prisma.auditLog, "create");
    mockCreate.mockRejectedValue(new Error("Database error"));

    const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    await logAdminAction("user-1", "RESET_DATA", "all");

    expect(mockCreate).toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalledWith("Failed to write audit log:", expect.any(Error));

    loggerSpy.mockRestore();
  });
});

