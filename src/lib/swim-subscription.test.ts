import { describe, it, expect } from "vitest";
import {
  getEffectiveSubscriptionStart,
  computeSubscriptionEnd,
  isSubscriptionExpiringSoon,
  subscriptionDaysLeft,
  getSubscriptionStatus,
  computeMemberSubscriptionDates,
  SUBSCRIPTION_FLOOR,
  DEFAULT_EXCLUDED_PERIODS,
} from "./swim-subscription";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function d(iso: string): Date {
  return new Date(iso);
}

// ─── getEffectiveSubscriptionStart ───────────────────────────────────────────

describe("getEffectiveSubscriptionStart", () => {
  it("returns Oct 1 2026 when date is before the floor", () => {
    const result = getEffectiveSubscriptionStart(d("2026-05-01T00:00:00.000Z"));
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(9); // 0-indexed: 9 = October
    expect(result.getUTCDate()).toBe(1);
  });

  it("returns Oct 1 2026 for a date exactly on the floor", () => {
    const result = getEffectiveSubscriptionStart(d("2026-10-01T00:00:00.000Z"));
    expect(result.toISOString().slice(0, 10)).toBe("2026-10-01");
  });

  it("returns the actual date when it is after the floor", () => {
    const result = getEffectiveSubscriptionStart(d("2027-01-15T00:00:00.000Z"));
    expect(result.toISOString().slice(0, 10)).toBe("2027-01-15");
  });

  it("falls back to the floor when passed null", () => {
    const result = getEffectiveSubscriptionStart(null);
    expect(result.toISOString().slice(0, 10)).toBe("2026-10-01");
  });

  it("falls back to the floor when passed undefined", () => {
    const result = getEffectiveSubscriptionStart(undefined);
    expect(result.toISOString().slice(0, 10)).toBe("2026-10-01");
  });
});

// ─── computeSubscriptionEnd (no exclusions) ───────────────────────────────────

describe("computeSubscriptionEnd with empty exclusions", () => {
  const noExclusions: typeof DEFAULT_EXCLUDED_PERIODS = [];

  it("1m (30 days) starting Oct 1 2026 ends Oct 30 2026", () => {
    const end = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "1m", noExclusions);
    expect(end.toISOString().slice(0, 10)).toBe("2026-10-30");
  });

  it("3m (90 days) starting Oct 1 2026 ends Dec 29 2026", () => {
    const end = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "3m", noExclusions);
    expect(end.toISOString().slice(0, 10)).toBe("2026-12-29");
  });

  it("6m (180 days) starting Oct 1 2026 ends Mar 29 2027", () => {
    const end = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "6m", noExclusions);
    expect(end.toISOString().slice(0, 10)).toBe("2027-03-29");
  });

  it("9m (270 days) starting Oct 1 2026 ends Jun 27 2027", () => {
    const end = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "9m", noExclusions);
    expect(end.toISOString().slice(0, 10)).toBe("2027-06-27");
  });

  it("defaults to 3m (90 days) for unknown duration", () => {
    const end = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), null, noExclusions);
    expect(end.toISOString().slice(0, 10)).toBe("2026-12-29");
  });
});

// ─── computeSubscriptionEnd (with Ramadan 2027 exclusion) ────────────────────

describe("computeSubscriptionEnd with Ramadan exclusion", () => {
  const ramadan2027Only = [
    {
      label: "Ramadan 2027",
      start: new Date("2027-02-08T00:00:00.000Z"),
      end:   new Date("2027-03-09T00:00:00.000Z"),
    },
  ];

  it("6m subscription crossing Ramadan 2027 is extended by 30 days", () => {
    // Starting Oct 1 2026, 6m without exclusions ends Mar 29 2027
    // With Ramadan 2027 (29 excluded days within that window), ends later
    const end = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "6m", ramadan2027Only);
    const endNoExcl = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "6m", []);
    expect(end.getTime()).toBeGreaterThan(endNoExcl.getTime());
  });
});

// ─── computeSubscriptionEnd with Eid exclusions ───────────────────────────────

describe("computeSubscriptionEnd with Eid exclusion", () => {
  const eidFitr2026 = [
    {
      label: "Eid al-Fitr 2026",
      start: new Date("2026-03-18T00:00:00.000Z"),
      end:   new Date("2026-03-20T00:00:00.000Z"),
    },
  ];

  it("subscription not crossing Eid window is unaffected", () => {
    // Oct 1 2026 start — Eid al-Fitr 2026 is in March 2026, already passed
    const endWith = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "3m", eidFitr2026);
    const endWithout = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "3m", []);
    expect(endWith.toISOString().slice(0, 10)).toBe(endWithout.toISOString().slice(0, 10));
  });

  it("subscription crossing Eid adds exactly 3 days to end", () => {
    const eidFitr2027 = [
      {
        label: "Eid al-Fitr 2027",
        start: new Date("2027-03-10T00:00:00.000Z"),
        end:   new Date("2027-03-12T00:00:00.000Z"),
      },
    ];
    const endWith = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "6m", eidFitr2027);
    const endWithout = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "6m", []);
    const diffMs = endWith.getTime() - endWithout.getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    expect(diffDays).toBe(3);
  });
});

// ─── isSubscriptionExpiringSoon ───────────────────────────────────────────────

describe("isSubscriptionExpiringSoon", () => {
  it("returns true when end date is today", () => {
    expect(isSubscriptionExpiringSoon(new Date(), 14)).toBe(true);
  });

  it("returns true when end date is 13 days from now", () => {
    const soon = new Date();
    soon.setUTCDate(soon.getUTCDate() + 13);
    expect(isSubscriptionExpiringSoon(soon, 14)).toBe(true);
  });

  it("returns false when end date is 30 days from now", () => {
    const later = new Date();
    later.setUTCDate(later.getUTCDate() + 30);
    expect(isSubscriptionExpiringSoon(later, 14)).toBe(false);
  });

  it("returns true for an already expired date", () => {
    const past = new Date("2020-01-01T00:00:00.000Z");
    expect(isSubscriptionExpiringSoon(past, 14)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isSubscriptionExpiringSoon(null, 14)).toBe(false);
  });
});

// ─── getSubscriptionStatus ────────────────────────────────────────────────────

describe("getSubscriptionStatus", () => {
  it("returns 'expired' for past date", () => {
    expect(getSubscriptionStatus(new Date("2020-01-01T00:00:00.000Z"))).toBe("expired");
  });

  it("returns 'expiring_soon' when within 14 days", () => {
    const soon = new Date();
    soon.setUTCDate(soon.getUTCDate() + 7);
    expect(getSubscriptionStatus(soon)).toBe("expiring_soon");
  });

  it("returns 'active' when more than 14 days remain", () => {
    const later = new Date();
    later.setUTCDate(later.getUTCDate() + 60);
    expect(getSubscriptionStatus(later)).toBe("active");
  });
});

// ─── computeMemberSubscriptionDates ──────────────────────────────────────────

describe("computeMemberSubscriptionDates", () => {
  it("clamps early date to Oct 1 2026 and computes 3m end", () => {
    const { subscriptionStart, subscriptionEnd } = computeMemberSubscriptionDates(
      "2026-01-15T00:00:00.000Z",
      "3m",
      []
    );
    expect(subscriptionStart.toISOString().slice(0, 10)).toBe("2026-10-01");
    expect(subscriptionEnd.toISOString().slice(0, 10)).toBe("2026-12-29");
  });

  it("uses actual date when after Oct 1 2026", () => {
    const { subscriptionStart } = computeMemberSubscriptionDates(
      "2026-11-01T00:00:00.000Z",
      "3m",
      []
    );
    expect(subscriptionStart.toISOString().slice(0, 10)).toBe("2026-11-01");
  });
});
