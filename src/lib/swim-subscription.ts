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
 * Payment Request eligibility rule:
 * - Starter formula (1m): Eligible on its monthly billing cycle.
 * - Other formulas (Silver 3m, Gold 6m, Diamond 9m):
 *   Never show clients that still have more than 10 days to expiration (must have daysLeft <= 10).
 */
export function isEligibleForPaymentRequest(
  isStarter: boolean,
  daysLeft: number
): boolean {
  if (isStarter) return true;
  return daysLeft <= 10;
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
    payments?: Array<{ id?: string; notes?: string | null; amount?: number; paidAt?: Date | string | null }>;
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
 * Resolves the effective subscription end date for a member.
 * For Starter (1m) subscribers, enforces the strict month-end boundary rule
 * (last day of the starting month, or last day of the latest paid [NEXT_MONTH:YYYY-MM] cycle),
 * preventing stale multi-month end dates in the database from misrepresenting Starter periods.
 */
export function getEffectiveSubscriptionEnd(
  member: {
    duration?: string | null;
    formula?: string | null;
    dateOfStart?: Date | string | null;
    subscriptionStart?: Date | string | null;
    subscriptionEnd?: Date | string | null;
    notes?: string | null;
    payments?: Array<{ notes?: string | null; paidAt?: Date | string | null }>;
  } | null | undefined,
  periods: ExcludedPeriod[] = DEFAULT_EXCLUDED_PERIODS
): Date {
  const isStarter = isStarterFormula(member?.duration, member?.formula);
  const hasStart = Boolean(member?.subscriptionStart || member?.dateOfStart);
  const subStart = hasStart
    ? getEffectiveSubscriptionStart(member?.subscriptionStart ?? member?.dateOfStart)
    : member?.subscriptionEnd
    ? toUTCMidnight(new Date(member.subscriptionEnd))
    : getEffectiveSubscriptionStart(null);

  if (!isStarter) {
    if (member?.subscriptionEnd) {
      const parsed = new Date(member.subscriptionEnd);
      if (!isNaN(parsed.getTime())) {
        return toUTCMidnight(parsed);
      }
    }
    return computeSubscriptionEnd(subStart, member?.duration, periods, member?.formula);
  }

  let end = getLastDayOfSameMonth(subStart);

  // Check if any [NEXT_MONTH:YYYY-MM] or [NEXT_MONTH_PAID:YYYY-MM] extends the Starter end date
  const monthKeys: string[] = [];
  const notesMatch = (member?.notes || "").match(/\[NEXT_MONTH_PAID:([0-9]{4}-[0-9]{2})\]/);
  if (notesMatch && notesMatch[1]) {
    monthKeys.push(notesMatch[1]);
  }
  if (Array.isArray(member?.payments)) {
    for (const p of member.payments) {
      const m = (p?.notes || "").match(/\[NEXT_MONTH:([0-9]{4}-[0-9]{2})\]/);
      if (m && m[1]) {
        monthKeys.push(m[1]);
      }
    }
  }

  for (const key of monthKeys) {
    const paidMonthStart = new Date(`${key}-01T00:00:00.000Z`);
    if (!isNaN(paidMonthStart.getTime())) {
      const paidMonthEnd = getLastDayOfSameMonth(paidMonthStart);
      if (paidMonthEnd.getTime() > end.getTime()) {
        end = paidMonthEnd;
      }
    }
  }

  return end;
}

/**
 * Provides comprehensive next-month projection and payment status for a swimmer.
 */
export function getMemberNextMonthInfo(
  member: {
    duration?: string | null;
    formula?: string | null;
    paymentStatus?: string | null;
    priceDA?: number | null;
    notes?: string | null;
    dateOfStart?: Date | string | null;
    subscriptionStart?: Date | string | null;
    subscriptionEnd?: Date | string | null;
    payments?: Array<{ id?: string; notes?: string | null; amount?: number; paidAt?: Date | string | null }>;
  } | null | undefined,
  locale = "fr",
  referenceDate?: Date
): SwimmerNextMonthInfo {
  const isStarter = isStarterFormula(member?.duration, member?.formula);

  let targetMonthDate: Date;
  if (isStarter && (referenceDate || member?.subscriptionStart || member?.dateOfStart)) {
    const effStatus = getEffectiveMemberPaymentStatus(member, referenceDate ?? new Date(), locale);
    targetMonthDate = new Date(`${effStatus.nextMonthKey}-01T00:00:00.000Z`);
  } else {
    targetMonthDate = getNextMonthDate(member?.subscriptionEnd);
  }

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
  const effCheck = isStarter
    ? getEffectiveMemberPaymentStatus(member, referenceDate ?? new Date(), locale)
    : null;
  const isPaid = paidResult.isPaid || Boolean(effCheck && effCheck.nextMonthKey === targetMonthKey && effCheck.isNextMonthPaid);
  const paidAmount = paidResult.amount || effCheck?.nextMonthAmount || 0;

  return {
    isStarter,
    targetMonthKey,
    targetMonthLabel,
    targetMonthDate,
    targetMonthEndDate,
    targetMonthStartDisplay,
    targetMonthEndDisplay,
    isPaid,
    paidAmount,
    paymentId: paidResult.paymentId,
  };
}

// ─── Formula Tier Badge & Effective Payment Status ────────────────────────────

export type SwimFormulaTier = "starter" | "silver" | "gold" | "diamond";

export interface FormulaBadgeInfo {
  tier: SwimFormulaTier;
  label: string;
  duration: string;
  pillClass: string;
  tone: "sky" | "slate" | "amber" | "purple";
}

/**
 * Resolves the formula tier badge info (label, duration code, styling).
 * Starter: 1m (Sky Blue)
 * Silver: 3m (Slate / Silver)
 * Gold: 6m (Amber / Gold)
 * Diamond: 9m (Purple / Diamond)
 *
 * Strictly Western Arabic numerals (0-9). No emojis.
 */
export function getFormulaBadgeInfo(
  duration?: string | null,
  formula?: string | null
): FormulaBadgeInfo {
  const d = (duration || "").toLowerCase().trim();
  const f = (formula || "").toLowerCase().trim();

  if (d === "9m" || f.includes("diamond") || f.includes("econom")) {
    return {
      tier: "diamond",
      label: "Diamond",
      duration: "9m",
      pillClass: "bg-purple-950/80 text-purple-300 border-purple-500/40",
      tone: "purple",
    };
  }
  if (d === "6m" || f.includes("gold") || f.includes("recommand")) {
    return {
      tier: "gold",
      label: "Gold",
      duration: "6m",
      pillClass: "bg-amber-950/80 text-amber-300 border-amber-500/40",
      tone: "amber",
    };
  }
  if (d === "3m" || f.includes("silver") || f.includes("decouverte")) {
    return {
      tier: "silver",
      label: "Silver",
      duration: "3m",
      pillClass: "bg-slate-800 text-slate-200 border-slate-600/50",
      tone: "slate",
    };
  }
  // Default to Starter (1m)
  return {
    tier: "starter",
    label: "Starter",
    duration: "1m",
    pillClass: "bg-sky-950/80 text-sky-300 border-sky-500/40",
    tone: "sky",
  };
}

export type EffectivePaymentStatus = "paid" | "partial" | "unpaid";

export interface EffectivePaymentStatusResult {
  effectiveStatus: EffectivePaymentStatus;
  originalStatus: string;
  isStarter: boolean;
  isAfterCutoff: boolean;
  isNextMonthPaid: boolean;
  nextMonthKey: string;
  nextMonthLabel: string;
  nextMonthAmount?: number;
}

/**
 * Evaluates the effective payment status for a swimmer.
 *
 * Rules:
 * - Premium formulas (Silver 3m, Gold 6m, Diamond 9m) maintain their recorded paymentStatus (paid/partial/unpaid).
 * - Starter formula (1m) follows a strict monthly cycle:
 *   - On or after the 25th of the month:
 *     If the member has NOT paid for the next month, their effective payment status becomes "unpaid".
 *     If the member HAS paid for the next month (via [NEXT_MONTH:YYYY-MM] payment, [NEXT_MONTH_PAID:YYYY-MM] notes,
 *     or active subscriptionEnd covering next month), they remain "paid".
 *   - Before the 25th of the month:
 *     Reflects their recorded paymentStatus (paid/partial/unpaid), or "paid" if advance payment was already recorded.
 *
 * Strictly Western Arabic numerals (0-9). No emojis.
 */
export function getEffectiveMemberPaymentStatus(
  member: {
    duration?: string | null;
    formula?: string | null;
    paymentStatus?: string | null;
    priceDA?: number | null;
    notes?: string | null;
    dateOfStart?: Date | string | null;
    subscriptionStart?: Date | string | null;
    subscriptionEnd?: Date | string | null;
    payments?: Array<{ id?: string; notes?: string | null; amount?: number; paidAt?: Date | string | null }>;
  } | null | undefined,
  referenceDate: Date = new Date(),
  locale = "fr"
): EffectivePaymentStatusResult {
  const originalStatus = (member?.paymentStatus || "unpaid").toLowerCase().trim();
  const isStarter = isStarterFormula(member?.duration, member?.formula);

  const defaultNextMonthDate = getNextMonthDate(referenceDate);
  const defaultNextMonthKey = formatMonthKey(defaultNextMonthDate);
  const defaultNextMonthLabel = formatMonthLabel(defaultNextMonthDate, locale);

  if (!isStarter) {
    const effectiveStatus: EffectivePaymentStatus =
      originalStatus === "paid" ? "paid" : originalStatus === "partial" ? "partial" : "unpaid";
    return {
      effectiveStatus,
      originalStatus,
      isStarter: false,
      isAfterCutoff: false,
      isNextMonthPaid: false,
      nextMonthKey: defaultNextMonthKey,
      nextMonthLabel: defaultNextMonthLabel,
    };
  }

  // Starter formula (1m)
  const refUTC = toUTCMidnight(referenceDate);
  const isRefDay25OrLater = referenceDate.getUTCDate() >= 25 || referenceDate.getDate() >= 25;

  // Determine the member's base starting month and its 25th cutoff date
  let baseMonthEnd: Date;
  if (member?.subscriptionStart || member?.dateOfStart) {
    const effStart = getEffectiveSubscriptionStart(member.subscriptionStart ?? member.dateOfStart);
    baseMonthEnd = getLastDayOfSameMonth(effStart);
  } else if (member?.subscriptionEnd) {
    const subEnd = new Date(member.subscriptionEnd);
    baseMonthEnd = !isNaN(subEnd.getTime()) ? getLastDayOfSameMonth(subEnd) : getLastDayOfSameMonth(refUTC);
  } else {
    baseMonthEnd = getLastDayOfSameMonth(refUTC);
  }

  const baseCutoffDate = new Date(Date.UTC(baseMonthEnd.getUTCFullYear(), baseMonthEnd.getUTCMonth(), 25));
  const isPastBaseCutoff = refUTC.getTime() >= baseCutoffDate.getTime();
  const isAfterCutoff = isPastBaseCutoff || isRefDay25OrLater;

  // Determine the target renewal month that must be settled once cutoff is reached:
  // - On days 25..31 of referenceDate's month: next calendar month after referenceDate.
  // - On days 1..24 of referenceDate's month when past baseCutoffDate (e.g. Nov 1..24 for an Oct subscriber):
  //   the current month of referenceDate (which is the renewal month they crossed into after the 25th).
  let targetMonthDate: Date;
  if (isRefDay25OrLater) {
    targetMonthDate = defaultNextMonthDate;
  } else if (isPastBaseCutoff) {
    targetMonthDate = new Date(Date.UTC(refUTC.getUTCFullYear(), refUTC.getUTCMonth(), 1));
  } else {
    targetMonthDate = defaultNextMonthDate;
  }

  const nextMonthKey = formatMonthKey(targetMonthDate);
  const nextMonthLabel = formatMonthLabel(targetMonthDate, locale);

  // 1. Check explicit next-month tags ([NEXT_MONTH:YYYY-MM] in payments or [NEXT_MONTH_PAID:YYYY-MM] in notes)
  const nextMonthCheck = isMemberNextMonthPaid(member, nextMonthKey, locale);
  let isNextMonthPaid = nextMonthCheck.isPaid;
  let nextMonthAmount = nextMonthCheck.amount;
  let isRenewalPartial = false;

  // 2. Also recognize untagged renewal payments recorded on/after the 25th cutoff preceding targetMonthDate
  if (!isNextMonthPaid && Array.isArray(member?.payments) && member.payments.length > 0) {
    const renewalCutoffDate = new Date(
      Date.UTC(targetMonthDate.getUTCFullYear(), targetMonthDate.getUTCMonth() - 1, 25)
    );
    const paymentsAfterCutoff = member.payments.filter((p) => {
      if (!p?.paidAt) return false;
      const pd = new Date(p.paidAt);
      return !isNaN(pd.getTime()) && toUTCMidnight(pd).getTime() >= renewalCutoffDate.getTime();
    });
    const paymentsBeforeCutoff = member.payments.filter((p) => {
      if (!p?.paidAt) return true;
      const pd = new Date(p.paidAt);
      return isNaN(pd.getTime()) || toUTCMidnight(pd).getTime() < renewalCutoffDate.getTime();
    });

    const expectedPrice = member?.priceDA ?? 0;
    const totalAllPayments = member.payments.reduce((s, p) => s + (p?.amount || 0), 0);
    const hasPaidInNewMonthAfterPriorStart = paymentsAfterCutoff.some((p) => {
      if (!p?.paidAt) return false;
      const pd = toUTCMidnight(new Date(p.paidAt));
      return pd.getTime() >= targetMonthDate.getTime() && baseMonthEnd.getTime() < targetMonthDate.getTime();
    });

    if (
      paymentsAfterCutoff.length > 0 &&
      (paymentsBeforeCutoff.length > 0 ||
        hasPaidInNewMonthAfterPriorStart ||
        (expectedPrice > 0 && totalAllPayments >= expectedPrice * 2))
    ) {
      const renewalSum = paymentsAfterCutoff.reduce((s, p) => s + (p?.amount || 0), 0);
      nextMonthAmount = renewalSum;
      if (expectedPrice > 0) {
        if (renewalSum >= expectedPrice) {
          isNextMonthPaid = true;
        } else if (renewalSum > 0) {
          isRenewalPartial = true;
        }
      } else if (renewalSum > 0) {
        isNextMonthPaid = true;
      }
    }
  }

  let effectiveStatus: EffectivePaymentStatus;
  if (isAfterCutoff) {
    if (isNextMonthPaid) {
      effectiveStatus = "paid";
    } else if (isRenewalPartial) {
      effectiveStatus = "partial";
    } else {
      // Must be changed to unpaid on or after 25th if next/renewal month is not paid
      effectiveStatus = "unpaid";
    }
  } else {
    // Before 25th of the member's starting month
    if (isNextMonthPaid) {
      effectiveStatus = "paid";
    } else {
      effectiveStatus =
        originalStatus === "paid" ? "paid" : originalStatus === "partial" ? "partial" : "unpaid";
    }
  }

  return {
    effectiveStatus,
    originalStatus,
    isStarter: true,
    isAfterCutoff,
    isNextMonthPaid,
    nextMonthKey,
    nextMonthLabel,
    nextMonthAmount,
  };
}
