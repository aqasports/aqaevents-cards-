import { z } from "zod";

/**
 * Validation rules for the AQA Swim equipment shop (sales and catalog).
 * Shared by the sale API routes and covered by unit tests.
 *
 * Business rules:
 * - A client phone number is OPTIONAL (walk-in customers are common at the pool shop).
 * - The article code must reference a catalog article (checked server-side), it is no
 *   longer limited to a fixed list of three codes.
 */

export const ARTICLE_CODE_REGEX = /^[a-z0-9-]+$/;
export const PHONE_REGEX = /^[+0-9\s().-]*$/;
export const MAX_SALE_QUANTITY = 1000;
export const MAX_UNIT_PRICE_DA = 10_000_000;
export const MAX_PHONE_LENGTH = 30;

/** Maximum tolerated distance into the future for a sale date (timezone slack), in ms. */
const FUTURE_TOLERANCE_MS = 36 * 60 * 60 * 1000;

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalises an optional phone number: trims and collapses whitespace.
 * Returns an empty string when no phone was provided (the database column is NOT NULL).
 */
export function normalizeOptionalPhone(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Converts the sale date sent by the client into a Date.
 * A date-only value (YYYY-MM-DD) is stored at 12:00 UTC so that it renders on the same
 * calendar day in every timezone. Returns null for missing or invalid values.
 */
export function resolveSoldAtDate(value: string | null | undefined): Date | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();

  if (DATE_ONLY_REGEX.test(trimmed)) {
    const parsed = new Date(`${trimmed}T12:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return null;
    // Reject overflowing dates such as 2026-02-31 which JS would silently roll over.
    if (parsed.toISOString().slice(0, 10) !== trimmed) return null;
    return parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const priceField = (label: string) =>
  z
    .number({ invalid_type_error: `${label} must be a number`, required_error: `${label} is required` })
    .int(`${label} must be a whole number`)
    .min(0, `${label} must be >= 0`)
    .max(MAX_UNIT_PRICE_DA, `${label} is too large`);

export const SaleInputSchema = z
  .object({
    article: z
      .string({ required_error: "Article is required" })
      .trim()
      .min(1, "Article is required")
      .max(60, "Article code is too long")
      .regex(ARTICLE_CODE_REGEX, "Article code is invalid"),
    clientName: z
      .string({ required_error: "Client name is required" })
      .trim()
      .min(1, "Client name is required")
      .max(120, "Client name is too long"),
    clientPhone: z
      .string()
      .trim()
      .max(MAX_PHONE_LENGTH, "Phone number is too long")
      .regex(PHONE_REGEX, "Phone number contains invalid characters")
      .optional()
      .nullable()
      .transform((value) => normalizeOptionalPhone(value)),
    leadId: z
      .string()
      .trim()
      .max(60)
      .optional()
      .nullable()
      .transform((value) => value || null),
    sellPrice: priceField("Sell price"),
    costPrice: priceField("Cost price"),
    quantity: z
      .number({ invalid_type_error: "Quantity must be a number", required_error: "Quantity is required" })
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be >= 1")
      .max(MAX_SALE_QUANTITY, `Quantity must be <= ${MAX_SALE_QUANTITY}`),
    notes: z
      .string()
      .trim()
      .max(500, "Notes are too long")
      .optional()
      .nullable()
      .transform((value) => value || null),
    soldAt: z.string().trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.soldAt) return;
    const resolved = resolveSoldAtDate(data.soldAt);
    if (!resolved) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["soldAt"],
        message: "Sale date is invalid",
      });
      return;
    }
    if (resolved.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["soldAt"],
        message: "Sale date cannot be in the future",
      });
    }
  });

export type SaleInput = z.infer<typeof SaleInputSchema>;

/** Returns the first human-readable validation message of a Zod error. */
export function firstValidationMessage(error: z.ZodError): string {
  const first = error.issues[0];
  return first?.message || "Validation failed";
}
