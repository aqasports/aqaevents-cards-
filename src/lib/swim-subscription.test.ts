import { describe, it, expect } from "vitest";
import {
  getEffectiveSubscriptionStart,
  getEffectiveSubscriptionEnd,
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
  isEligibleForPaymentRequest,
  parseSidePocketBalance,
  encodeSidePocketBalance,
  parseLinkedEventCard,
  encodeLinkedEventCard,
  getFormulaUpgradeOptions,
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

  it("Starter client who crossed 25th remains 'unpaid' after calendar month rolls over to Nov 1+", () => {
    const starterMember = {
      duration: "1m",
      formula: "Starter",
      paymentStatus: "paid",
      dateOfStart: "2026-10-01T00:00:00.000Z",
      subscriptionStart: "2026-10-01T00:00:00.000Z",
      subscriptionEnd: "2026-10-31T00:00:00.000Z",
      payments: [
        { id: "p1", amount: 7800, paidAt: "2026-10-05T00:00:00.000Z", notes: "Oct initial" },
      ],
    };

    const nov1 = d("2026-11-01T10:00:00.000Z");
    const nov10 = d("2026-11-10T10:00:00.000Z");

    const resNov1 = getEffectiveMemberPaymentStatus(starterMember, nov1);
    expect(resNov1.isStarter).toBe(true);
    expect(resNov1.isAfterCutoff).toBe(true);
    expect(resNov1.isNextMonthPaid).toBe(false);
    expect(resNov1.effectiveStatus).toBe("unpaid");

    const resNov10 = getEffectiveMemberPaymentStatus(starterMember, nov10);
    expect(resNov10.isAfterCutoff).toBe(true);
    expect(resNov10.isNextMonthPaid).toBe(false);
    expect(resNov10.effectiveStatus).toBe("unpaid");
  });

  it("Starter client with stale multi-month subscriptionEnd in DB is capped and marked 'unpaid' without renewal payment", () => {
    const starterWithStaleEnd = {
      duration: "1m",
      formula: "Starter",
      paymentStatus: "paid",
      dateOfStart: "2026-10-01T00:00:00.000Z",
      subscriptionStart: "2026-10-01T00:00:00.000Z",
      subscriptionEnd: "2026-12-29T00:00:00.000Z", // Stale 3m date from pre-assignment
      payments: [
        { id: "p1", amount: 7800, paidAt: "2026-10-05T00:00:00.000Z", notes: "Oct payment" },
      ],
    };

    const effectiveEnd = getEffectiveSubscriptionEnd(starterWithStaleEnd);
    expect(effectiveEnd.toISOString().slice(0, 10)).toBe("2026-10-31");

    const nov1 = d("2026-11-01T10:00:00.000Z");
    const res = getEffectiveMemberPaymentStatus(starterWithStaleEnd, nov1);
    expect(res.effectiveStatus).toBe("unpaid");
    expect(res.isNextMonthPaid).toBe(false);
  });

  it("Starter client who makes renewal payment after Oct 25 or tagged [NEXT_MONTH:2026-11] is 'paid'", () => {
    const starterRenewed = {
      duration: "1m",
      formula: "Starter",
      paymentStatus: "paid",
      dateOfStart: "2026-10-01T00:00:00.000Z",
      subscriptionStart: "2026-10-01T00:00:00.000Z",
      subscriptionEnd: "2026-10-31T00:00:00.000Z",
      payments: [
        { id: "p1", amount: 7800, paidAt: "2026-10-05T00:00:00.000Z", notes: "Oct" },
        { id: "p2", amount: 7800, paidAt: "2026-10-26T14:00:00.000Z", notes: "Renewal Nov" },
      ],
    };

    const nov1 = d("2026-11-01T10:00:00.000Z");
    const res = getEffectiveMemberPaymentStatus(starterRenewed, nov1);
    expect(res.isNextMonthPaid).toBe(true);
    expect(res.effectiveStatus).toBe("paid");
  });

  describe("isEligibleForPaymentRequest: 10-day expiration rule for other formulas", () => {
    it("never shows other formulas if they have more than 10 days to expiration", () => {
      // 11 days or more left -> NOT eligible (hidden)
      expect(isEligibleForPaymentRequest(false, 11)).toBe(false);
      expect(isEligibleForPaymentRequest(false, 15)).toBe(false);
      expect(isEligibleForPaymentRequest(false, 30)).toBe(false);
      expect(isEligibleForPaymentRequest(false, 90)).toBe(false);
    });

    it("shows other formulas when they have 10 days or fewer to expiration", () => {
      // Exactly 10 days left -> eligible
      expect(isEligibleForPaymentRequest(false, 10)).toBe(true);
      // 5 days left -> eligible
      expect(isEligibleForPaymentRequest(false, 5)).toBe(true);
      // 1 day left -> eligible
      expect(isEligibleForPaymentRequest(false, 1)).toBe(true);
      // Expired today (0 days left) -> eligible
      expect(isEligibleForPaymentRequest(false, 0)).toBe(true);
      // Expired in past (-5 days) -> eligible
      expect(isEligibleForPaymentRequest(false, -5)).toBe(true);
    });

    it("Starter formulas remain eligible based on their monthly cycle regardless of daysLeft", () => {
      expect(isEligibleForPaymentRequest(true, 25)).toBe(true);
      expect(isEligibleForPaymentRequest(true, 12)).toBe(true);
      expect(isEligibleForPaymentRequest(true, 3)).toBe(true);
      expect(isEligibleForPaymentRequest(true, 0)).toBe(true);
      expect(isEligibleForPaymentRequest(true, -1)).toBe(true);
    });
  });

  describe("Starter Multi-Month Business Logic & Dynamic Cycle Tracking", () => {
    it("in November: expects same amount paid in October to be paid in November", () => {
      // Swimmer started Oct 1, paid 7800 for Oct
      const octSubscriber = {
        duration: "1m",
        formula: "G10",
        priceDA: 7800,
        paymentStatus: "paid",
        subscriptionStart: "2026-10-01T00:00:00.000Z",
        subscriptionEnd: "2026-10-31T00:00:00.000Z",
        payments: [
          { id: "p1", amount: 7800, paidAt: "2026-10-02T10:00:00.000Z" },
        ],
      };

      // In October (Oct 20): fully paid
      const oct20 = d("2026-10-20T10:00:00.000Z");
      const sitOct = getEffectiveMemberPaymentStatus(octSubscriber, oct20);
      expect(sitOct.effectiveStatus).toBe("paid");

      // In November (Nov 4): system expects 7800 for November! Status must be unpaid
      const nov4 = d("2026-11-04T12:00:00.000Z");
      const sitNov = getEffectiveMemberPaymentStatus(octSubscriber, nov4);
      expect(sitNov.effectiveStatus).toBe("unpaid");
      expect(sitNov.isNextMonthPaid).toBe(false);
      expect(sitNov.nextMonthKey).toBe("2026-11");

      // When November payment of 7800 is added: status becomes paid!
      const novSubscriberPaid = {
        ...octSubscriber,
        payments: [
          { id: "p1", amount: 7800, paidAt: "2026-10-02T10:00:00.000Z" },
          { id: "p2", amount: 7800, paidAt: "2026-11-04T14:00:00.000Z", notes: "Nov payment" },
        ],
      };
      const sitNovPaid = getEffectiveMemberPaymentStatus(novSubscriberPaid, nov4);
      expect(sitNovPaid.effectiveStatus).toBe("paid");
      expect(sitNovPaid.isNextMonthPaid).toBe(true);

      // On November 25: turns to unpaid for December!
      const nov25 = d("2026-11-25T10:00:00.000Z");
      const sitNov25 = getEffectiveMemberPaymentStatus(novSubscriberPaid, nov25);
      expect(sitNov25.isAfterCutoff).toBe(true);
      expect(sitNov25.isNextMonthPaid).toBe(false);
      expect(sitNov25.effectiveStatus).toBe("unpaid");
      expect(sitNov25.nextMonthKey).toBe("2026-12");
    });
  });

  describe("Side Pocket (Avoir Club) & Event Card Utilities", () => {
    it("parses and encodes side pocket balance", () => {
      expect(parseSidePocketBalance(null)).toBe(0);
      expect(parseSidePocketBalance("Some note | [SIDE_POCKET:2500]")).toBe(2500);
      expect(parseSidePocketBalance("No pocket here")).toBe(0);

      const encoded = encodeSidePocketBalance("Old note", 3000);
      expect(encoded).toContain("[SIDE_POCKET:3000]");
      expect(parseSidePocketBalance(encoded)).toBe(3000);

      const updated = encodeSidePocketBalance(encoded, 5000);
      expect(updated).toContain("[SIDE_POCKET:5000]");
      expect(updated).not.toContain("[SIDE_POCKET:3000]");

      const cleared = encodeSidePocketBalance(updated, 0);
      expect(cleared).not.toContain("[SIDE_POCKET:");
      expect(parseSidePocketBalance(cleared)).toBe(0);
    });

    it("parses and encodes linked AQA Event card", () => {
      expect(parseLinkedEventCard(null)).toBeNull();
      expect(parseLinkedEventCard("Swimmer note | [AQA_EVENT_CARD:CRD-90021]")).toEqual({
        cardCode: "CRD-90021",
        amount: undefined,
      });
      expect(parseLinkedEventCard("Swimmer note | [AQA_EVENT_CARD:CRD-90021:1500]")).toEqual({
        cardCode: "CRD-90021",
        amount: 1500,
      });

      const encoded = encodeLinkedEventCard("Note", "CRD-12345", 2000);
      expect(encoded).toContain("[AQA_EVENT_CARD:CRD-12345:2000]");
    });

    it("computes dynamic formula upgrade options from Starter", () => {
      const starterMember = {
        category: "homme",
        formula: "G10",
        duration: "1m",
        priceDA: 7800,
        payments: [{ amount: 7800 }],
      };

      const options = getFormulaUpgradeOptions(starterMember);
      expect(options).toHaveLength(3);

      const silver = options.find((o) => o.targetTier === "silver");
      expect(silver).toBeDefined();
      expect(silver?.targetDuration).toBe("3m");
      expect(silver?.totalPriceDA).toBe(21900);
      expect(silver?.currentPaidDA).toBe(7800);
      expect(silver?.complementDA).toBe(14100); // 21900 - 7800 = 14100 DA
      expect(silver?.savingsDA).toBe(1500); // 7800*3 - 21900 = 1500 DA saved

      const gold = options.find((o) => o.targetTier === "gold");
      expect(gold).toBeDefined();
      expect(gold?.targetDuration).toBe("6m");
      expect(gold?.totalPriceDA).toBe(43500);
      expect(gold?.complementDA).toBe(35700); // 43500 - 7800 = 35700 DA
      expect(gold?.savingsDA).toBe(3300);

      const diamond = options.find((o) => o.targetTier === "diamond");
      expect(diamond).toBeDefined();
      expect(diamond?.targetDuration).toBe("9m");
      expect(diamond?.totalPriceDA).toBe(65200);
      expect(diamond?.complementDA).toBe(57400); // 65200 - 7800 = 57400 DA
      expect(diamond?.savingsDA).toBe(5000);
    });
  });
});
