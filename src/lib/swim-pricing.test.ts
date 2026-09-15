import { describe, it, expect } from "vitest";
import { calculateSwimPrice, getCardTier } from "./swim-pricing";

describe("Swim Pricing Utilities (from tarifs.astro)", () => {
  describe("Adult pricing (Homme/Femme)", () => {
    it("calculates 1x/week G10 pricing correctly across all durations", () => {
      expect(calculateSwimPrice({ category: "homme", groupType: "G10", duration: "1m", frequency: 1 })).toBe(7800);
      expect(calculateSwimPrice({ category: "homme", groupType: "G10", duration: "3m", frequency: 1 })).toBe(21900);
      expect(calculateSwimPrice({ category: "homme", groupType: "G10", duration: "6m", frequency: 1 })).toBe(43500);
      expect(calculateSwimPrice({ category: "homme", groupType: "G10", duration: "9m", frequency: 1 })).toBe(65200);
    });

    it("calculates 1x/week MAX5 pricing correctly across all durations", () => {
      expect(calculateSwimPrice({ category: "homme", groupType: "MAX5", duration: "1m", frequency: 1 })).toBe(9900);
      expect(calculateSwimPrice({ category: "homme", groupType: "MAX5", duration: "3m", frequency: 1 })).toBe(28500);
      expect(calculateSwimPrice({ category: "homme", groupType: "MAX5", duration: "6m", frequency: 1 })).toBe(56100);
      expect(calculateSwimPrice({ category: "homme", groupType: "MAX5", duration: "9m", frequency: 1 })).toBe(84400);
    });

    it("calculates 1x/week INDIVID pricing correctly", () => {
      expect(calculateSwimPrice({ category: "homme", groupType: "INDIVID", duration: "3m", frequency: 1 })).toBe(58800);
      expect(calculateSwimPrice({ category: "homme", groupType: "indiv", duration: "1m", frequency: 1 })).toBe(19900);
    });

    it("calculates 2x/week pricing correctly", () => {
      expect(calculateSwimPrice({ category: "homme", groupType: "G10", duration: "3m", frequency: 2 })).toBe(41600);
      expect(calculateSwimPrice({ category: "homme", groupType: "MAX5", duration: "3m", frequency: 2 })).toBe(51200);
    });

    it("calculates 3x/week pricing correctly", () => {
      expect(calculateSwimPrice({ category: "homme", groupType: "G10", duration: "3m", frequency: 3 })).toBe(57500);
      expect(calculateSwimPrice({ category: "homme", groupType: "MAX5", duration: "3m", frequency: 3 })).toBe(74400);
    });
  });

  describe("Kids & Apnea pricing", () => {
    it("calculates kids plan prices accurately", () => {
      expect(calculateSwimPrice({ category: "enfants", duration: "3m" })).toBe(28700);
      expect(calculateSwimPrice({ category: "enfants", duration: "6m" })).toBe(46500);
      expect(calculateSwimPrice({ category: "enfants", duration: "9m" })).toBe(65800);
    });

    it("calculates apnea prices accurately", () => {
      expect(calculateSwimPrice({ category: "apnea", groupType: "initiale" })).toBe(10500);
      expect(calculateSwimPrice({ category: "apnea", groupType: "renouvellement" })).toBe(7300);
    });
  });

  describe("getCardTier", () => {
    it("resolves starter card for 1m duration", () => {
      const tier = getCardTier("G10", "1m");
      expect(tier.tierId).toBe("starter");
      expect(tier.frontImage).toBe("/image/card_starter.png");
    });

    it("resolves silver card for 3m duration", () => {
      const tier = getCardTier("G10", "3m");
      expect(tier.tierId).toBe("silver");
      expect(tier.frontImage).toBe("/image/card_silver.png");
    });

    it("resolves gold card for 6m duration", () => {
      const tier = getCardTier("MAX5", "6m");
      expect(tier.tierId).toBe("gold");
      expect(tier.frontImage).toBe("/image/card_gold.png");
    });

    it("resolves diamond card for 9m duration", () => {
      const tier = getCardTier("Economique", "9m");
      expect(tier.tierId).toBe("diamond");
      expect(tier.frontImage).toBe("/image/card_diamond.png");
    });

    it("resolves emerald card for VIP formulas", () => {
      const tier = getCardTier("VIP Emerald", "3m");
      expect(tier.tierId).toBe("emerald");
      expect(tier.frontImage).toBe("/image/card_emerald.png");
    });
  });
});
