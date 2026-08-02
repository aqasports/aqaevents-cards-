import { describe, it, expect } from "vitest";
import { createDepartmentSchema, updateDepartmentSchema, reassignEmployeeDepartmentSchema } from "./validators";

describe("Department Validators", () => {
  it("should validate department with non-negative budgetCap", () => {
    const valid = {
      organizationId: "org-1",
      name: "Engineering",
      budgetCap: 500,
    };

    const res = createDepartmentSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("should allow budgetCap equal to zero", () => {
    const zeroCap = {
      organizationId: "org-1",
      name: "Research",
      budgetCap: 0,
    };

    const res = createDepartmentSchema.safeParse(zeroCap);
    expect(res.success).toBe(true);
  });

  it("should reject negative budgetCap", () => {
    const negativeCap = {
      organizationId: "org-1",
      name: "Marketing",
      budgetCap: -100,
    };

    const res = createDepartmentSchema.safeParse(negativeCap);
    expect(res.success).toBe(false);
  });

  it("should allow null or undefined budgetCap for unlimited departments", () => {
    const unlimited = {
      organizationId: "org-1",
      name: "Executive",
      budgetCap: null,
    };

    const res = createDepartmentSchema.safeParse(unlimited);
    expect(res.success).toBe(true);
  });

  it("should validate employee department reassignment", () => {
    const reassign = {
      clientId: "client-100",
      departmentId: "dept-500",
    };

    const res = reassignEmployeeDepartmentSchema.safeParse(reassign);
    expect(res.success).toBe(true);
  });
});
