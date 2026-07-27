import { describe, it, expect } from "vitest";
import { calculateMonthlyDepreciation, calculateAssetCostPerUse } from "./equipment-math";

describe("equipment math helpers", () => {
  describe("calculateMonthlyDepreciation", () => {
    it("should calculate monthly linear depreciation", () => {
      const asset = { purchasePrice: 360000, usefulLifeMonths: 36 };
      expect(calculateMonthlyDepreciation(asset)).toBe(10000);
    });

    it("should handle 0 usefulLifeMonths gracefully", () => {
      const asset = { purchasePrice: 50000, usefulLifeMonths: 0 };
      expect(calculateMonthlyDepreciation(asset)).toBe(50000);
    });
  });

  describe("calculateAssetCostPerUse", () => {
    it("should calculate cost per session/usage including maintenance", () => {
      const asset = { purchasePrice: 200000, maintenanceCost: 50000 };
      // Total invested = 250,000 DA across 50 uses = 5,000 DA/use
      expect(calculateAssetCostPerUse(asset, 50)).toBe(5000);
    });

    it("should handle 0 uses count gracefully", () => {
      const asset = { purchasePrice: 100000, maintenanceCost: 0 };
      expect(calculateAssetCostPerUse(asset, 0)).toBe(100000);
    });
  });
});
