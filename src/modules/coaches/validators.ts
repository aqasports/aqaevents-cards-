import { z } from "zod";

export const createCoachSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  specialties: z.string().optional().nullable(),
  defaultPayRate: z.number().min(0).optional().default(0),
  commissionRate: z.number().min(0).optional().default(0),
});

export const updateCoachSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  specialties: z.string().optional().nullable(),
  defaultPayRate: z.number().min(0).optional(),
  commissionRate: z.number().min(0).optional(),
  active: z.boolean().optional(),
});
