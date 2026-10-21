import { describe, it, expect } from "vitest";
import {
  APNEA_EXTRA_SESSION_PRICE_DA,
  buildApneaEvolution,
  formatApneaDuration,
  getApneaExtrasPrice,
  getApneaPackPrice,
  getApneaStaticGoalPercent,
  getBestApneaRecords,
  summarizeApneaPacks,
  toApneaSessionDay,
  validateApneaRecordValue,
} from "./swim-apnea";

describe("apnea pricing", () => {
  it("prices packs with and without fins", () => {
    expect(getApneaPackPrice(false)).toBe(7800);
    expect(getApneaPackPrice(true)).toBe(10500);
  });

  it("prices extra sessions pro rata (7800 / 4)", () => {
    expect(APNEA_EXTRA_SESSION_PRICE_DA).toBe(1950);
    expect(getApneaExtrasPrice(1)).toBe(1950);
    expect(getApneaExtrasPrice(2)).toBe(3900);
    expect(getApneaExtrasPrice(-3)).toBe(0);
  });
});

describe("apnea pack accounting", () => {
  it("computes remaining sessions from present marks only", () => {
    const s = summarizeApneaPacks(
      [{ sessionsTotal: 4, priceDA: 7800, withFins: false }],
      [{ status: "present" }, { status: "absent" }, { status: "present" }]
    );
    expect(s.sessionsAttended).toBe(2);
    expect(s.sessionsRemaining).toBe(2);
    expect(s.totalPriceDA).toBe(7800);
  });

  it("never goes below zero and sums several packs", () => {
    const s = summarizeApneaPacks(
      [
        { sessionsTotal: 4, priceDA: 10500, withFins: true },
        { sessionsTotal: 5, priceDA: 9750, withFins: false },
      ],
      Array.from({ length: 12 }, () => ({ status: "present" }))
    );
    expect(s.sessionsTotal).toBe(9);
    expect(s.sessionsRemaining).toBe(0);
    expect(s.hasFins).toBe(true);
  });
});

describe("apnea records", () => {
  const records = [
    { kind: "static", value: 90, recordedAt: "2026-10-01T10:00:00Z" },
    { kind: "static", value: 150, recordedAt: "2026-10-08T10:00:00Z" },
    { kind: "dynamic", value: 40, recordedAt: "2026-10-03T10:00:00Z" },
    { kind: "static", value: 120, recordedAt: "2026-10-15T10:00:00Z" },
  ];

  it("finds best records per kind", () => {
    expect(getBestApneaRecords(records)).toEqual({ staticSeconds: 150, dynamicMeters: 40 });
    expect(getBestApneaRecords([])).toEqual({ staticSeconds: null, dynamicMeters: null });
  });

  it("builds a chronological evolution series", () => {
    const series = buildApneaEvolution([...records].reverse(), "static");
    expect(series.map((p) => p.value)).toEqual([90, 150, 120]);
  });

  it("computes the 4 minute static goal percentage", () => {
    expect(getApneaStaticGoalPercent(null)).toBe(0);
    expect(getApneaStaticGoalPercent(120)).toBe(50);
    expect(getApneaStaticGoalPercent(240)).toBe(100);
    expect(getApneaStaticGoalPercent(400)).toBe(100);
  });

  it("formats durations", () => {
    expect(formatApneaDuration(185)).toBe("3:05");
    expect(formatApneaDuration(0)).toBe("0:00");
  });

  it("validates values", () => {
    expect(validateApneaRecordValue("static", 120)).toBeNull();
    expect(validateApneaRecordValue("static", 0)).toBe("invalid_value");
    expect(validateApneaRecordValue("static", 1.5)).toBe("invalid_value");
    expect(validateApneaRecordValue("static", 5000)).toBe("static_out_of_range");
    expect(validateApneaRecordValue("dynamic", 500)).toBe("dynamic_out_of_range");
  });
});

describe("session day key", () => {
  it("normalizes to UTC midnight", () => {
    expect(toApneaSessionDay("2026-10-21T18:45:00Z").toISOString()).toBe("2026-10-21T00:00:00.000Z");
  });
});
