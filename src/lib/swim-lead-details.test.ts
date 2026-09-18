import { describe, it, expect } from "vitest";
import {
  parseSwimLeadNotes,
  formatSwimLeadNotes,
  normalizeArticleId,
  getArticleLabel,
  getArticleShortLabel,
} from "./swim-lead-details";

describe("swim-lead-details", () => {
  describe("normalizeArticleId", () => {
    it("normalizes goggle terms", () => {
      expect(normalizeArticleId("goggles")).toBe("goggles");
      expect(normalizeArticleId("lunettes")).toBe("goggles");
      expect(normalizeArticleId("Lunettes de natation")).toBe("goggles");
    });

    it("normalizes cap terms", () => {
      expect(normalizeArticleId("cap")).toBe("cap");
      expect(normalizeArticleId("bonnet")).toBe("cap");
      expect(normalizeArticleId("Bonnet silicone")).toBe("cap");
    });

    it("normalizes swimsuit terms", () => {
      expect(normalizeArticleId("swimsuit")).toBe("swimsuit");
      expect(normalizeArticleId("maillot")).toBe("swimsuit");
      expect(normalizeArticleId("jammer")).toBe("swimsuit");
      expect(normalizeArticleId("combinaison")).toBe("swimsuit");
    });

    it("returns null for unknown items", () => {
      expect(normalizeArticleId("towel")).toBeNull();
      expect(normalizeArticleId("")).toBeNull();
    });
  });

  describe("parseSwimLeadNotes - Modern AQA_META format", () => {
    it("parses modern meta block with equipment and demographics", () => {
      const formatted = formatSwimLeadNotes({
        equipment: {
          hasPack: true,
          articles: ["goggles", "cap"],
          size: "L",
          notes: "Teinte fumee",
        },
        demographics: {
          city: "Alger",
          age: 26,
          whatsapp: "0550123456",
          channel: "Instagram",
          goal: "Perfectionnement",
          timePref: "Soir",
        },
        userNotes: "Prendre contact en soiree uniquement.",
      });

      const parsed = parseSwimLeadNotes(formatted);

      expect(parsed.equipment.hasPack).toBe(true);
      expect(parsed.equipment.articles).toEqual(["goggles", "cap"]);
      expect(parsed.equipment.articleLabels).toHaveLength(2);
      expect(parsed.equipment.size).toBe("L");
      expect(parsed.equipment.notes).toBe("Teinte fumee");

      expect(parsed.demographics.city).toBe("Alger");
      expect(parsed.demographics.age).toBe(26);
      expect(parsed.demographics.whatsapp).toBe("0550123456");
      expect(parsed.demographics.channel).toBe("Instagram");
      expect(parsed.demographics.goal).toBe("Perfectionnement");
      expect(parsed.demographics.timePref).toBe("Soir");

      expect(parsed.userNotes).toBe("Prendre contact en soiree uniquement.");
    });
  });

  describe("parseSwimLeadNotes - Legacy pipe format", () => {
    it("parses legacy string with equipment articles", () => {
      const legacyNote =
        "Canal: Instagram | WhatsApp: 0550123456 | Ville: Hydra | Age: 30 | Pack Equipement: Lunettes, Bonnet, Maillot | Objectif: Apprentissage | Appel effectue avec succes";
      const parsed = parseSwimLeadNotes(legacyNote);

      expect(parsed.equipment.hasPack).toBe(true);
      expect(parsed.equipment.articles).toContain("goggles");
      expect(parsed.equipment.articles).toContain("cap");
      expect(parsed.equipment.articles).toContain("swimsuit");
      expect(parsed.demographics.whatsapp).toBe("0550123456");
      expect(parsed.demographics.city).toBe("Hydra");
      expect(parsed.demographics.age).toBe(30);
      expect(parsed.demographics.channel).toBe("Instagram");
      expect(parsed.demographics.goal).toBe("Apprentissage");
      expect(parsed.userNotes).toBe("Appel effectue avec succes");
    });

    it("parses generic Pack Equipement: Oui", () => {
      const legacyNote = "Pack Equipement: Oui | Ville: Oran";
      const parsed = parseSwimLeadNotes(legacyNote);

      expect(parsed.equipment.hasPack).toBe(true);
      expect(parsed.equipment.articles).toEqual([]);
      expect(parsed.demographics.city).toBe("Oran");
    });

    it("parses old member renewal note with ID", () => {
      const legacyNote = "Renouvellement Ancien Membre (ID: SWM-2024-001) | Piscine: Bab Ezzouar";
      const parsed = parseSwimLeadNotes(legacyNote);

      expect(parsed.demographics.memberType).toBe("old");
      expect(parsed.demographics.personalId).toBe("SWM-2024-001");
      expect(parsed.demographics.pool).toBe("Bab Ezzouar");
    });

    it("handles null or empty notes gracefully", () => {
      const emptyParsed = parseSwimLeadNotes(null);
      expect(emptyParsed.equipment.hasPack).toBe(false);
      expect(emptyParsed.equipment.articles).toEqual([]);
      expect(emptyParsed.demographics.city).toBeNull();
      expect(emptyParsed.userNotes).toBe("");
    });
  });

  describe("Labels", () => {
    it("returns correct labels", () => {
      expect(getArticleLabel("goggles")).toBe("Lunettes de Natation Pro");
      expect(getArticleShortLabel("goggles")).toBe("Lunettes");
      expect(getArticleShortLabel("cap")).toBe("Bonnet");
      expect(getArticleShortLabel("swimsuit")).toBe("Maillot");
    });
  });
});
