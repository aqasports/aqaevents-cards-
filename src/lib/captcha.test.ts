import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyCaptcha } from "./captcha";

describe("captcha verification", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should return success: true when TURNSTILE_SECRET_KEY is missing (dev mode)", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.HCAPTCHA_SECRET_KEY;

    const result = await verifyCaptcha("some-token");
    expect(result).toEqual({ success: true });
  });

  it("should fail if secret key is present but token is missing", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";

    const result = await verifyCaptcha("");
    expect(result.success).toBe(false);
    expect(result.error).toBe("CAPTCHA_TOKEN_MISSING");
  });

  it("should pass when Cloudflare Turnstile returns success: true", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyCaptcha("valid-token", "1.2.3.4");

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("should fail when Cloudflare Turnstile returns success: false", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyCaptcha("invalid-token");

    expect(result.success).toBe(false);
    expect(result.error).toBe("invalid-input-response");
  });
});
