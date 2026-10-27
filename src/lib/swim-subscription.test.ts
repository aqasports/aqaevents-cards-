import { describe, it, expect } from "vitest";
import {
  getEffectiveSubscriptionStart,
  computeSubscriptionEnd,
  isSubscriptionExpiringSoon,
  subscriptionDaysLeft,
  getSubscriptionStatus,
  computeMemberSubscriptionDates,
  isStarterFormula,
  getLastDayOfSameMonth,
  SUBSCRIPTION_FLOOR,
  DEFAULT_EXCLUDED_PERIODS,
  getNextMonthDate,
  getNextMonthEnd,
  formatMonthKey,
  formatMonthLabel,
  isMemberNextMonthPaid,
  encodeNextMonthPaidTag,
  getMemberNextMonthInfo,
  getFormulaBadgeInfo,
  getEffectiveMemberPaymentStatus,
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

// ─── isStarterFormula & getLastDayOfSameMonth ─────────────────────────────────

describe("Starter Formula Rule Utilities", () => {
  it("correctly identifies Starter formula from duration or formula", () => {
    expect(isStarterFormula("1m")).toBe(true);
    expect(isStarterFormula("1m", "G10")).toBe(true);
    expect(isStarterFormula("3m", "Starter")).toBe(true);
    expect(isStarterFormula(null, "starter pass")).toBe(true);
    expect(isStarterFormula("3m", "G10")).toBe(false);
    expect(isStarterFormula("6m", "MAX5")).toBe(false);
    expect(isStarterFormula("9m", "Individuel")).toBe(false);
  });

  it("calculates the last day of the same calendar month", () => {
    expect(getLastDayOfSameMonth(d("2026-10-07T00:00:00.000Z")).toISOString().slice(0, 10)).toBe("2026-10-31");
    expect(getLastDayOfSameMonth(d("2026-10-01T00:00:00.000Z")).toISOString().slice(0, 10)).toBe("2026-10-31");
    expect(getLastDayOfSameMonth(d("2026-10-25T00:00:00.000Z")).toISOString().slice(0, 10)).toBe("2026-10-31");
    expect(getLastDayOfSameMonth(d("2026-11-15T00:00:00.000Z")).toISOString().slice(0, 10)).toBe("2026-11-30");
    expect(getLastDayOfSameMonth(d("2027-02-10T00:00:00.000Z")).toISOString().slice(0, 10)).toBe("2027-02-28");
  });
});

// ─── computeSubscriptionEnd ───────────────────────────────────────────────────

describe("computeSubscriptionEnd: Starter formula month-boundary rule", () => {
  const noExclusions: typeof DEFAULT_EXCLUDED_PERIODS = [];

  it("Starter starting Oct 1 2026 ends Oct 31 2026 (never exceeds to Nov)", () => {
    const end = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "1m", noExclusions);
    expect(end.toISOString().slice(0, 10)).toBe("2026-10-31");
  });

  it("Starter starting Oct 7 2026 ends Oct 31 2026 (never exceeds to Nov)", () => {
    const end = computeSubscriptionEnd(d("2026-10-07T00:00:00.000Z"), "1m", noExclusions);
    expect(end.toISOString().slice(0, 10)).toBe("2026-10-31");
  });

  it("Starter entering in last week (Oct 25 2026) ends Oct 31 2026", () => {
    const end = computeSubscriptionEnd(d("2026-10-25T00:00:00.000Z"), "1m", noExclusions);
    expect(end.toISOString().slice(0, 10)).toBe("2026-10-31");
  });

  it("Starter identified via formula name ends on the last day of month", () => {
    const end = computeSubscriptionEnd(d("2026-10-12T00:00:00.000Z"), "1m", noExclusions, "Starter");
    expect(end.toISOString().slice(0, 10)).toBe("2026-10-31");
  });
});

describe("computeSubscriptionEnd: The other 3 formulas work normally and exceed 31-day barrier", () => {
  const noExclusions: typeof DEFAULT_EXCLUDED_PERIODS = [];

  it("3m (90 days) starting Oct 1 2026 ends Dec 29 2026 (crosses month barriers)", () => {
    const end = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "3m", noExclusions);
    expect(end.toISOString().slice(0, 10)).toBe("2026-12-29");
  });

  it("6m (180 days) starting Oct 1 2026 ends Mar 29 2027 (crosses month barriers)", () => {
    const end = computeSubscriptionEnd(d("2026-10-01T00:00:00.000Z"), "6m", noExclusions);
    expect(end.toISOString().slice(0, 10)).toBe("2027-03-29");
  });

  it("9m (270 days) starting Oct 1 2026 ends Jun 27 2027 (crosses month barriers)", () => {
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

// ─── Next Month Subscription Utilities ───────────────────────────────────────

describe("Next Month Subscription Utilities (Starter Formula)", () => {
  it("getNextMonthDate computes 1st of next month correctly", () => {
    const next1 = getNextMonthDate("2026-10-15T00:00:00.000Z");
    expect(next1.toISOString().slice(0, 10)).toBe("2026-11-01");

    const next2 = getNextMonthDate("2026-10-31T00:00:00.000Z");
    expect(next2.toISOString().slice(0, 10)).toBe("2026-11-01");

    const nextDec = getNextMonthDate("2026-12-10T00:00:00.000Z");
    expect(nextDec.toISOString().slice(0, 10)).toBe("2027-01-01");
  });

  it("getNextMonthEnd returns the last day of next month", () => {
    const endNov = getNextMonthEnd("2026-10-27T00:00:00.000Z");
    expect(endNov.toISOString().slice(0, 10)).toBe("2026-11-30");

    const endFeb = getNextMonthEnd("2027-01-05T00:00:00.000Z");
    expect(endFeb.toISOString().slice(0, 10)).toBe("2027-02-28");
  });

  it("formatMonthKey and formatMonthLabel work as expected", () => {
    const date = new Date("2026-11-01T00:00:00.000Z");
    expect(formatMonthKey(date)).toBe("2026-11");
    expect(formatMonthLabel(date, "fr")).toBe("Novembre 2026");
    expect(formatMonthLabel(date, "en")).toBe("November 2026");
    expect(formatMonthLabel(date, "ar")).toBe("نوفمبر 2026");
  });

  it("isMemberNextMonthPaid identifies payment tagged with [NEXT_MONTH:YYYY-MM]", () => {
    const member = {
      subscriptionEnd: "2026-10-31T00:00:00.000Z",
      payments: [
        { id: "p1", amount: 7800, notes: "Regular October payment" },
        { id: "p2", amount: 7800, notes: "[NEXT_MONTH:2026-11] Paiement Novembre 2026" },
      ],
    };

    const res = isMemberNextMonthPaid(member, "2026-11");
    expect(res.isPaid).toBe(true);
    expect(res.amount).toBe(7800);
    expect(res.paymentId).toBe("p2");
    expect(res.monthKey).toBe("2026-11");
  });

  it("isMemberNextMonthPaid identifies tag in member notes", () => {
    const member = {
      subscriptionEnd: "2026-10-31T00:00:00.000Z",
      notes: "VIP Member | [NEXT_MONTH_PAID:2026-11]",
      payments: [],
    };

    const res = isMemberNextMonthPaid(member, "2026-11");
    expect(res.isPaid).toBe(true);
    expect(res.monthKey).toBe("2026-11");
  });

  it("isMemberNextMonthPaid returns false when not paid", () => {
    const member = {
      subscriptionEnd: "2026-10-31T00:00:00.000Z",
      payments: [{ id: "p1", amount: 7800, notes: "Only October" }],
    };

    const res = isMemberNextMonthPaid(member, "2026-11");
    expect(res.isPaid).toBe(false);
  });

  it("encodeNextMonthPaidTag appends or updates tag properly", () => {
    expect(encodeNextMonthPaidTag(null, "2026-11")).toBe("[NEXT_MONTH_PAID:2026-11]");
    expect(encodeNextMonthPaidTag("Existing notes", "2026-11")).toBe("Existing notes | [NEXT_MONTH_PAID:2026-11]");
    expect(encodeNextMonthPaidTag("Existing | [NEXT_MONTH_PAID:2026-10]", "2026-11")).toBe("Existing | [NEXT_MONTH_PAID:2026-11]");
  });

  it("getMemberNextMonthInfo returns complete projection object", () => {
    const member = {
      formula: "G10",
      duration: "1m",
      subscriptionEnd: "2026-10-31T00:00:00.000Z",
      payments: [
        { id: "p-adv", amount: 7800, notes: "[NEXT_MONTH:2026-11] Advance payment" },
      ],
    };

    const info = getMemberNextMonthInfo(member, "fr");
    expect(info.isStarter).toBe(true);
    expect(info.targetMonthKey).toBe("2026-11");
    expect(info.targetMonthLabel).toBe("Novembre 2026");
    expect(info.targetMonthStartDisplay).toBe("01/11/2026");
    expect(info.targetMonthEndDisplay).toBe("30/11/2026");
    expect(info.isPaid).toBe(true);
    expect(info.paidAmount).toBe(7800);
    expect(info.paymentId).toBe("p-adv");
  });
});

// ─── Formula Badge Resolver ───────────────────────────────────────────────────

describe("getFormulaBadgeInfo", () => {
  it("resolves Starter formula (1m)", () => {
    const res = getFormulaBadgeInfo("1m", "G10");
    expect(res.tier).toBe("starter");
    expect(res.label).toBe("Starter");
    expect(res.duration).toBe("1m");
    expect(res.tone).toBe("sky");
  });

  it("resolves Silver formula (3m)", () => {
    const res = getFormulaBadgeInfo("3m", "Silver Pass");
    expect(res.tier).toBe("silver");
    expect(res.label).toBe("Silver");
    expect(res.duration).toBe("3m");
    expect(res.tone).toBe("slate");
  });

  it("resolves Gold formula (6m)", () => {
    const res = getFormulaBadgeInfo("6m", "Gold Pass");
    expect(res.tier).toBe("gold");
    expect(res.label).toBe("Gold");
    expect(res.duration).toBe("6m");
    expect(res.tone).toBe("amber");
  });

  it("resolves Diamond formula (9m)", () => {
    const res = getFormulaBadgeInfo("9m", "Diamond Pass");
    expect(res.tier).toBe("diamond");
    expect(res.label).toBe("Diamond");
    expect(res.duration).toBe("9m");
    expect(res.tone).toBe("purple");
  });
});

// ─── Effective Member Payment Status (25th Cut-off Rule) ──────────────────────

describe("getEffectiveMemberPaymentStatus (25th Cut-off Rule)", () => {
  const day24 = new Date("2026-10-24T12:00:00.000Z");
  const day25 = new Date("2026-10-25T12:00:00.000Z");
  const day28 = new Date("2026-10-28T12:00:00.000Z");

  it("Starter client on day 24 with paid status stays 'paid'", () => {
    const starterMember = {
      duration: "1m",
      formula: "Starter",
      paymentStatus: "paid",
      subscriptionEnd: "2026-10-31T00:00:00.000Z",
      payments: [],
    };

    const res = getEffectiveMemberPaymentStatus(starterMember, day24);
    expect(res.isStarter).toBe(true);
    expect(res.isAfterCutoff).toBe(false);
    expect(res.effectiveStatus).toBe("paid");
  });

  it("Starter client on/after day 25 without next month payment changes to 'unpaid'", () => {
    const starterMember = {
      duration: "1m",
      formula: "Starter",
      paymentStatus: "paid",
      subscriptionEnd: "2026-10-31T00:00:00.000Z",
      payments: [{ id: "p1", amount: 7800, notes: "Current month payment only" }],
    };

    const res25 = getEffectiveMemberPaymentStatus(starterMember, day25);
    expect(res25.isStarter).toBe(true);
    expect(res25.isAfterCutoff).toBe(true);
    expect(res25.isNextMonthPaid).toBe(false);
    expect(res25.effectiveStatus).toBe("unpaid");

    const res28 = getEffectiveMemberPaymentStatus(starterMember, day28);
    expect(res28.effectiveStatus).toBe("unpaid");
  });

  it("Starter client on/after day 25 with next month payment remains 'paid'", () => {
    const starterMember = {
      duration: "1m",
      formula: "Starter",
      paymentStatus: "paid",
      subscriptionEnd: "2026-10-31T00:00:00.000Z",
      payments: [
        { id: "p-adv", amount: 7800, notes: "[NEXT_MONTH:2026-11] Advance payment for Nov" },
      ],
    };

    const res = getEffectiveMemberPaymentStatus(starterMember, day25);
    expect(res.isStarter).toBe(true);
    expect(res.isAfterCutoff).toBe(true);
    expect(res.isNextMonthPaid).toBe(true);
    expect(res.effectiveStatus).toBe("paid");
  });

  it("Starter client on/after day 25 with [NEXT_MONTH_PAID:YYYY-MM] notes tag remains 'paid'", () => {
    const starterMember = {
      duration: "1m",
      formula: "Starter",
      paymentStatus: "paid",
      notes: "Member notes | [NEXT_MONTH_PAID:2026-11]",
      subscriptionEnd: "2026-10-31T00:00:00.000Z",
      payments: [],
    };

    const res = getEffectiveMemberPaymentStatus(starterMember, day28);
    expect(res.isStarter).toBe(true);
    expect(res.isAfterCutoff).toBe(true);
    expect(res.isNextMonthPaid).toBe(true);
    expect(res.effectiveStatus).toBe("paid");
  });

  it("Multi-month formula (Silver 3m) is unaffected by the monthly 25th cut-off", () => {
    const silverMember = {
      duration: "3m",
      formula: "Silver Pass",
      paymentStatus: "paid",
      subscriptionEnd: "2026-12-31T00:00:00.000Z",
      payments: [],
    };

    const res = getEffectiveMemberPaymentStatus(silverMember, day25);
    expect(res.isStarter).toBe(false);
    expect(res.isAfterCutoff).toBe(false);
    expect(res.effectiveStatus).toBe("paid");
  });

  it("Multi-month formula (Gold 6m) remains 'paid' across cut-off", () => {
    const goldMember = {
      duration: "6m",
      formula: "Gold Pass",
      paymentStatus: "paid",
      subscriptionEnd: "2027-03-31T00:00:00.000Z",
      payments: [],
    };

    const res = getEffectiveMemberPaymentStatus(goldMember, day28);
    expect(res.isStarter).toBe(false);
    expect(res.effectiveStatus).toBe("paid");
  });

  it("Multi-month formula (Diamond 9m) remains 'paid' across cut-off", () => {
    const diamondMember = {
      duration: "9m",
      formula: "Diamond Pass",
      paymentStatus: "paid",
      subscriptionEnd: "2027-06-30T00:00:00.000Z",
      payments: [],
    };

    const res = getEffectiveMemberPaymentStatus(diamondMember, day28);
    expect(res.isStarter).toBe(false);
    expect(res.effectiveStatus).toBe("paid");
  });
});
