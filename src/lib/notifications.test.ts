import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendSimulatedNotification } from "./notifications";
import { prisma } from "./prisma";

// Mock the prisma module
vi.mock("./prisma", () => ({
  prisma: {
    notificationLog: {
      create: vi.fn(),
    },
  },
}));

describe("sendSimulatedNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully send and log simulated email notification", async () => {
    const mockCreate = vi.spyOn(prisma.notificationLog, "create");
    mockCreate.mockResolvedValue({} as any);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendSimulatedNotification(
      "client-1",
      "email",
      "john@example.com",
      "Welcome to the platform!",
      "Welcome"
    );

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        clientId: "client-1",
        type: "email",
        recipient: "john@example.com",
        subject: "Welcome",
        message: "Welcome to the platform!",
        status: "sent",
      },
    });

    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it("should successfully send and log simulated SMS notification without subject", async () => {
    const mockCreate = vi.spyOn(prisma.notificationLog, "create");
    mockCreate.mockResolvedValue({} as any);

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendSimulatedNotification(
      "client-1",
      "sms",
      "+2135555555",
      "Your balance is updated."
    );

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        clientId: "client-1",
        type: "sms",
        recipient: "+2135555555",
        subject: null,
        message: "Your balance is updated.",
        status: "sent",
      },
    });

    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it("should handle error if database log fails", async () => {
    const mockCreate = vi.spyOn(prisma.notificationLog, "create");
    mockCreate.mockRejectedValue(new Error("Database write failed"));

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendSimulatedNotification(
      "client-1",
      "sms",
      "+2135555555",
      "Your balance is updated."
    );

    expect(mockCreate).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to log simulated notification:", expect.any(Error));

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
