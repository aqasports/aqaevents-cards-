/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendSimulatedNotification, sendNotification } from "./notifications";
import { prisma } from "./prisma";

// Mock the prisma module
vi.mock("./prisma", () => ({
  prisma: {
    notificationLog: {
      create: vi.fn(),
    },
  },
}));

describe("notifications module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should fall back to simulation when env vars are missing", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;

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
  });

  it("should send email via Resend when RESEND_API_KEY is present", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "test@aqa.dz";

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "123" }) });
    vi.stubGlobal("fetch", fetchMock);

    const mockCreate = vi.spyOn(prisma.notificationLog, "create");
    mockCreate.mockResolvedValue({} as any);

    await sendNotification("client-1", "email", "user@example.com", "Hello!", "Subject");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_key",
        }),
      })
    );

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        clientId: "client-1",
        type: "email",
        recipient: "user@example.com",
        subject: "Subject",
        message: "Hello!",
        status: "sent",
      },
    });
  });

  it("should send SMS via Twilio when Twilio credentials are present", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "auth123";
    process.env.TWILIO_FROM_NUMBER = "+123456";

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sid: "SM123" }) });
    vi.stubGlobal("fetch", fetchMock);

    const mockCreate = vi.spyOn(prisma.notificationLog, "create");
    mockCreate.mockResolvedValue({} as any);

    await sendNotification("client-1", "sms", "+213555000", "Your code is 1234");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json",
      expect.objectContaining({
        method: "POST",
      })
    );

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        clientId: "client-1",
        type: "sms",
        recipient: "+213555000",
        subject: null,
        message: "Your code is 1234",
        status: "sent",
      },
    });
  });

  it("should handle error if database log fails", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;

    const mockCreate = vi.spyOn(prisma.notificationLog, "create");
    mockCreate.mockRejectedValue(new Error("Database write failed"));

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendSimulatedNotification(
      "client-1",
      "sms",
      "+2135555555",
      "Your balance is updated."
    );

    expect(mockCreate).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to process notification delivery/logging:", expect.any(Error));
  });
});
