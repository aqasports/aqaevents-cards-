import { describe, it, expect } from "vitest";
import {
  SaleInputSchema,
  firstValidationMessage,
  normalizeOptionalPhone,
  resolveSoldAtDate,
} from "./swim-equipment-validation";

const validSale = {
  article: "goggles-pro-uv400",
  clientName: "  Mohamed Benali  ",
  clientPhone: "0555 123 456",
  leadId: null,
  sellPrice: 2500,
  costPrice: 1200,
  quantity: 2,
  notes: "Taille L",
  soldAt: "2026-10-01",
};

describe("SaleInputSchema", () => {
  it("accepts a sale without any phone number", () => {
    const withoutPhone = { ...validSale } as Record<string, unknown>;
    delete withoutPhone.clientPhone;
    const parsed = SaleInputSchema.safeParse(withoutPhone);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.clientPhone).toBe("");
  });

  it("treats null and blank phone as an empty string", () => {
    const nullPhone = SaleInputSchema.safeParse({ ...validSale, clientPhone: null });
    const blankPhone = SaleInputSchema.safeParse({ ...validSale, clientPhone: "   " });
    expect(nullPhone.success && nullPhone.data.clientPhone).toBe("");
    expect(blankPhone.success && blankPhone.data.clientPhone).toBe("");
  });

  it("accepts any catalog article code, not only the legacy three", () => {
    const parsed = SaleInputSchema.safeParse({ ...validSale, article: "kickboard-junior" });
    expect(parsed.success).toBe(true);
  });

  it("rejects malformed article codes", () => {
    expect(SaleInputSchema.safeParse({ ...validSale, article: "Bad Code!" }).success).toBe(false);
    expect(SaleInputSchema.safeParse({ ...validSale, article: "" }).success).toBe(false);
  });

  it("trims the client name and normalises the phone", () => {
    const parsed = SaleInputSchema.safeParse({ ...validSale, clientPhone: "  0555   123 456 " });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.clientName).toBe("Mohamed Benali");
      expect(parsed.data.clientPhone).toBe("0555 123 456");
    }
  });

  it("rejects phone numbers with letters", () => {
    const parsed = SaleInputSchema.safeParse({ ...validSale, clientPhone: "abc123" });
    expect(parsed.success).toBe(false);
  });

  it("requires a client name", () => {
    const parsed = SaleInputSchema.safeParse({ ...validSale, clientName: "   " });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(firstValidationMessage(parsed.error)).toBe("Client name is required");
  });

  it("rejects negative, fractional and oversized numbers", () => {
    expect(SaleInputSchema.safeParse({ ...validSale, sellPrice: -1 }).success).toBe(false);
    expect(SaleInputSchema.safeParse({ ...validSale, costPrice: 10.5 }).success).toBe(false);
    expect(SaleInputSchema.safeParse({ ...validSale, quantity: 0 }).success).toBe(false);
    expect(SaleInputSchema.safeParse({ ...validSale, quantity: 1001 }).success).toBe(false);
    expect(SaleInputSchema.safeParse({ ...validSale, sellPrice: 10_000_001 }).success).toBe(false);
  });

  it("normalises empty notes and lead id to null", () => {
    const parsed = SaleInputSchema.safeParse({ ...validSale, notes: "  ", leadId: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.notes).toBeNull();
      expect(parsed.data.leadId).toBeNull();
    }
  });

  it("rejects invalid and future sale dates", () => {
    expect(SaleInputSchema.safeParse({ ...validSale, soldAt: "2026-02-31" }).success).toBe(false);
    expect(SaleInputSchema.safeParse({ ...validSale, soldAt: "not-a-date" }).success).toBe(false);
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const parsed = SaleInputSchema.safeParse({ ...validSale, soldAt: future });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(firstValidationMessage(parsed.error)).toBe("Sale date cannot be in the future");
    }
  });

  it("allows an omitted sale date", () => {
    const withoutDate = { ...validSale } as Record<string, unknown>;
    delete withoutDate.soldAt;
    expect(SaleInputSchema.safeParse(withoutDate).success).toBe(true);
  });
});

describe("resolveSoldAtDate", () => {
  it("stores date-only values at noon UTC", () => {
    const resolved = resolveSoldAtDate("2026-10-01");
    expect(resolved?.toISOString()).toBe("2026-10-01T12:00:00.000Z");
  });

  it("returns null for missing or overflowing values", () => {
    expect(resolveSoldAtDate(null)).toBeNull();
    expect(resolveSoldAtDate("")).toBeNull();
    expect(resolveSoldAtDate("2026-13-40")).toBeNull();
  });

  it("accepts a full ISO timestamp", () => {
    const resolved = resolveSoldAtDate("2026-10-01T08:30:00.000Z");
    expect(resolved?.toISOString()).toBe("2026-10-01T08:30:00.000Z");
  });
});

describe("normalizeOptionalPhone", () => {
  it("returns an empty string for nothing", () => {
    expect(normalizeOptionalPhone(undefined)).toBe("");
    expect(normalizeOptionalPhone(null)).toBe("");
  });
});
