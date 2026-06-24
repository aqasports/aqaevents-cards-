import { describe, it, expect } from "vitest";
import {
  generatePublicToken,
  generateCardCode,
  getEventCardUrl,
  getFirstName,
} from "./tokens";

describe("token utils", () => {
  describe("generatePublicToken", () => {
    it("should generate a 32-character string", () => {
      const token = generatePublicToken();
      expect(token).toHaveLength(32);
    });

    it("should generate unique tokens", () => {
      const token1 = generatePublicToken();
      const token2 = generatePublicToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("generateCardCode", () => {
    it("should generate a code with AQA- prefix and 6 digits", () => {
      const code = generateCardCode();
      expect(code).toMatch(/^AQA-\d{6}$/);
    });
  });

  describe("getEventCardUrl", () => {
    it("should format the URL correctly with env variable base", () => {
      const originalEnv = process.env.PUBLIC_SITE_URL;
      process.env.PUBLIC_SITE_URL = "https://example.com/";
      try {
        const url = getEventCardUrl("my-token");
        expect(url).toBe("https://example.com/eventscard/my-token");
      } finally {
        process.env.PUBLIC_SITE_URL = originalEnv;
      }
    });

    it("should fallback to localhost if env variable is missing", () => {
      const originalEnv = process.env.PUBLIC_SITE_URL;
      delete process.env.PUBLIC_SITE_URL;
      try {
        const url = getEventCardUrl("my-token");
        expect(url).toBe("http://localhost:3000/eventscard/my-token");
      } finally {
        process.env.PUBLIC_SITE_URL = originalEnv;
      }
    });
  });

  describe("getFirstName", () => {
    it("should return the first word of a name", () => {
      expect(getFirstName("John Doe")).toBe("John");
      expect(getFirstName("Fatima Zahra")).toBe("Fatima");
      expect(getFirstName("  SingleName   ")).toBe("SingleName");
    });
  });
});
