import { z } from "zod";

export const createInvoiceSchema = z.object({
  clientId: z.string(),
  amount: z.number().positive(),
  category: z.enum(["package", "custom", "adhoc"]),
  items: z.string().min(1),
  notes: z.string().optional(),
  status: z.enum(["paid", "unpaid"]).default("paid"),
  packageId: z.string().optional(),
  creditDelta: z.number().optional(),
  creditReason: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  status: z.enum(["paid", "unpaid", "refunded"]).optional(),
  notes: z.string().optional().nullable(),
  amount: z.number().positive().optional(),
  category: z.enum(["package", "custom", "adhoc"]).optional(),
  items: z.string().min(1).optional(),
  createdAt: z.string().optional(),
  paidAt: z.string().nullable().optional(),
});

export const addCreditsSchema = z.object({
  packageId: z.string().optional(),
  customAmount: z.number().max(500, "Custom credit amount cannot exceed 500 credits.").optional(),
  reason: z.string().optional(),
  invoice: z
    .object({
      amount: z.number().int().positive(),
      category: z.enum(["package", "custom", "adhoc"]).default("custom"),
      items: z.string().min(1),
      notes: z.string().optional(),
      status: z.enum(["paid", "unpaid"]).default("paid"),
    })
    .optional(),
});

export const createPackageSchema = z.object({
  name: z.string().min(2),
  creditAmount: z.number().int().min(1),
  bonusCredits: z.number().int().nonnegative().default(0),
  sortOrder: z.number().int().default(0),
});

export const updatePackageSchema = z.object({
  name: z.string().min(2).optional(),
  creditAmount: z.number().int().min(1).optional(),
  bonusCredits: z.number().int().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(2),
  price: z.number().int().positive(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  advertised: z.boolean().default(true),
  sortOrder: z.number().int().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  price: z.number().int().positive().optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  advertised: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const redeemSchema = z.object({
  clientId: z.string(),
  activityId: z.string(),
  sessionId: z.string().optional(),
  notes: z.string().optional(),
  bypassBalanceCheck: z.boolean().optional(),
  creditsUsed: z.number().optional(),
});

export const updateLedgerSchema = z.object({
  delta: z.number().optional(),
  reason: z.string().optional(),
});
