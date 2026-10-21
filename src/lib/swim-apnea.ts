/**
 * AQA Apnea: pure business logic (pricing, pack/session accounting, records, goal progress).
 * No database access here so everything is unit-testable.
 */

export const APNEA_PACK_SESSIONS = 4;
export const APNEA_PACK_PRICE_DA = 7800;
export const APNEA_PACK_WITH_FINS_PRICE_DA = 10500;
/** One extra session is priced pro rata: 7800 / 4. */
export const APNEA_EXTRA_SESSION_PRICE_DA = APNEA_PACK_PRICE_DA / APNEA_PACK_SESSIONS;
/** Static apnea goal: 4 minutes. */
export const APNEA_STATIC_GOAL_SECONDS = 240;

export type ApneaRecordKind = "static" | "dynamic";

export function isApneaRecordKind(value: unknown): value is ApneaRecordKind {
  return value === "static" || value === "dynamic";
}

export function getApneaPackPrice(withFins: boolean): number {
  return withFins ? APNEA_PACK_WITH_FINS_PRICE_DA : APNEA_PACK_PRICE_DA;
}

export function getApneaExtrasPrice(extraSessions: number): number {
  return Math.max(0, Math.floor(extraSessions)) * APNEA_EXTRA_SESSION_PRICE_DA;
}

/** Normalizes any date to the UTC midnight of its calendar day (presence key). */
export function toApneaSessionDay(input: Date | string = new Date()): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export interface ApneaPackLike {
  sessionsTotal: number;
  priceDA: number;
  withFins: boolean;
}

export interface ApneaPresenceLike {
  status: string;
}

export interface ApneaRecordLike {
  kind: string;
  value: number;
  recordedAt: Date | string;
}

export interface ApneaPackSummary {
  sessionsTotal: number;
  sessionsAttended: number;
  sessionsRemaining: number;
  totalPriceDA: number;
  hasFins: boolean;
}

export function summarizeApneaPacks(
  packs: ApneaPackLike[],
  presences: ApneaPresenceLike[]
): ApneaPackSummary {
  const sessionsTotal = packs.reduce((sum, p) => sum + p.sessionsTotal, 0);
  const sessionsAttended = presences.filter((p) => p.status === "present").length;
  return {
    sessionsTotal,
    sessionsAttended,
    sessionsRemaining: Math.max(0, sessionsTotal - sessionsAttended),
    totalPriceDA: packs.reduce((sum, p) => sum + p.priceDA, 0),
    hasFins: packs.some((p) => p.withFins),
  };
}

export interface ApneaBestRecords {
  staticSeconds: number | null;
  dynamicMeters: number | null;
}

export function getBestApneaRecords(records: ApneaRecordLike[]): ApneaBestRecords {
  let staticSeconds: number | null = null;
  let dynamicMeters: number | null = null;
  for (const r of records) {
    if (r.kind === "static" && (staticSeconds === null || r.value > staticSeconds)) {
      staticSeconds = r.value;
    }
    if (r.kind === "dynamic" && (dynamicMeters === null || r.value > dynamicMeters)) {
      dynamicMeters = r.value;
    }
  }
  return { staticSeconds, dynamicMeters };
}

/** Percentage (0-100, integer) of the 4 minute static goal reached by the best static time. */
export function getApneaStaticGoalPercent(bestStaticSeconds: number | null): number {
  if (!bestStaticSeconds || bestStaticSeconds <= 0) return 0;
  return Math.min(100, Math.round((bestStaticSeconds / APNEA_STATIC_GOAL_SECONDS) * 100));
}

export interface ApneaEvolutionPoint {
  date: string;
  value: number;
}

/** Chronological evolution series for one kind. */
export function buildApneaEvolution(
  records: ApneaRecordLike[],
  kind: ApneaRecordKind
): ApneaEvolutionPoint[] {
  return records
    .filter((r) => r.kind === kind)
    .map((r) => ({ date: new Date(r.recordedAt).toISOString(), value: r.value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Formats seconds as m:ss (e.g. 185 -> "3:05"). */
export function formatApneaDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const APNEA_MAX_STATIC_SECONDS = 1200;
export const APNEA_MAX_DYNAMIC_METERS = 400;

/** Returns an error code when the value is outside sane bounds, otherwise null. */
export function validateApneaRecordValue(kind: ApneaRecordKind, value: number): string | null {
  if (!Number.isInteger(value) || value <= 0) return "invalid_value";
  if (kind === "static" && value > APNEA_MAX_STATIC_SECONDS) return "static_out_of_range";
  if (kind === "dynamic" && value > APNEA_MAX_DYNAMIC_METERS) return "dynamic_out_of_range";
  return null;
}
