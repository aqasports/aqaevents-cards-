import { z } from "zod";

/**
 * Shared contract between AQA ERP (/api/coach/*) and the AQA Coaches mobile app.
 * Keeping request/response schemas and outbox classification in one module
 * prevents payload drift between the server and mobile client.
 */

export const coachRoleSchema = z.enum(["head_coach", "coach", "assistant", "lead"]);
export type CoachRole = z.infer<typeof coachRoleSchema>;

export const coachCategorySchema = z.enum(["homme", "femme", "enfants", "apnea"]);
export type CoachCategory = z.infer<typeof coachCategorySchema>;

export const attendanceStatusSchema = z
  .string()
  .transform((v) => (v.trim().toLowerCase() === "absent" ? "absent" : "present"))
  .pipe(z.enum(["present", "absent"]));
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

export const attendanceMethodSchema = z
  .string()
  .optional()
  .transform((v) => (v?.toLowerCase() === "qr" ? "qr" : "manual"))
  .pipe(z.enum(["manual", "qr"]));
export type AttendanceMethod = z.infer<typeof attendanceMethodSchema>;

export const strokeBarKeySchema = z.enum([
  "basics",
  "crawl",
  "backstroke",
  "breaststroke",
  "butterfly",
]);
export type StrokeBarKey = z.infer<typeof strokeBarKeySchema>;

export const strokeBarsSchema = z.object({
  basics: z.number().min(0).max(200).default(0),
  crawl: z.number().min(0).max(200).default(0),
  backstroke: z.number().min(0).max(200).default(0),
  breaststroke: z.number().min(0).max(200).default(0),
  butterfly: z.number().min(0).max(200).default(0),
});
export type StrokeBars = z.infer<typeof strokeBarsSchema>;

export const honorBadgeTypeSchema = z.enum([
  "swimmer_of_the_month",
  "swimmer_of_the_year",
]);
export type HonorBadgeType = z.infer<typeof honorBadgeTypeSchema>;

export const coachLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  platform: z.enum(["android", "ios", "web"]).optional(),
  deviceLabel: z.string().max(120).optional(),
  appVersion: z.string().max(40).optional(),
});
export type CoachLoginRequest = z.infer<typeof coachLoginRequestSchema>;

export const coachPushTokenRequestSchema = z.object({
  pushToken: z.string().min(8).max(512).nullable(),
  platform: z.enum(["android", "ios"]).optional(),
});
export type CoachPushTokenRequest = z.infer<typeof coachPushTokenRequestSchema>;

export const attendanceRecordInputSchema = z.object({
  memberId: z.string().min(1),
  status: attendanceStatusSchema,
  method: attendanceMethodSchema.default("manual"),
  isGuest: z.boolean().default(false),
  guestName: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  clientMutationId: z.string().optional().nullable(),
});
export type AttendanceRecordInput = z.input<typeof attendanceRecordInputSchema>;

export const sessionRatingInputSchema = z.object({
  rating: z.number().int().min(1).max(5).default(5),
  intensity: z.string().optional().nullable(),
  focus: z.string().optional().nullable(),
  discipline: z.number().int().min(1).max(5).optional().nullable(),
  waterTempC: z.number().optional().nullable(),
  summary: z.string().optional().nullable(),
});
export type SessionRatingInput = z.infer<typeof sessionRatingInputSchema>;

export const quickEvolutionInputSchema = z.object({
  memberId: z.string().min(1),
  bars: strokeBarsSchema.optional().nullable(),
  lastTouchedBar: strokeBarKeySchema.optional().nullable(),
  sessionVolumeMeters: z.number().min(0).max(50000).optional().nullable(),
  volume: z.number().min(0).max(50000).optional().nullable(),
  observation: z.string().optional().nullable(),
  record50m: z.number().min(0).max(1000).optional().nullable(),
  recordApnea: z.number().min(0).max(1000).optional().nullable(),
  weightKg: z.number().min(0).max(300).optional().nullable(),
  heightCm: z.number().min(0).max(260).optional().nullable(),
  wordFromCoach: z.string().optional().nullable(),
  badgeKey: z.string().optional().nullable(),
  honorRequestType: honorBadgeTypeSchema.optional().nullable(),
  recommendedLevel: z.string().optional().nullable(),
  starScore: z.number().int().min(1).max(5).optional().nullable(),
  note: z.string().optional().nullable(),
});
export type QuickEvolutionInput = z.infer<typeof quickEvolutionInputSchema>;

export const submitAttendanceRequestSchema = z.object({
  clientMutationId: z.string().optional().nullable(),
  records: z.array(attendanceRecordInputSchema),
  closeSession: z.boolean().default(true),
  sessionRating: sessionRatingInputSchema.optional().nullable(),
  quickEvolutions: z.array(quickEvolutionInputSchema).optional().nullable(),
});
export type SubmitAttendanceRequest = z.input<typeof submitAttendanceRequestSchema>;

export const submitReviewRequestSchema = z.object({
  clientMutationId: z.string().optional().nullable(),
  memberId: z.string().optional(),
  sessionId: z.string().optional().nullable(),
  kind: z.enum(["assessment", "observation"]).default("assessment"),
  bars: strokeBarsSchema.optional().nullable(),
  lastTouchedBar: strokeBarKeySchema.optional().nullable(),
  sessionVolumeMeters: z.number().min(0).max(50000).optional().nullable(),
  record50m: z.number().min(0).max(1000).optional().nullable(),
  recordApnea: z.number().min(0).max(1000).optional().nullable(),
  weightKg: z.number().min(0).max(300).optional().nullable(),
  heightCm: z.number().min(0).max(260).optional().nullable(),
  wordFromCoach: z.string().optional().nullable(),
  observation: z.string().optional().nullable(),
  awardedBadgeKey: z.string().optional().nullable(),
  recommendedLevel: z.string().optional().nullable(),
  honorRequestType: honorBadgeTypeSchema.optional().nullable(),
});
export type SubmitReviewRequest = z.input<typeof submitReviewRequestSchema>;

export const replacementRespondSchema = z.object({
  accept: z.boolean(),
  declineReason: z.string().optional().nullable(),
});
export type ReplacementRespondRequest = z.infer<typeof replacementRespondSchema>;

export const canonicalMutationTypeSchema = z.enum(["ATTENDANCE_BATCH", "TECH_REVIEW"]);
export type CanonicalMutationType = z.infer<typeof canonicalMutationTypeSchema>;

/** Normalizes both canonical uppercase and legacy lowercase offline mutation types. */
export function normalizeCoachMutationType(raw: string): CanonicalMutationType | null {
  const normalized = raw.trim().toUpperCase();
  if (normalized === "ATTENDANCE_BATCH" || normalized === "ATTENDANCE") {
    return "ATTENDANCE_BATCH";
  }
  if (normalized === "TECH_REVIEW") {
    return "TECH_REVIEW";
  }
  return null;
}

export interface SyncItemAck {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Classifies an HTTP failure when replaying an offline mutation:
 * - "retry": network loss, timeout, 401 (refresh token first), 408, 429, or 5xx.
 * - "reject": deterministic 4xx refusal (400, 403, 404, 409, 422) that must be
 *   moved to the rejected queue and surfaced to the coach rather than retried forever.
 */
export function classifySyncFailure(statusCode: number | null | undefined): "retry" | "reject" {
  if (statusCode == null) return "retry";
  if (statusCode === 401 || statusCode === 408 || statusCode === 429) return "retry";
  if (statusCode >= 400 && statusCode < 500) return "reject";
  return "retry";
}

const EASTERN_ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Enforces Western Arabic numerals (0-9) across all locales including Arabic. */
export function toWesternNumerals(input: string | number): string {
  let out = String(input);
  for (let i = 0; i < 10; i++) {
    out = out.replaceAll(EASTERN_ARABIC_DIGITS[i], String(i));
    out = out.replaceAll(PERSIAN_DIGITS[i], String(i));
  }
  return out;
}
