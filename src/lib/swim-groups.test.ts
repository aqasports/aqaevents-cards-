import { describe, it, expect } from "vitest";
import {
  generateSwimGroupName,
  encodeSolidNotes,
  decodeSolidNotes,
  SWIM_GROUP_DEFAULT_CAPACITIES,
  SWIM_TIME_SLOTS,
  getSwimLevelLabel,
  isOldSwimMember,
  encodeMemberGroupIds,
  decodeMemberGroupIds,
  extractFirstName,
} from "./swim-groups";

describe("Swim Groups Utilities", () => {
  describe("generateSwimGroupName", () => {
    it("generates group name according to exact specification", () => {
      // (first 3 letters of French day) (space) (time) (space) (7 first letters coach) (space) (4 first letters loc)
      const name = generateSwimGroupName(
        "Lundi",
        "18:00",
        "Karim Benali",
        "Bassin Olympique"
      );
      expect(name).toBe("Lun 18:00 Karim B Bass");
    });

    it("handles short coach and location names correctly", () => {
      const name = generateSwimGroupName(
        "Mercredi",
        "19:30",
        "Amine",
        "Kouba"
      );
      // "Amine" is 5 chars (< 7 chars), "Kouba" trimmed to 4 is "Koub"
      expect(name).toBe("Mer 19:30 Amine Koub");
    });

    it("handles coach names with prefix like Coach Mustapha", () => {
      const name = generateSwimGroupName(
        "Vendredi",
        "09:00",
        "Coach Mustapha",
        "Piscine El Biar"
      );
      // "Coach M" (7 chars), "Pisc" (4 chars)
      expect(name).toBe("Ven 09:00 Coach M Pisc");
    });

    it("gracefully omits missing parts when fields are not yet provided", () => {
      expect(generateSwimGroupName("Samedi", "10:00", null, null)).toBe("Sam 10:00");
      expect(generateSwimGroupName(null, null, null, null)).toBe("");
    });
  });

  describe("Solid Notes Encoding and Decoding", () => {
    it("encodes solid flag into notes with [SOLID] prefix", () => {
      expect(encodeSolidNotes("Ligne 3 et 4", true)).toBe("[SOLID] Ligne 3 et 4");
      expect(encodeSolidNotes("", true)).toBe("[SOLID]");
      expect(encodeSolidNotes(null, true)).toBe("[SOLID]");
    });

    it("removes solid tag when isSolid is false", () => {
      expect(encodeSolidNotes("[SOLID] Ligne 3 et 4", false)).toBe("Ligne 3 et 4");
      expect(encodeSolidNotes("[SOLID]", false)).toBe(null);
      expect(encodeSolidNotes("Normal note", false)).toBe("Normal note");
    });

    it("decodes solid notes correctly", () => {
      const decoded1 = decodeSolidNotes("[SOLID] Ligne 3 et 4");
      expect(decoded1.isSolid).toBe(true);
      expect(decoded1.cleanNotes).toBe("Ligne 3 et 4");

      const decoded2 = decodeSolidNotes("Just notes");
      expect(decoded2.isSolid).toBe(false);
      expect(decoded2.cleanNotes).toBe("Just notes");

      const decoded3 = decodeSolidNotes(null);
      expect(decoded3.isSolid).toBe(false);
      expect(decoded3.cleanNotes).toBe("");
    });
  });

  describe("Group capacities and time slots", () => {
    it("provides expected defaults for each group type", () => {
      expect(SWIM_GROUP_DEFAULT_CAPACITIES.G10).toBe(10);
      expect(SWIM_GROUP_DEFAULT_CAPACITIES.MAX5).toBe(5);
      expect(SWIM_GROUP_DEFAULT_CAPACITIES.indiv).toBe(1);
    });

    it("starts time slots from 06:00", () => {
      expect(SWIM_TIME_SLOTS[0]).toBe("06:00");
      expect(SWIM_TIME_SLOTS[1]).toBe("06:30");
      expect(SWIM_TIME_SLOTS[2]).toBe("07:00");
    });
  });

  describe("Swim Levels", () => {
    it("maps new and legacy level labels properly", () => {
      expect(getSwimLevelLabel("new_aqa")).toBe("New AQA Member");
      expect(getSwimLevelLabel("old_aqa")).toBe("Old AQA Member");
      expect(getSwimLevelLabel("beginner")).toBe("New AQA Member");
      expect(getSwimLevelLabel("intermediate")).toBe("Old AQA Member");
      expect(getSwimLevelLabel("advanced")).toBe("Old AQA Member");
    });

    it("correctly identifies old members who can view cohort roster", () => {
      expect(isOldSwimMember("old_aqa")).toBe(true);
      expect(isOldSwimMember("intermediate")).toBe(true);
      expect(isOldSwimMember("advanced")).toBe(true);
      expect(isOldSwimMember("OLD_AQA")).toBe(true);

      expect(isOldSwimMember("new_aqa")).toBe(false);
      expect(isOldSwimMember("beginner")).toBe(false);
      expect(isOldSwimMember(null)).toBe(false);
      expect(isOldSwimMember(undefined)).toBe(false);
      expect(isOldSwimMember("")).toBe(false);
    });
  });

  describe("Multi-group notes encoding and decoding", () => {
    it("encodes and decodes multiple group IDs cleanly", () => {
      const encoded = encodeMemberGroupIds("Existing note", ["grp-1", "grp-2", "grp-3"]);
      expect(encoded).toBe("[GROUPS:grp-1,grp-2,grp-3] Existing note");

      const decoded = decodeMemberGroupIds(encoded, "grp-1");
      expect(decoded).toEqual(["grp-1", "grp-2", "grp-3"]);
    });

    it("handles single group with primary group ID fallback", () => {
      const decoded = decodeMemberGroupIds(null, "grp-primary");
      expect(decoded).toEqual(["grp-primary"]);
    });
  });

  describe("extractFirstName (First name before space)", () => {
    it("extracts first name before space correctly", () => {
      expect(extractFirstName("Salim Benali")).toBe("Salim");
      expect(extractFirstName("Mohamed Amine Bouzid")).toBe("Mohamed");
      expect(extractFirstName("  Amina   Zitouni ")).toBe("Amina");
    });

    it("returns whole name when there is no space", () => {
      expect(extractFirstName("Karim")).toBe("Karim");
      expect(extractFirstName("  Yacine  ")).toBe("Yacine");
    });

    it("works with Arabic text", () => {
      expect(extractFirstName("محمد علي")).toBe("محمد");
      expect(extractFirstName("كريم")).toBe("كريم");
    });

    it("handles empty or null values gracefully", () => {
      expect(extractFirstName("")).toBe("");
      expect(extractFirstName(null)).toBe("");
      expect(extractFirstName(undefined)).toBe("");
    });
  });
});
