/**
 * AQA Swim Subscription Date Calculator
 *
 * Computes subscription end dates by counting forward the nominal duration
 * (in swimming days), skipping all excluded periods (Ramadan + Eid).
 *
 * Rules:
 * - Minimum subscription start: 1 October 2026
 * - Ramadan periods are fully excluded (no sessions during Ramadan)
 * - 3 days of Eid al-Fitr are excluded each year
 * - 3 days of Eid al-Adha are excluded each year
 * - Duration codes: "1m"=30 days, "3m"=90 days, "6m"=180 days, "9m"=270 days
 *
 * No emojis. Western Arabic numerals only.
 */

// ─── Minimum Subscription Start ──────────────────────────────────────────────

/** The earliest allowed subscription start date: 1 October 2026 */
export const SUBSCRIPTION_FLOOR = new Date("2026-10-01T00:00:00.000Z");

// ─── Excluded Periods ─────────────────────────────────────────────────────────

export interface ExcludedPeriod {
  label: string;
  /** First excluded day (inclusive) */
  start: Date;
  /** Last excluded day (inclusive) */
  end: Date;
}

/**
 * Official excluded periods for the AQA Swim subscription calendar.
 * These are editable by admins via the dedicated exclusion manager UI.
 * Dates are stored as UTC midnight.
 *
 * Algerian calendar estimates (2026-2027):
 * - Ramadan 2026:     17 Feb 2026 – 17 Mar 2026  (29 days)
 * - Eid al-Fitr 2026: 18 Mar 2026 – 20 Mar 2026  (3 days)
 * - Eid al-Adha 2026: 26 May 2026 – 28 May 2026  (3 days)
 * - Ramadan 2027:      8 Feb 2027 –  9 Mar 2027  (29 days)
 * - Eid al-Fitr 2027: 10 Mar 2027 – 12 Mar 2027  (3 days)
 * - Eid al-Adha 2027: 16 Jun 2027 – 18 Jun 2027  (3 days)
 */
export const DEFAULT_EXCLUDED_PERIODS: ExcludedPeriod[] = [
  {
    label: "Ramadan 2026",
    start: new Date("2026-02-17T00:00:00.000Z"),
    end:   new Date("2026-03-17T00:00:00.000Z"),
  },
  {
    label: "Eid al-Fitr 2026",
    start: new Date("2026-03-18T00:00:00.000Z"),
    end:   new Date("2026-03-20T00:00:00.000Z"),
  },
  {
    label: "Eid al-Adha 2026",
    start: new Date("2026-05-26T00:00:00.000Z"),
    end:   new Date("2026-05-28T00:00:00.000Z"),
  },
  {
    label: "Ramadan 2027",
    start: new Date("2027-02-08T00:00:00.000Z"),
    end:   new Date("2027-03-09T00:00:00.000Z"),
  },
  {
    label: "Eid al-Fitr 2027",
    start: new Date("2027-03-10T00:00:00.000Z"),
    end:   new Date("2027-03-12T00:00:00.000Z"),
  },
  {
    label: "Eid al-Adha 2027",
    start: new Date("2027-06-16T00:00:00.000Z"),
    end:   new Date("2027-06-18T00:00:00.000Z"),
  },
];

// ─── Duration Code → Calendar Day Count ──────────────────────────────────────

const DURATION_DAYS: Record<string, number> = {
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "9m": 270,
};

/**
 * Returns the nominal number of active swimming days for a duration code.
 * Falls back to 90 (3m) for unknown codes.
 */
export function durationToDays(durationCode: string | null | undefined): number {
  const code = (durationCode || "3m").toLowerCase().trim();
  return DURATION_DAYS[code] ?? 90;
}

// ─── Core Date Utilities ──────────────────────────────────────────────────────

/** Returns a new Date set to UTC midnight of the given date */
function toUTCMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Adds `n` calendar days to `d` (UTC midnight) */
function addDays(d: Date, n: number): Date {
  const result = new Date(d.getTime());
  result.setUTCDate(result.getUTCDate() + n);
  return result;
}

/**
 * Returns true if `day` falls within the excluded period [start, end] inclusive.
 * All comparisons are done at UTC midnight.
 */
function isExcluded(day: Date, periods: ExcludedPeriod[]): boolean {
  const t = day.getTime();
  for (const p of periods) {
    const s = toUTCMidnight(p.start).getTime();
    const e = toUTCMidnight(p.end).getTime();
    if (t >= s && t <= e) return true;
  }
  return false;
}

// ─── Main Exported Functions ──────────────────────────────────────────────────

/**
 * Returns true if the given duration code or formula corresponds to the Starter formula.
 * Starter is 1 month ("1m" / "starter").
 */
export function isStarterFormula(
  durationCode: string | null | undefined,
  formula?: string | null | undefined
): boolean {
  const d = (durationCode || "").toLowerCase().trim();
  const f = (formula || "").toLowerCase().trim();
  return d === "1m" || d.includes("starter") || f.includes("starter");
}

/**
 * Returns the last calendar day of the same month as `date` (at UTC midnight).
 * Business rule: Starter formulas must end on the last day of the starting month
 * and never exceed into another month.
 */
export function getLastDayOfSameMonth(date: Date): Date {
  const d = toUTCMidnight(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

/**
 * Returns the effective subscription start date.
 * If `rawDate` is before SUBSCRIPTION_FLOOR (1 Oct 2026), returns the floor instead.
 */
export function getEffectiveSubscriptionStart(rawDate: Date | string | null | undefined): Date {
  if (!rawDate) return toUTCMidnight(SUBSCRIPTION_FLOOR);
  const d = typeof rawDate === "string" ? new Date(rawDate) : rawDate;
  if (isNaN(d.getTime())) return toUTCMidnight(SUBSCRIPTION_FLOOR);
  const clamped = toUTCMidnight(d);
  return clamped >= toUTCMidnight(SUBSCRIPTION_FLOOR) ? clamped : toUTCMidnight(SUBSCRIPTION_FLOOR);
}

/**
 * Computes the subscription end date.
 *
 * Rules:
 * 1. Starter formula ("1m" / "starter"):
 *    Always ends on the last day of the starting month (never exceeds to another month).
 * 2. Other 3 formulas ("3m" Silver, "6m" Gold, "9m" Diamond):
 *    Walks forward active swimming days, skipping excluded periods (Ramadan & Eid),
 *    exceeding month boundaries as needed to complete the full period.
 *
 * @param startDate     Effective subscription start (already clamped)
 * @param durationCode  "1m" | "3m" | "6m" | "9m"
 * @param periods       Excluded periods to skip (defaults to DEFAULT_EXCLUDED_PERIODS)
 * @param formula       Optional formula name (e.g. "Starter", "G10")
 * @returns             The last day of the subscription (inclusive)
 */
export function computeSubscriptionEnd(
  startDate: Date | string,
  durationCode: string | null | undefined,
  periods: ExcludedPeriod[] = DEFAULT_EXCLUDED_PERIODS,
  formula?: string | null | undefined
): Date {
  const start = toUTCMidnight(
    typeof startDate === "string" ? new Date(startDate) : startDate
  );

  // Business Rule: Starter formula always ends on the last day of the same month
  if (isStarterFormula(durationCode, formula)) {
    return getLastDayOfSameMonth(start);
  }

  // The other 3 formulas (Silver, Gold, Diamond) work normally with exclusions
  const nominalDays = durationToDays(durationCode);

  let activeDaysCount = 0;
  let cursor = new Date(start.getTime());

  // Walk forward one day at a time. Count a day only when it is NOT excluded.
  // The end date is the cursor when we have accumulated `nominalDays` active days.
  while (activeDaysCount < nominalDays) {
    if (!isExcluded(cursor, periods)) {
      activeDaysCount++;
      if (activeDaysCount === nominalDays) break;
    }
    cursor = addDays(cursor, 1);
  }

  return cursor;
}

/**
 * Returns true when the subscription end date is within `thresholdDays` calendar
 * days from now (or already passed).
 */
export function isSubscriptionExpiringSoon(
  endDate: Date | string | null | undefined,
  thresholdDays = 14
): boolean {
  if (!endDate) return false;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  if (isNaN(end.getTime())) return false;
  const now = new Date();
  const msThreshold = thresholdDays * 24 * 60 * 60 * 1000;
  return end.getTime() - now.getTime() <= msThreshold;
}

/**
 * Returns the number of calendar days remaining in the subscription.
 * Negative values mean expired.
 */
export function subscriptionDaysLeft(endDate: Date | string | null | undefined): number {
  if (!endDate) return 0;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  if (isNaN(end.getTime())) return 0;
  const now = toUTCMidnight(new Date());
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/**
 * Returns "active" | "expiring_soon" | "expired" based on the end date.
 */
export function getSubscriptionStatus(
  endDate: Date | string | null | undefined
): "active" | "expiring_soon" | "expired" {
  const days = subscriptionDaysLeft(endDate);
  if (days < 0) return "expired";
  if (days <= 14) return "expiring_soon";
  return "active";
}

/**
 * Given a member's dateOfStart, duration, and optional formula, computes and returns
 * both the effective subscription start and end dates.
 */
export function computeMemberSubscriptionDates(
  dateOfStart: Date | string | null | undefined,
  duration: string | null | undefined,
  periods: ExcludedPeriod[] = DEFAULT_EXCLUDED_PERIODS,
  formula?: string | null | undefined
): { subscriptionStart: Date; subscriptionEnd: Date } {
  const subscriptionStart = getEffectiveSubscriptionStart(dateOfStart);
  const subscriptionEnd = computeSubscriptionEnd(subscriptionStart, duration, periods, formula);
  return { subscriptionStart, subscriptionEnd };
}

// ─── Next Month Subscription Utilities (Starter Formula) ─────────────────────

export const NEXT_MONTH_TAG_PREFIX = "[NEXT_MONTH:";

/**
 * Returns a new Date set to the 1st of the next calendar month (at UTC midnight)
 * relative to the given reference date (or current date if omitted/invalid).
 */
export function getNextMonthDate(referenceDate?: Date | string | null): Date {
  let base: Date;
  if (!referenceDate) {
    base = new Date();
  } else {
    base = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;
    if (isNaN(base.getTime())) base = new Date();
  }
  const utc = toUTCMidnight(base);
  return new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth() + 1, 1));
}

/**
 * Returns the last day of the next month (at UTC midnight) relative to referenceDate.
 */
export function getNextMonthEnd(referenceDate?: Date | string | null): Date {
  const nextMonthStart = getNextMonthDate(referenceDate);
  return getLastDayOfSameMonth(nextMonthStart);
}

/**
 * Returns a YYYY-MM formatted key for a given date (e.g. "2026-11").
 */
export function formatMonthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const MONTH_NAMES_FR = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"
];

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_NAMES_AR = [
  "يناير", "فبراير", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

/**
 * Formats month and year label, e.g. "Novembre 2026", "November 2026", "نوفمبر 2026".
 * Always uses Western Arabic numerals (0-9). No emojis.
 */
export function formatMonthLabel(
  date: Date | string,
  locale: "en" | "fr" | "ar" | string = "fr"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const monthIdx = d.getUTCMonth();
  const year = d.getUTCFullYear();

  let name = MONTH_NAMES_FR[monthIdx] || "";
  if (locale === "en") {
    name = MONTH_NAMES_EN[monthIdx] || "";
  } else if (locale === "ar") {
    name = MONTH_NAMES_AR[monthIdx] || "";
  }
  return `${name} ${year}`;
}

export interface NextMonthPaidResult {
  isPaid: boolean;
  amount: number;
  monthKey: string;
  monthLabel: string;
  paymentId?: string;
  paidAt?: string;
  notes?: string;
}

/**
 * Checks whether a member has a payment recorded for the next month
 * or has notes tagged with [NEXT_MONTH:YYYY-MM].
 */
export function isMemberNextMonthPaid(
  member: {
    notes?: string | null;
    subscriptionEnd?: Date | string | null;
    payments?: Array<{ id?: string; notes?: string | null; amount?: number; paidAt?: Date | string }>;
  } | null | undefined,
  targetMonthKey?: string,
  locale = "fr"
): NextMonthPaidResult {
  const defaultNextMonthDate = getNextMonthDate(member?.subscriptionEnd);
  const expectedMonthKey = targetMonthKey || formatMonthKey(defaultNextMonthDate);
  const monthLabel = formatMonthLabel(
    targetMonthKey ? new Date(`${targetMonthKey}-01T00:00:00.000Z`) : defaultNextMonthDate,
    locale
  );

  if (!member) {
    return { isPaid: false, amount: 0, monthKey: expectedMonthKey, monthLabel };
  }

  // 1. Look in payments array
  if (Array.isArray(member.payments) && member.payments.length > 0) {
    for (const p of member.payments) {
      const pNotes = p.notes || "";
      if (pNotes.includes(`[NEXT_MONTH:${expectedMonthKey}]`)) {
        return {
          isPaid: true,
          amount: p.amount || 0,
          monthKey: expectedMonthKey,
          monthLabel,
          paymentId: p.id,
          paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : undefined,
          notes: p.notes || undefined,
        };
      }
    }
  }

  // 2. Look in member.notes for [NEXT_MONTH_PAID:YYYY-MM]
  const memberNotes = member.notes || "";
  const match = memberNotes.match(/\[NEXT_MONTH_PAID:([0-9]{4}-[0-9]{2})\]/);
  if (match && match[1] === expectedMonthKey) {
    return {
      isPaid: true,
      amount: 0,
      monthKey: expectedMonthKey,
      monthLabel,
    };
  }

  return {
    isPaid: false,
    amount: 0,
    monthKey: expectedMonthKey,
    monthLabel,
  };
}

/**
 * Encodes or updates the [NEXT_MONTH_PAID:YYYY-MM] tag in member notes.
 */
export function encodeNextMonthPaidTag(
  notes: string | null | undefined,
  monthKey: string
): string {
  const tag = `[NEXT_MONTH_PAID:${monthKey}]`;
  const base = (notes || "").trim();
  if (!base) return tag;
  if (base.includes("[NEXT_MONTH_PAID:")) {
    return base.replace(/\[NEXT_MONTH_PAID:[0-9]{4}-[0-9]{2}\]/, tag);
  }
  return `${base} | ${tag}`;
}

export interface SwimmerNextMonthInfo {
  isStarter: boolean;
  targetMonthKey: string;
  targetMonthLabel: string;
  targetMonthDate: Date;
  targetMonthEndDate: Date;
  targetMonthStartDisplay: string;
  targetMonthEndDisplay: string;
  isPaid: boolean;
  paidAmount: number;
  paymentId?: string;
}

/**
 * Provides comprehensive next-month projection and payment status for a swimmer.
 */
export function getMemberNextMonthInfo(
  member: {
    duration?: string | null;
    formula?: string | null;
    notes?: string | null;
    subscriptionEnd?: Date | string | null;
    payments?: Array<{ id?: string; notes?: string | null; amount?: number; paidAt?: Date | string }>;
  } | null | undefined,
  locale = "fr"
): SwimmerNextMonthInfo {
  const isStarter = isStarterFormula(member?.duration, member?.formula);
  const targetMonthDate = getNextMonthDate(member?.subscriptionEnd);
  const targetMonthEndDate = getLastDayOfSameMonth(targetMonthDate);
  const targetMonthKey = formatMonthKey(targetMonthDate);
  const targetMonthLabel = formatMonthLabel(targetMonthDate, locale);

  const startDay = String(targetMonthDate.getUTCDate()).padStart(2, "0");
  const startMonth = String(targetMonthDate.getUTCMonth() + 1).padStart(2, "0");
  const startYear = targetMonthDate.getUTCFullYear();
  const targetMonthStartDisplay = `${startDay}/${startMonth}/${startYear}`;

  const endDay = String(targetMonthEndDate.getUTCDate()).padStart(2, "0");
  const endMonth = String(targetMonthEndDate.getUTCMonth() + 1).padStart(2, "0");
  const endYear = targetMonthEndDate.getUTCFullYear();
  const targetMonthEndDisplay = `${endDay}/${endMonth}/${endYear}`;

  const paidResult = isMemberNextMonthPaid(member, targetMonthKey, locale);

  return {
    isStarter,
    targetMonthKey,
    targetMonthLabel,
    targetMonthDate,
    targetMonthEndDate,
    targetMonthStartDisplay,
    targetMonthEndDisplay,
    isPaid: paidResult.isPaid,
    paidAmount: paidResult.amount,
    paymentId: paidResult.paymentId,
  };
}
