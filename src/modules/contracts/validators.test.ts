import { describe, it, expect } from "vitest";
import { createContractSchema, updateContractSchema } from "./validators";

describe("Contract Validators", () => {
  it("should validate a correct contract with startDate <= endDate", () => {
    const validContract = {
      organizationId: "org-1",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      creditRate: 1800,
      discountTier: "Gold",
      autoRenew: true,
      expiryPolicy: "rollover",
      status: "active",
    };

    const res = createContractSchema.safeParse(validContract);
    expect(res.success).toBe(true);
  });

  it("should reject contract when endDate is before startDate", () => {
    const invalidContract = {
      organizationId: "org-1",
      startDate: "2026-12-31",
      endDate: "2026-01-01", // earlier than startDate
      expiryPolicy: "rollover",
    };

    const res = createContractSchema.safeParse(invalidContract);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("End date must be on or after start date");
    }
  });

  it("should validate allowed expiryPolicy enum values", () => {
    const valid1 = createContractSchema.safeParse({
      organizationId: "org-1",
      startDate: "2026-01-01",
      expiryPolicy: "rollover",
    });
    expect(valid1.success).toBe(true);

    const valid2 = createContractSchema.safeParse({
      organizationId: "org-1",
      startDate: "2026-01-01",
      expiryPolicy: "use_it_or_lose_it",
    });
    expect(valid2.success).toBe(true);

    const invalid = createContractSchema.safeParse({
      organizationId: "org-1",
      startDate: "2026-01-01",
      expiryPolicy: "invalid_policy_name",
    });
    expect(invalid.success).toBe(false);
  });

  it("should allow open-ended contracts with null endDate", () => {
    const openEnded = {
      organizationId: "org-1",
      startDate: "2026-01-01",
      endDate: null,
      autoRenew: false,
    };

    const res = createContractSchema.safeParse(openEnded);
    expect(res.success).toBe(true);
  });
});
