import { describe, it, expect } from "vitest";
import {
  isStarterTier,
  resolveFormulaTier,
  isPremiumFormula,
  getDefaultPerksForTier,
  parsePerksFromNotes,
  encodePerksInNotes,
  removePerksFromNotes,
  cleanMemberDisplayNotes,
  computePerksProgress,
  PerkItem,
} from "./swim-perks";

describe("swim-perks: tier resolution", () => {
  it("resolves starter tier correctly", () => {
    expect(isStarterTier("1m")).toBe(true);
    expect(isStarterTier(null, "Starter")).toBe(true);
    expect(isStarterTier("1m", "G10")).toBe(true);
    expect(isStarterTier("3m", "G10")).toBe(false);
    expect(resolveFormulaTier("1m", "G10")).toBe("starter");
  });

  it("resolves the three premium tiers", () => {
    expect(resolveFormulaTier("3m", "Silver")).toBe("silver");
    expect(resolveFormulaTier("3m", "Decouverte")).toBe("silver");
    expect(resolveFormulaTier("6m", "Gold")).toBe("gold");
    expect(resolveFormulaTier("6m", "Recommande")).toBe("gold");
    expect(resolveFormulaTier("9m", "Diamond")).toBe("diamond");
    expect(resolveFormulaTier("9m", "Economique")).toBe("diamond");

    expect(isPremiumFormula("3m", "G10")).toBe(true);
    expect(isPremiumFormula("6m", "MAX5")).toBe(true);
    expect(isPremiumFormula("9m", "INDIVID")).toBe(true);
    expect(isPremiumFormula("1m", "G10")).toBe(false);
  });
});

describe("swim-perks: default perks per tier", () => {
  it("gives Silver 1 feature (video analysis)", () => {
    const perks = getDefaultPerksForTier("silver");
    expect(perks.length).toBe(1);
    expect(perks[0].id).toBe("video_analysis");
    expect(perks[0].status).toBe("pending");
  });

  it("gives Gold 3 features (video, arena pack, app)", () => {
    const perks = getDefaultPerksForTier("gold");
    expect(perks.length).toBe(3);
    const ids = perks.map((p) => p.id);
    expect(ids).toContain("video_analysis");
    expect(ids).toContain("arena_pack");
    expect(ids).toContain("mobile_app");
  });

  it("gives Diamond 5 features (video, arena pack, app, apnea, guest passes)", () => {
    const perks = getDefaultPerksForTier("diamond");
    expect(perks.length).toBe(5);
    const ids = perks.map((p) => p.id);
    expect(ids).toContain("video_analysis");
    expect(ids).toContain("arena_pack");
    expect(ids).toContain("mobile_app");
    expect(ids).toContain("apnea_month");
    expect(ids).toContain("guest_passes");
  });
});

describe("swim-perks: encoding and decoding in notes", () => {
  it("encodes and decodes perks without corrupting user notes", () => {
    const initialNotes = "Locker 42. [DEBT:5000:Precedent] Medical cert ok.";
    const perks: PerkItem[] = [
      {
        id: "video_analysis",
        title: "Analyse Video",
        description: "Test desc",
        status: "delivered",
        deliveredAt: "2026-10-20T10:00:00.000Z",
        deliveredBy: "Coach Samy",
        notes: "Envoye sur WhatsApp",
      },
      {
        id: "arena_pack",
        title: "Pack Arena",
        description: "Kit Arena",
        status: "in_progress",
        notes: "Taille L commandee",
      },
    ];

    const encoded = encodePerksInNotes(initialNotes, perks);
    expect(encoded).toContain("[PERKS:");
    expect(encoded).toContain("Locker 42.");
    expect(encoded).toContain("[DEBT:5000:Precedent]");

    const parsed = parsePerksFromNotes(encoded, { duration: "6m" });
    expect(parsed.length).toBe(3); // Gold has 3 perks, video + pack + app

    const videoPerk = parsed.find((p) => p.id === "video_analysis");
    expect(videoPerk?.status).toBe("delivered");
    expect(videoPerk?.deliveredBy).toBe("Coach Samy");
    expect(videoPerk?.notes).toBe("Envoye sur WhatsApp");

    const packPerk = parsed.find((p) => p.id === "arena_pack");
    expect(packPerk?.status).toBe("in_progress");
    expect(packPerk?.notes).toBe("Taille L commandee");

    const appPerk = parsed.find((p) => p.id === "mobile_app");
    expect(appPerk?.status).toBe("pending");
  });

  it("supports custom additional perks", () => {
    const perks: PerkItem[] = [
      {
        id: "video_analysis",
        title: "Analyse Video",
        description: "Test",
        status: "delivered",
      },
      {
        id: "custom_sauna",
        title: "Acces Espace Recuperation Sauna",
        description: "Offert par la direction",
        status: "delivered",
        isCustom: true,
      },
    ];

    const encoded = encodePerksInNotes("VIP client", perks);
    const parsed = parsePerksFromNotes(encoded, { duration: "3m" });

    expect(parsed.length).toBe(2);
    const custom = parsed.find((p) => p.id === "custom_sauna");
    expect(custom?.isCustom).toBe(true);
    expect(custom?.title).toBe("Acces Espace Recuperation Sauna");
    expect(custom?.status).toBe("delivered");
  });

  it("cleans notes for display safely", () => {
    const raw = "[PERKS:eyJuYW1lIjoidGVzdCJ9] [DEBT:3000] Genuine human note here. [POOLPAID]";
    const clean = cleanMemberDisplayNotes(raw);
    expect(clean).toBe("Genuine human note here.");
  });

  it("removes perks from notes", () => {
    const raw = "[PERKS:eyJuYW1lIjoidGVzdCJ9] Note text";
    const removed = removePerksFromNotes(raw);
    expect(removed).toBe("Note text");
  });
});

describe("swim-perks: progress calculations", () => {
  it("calculates delivery progress percentage accurately", () => {
    const perks: PerkItem[] = [
      { id: "1", title: "A", description: "", status: "delivered" },
      { id: "2", title: "B", description: "", status: "in_progress" },
      { id: "3", title: "C", description: "", status: "pending" },
    ];

    const prog = computePerksProgress(perks);
    expect(prog.total).toBe(3);
    expect(prog.delivered).toBe(1);
    expect(prog.inProgress).toBe(1);
    expect(prog.pending).toBe(1);
    expect(prog.percent).toBe(33);
    expect(prog.isFullyDelivered).toBe(false);
  });

  it("handles 100% completion", () => {
    const perks: PerkItem[] = [
      { id: "1", title: "A", description: "", status: "delivered" },
      { id: "2", title: "B", description: "", status: "delivered" },
    ];

    const prog = computePerksProgress(perks);
    expect(prog.percent).toBe(100);
    expect(prog.isFullyDelivered).toBe(true);
  });
});
