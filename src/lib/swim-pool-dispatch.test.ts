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
  buildPoolSlotReservations,
  computeSlotReservationsSummary,
  exportSlotReservationsToCSV,
  generatePlaceReservationMessage,
  DEFAULT_POOL_PRICING,
  DEFAULT_PREVIEW_COLUMNS,
  DEFAULT_REAL_FINAL_COLUMNS,
  DEFAULT_DOCUMENT_META,
  exportOfficialCorrespondenceToCSV,
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
      expect(rows[0].poolPriceDA).toBe(4000); // Soir x1: 4000 DA
      expect(rows[1].assignedGroupNames).toEqual(["G10 Lundi Soir", "G10 Samedi Soir"]);
      expect(rows[1].poolPriceDA).toBe(7600); // Soir x2: 7600 DA
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

  describe("Method ONE: simple place reservations without names", () => {
    const groups = [
      { id: "g1", name: "G10 Homme Soir", schedule: "Samedi 18:00 - 19:00", capacity: 10, category: "homme" },
      { id: "g2", name: "MAX5 Kids", schedule: "Mardi 17:00 - 18:00", capacity: 5, category: "enfants" },
    ];

    const members = [
      {
        id: "m1",
        swimId: "SWM-01",
        fullName: "Ali Baba",
        category: "homme",
        level: "new_aqa",
        phone: "0555",
        paymentStatus: "paid" as const,
        notes: null,
        groupId: "g1",
      },
      {
        id: "m2",
        swimId: "SWM-02",
        fullName: "Nadir Test",
        category: "homme",
        level: "old_aqa",
        phone: "0556",
        paymentStatus: "paid" as const,
        notes: null,
        groupId: "g1",
      },
    ];

    it("should build place reservations by slot with no client names", () => {
      const res = buildPoolSlotReservations(groups, members);
      expect(res.length).toBe(2);

      const g1Slot = res.find((r) => r.groupId === "g1");
      expect(g1Slot).toBeDefined();
      expect(g1Slot?.day).toBe("Samedi");
      expect(g1Slot?.time).toBe("18:00");
      expect(g1Slot?.reservedPlaces).toBe(2); // 2 members assigned
      expect(g1Slot?.isPeak).toBe(true);

      // Verify no member name property exists on reservation
      expect((g1Slot as unknown as Record<string, unknown>).fullName).toBeUndefined();
      expect((g1Slot as unknown as Record<string, unknown>).swimId).toBeUndefined();
    });

    it("should support manual place count overrides", () => {
      const overrides = { g1_slot_0: 8 };
      const res = buildPoolSlotReservations(groups, members, overrides);
      const g1Slot = res.find((r) => r.id === "g1_slot_0");
      expect(g1Slot?.reservedPlaces).toBe(8);
      expect(g1Slot?.hasCustomPlaces).toBe(true);
    });

    it("should compute reservation summary places count", () => {
      const res = buildPoolSlotReservations(groups, members);
      const selected = new Set([res[0].id, res[1].id]);
      const summary = computeSlotReservationsSummary(res, selected);
      expect(summary.selectedReservationsCount).toBe(2);
      expect(summary.totalReservedPlaces).toBe(7); // 2 in g1 + 5 in g2
    });

    it("should export CSV with places and without client names", () => {
      const res = buildPoolSlotReservations(groups, members);
      const selected = new Set([res[0].id, res[1].id]);
      const csv = exportSlotReservationsToCSV(res, "Octobre 2026", true, selected);
      expect(csv).toContain("Places Reservees");
      expect(csv).toContain("G10 Homme Soir");
      expect(csv).toContain("MAX5 Kids");
      expect(csv).not.toContain("Ali Baba");
      expect(csv).not.toContain("Nadir Test");
    });

    it("should generate WhatsApp message with places and without client names", () => {
      const res = buildPoolSlotReservations(groups, members);
      const msg = generatePlaceReservationMessage({
        monthLabel: "Octobre 2026",
        reservations: res,
        totalPlaces: 7,
      });
      expect(msg).toContain("AQA SPORTS - ETAT PREVISIONNEL DE RESERVATION DES PLACES");
      expect(msg).toContain("Nombre total de places reservees: 7 places");
      expect(msg).toContain("G10 Homme Soir");
      expect(msg).not.toContain("Ali Baba");
      expect(msg).not.toContain("Nadir Test");
    });

    it("should allow overriding peak hour status explicitly", () => {
      // By default g1 slot at 18:00 is peak
      const defaultRes = buildPoolSlotReservations(groups, members);
      expect(defaultRes[0].isPeak).toBe(true);

      // User overrides it to false (normal)
      const overrides = { [defaultRes[0].id]: false };
      const customRes = buildPoolSlotReservations(groups, members, {}, overrides);
      expect(customRes[0].isPeak).toBe(false);

      // User marks g2 slot as peak
      const customPeak = { [customRes[1].id]: true };
      const resWithPeak = buildPoolSlotReservations(groups, members, {}, customPeak);
      expect(resWithPeak[1].isPeak).toBe(true);
    });
  });

  describe("Official Correspondence & Custom Rows (Demande d'acces)", () => {
    const config = {
      defaultPrice: 4000,
      categoryPrices: { homme: 4000, femme: 4000, enfants: 3000, apnea: 4000 },
      individualOverrides: { "SWM-001": 6600 },
    };

    const members = [
      {
        id: "m1",
        swimId: "SWM-001",
        fullName: "Chakib hafid",
        phone: "0555112233",
        category: "homme",
        level: "old_aqa",
        paymentStatus: "paid" as const,
        notes: null,
        groupId: "g1",
      },
      {
        id: "m2",
        swimId: "SWM-002",
        fullName: "Nadjib yetto",
        phone: "0555445566",
        category: "homme",
        level: "new_aqa",
        paymentStatus: "paid" as const,
        notes: null,
        groupId: "g1",
      },
    ];

    const groups = [
      {
        id: "g1",
        name: "Groupe Adultes",
        category: "homme",
        schedule: "Samedi 18:00",
      },
    ];

    const customRows = [
      {
        id: "cust_kids",
        fullName: "AQA KIDS",
        groupOrNote: "Section Enfants",
        poolPriceDA: 80500,
        month: "Juillet",
      },
    ];

    it("should include custom collective rows and per-row months", () => {
      const monthOverrides = { "SWM-001": "JUIN" };
      const rows = buildPoolDispatchRows(
        members,
        groups,
        config,
        "Juillet",
        monthOverrides,
        customRows
      );

      expect(rows.length).toBe(3); // 2 members + 1 custom row

      const chakib = rows.find((r) => r.fullName === "Chakib hafid");
      expect(chakib?.currentMonth).toBe("JUIN");
      expect(chakib?.poolPriceDA).toBe(6600);

      const nadjib = rows.find((r) => r.fullName === "Nadjib yetto");
      expect(nadjib?.currentMonth).toBe("Juillet");
      expect(nadjib?.poolPriceDA).toBe(4000);

      const aqaKids = rows.find((r) => r.fullName === "AQA KIDS");
      expect(aqaKids?.isCustom).toBe(true);
      expect(aqaKids?.poolPriceDA).toBe(80500);
      expect(aqaKids?.currentMonth).toBe("Juillet");
    });

    it("should export official correspondence matching Demande d'acces format", () => {
      const rows = buildPoolDispatchRows(
        members,
        groups,
        config,
        "Juillet",
        { "SWM-001": "JUIN" },
        customRows
      );
      const meta = {
        title: "Demande d'accès",
        referenceNumber: "n:0031/26",
        date: "10/07/2026",
        year: "2026",
      };

      const csv = exportOfficialCorrespondenceToCSV(rows, meta, false, new Set());
      expect(csv).toContain("AQA;\"2026\"");
      expect(csv).toContain("\"Demande d'accès\";;;\"10/07/2026\";\"n:0031/26\"");
      expect(csv).toContain(";prix;;;");
      expect(csv).toContain("N;Nom;Groupe;prix;Mois");
      expect(csv).toContain("\"Chakib hafid\";\"Groupe Adultes\";\"6600\";\"JUIN\"");
      expect(csv).toContain("\"AQA KIDS\";\"Section Enfants\";\"80500\";\"Juillet\"");
      expect(csv).toContain(";\"Total\";;\"91100\";"); // 6600 + 4000 + 80500 = 91100
    });
  });

  describe("Azal Automated Pool Pricing Engine", () => {
    it("should correctly classify morning and evening slots", async () => {
      const { getSlotPeriod } = await import("./swim-pool-dispatch");
      expect(getSlotPeriod("09:00")).toBe("matin");
      expect(getSlotPeriod("10:30")).toBe("matin");
      expect(getSlotPeriod("12:00")).toBe("matin");
      expect(getSlotPeriod("13:00")).toBe("soir");
      expect(getSlotPeriod("18:00")).toBe("soir");
      expect(getSlotPeriod("20:30")).toBe("soir");
    });

    it("should compute exact Azal monthly prices based on frequency and time of day", async () => {
      const { calculateAzalPrice } = await import("./swim-pool-dispatch");

      // Matin: x1=3500, x2=6600, x3=9000
      const matin1 = [{ day: "Lundi", time: "09:00", location: "Azal", isPeak: false }];
      expect(calculateAzalPrice(matin1).priceDA).toBe(3500);

      const matin2 = [
        { day: "Lundi", time: "09:00", location: "Azal", isPeak: false },
        { day: "Mercredi", time: "09:00", location: "Azal", isPeak: false },
      ];
      expect(calculateAzalPrice(matin2).priceDA).toBe(6600);

      const matin3 = [
        { day: "Lundi", time: "09:00", location: "Azal", isPeak: false },
        { day: "Mercredi", time: "09:00", location: "Azal", isPeak: false },
        { day: "Vendredi", time: "09:00", location: "Azal", isPeak: false },
      ];
      expect(calculateAzalPrice(matin3).priceDA).toBe(9000);

      // Soir: x1=4000, x2=7600, x3=10000
      const soir1 = [{ day: "Mardi", time: "18:00", location: "Azal", isPeak: true }];
      expect(calculateAzalPrice(soir1).priceDA).toBe(4000);

      const soir2 = [
        { day: "Lundi", time: "18:00", location: "Azal", isPeak: true },
        { day: "Jeudi", time: "18:00", location: "Azal", isPeak: true },
      ];
      expect(calculateAzalPrice(soir2).priceDA).toBe(7600);

      const soir3 = [
        { day: "Samedi", time: "16:00", location: "Azal", isPeak: true },
        { day: "Lundi", time: "19:00", location: "Azal", isPeak: true },
        { day: "Mercredi", time: "19:00", location: "Azal", isPeak: true },
      ];
      expect(calculateAzalPrice(soir3).priceDA).toBe(10000);

      // Mixed: x2=7100, x3=9900
      const mixed2 = [
        { day: "Samedi", time: "09:00", location: "Azal", isPeak: false },
        { day: "Mardi", time: "18:00", location: "Azal", isPeak: true },
      ];
      expect(calculateAzalPrice(mixed2).priceDA).toBe(7100);

      const mixed3 = [
        { day: "Samedi", time: "09:00", location: "Azal", isPeak: false },
        { day: "Lundi", time: "18:00", location: "Azal", isPeak: true },
        { day: "Mercredi", time: "18:00", location: "Azal", isPeak: true },
      ];
      expect(calculateAzalPrice(mixed3).priceDA).toBe(9900);
    });

    it("should compute session settlement at 500 DA/hour", async () => {
      const { calculateAzalPrice } = await import("./swim-pool-dispatch");

      // Hafid louchat: 3 sessions = 6h consumed = 3000 DA
      const res6h = calculateAzalPrice([], { mode: "session", hoursConsumed: 6 });
      expect(res6h.priceDA).toBe(3000);

      // racil moualhi: 1 hour consumed = 500 DA
      const res1h = calculateAzalPrice([], { mode: "session", hoursConsumed: 1 });
      expect(res1h.priceDA).toBe(500);

      // Standard 1 session (2h) = 1000 DA
      const resSession = calculateAzalPrice([], { mode: "session", sessionsConsumed: 1 });
      expect(resSession.priceDA).toBe(1000);
    });
  });
});
