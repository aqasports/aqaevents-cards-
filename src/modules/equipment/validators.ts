import { z } from "zod";

export const createEquipmentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().min(2, "Category is required"),
  purchasePrice: z.number().min(0).optional().default(0),
  purchaseDate: z.string().optional(),
  usefulLifeMonths: z.number().min(1).optional().default(36),
  maintenanceCost: z.number().min(0).optional().default(0),
  status: z.string().optional().default("available"),
  notes: z.string().optional().nullable(),
});

export const updateEquipmentSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  purchasePrice: z.number().min(0).optional(),
  purchaseDate: z.string().optional(),
  usefulLifeMonths: z.number().min(1).optional(),
  maintenanceCost: z.number().min(0).optional(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
});
