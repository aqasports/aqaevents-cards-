import { describe, it, expect } from "vitest";
import {
  calculateSubscriptionExpiration,
  getCallUrgency,
  formatAlgerianPhoneForWhatsApp,
  formatWhatsAppReinscriptionUrl,
} from "./swim-calls";

describe("swim-calls utilities", () => {
  describe("calculateSubscriptionExpiration", () => {
    it("correctly adds 1 month for 1m duration", () => {
      const start = new Date(2026, 0, 15); // Jan 15, 2026
      const exp = calculateSubscriptionExpiration(start, "1m");
      expect(exp.getFullYear()).toBe(2026);
      expect(exp.getMonth()).toBe(1); // Feb
      expect(exp.getDate()).toBe(15);
    });

    it("correctly adds 3 months for 3m duration", () => {
      const start = new Date(2026, 2, 10); // March 10, 2026
      const exp = calculateSubscriptionExpiration(start, "3m");
      expect(exp.getFullYear()).toBe(2026);
      expect(exp.getMonth()).toBe(5); // June
      expect(exp.getDate()).toBe(10);
    });

    it("correctly adds 6 months for 6m duration", () => {
      const start = new Date(2026, 0, 1);
      const exp = calculateSubscriptionExpiration(start, "6m");
      expect(exp.getMonth()).toBe(6); // July
    });

    it("defaults to 3 months when duration is invalid or omitted", () => {
      const start = new Date(2026, 0, 1);
      const exp = calculateSubscriptionExpiration(start, null);
      expect(exp.getMonth()).toBe(3); // April
    });
  });

  describe("getCallUrgency", () => {
    it("returns overdue when expiration date is in the past", () => {
      const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      expect(getCallUrgency(past)).toBe("overdue");
    });

    it("returns expiring_soon when expiration is within 14 days", () => {
      const soon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // in 5 days
      expect(getCallUrgency(soon)).toBe("expiring_soon");
    });

    it("returns active when expiration is far in the future", () => {
      const farFuture = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // in 60 days
      expect(getCallUrgency(farFuture)).toBe("active");
    });

    it("prioritizes callback date when scheduled for today or past", () => {
      const futureExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const pastCallback = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(getCallUrgency(futureExp, pastCallback)).toBe("overdue");
    });
  });

  describe("formatAlgerianPhoneForWhatsApp", () => {
    it("converts 0-prefixed number to 213", () => {
      expect(formatAlgerianPhoneForWhatsApp("0550123456")).toBe("213550123456");
      expect(formatAlgerianPhoneForWhatsApp("0770 98 76 54")).toBe("213770987654");
    });

    it("leaves already formatted 213 numbers intact", () => {
      expect(formatAlgerianPhoneForWhatsApp("213550123456")).toBe("213550123456");
    });
  });

  describe("formatWhatsAppReinscriptionUrl", () => {
    it("creates a valid wa.me link without any emojis", () => {
      const url = formatWhatsAppReinscriptionUrl("0550123456", "Karim Benali", "G10");
      expect(url).toContain("https://wa.me/213550123456?text=");
      expect(url).toContain("Karim%20Benali");
      expect(url).toContain("G10");
      // Verify no emoji encoding
      expect(url).not.toMatch(/%F0%9F/);
    });
  });
});
