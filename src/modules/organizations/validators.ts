import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2).optional(),
  creditRate: z.number().positive().optional().nullable(),
  sharedCreditPool: z.number().min(0).optional().default(0),
  useSharedPool: z.boolean().optional().default(false),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  creditRate: z.number().positive().optional().nullable(),
  sharedCreditPool: z.number().min(0).optional(),
  useSharedPool: z.boolean().optional(),
});

export const provisionEmployeesSchema = z.object({
  employees: z.array(
    z.object({
      fullName: z.string().min(2),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      orgRole: z.string().optional(),
    })
  ).min(1, "At least one employee required"),
});
