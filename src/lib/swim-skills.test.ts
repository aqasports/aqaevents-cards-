import { describe, it, expect } from "vitest";
import {
  getSkillsForCategory,
  SWIM_SKILLS_CATALOG_V1,
  SKILL_SCORE_LABELS,
} from "./swim-skills";

describe("swim-skills", () => {
  it("provides valid skills and metrics for all categories", () => {
    const categories = ["enfants", "homme", "femme", "apnea"];
    for (const cat of categories) {
      const catalog = getSkillsForCategory(cat);
      expect(catalog.skills.length).toBeGreaterThan(0);
      expect(catalog.metrics.length).toBeGreaterThan(0);
      for (const s of catalog.skills) {
        expect(s.key).toBeDefined();
        expect(s.label).toBeDefined();
      }
    }
  });

  it("maps 1-4 scores to French labels", () => {
    expect(SKILL_SCORE_LABELS[1]).toBe("Non acquis");
    expect(SKILL_SCORE_LABELS[2]).toBe("En cours d'acquisition");
    expect(SKILL_SCORE_LABELS[3]).toBe("Acquis");
    expect(SKILL_SCORE_LABELS[4]).toBe("Maitrise");
  });

  it("falls back to homme for unrecognized categories", () => {
    const fallback = getSkillsForCategory("unknown_category");
    expect(fallback.skills).toEqual(SWIM_SKILLS_CATALOG_V1.homme.skills);
  });
});
