import { z } from "zod";

export const createClientSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  packageId: z.string().optional(),
  issueCard: z.boolean().default(true),
  preCardCode: z.string().optional(),
  leadSource: z.string().optional().nullable(),
});

export const updateClientSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  leadSource: z.string().optional().nullable(),
});
