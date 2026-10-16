import { describe, it, expect } from "vitest";
import {
  getSkillsForCategory,
  SWIM_SKILLS_CATALOG_V1,
  SKILL_SCORE_LABELS,
  AQA_SUIVI_STAGES,
  AQA_SUIVI_BADGES,
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

  it("exports exactly 6 pedagogy stages in correct order", () => {
    expect(AQA_SUIVI_STAGES).toHaveLength(6);
    expect(AQA_SUIVI_STAGES.map((s) => s.key)).toEqual([
      "basics",
      "crawl",
      "backstroke",
      "breaststroke",
      "butterfly",
      "elite",
    ]);
  });

  it("exports exactly 15 badges in the specified exact sequence", () => {
    expect(AQA_SUIVI_BADGES).toHaveLength(15);
    expect(AQA_SUIVI_BADGES.map((b) => b.key)).toEqual([
      "starter",
      "beginner",
      "floater",
      "crawler",
      "leaf",
      "brasseur",
      "butterfly",
      "full_swimmer",
      "dolphin",
      "shark",
      "orca",
      "whale",
      "kraken",
      "mosasaurus",
      "tsunami",
    ]);
  });
});
