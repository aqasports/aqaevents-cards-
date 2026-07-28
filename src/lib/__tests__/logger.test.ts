import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { logger } from "../logger";

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  init: vi.fn(),
}));

describe("logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls Sentry.captureMessage when logger.error is called with expected shape", () => {
    logger.error("api/test", "An error occurred", { detail: "extra" });

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "[api/test] An error occurred {\"detail\":\"extra\"}",
      {
        level: "error",
        extra: {
          context: "api/test",
          message: "An error occurred",
          args: [{ detail: "extra" }],
        },
      }
    );
  });

  it("calls Sentry.captureMessage when logger.warn is called", () => {
    logger.warn("api/test", "A warning message");

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "[api/test] A warning message",
      {
        level: "warning",
        extra: {
          context: "api/test",
          message: "A warning message",
          args: [],
        },
      }
    );
  });

  it("does not call Sentry.captureMessage for logger.info", () => {
    logger.info("api/test", "Info log");

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
