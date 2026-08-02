import { z } from "zod";

export const createContractSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  startDate: z.string().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().or(z.date()).optional().nullable().transform((val) => (val ? new Date(val) : null)),
  creditRate: z.number().positive().optional().nullable(),
  discountTier: z.string().optional().nullable(),
  autoRenew: z.boolean().default(false),
  expiryPolicy: z.enum(["rollover", "use_it_or_lose_it"]).default("rollover"),
  status: z.enum(["draft", "active", "expired", "cancelled"]).default("draft"),
});

export const updateContractSchema = z.object({
  startDate: z.string().or(z.date()).optional().transform((val) => (val ? new Date(val) : undefined)),
  endDate: z.string().or(z.date()).optional().nullable().transform((val) => (val ? new Date(val) : null)),
  creditRate: z.number().positive().optional().nullable(),
  discountTier: z.string().optional().nullable(),
  autoRenew: z.boolean().optional(),
  expiryPolicy: z.enum(["rollover", "use_it_or_lose_it"]).optional(),
  status: z.enum(["draft", "active", "expired", "cancelled"]).optional(),
});
