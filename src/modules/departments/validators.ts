import { z } from "zod";

export const createDepartmentSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  name: z.string().min(2, "Department name must be at least 2 characters"),
  budgetCap: z.number().int().nonnegative().optional().nullable(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2).optional(),
  budgetCap: z.number().int().nonnegative().optional().nullable(),
});

export const reassignEmployeeDepartmentSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  departmentId: z.string().optional().nullable(),
});
