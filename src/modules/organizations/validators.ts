import { z } from "zod";

const nifRegex = /^\d{15}$/;
const nisRegex = /^\d{14}$/;

export const organizationLegalSchema = z.object({
  nif: z.string().refine((val) => !val || nifRegex.test(val), { message: "NIF must be 15 digits" }).optional().nullable(),
  nis: z.string().refine((val) => !val || nisRegex.test(val), { message: "NIS must be 14 digits" }).optional().nullable(),
  rc: z.string().optional().nullable(),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2).optional(),
  logoUrl: z.string().optional().nullable(),
  allowedActivities: z.string().optional().nullable(),
  whatsappGroupUrl: z.string().optional().nullable(),
  commChannel: z.enum(["ads_tunnel", "whatsapp", "app_notification"]).optional().default("ads_tunnel"),
  creditRate: z.number().positive().optional().nullable(),
  sharedCreditPool: z.number().min(0).optional().default(0),
  useSharedPool: z.boolean().optional().default(false),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  contactPhone: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
  nif: z.string().refine((val) => !val || nifRegex.test(val), { message: "NIF must be 15 digits" }).optional().nullable(),
  nis: z.string().refine((val) => !val || nisRegex.test(val), { message: "NIS must be 14 digits" }).optional().nullable(),
  rc: z.string().optional().nullable(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  logoUrl: z.string().optional().nullable(),
  allowedActivities: z.string().optional().nullable(),
  whatsappGroupUrl: z.string().optional().nullable(),
  commChannel: z.enum(["ads_tunnel", "whatsapp", "app_notification"]).optional(),
  creditRate: z.number().positive().optional().nullable(),
  sharedCreditPool: z.number().min(0).optional(),
  useSharedPool: z.boolean().optional(),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  contactPhone: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
  nif: z.string().refine((val) => !val || nifRegex.test(val), { message: "NIF must be 15 digits" }).optional().nullable(),
  nis: z.string().refine((val) => !val || nisRegex.test(val), { message: "NIS must be 14 digits" }).optional().nullable(),
  rc: z.string().optional().nullable(),
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

export const poolAdjustmentSchema = z.object({
  delta: z.number().describe("Credits to add (positive) or deduct (negative)"),
  reason: z.string().min(3, "Reason for credit adjustment required"),
});

export const orgRedemptionSchema = z.object({
  clientId: z.string().min(1, "Employee ID required"),
  activityId: z.string().min(1, "Activity ID required"),
  sessionId: z.string().optional().nullable(),
  creditsUsed: z.number().positive().default(1),
  notes: z.string().optional(),
});

