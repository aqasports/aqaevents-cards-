import { z } from "zod";

export const createCampaignSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").transform((c) => c.toUpperCase().trim()),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().optional().nullable(),
  validUntil: z.string().optional().nullable(),
});

export const updateCampaignSchema = z.object({
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  active: z.boolean().optional(),
});
