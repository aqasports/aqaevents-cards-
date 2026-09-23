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
 * Computes the subscription end date by walking forward `nominalDays` active
 * swimming days from `startDate`, skipping all excluded periods.
 *
 * @param startDate     Effective subscription start (already clamped)
 * @param durationCode  "1m" | "3m" | "6m" | "9m"
 * @param periods       Excluded periods to skip (defaults to DEFAULT_EXCLUDED_PERIODS)
 * @returns             The last day of the subscription (inclusive)
 */
export function computeSubscriptionEnd(
  startDate: Date | string,
  durationCode: string | null | undefined,
  periods: ExcludedPeriod[] = DEFAULT_EXCLUDED_PERIODS
): Date {
  const start = toUTCMidnight(
    typeof startDate === "string" ? new Date(startDate) : startDate
  );
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
 * Given a member's dateOfStart and duration, computes and returns both
 * the effective subscription start and end dates.
 */
export function computeMemberSubscriptionDates(
  dateOfStart: Date | string | null | undefined,
  duration: string | null | undefined,
  periods: ExcludedPeriod[] = DEFAULT_EXCLUDED_PERIODS
): { subscriptionStart: Date; subscriptionEnd: Date } {
  const subscriptionStart = getEffectiveSubscriptionStart(dateOfStart);
  const subscriptionEnd = computeSubscriptionEnd(subscriptionStart, duration, periods);
  return { subscriptionStart, subscriptionEnd };
}
