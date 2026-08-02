import { describe, it, expect } from "vitest";
import { organizationLegalSchema, createOrganizationSchema, updateOrganizationSchema } from "./validators";

describe("Organization Legal Fields & Validators", () => {
  it("should accept valid 15-digit NIF and 14-digit NIS", () => {
    const validData = {
      nif: "002416099814522",
      nis: "00241609981452",
      rc: "16/00-0982341B24",
    };

    const res = organizationLegalSchema.safeParse(validData);
    expect(res.success).toBe(true);
  });

  it("should reject NIF with invalid digit count", () => {
    const invalidData = {
      nif: "12345", // too short
      nis: "00241609981452",
    };

    const res = organizationLegalSchema.safeParse(invalidData);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("NIF must be 15 digits");
    }
  });

  it("should reject NIS with non-digit characters or wrong length", () => {
    const invalidData = {
      nif: "002416099814522",
      nis: "0024160998145A", // contains letter
    };

    const res = organizationLegalSchema.safeParse(invalidData);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("NIS must be 14 digits");
    }
  });

  it("should allow null or empty string NIF/NIS when optional", () => {
    const res1 = organizationLegalSchema.safeParse({ nif: null, nis: null });
    expect(res1.success).toBe(true);

    const res2 = createOrganizationSchema.safeParse({
      name: "Acme Enterprise",
      nif: null,
      nis: null,
    });
    expect(res2.success).toBe(true);
  });

  it("should validate full organization update with legal fields", () => {
    const res = updateOrganizationSchema.safeParse({
      name: "Updated Org Name",
      contactEmail: "legal@acme.dz",
      nif: "001122334455667",
      nis: "00112233445566",
      rc: "RC-99881",
    });
    expect(res.success).toBe(true);
  });
});
