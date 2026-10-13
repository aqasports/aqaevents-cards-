import { describe, it, expect } from "vitest";
import { isDateExcluded, toMidnightUTC } from "./swim-sessions";

describe("swim-sessions", () => {
  it("normalizes dates to UTC midnight", () => {
    const d = new Date("2026-10-15T18:45:00.000Z");
    const m = toMidnightUTC(d);
    expect(m.getUTCHours()).toBe(0);
    expect(m.getUTCMinutes()).toBe(0);
    expect(m.getUTCSeconds()).toBe(0);
    expect(m.toISOString().startsWith("2026-10-15T00:00:00")).toBe(true);
  });

  it("identifies Ramadan and Eid as excluded periods", () => {
    // Ramadan 2026: 17 Feb 2026 - 17 Mar 2026
    const ramadanDay = new Date("2026-03-01T00:00:00.000Z");
    expect(isDateExcluded(ramadanDay)).toBe(true);

    // Normal day in October 2026
    const normalDay = new Date("2026-10-20T00:00:00.000Z");
    expect(isDateExcluded(normalDay)).toBe(false);
  });
});
