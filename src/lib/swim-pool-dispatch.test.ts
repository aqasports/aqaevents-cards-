import { describe, it, expect } from "vitest";
import {
  isPeakTimeSlot,
  calculateMemberPoolPrice,
  resolveMemberGroups,
  buildPoolDispatchRows,
  computeSlotOccupancy,
  computeRealFinalPoolSummary,
  exportPoolRowsToCSV,
  generatePoolDispatchMessage,
  formatMonthLabel,
  DEFAULT_POOL_PRICING,
  DEFAULT_PREVIEW_COLUMNS,
  DEFAULT_REAL_FINAL_COLUMNS,
} from "./swim-pool-dispatch";

describe("swim-pool-dispatch domain utilities", () => {
  describe("isPeakTimeSlot", () => {
    it("should identify weekday evening slots as peak hours", () => {
      expect(isPeakTimeSlot("18:00", "Lundi")).toBe(true);
      expect(isPeakTimeSlot("19:30", "Mardi")).toBe(true);
      expect(isPeakTimeSlot("20:00", "Mercredi")).toBe(true);
      expect(isPeakTimeSlot("14:00", "Lundi")).toBe(false);
      expect(isPeakTimeSlot("08:00", "Mardi")).toBe(false);
    });

    it("should identify weekend morning and afternoon peak slots", () => {
      expect(isPeakTimeSlot("10:00", "Samedi")).toBe(true);
      expect(isPeakTimeSlot("18:00", "Samedi")).toBe(true);
      expect(isPeakTimeSlot("13:30", "Samedi")).toBe(false);
    });
  });

  describe("calculateMemberPoolPrice", () => {
    const config = {
      defaultPrice: 2000,
      categoryPrices: {
        homme: 2200,
        femme: 2100,
        enfants: 1600,
        apnea: 2800,
      },
      individualOverrides: {
        "SWM-SPECIAL": 1200,
      },
    };

    it("should prioritize individual override", () => {
      const res = calculateMemberPoolPrice(
        { id: "m1", swimId: "SWM-SPECIAL", category: "homme" },
        config
      );
      expect(res.priceDA).toBe(1200);
      expect(res.hasOverride).toBe(true);
    });

    it("should apply category specific price when no override", () => {
      const hommeRes = calculateMemberPoolPrice(
        { id: "m2", swimId: "SWM-001", category: "homme" },
        config
      );
      expect(hommeRes.priceDA).toBe(2200);
      expect(hommeRes.hasOverride).toBe(false);

      const enfantRes = calculateMemberPoolPrice(
        { id: "m3", swimId: "SWM-002", category: "enfants" },
        config
      );
      expect(enfantRes.priceDA).toBe(1600);
      expect(enfantRes.hasOverride).toBe(false);
    });

    it("should fall back to default price for unknown category", () => {
      const res = calculateMemberPoolPrice(
        { id: "m4", swimId: "SWM-003", category: "other" },
        config
      );
      expect(res.priceDA).toBe(2000);
      expect(res.hasOverride).toBe(false);
    });
  });

  describe("resolveMemberGroups", () => {
    const groups = [
      { id: "g1", name: "G1 - Homme Soir", schedule: "Lundi 19:00 - 20:00" },
      { id: "g2", name: "G2 - Homme Matin", schedule: "Samedi 08:00 - 09:00" },
    ];

    it("should resolve single primary group", () => {
      const res = resolveMemberGroups({ groupId: "g1", notes: null }, groups);
      expect(res).toHaveLength(1);
      expect(res[0].name).toBe("G1 - Homme Soir");
    });

    it("should resolve multi-groups from notes", () => {
      const res = resolveMemberGroups(
        { groupId: "g1", notes: "[GROUPS:g1,g2]" },
        groups
      );
      expect(res).toHaveLength(2);
      expect(res.map((g) => g.id)).toEqual(["g1", "g2"]);
    });

    it("should return empty array if unassigned", () => {
      const res = resolveMemberGroups({ groupId: null, notes: null }, groups);
      expect(res).toHaveLength(0);
    });
  });

  describe("buildPoolDispatchRows and computeSlotOccupancy", () => {
    const groups = [
      { id: "g1", name: "G10 Lundi Soir", schedule: "Lundi 18:00 - 19:00" },
      { id: "g2", name: "G10 Samedi Soir", schedule: "Samedi 18:00 - 19:00" },
    ];

    const members = [
      {
        id: "mem1",
        swimId: "SWM-01",
        fullName: "Amine Belkacem",
        phone: "0555112233",
        category: "homme",
        level: "new_aqa",
        paymentStatus: "paid" as const,
        notes: null,
        groupId: "g1",
      },
      {
        id: "mem2",
        swimId: "SWM-02",
        fullName: "Karim Zidane",
        phone: "0555998877",
        category: "homme",
        level: "old_aqa",
        paymentStatus: "unpaid" as const,
        notes: "[GROUPS:g1,g2]",
        groupId: "g1",
      },
    ];

    it("should build rows with peak hours detection and pricing", () => {
      const rows = buildPoolDispatchRows(members, groups, DEFAULT_POOL_PRICING, "Octobre 2026");
      expect(rows).toHaveLength(2);
      expect(rows[0].fullName).toBe("Amine Belkacem");
      expect(rows[0].hasBusySlot).toBe(true);
      expect(rows[0].poolPriceDA).toBe(2000);
      expect(rows[1].assignedGroupNames).toEqual(["G10 Lundi Soir", "G10 Samedi Soir"]);
    });

    it("should compute slot occupancy accurately", () => {
      const rows = buildPoolDispatchRows(members, groups, DEFAULT_POOL_PRICING, "Octobre 2026");
      const occupancy = computeSlotOccupancy(rows);
      expect(occupancy.length).toBeGreaterThan(0);

      const lundiSlot = occupancy.find((o) => o.day === "Lundi" && o.time === "18:00");
      expect(lundiSlot).toBeDefined();
      expect(lundiSlot?.swimmerCount).toBe(2);
      expect(lundiSlot?.isPeak).toBe(true);
    });
  });

  describe("computeRealFinalPoolSummary", () => {
    const rows = [
      {
        memberId: "m1",
        swimId: "SWM-01",
        fullName: "Amine",
        category: "homme",
        level: "new_aqa",
        phone: "0555",
        paymentStatus: "paid" as const,
        assignedGroupIds: ["g1"],
        assignedGroupNames: ["Group 1"],
        assignedSchedules: ["Lundi 18:00"],
        parsedSlots: [],
        hasBusySlot: true,
        busySlotLabels: ["Lundi 18:00"],
        poolPriceDA: 2500,
        hasPriceOverride: false,
        currentMonth: "Octobre 2026",
      },
      {
        memberId: "m2",
        swimId: "SWM-02",
        fullName: "Yasmine",
        category: "femme",
        level: "old_aqa",
        phone: "0666",
        paymentStatus: "paid" as const,
        assignedGroupIds: ["g2"],
        assignedGroupNames: ["Group 2"],
        assignedSchedules: ["Mardi 19:00"],
        parsedSlots: [],
        hasBusySlot: true,
        busySlotLabels: ["Mardi 19:00"],
        poolPriceDA: 2000,
        hasPriceOverride: false,
        currentMonth: "Octobre 2026",
      },
    ];

    it("should compute totals for selected swimmers only", () => {
      const selected = new Set(["SWM-01", "SWM-02"]);
      const summary = computeRealFinalPoolSummary(rows, selected);
      expect(summary.totalSwimmers).toBe(2);
      expect(summary.selectedCount).toBe(2);
      expect(summary.totalDuePoolDA).toBe(4500);
      expect(summary.averageFeePerSwimmerDA).toBe(2250);
      expect(summary.categoryBreakdown.homme.count).toBe(1);
      expect(summary.categoryBreakdown.homme.subtotalDA).toBe(2500);
      expect(summary.categoryBreakdown.femme.count).toBe(1);
      expect(summary.categoryBreakdown.femme.subtotalDA).toBe(2000);
    });

    it("should omit unselected swimmers from total payment", () => {
      const selected = new Set(["SWM-01"]);
      const summary = computeRealFinalPoolSummary(rows, selected);
      expect(summary.selectedCount).toBe(1);
      expect(summary.totalDuePoolDA).toBe(2500);
    });
  });

  describe("exportPoolRowsToCSV", () => {
    it("should export CSV with headers and proper separators", () => {
      const rows = [
        {
          memberId: "m1",
          swimId: "SWM-01",
          fullName: "Amine",
          category: "homme",
          level: "new_aqa",
          phone: "0555",
          paymentStatus: "paid" as const,
          assignedGroupIds: ["g1"],
          assignedGroupNames: ["G1"],
          assignedSchedules: ["Lundi 18:00"],
          parsedSlots: [],
          hasBusySlot: true,
          busySlotLabels: [],
          poolPriceDA: 2500,
          hasPriceOverride: false,
          currentMonth: "Octobre 2026",
        },
      ];
      const csv = exportPoolRowsToCSV(rows, DEFAULT_REAL_FINAL_COLUMNS, "Octobre 2026", false, new Set());
      expect(csv).toContain("Nom et Prenom");
      expect(csv).toContain("Tarif Piscine (DA)");
      expect(csv).toContain("Amine");
      expect(csv).toContain("2500");
    });
  });

  describe("generatePoolDispatchMessage", () => {
    it("should generate professional preview message without emojis", () => {
      const msg = generatePoolDispatchMessage({
        mode: "preview",
        monthLabel: "Octobre 2026",
        totalSwimmers: 42,
        busySlots: [{ slot: "Samedi 18:00", count: 12 }],
      });
      expect(msg).toContain("AQA SPORTS - ETAT PREVISIONNEL DEBUT DE MOIS");
      expect(msg).toContain("Nombre total d'adherents prevus: 42");
      expect(msg).toContain("Samedi 18:00: 12 adherents");
    });

    it("should generate RealFinalPool settlement message with total DA", () => {
      const msg = generatePoolDispatchMessage({
        mode: "real_final",
        monthLabel: "Octobre 2026",
        totalSwimmers: 35,
        totalDueDA: 87500,
      });
      expect(msg).toContain("REALFINALPOOL");
      expect(msg).toContain("87 500 DA");
    });
  });

  describe("formatMonthLabel and default column configs", () => {
    it("should format month labels with standard Western Arabic numerals", () => {
      const frLabel = formatMonthLabel(2026, 9, "fr");
      expect(frLabel.toLowerCase()).toContain("octobre");
      expect(frLabel).toContain("2026");

      const arLabel = formatMonthLabel(2026, 9, "ar");
      expect(arLabel).toContain("2026");
      // Must not contain Eastern Arabic numerals
      expect(/[\u0660-\u0669]/.test(arLabel)).toBe(false);
    });

    it("should provide valid column configs with proper defaults", () => {
      expect(DEFAULT_PREVIEW_COLUMNS.poolPrice).toBe(false);
      expect(DEFAULT_PREVIEW_COLUMNS.name).toBe(true);
      expect(DEFAULT_REAL_FINAL_COLUMNS.poolPrice).toBe(true);
      expect(DEFAULT_REAL_FINAL_COLUMNS.number).toBe(true);
    });
  });
});
