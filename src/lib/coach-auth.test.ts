import { describe, it, expect } from "vitest";
import {
  signCoachJwt,
  verifyCoachJwt,
  hashPassword,
  verifyPassword,
  hashRefreshToken,
} from "./coach-auth";

describe("coach-auth", () => {
  it("hashes and verifies passwords correctly", async () => {
    const raw = "SuperSecret123!";
    const hash = await hashPassword(raw);
    expect(hash).not.toBe(raw);

    const matches = await verifyPassword(raw, hash);
    expect(matches).toBe(true);

    const wrong = await verifyPassword("WrongPassword", hash);
    expect(wrong).toBe(false);
  });

  it("signs and verifies coach JWT tokens", () => {
    const token = signCoachJwt({
      sub: "acc_123",
      coachId: "coach_456",
      role: "head_coach",
      email: "coach@aqasports.pro",
      name: "Samir Swim",
      sessionId: "sess_789",
    });

    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const payload = verifyCoachJwt(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("acc_123");
    expect(payload?.coachId).toBe("coach_456");
    expect(payload?.role).toBe("head_coach");
    expect(payload?.email).toBe("coach@aqasports.pro");
  });

  it("rejects tampered JWT tokens", () => {
    const token = signCoachJwt({
      sub: "acc_123",
      coachId: "coach_456",
      role: "coach",
      email: "coach@aqasports.pro",
      name: "Karim",
      sessionId: "sess_789",
    });

    const tampered = token.slice(0, -5) + "abcde";
    expect(verifyCoachJwt(tampered)).toBeNull();
  });

  it("hashes refresh tokens deterministically using SHA-256", () => {
    const raw = "a1b2c3d4e5f6";
    const h1 = hashRefreshToken(raw);
    const h2 = hashRefreshToken(raw);
    expect(h1).toBe(h2);
    expect(h1.length).toBe(64);
  });
});
