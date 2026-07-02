import { z } from "zod";

export const createActivitySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  creditCost: z.number().nonnegative().default(1),
  imageUrl: z.string().optional().nullable(),
  places: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  gallery: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
  eventType: z.string().optional().default("fixed"),
  expenses: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().int().positive(),
    notes: z.string().optional().nullable(),
  })).optional(),
});

export const updateActivitySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  creditCost: z.number().nonnegative().optional(),
  imageUrl: z.string().optional().nullable(),
  places: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  gallery: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
  active: z.boolean().optional(),
  eventType: z.string().optional(),
});

export const createSessionSchema = z.object({
  activityId: z.string(),
  sessionDate: z.string(),
  location: z.string().optional(),
  capacity: z.number().int().positive().optional(),
});

export const createExpenseSchema = z.object({
  activityId: z.string(),
  name: z.string().min(1),
  amount: z.number().positive(),
  notes: z.string().optional().nullable(),
});

export const updateExpenseSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
  activityId: z.string().optional(),
  createdAt: z.string().optional(),
});
