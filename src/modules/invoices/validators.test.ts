import { describe, it, expect } from "vitest";
import { invoiceLineItemSchema, createInvoiceSchema } from "./validators";

describe("Invoice Line Item Validators", () => {
  it("should validate a line item with positive quantity, non-negative unitPrice, and taxRate in {9, 19}", () => {
    const valid1 = {
      description: "Corporate Group Activity Credits (100 credits)",
      quantity: 10,
      unitPrice: 1900,
      taxRate: 19,
    };
    const res1 = invoiceLineItemSchema.safeParse(valid1);
    expect(res1.success).toBe(true);

    const valid2 = {
      description: "Sport Equipment Rental Fee",
      quantity: 1,
      unitPrice: 0, // free item / promo
      taxRate: 9,
    };
    const res2 = invoiceLineItemSchema.safeParse(valid2);
    expect(res2.success).toBe(true);
  });

  it("should reject non-positive quantity (0 or negative)", () => {
    const zeroQty = {
      description: "Invalid item",
      quantity: 0,
      unitPrice: 1000,
      taxRate: 19,
    };
    const res1 = invoiceLineItemSchema.safeParse(zeroQty);
    expect(res1.success).toBe(false);

    const negQty = {
      description: "Invalid item",
      quantity: -5,
      unitPrice: 1000,
      taxRate: 19,
    };
    const res2 = invoiceLineItemSchema.safeParse(negQty);
    expect(res2.success).toBe(false);
  });

  it("should reject negative unitPrice", () => {
    const negPrice = {
      description: "Invalid negative price",
      quantity: 1,
      unitPrice: -500,
      taxRate: 19,
    };
    const res = invoiceLineItemSchema.safeParse(negPrice);
    expect(res.success).toBe(false);
  });

  it("should reject taxRate other than 9% or 19%", () => {
    const invalidTax = {
      description: "Item with arbitrary 15% tax rate",
      quantity: 1,
      unitPrice: 1000,
      taxRate: 15,
    };
    const res = invoiceLineItemSchema.safeParse(invalidTax);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("Tax rate must be 9% or 19%");
    }
  });

  it("should validate createInvoiceSchema structure", () => {
    const invoice = {
      clientId: "client-1",
      amount: 19000,
      category: "package",
      items: "Corporate Starter Package",
      status: "paid",
    };
    const res = createInvoiceSchema.safeParse(invoice);
    expect(res.success).toBe(true);
  });
});
