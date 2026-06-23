import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  hashPassword,
  verifyPassword,
  getFailedAttempts,
  isLockedOut,
  recordFailedAttempt,
  resetAttempts,
  getLockoutTimeRemaining,
} from "./auth";

describe("auth utils", () => {
  beforeEach(() => {
    resetAttempts("test@example.com");
  });

  describe("password hashing", () => {
    it("should hash a password and verify it correctly", async () => {
      const password = "my-secure-password";
      const hash = await hashPassword(password);
      expect(hash).not.toBe(password);
      expect(await verifyPassword(password, hash)).toBe(true);
      expect(await verifyPassword("wrong-password", hash)).toBe(false);
    });
  });

  describe("brute force protection", () => {
    it("should start with 0 failed attempts and not locked out", () => {
      expect(getFailedAttempts("test@example.com")).toBe(0);
      expect(isLockedOut("test@example.com")).toBe(false);
    });

    it("should increment failed attempts", () => {
      recordFailedAttempt("test@example.com");
      expect(getFailedAttempts("test@example.com")).toBe(1);
      expect(isLockedOut("test@example.com")).toBe(true); // locked for 1s on first attempt
    });

    it("should support lockout time remaining", () => {
      recordFailedAttempt("test@example.com");
      const remaining = getLockoutTimeRemaining("test@example.com");
      expect(remaining).toBeGreaterThan(0);
    });

    it("should lock out for a long period after 5 failed attempts", () => {
      // Simulate 5 failed attempts
      recordFailedAttempt("test@example.com"); // 1
      recordFailedAttempt("test@example.com"); // 2
      recordFailedAttempt("test@example.com"); // 3
      recordFailedAttempt("test@example.com"); // 4
      recordFailedAttempt("test@example.com"); // 5

      expect(getFailedAttempts("test@example.com")).toBe(5);
      expect(isLockedOut("test@example.com")).toBe(true);
      
      const remaining = getLockoutTimeRemaining("test@example.com");
      // 15 minutes is 900 seconds. It should be close to 900.
      expect(remaining).toBeGreaterThan(800);
      expect(remaining).toBeLessThanOrEqual(900);
    });

    it("should reset failed attempts", () => {
      recordFailedAttempt("test@example.com");
      expect(getFailedAttempts("test@example.com")).toBe(1);
      resetAttempts("test@example.com");
      expect(getFailedAttempts("test@example.com")).toBe(0);
      expect(isLockedOut("test@example.com")).toBe(false);
    });
  });
});
