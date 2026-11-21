import { describe, it, expect } from "vitest";
import {
  computeAgeYears,
  computeBmi,
  computeGrowthVelocityCmPerYear,
  computeWhoBmiZScore,
  createDefaultChildProfile,
  createEmptyAssessmentDraft,
  evaluateKidsAssessment,
  kidsSuiviActionSchema,
  type KidsPhysicalAssessment,
} from "./swim-kids-physical";

function makeAssessment(
  overrides: Partial<KidsPhysicalAssessment> = {}
): KidsPhysicalAssessment {
  return {
    ...createEmptyAssessmentDraft("Dr. Amine"),
    id: "bilan-1",
    assessedAt: "2026-10-15",
    createdAt: "2026-10-15T10:00:00.000Z",
    updatedAt: "2026-10-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("swim-kids-physical clinical engine", () => {
  it("computes BMI and WHO 2007 BMI-for-age Z-score accurately", () => {
    const bmi = computeBmi(130, 27); // 27 / 1.69 = 15.976 -> 16.0
    expect(bmi).toBe(16);

    const whoNormal = computeWhoBmiZScore(16.0, 8, "male");
    expect(whoNormal).not.toBeNull();
    expect(whoNormal?.band).toBe("normal");
    expect(Math.abs(whoNormal!.zScore)).toBeLessThan(0.5);

    const whoObesity = computeWhoBmiZScore(23.5, 8, "male");
    expect(whoObesity?.band).toBe("obesity");
    expect(whoObesity!.zScore).toBeGreaterThan(2);

    const whoThin = computeWhoBmiZScore(12.2, 8, "female");
    expect(whoThin?.band === "thinness" || whoThin?.band === "severe_thinness").toBe(true);
  });

  it("computes age and annual growth velocity across sequential bilans", () => {
    expect(computeAgeYears("2018-04-15", "2026-10-15")).toBe(8.5);

    const velocity = computeGrowthVelocityCmPerYear([
      { assessedAt: "2026-01-01", heightCm: 132 },
      { assessedAt: "2026-07-02", heightCm: 136.5 },
    ]);
    expect(velocity).not.toBeNull();
    expect(velocity!).toBeGreaterThanOrEqual(8.5);
    expect(velocity!).toBeLessThanOrEqual(9.5);
  });

  it("returns optimal status and preventive recommendation for a healthy child", () => {
    const profile = { ...createDefaultChildProfile(), birthDate: "2018-05-01", sex: "female" as const };
    const assessment = makeAssessment({
      heightCm: 128,
      weightKg: 26,
      armSpanCm: 130,
      chestExpansionCm: 5.5,
      coreEnduranceSec: 45,
      fingerFloorDistCm: 0,
      schoberCm: 5,
    });

    const evalRes = evaluateKidsAssessment(assessment, profile);
    expect(evalRes.overallStatus).toBe("optimal");
    expect(evalRes.flags).toHaveLength(0);
    expect(evalRes.apeIndexCm).toBe(2);
    expect(evalRes.recommendations.some((r) => r.code === "harmonious_4_stroke_development")).toBe(true);
  });

  it("flags structural scoliosis referral when Adams test shows rib hump or ATR >= 7 deg", () => {
    const profile = { ...createDefaultChildProfile(), birthDate: "2015-03-10", sex: "female" as const };
    const assessment = makeAssessment({
      adamsTest: "rib_hump_thoracic",
      scoliometerAtrDeg: 8,
      shouldersLevel: "right_higher",
    });

    const evalRes = evaluateKidsAssessment(assessment, profile);
    expect(evalRes.overallStatus).toBe("referral");
    expect(evalRes.bodyZones.spineFrontal).toBe("referral");
    expect(evalRes.flags.some((f) => f.code === "scoliosis_structural_suspect" && f.severity === "referral")).toBe(true);
    expect(evalRes.recommendations.some((r) => r.code === "scoliosis_axial_elongation")).toBe(true);
  });

  it("distinguishes physiological genu valgum at age 5 from watch/referral at age 9 (Salenius & Vankka)", () => {
    const youngProfile = { ...createDefaultChildProfile(), birthDate: "2021-10-15", sex: "male" as const };
    const youngAssessment = makeAssessment({
      kneeAlignment: "genu_valgum",
      intermalleolarDistCm: 4.5,
    });
    const youngEval = evaluateKidsAssessment(youngAssessment, youngProfile);
    expect(youngEval.overallStatus).toBe("optimal");
    expect(youngEval.flags.some((f) => f.code === "genu_valgum_physiological" && f.severity === "info")).toBe(true);

    const olderProfile = { ...createDefaultChildProfile(), birthDate: "2017-10-15", sex: "male" as const };
    const olderAssessment = makeAssessment({
      kneeAlignment: "genu_valgum",
      intermalleolarDistCm: 7.5,
    });
    const olderEval = evaluateKidsAssessment(olderAssessment, olderProfile);
    expect(olderEval.overallStatus).toBe("referral");
    expect(olderEval.flags.some((f) => f.code === "genu_valgum_significant" && f.severity === "referral")).toBe(true);
  });

  it("distinguishes flexible pediatric flatfoot from rigid flatfoot via Jack test", () => {
    const youngProfile = { ...createDefaultChildProfile(), birthDate: "2021-05-01", sex: "male" as const };
    const flexEval = evaluateKidsAssessment(
      makeAssessment({
        footArch: "flat_flexible",
        jackTest: "positive_reducible",
        tiptoeTest: "arch_forms",
        heelAlignment: "valgus_mild",
      }),
      youngProfile
    );
    expect(flexEval.overallStatus).toBe("optimal");
    expect(flexEval.flags.some((f) => f.code === "flatfoot_flexible_physiological" && f.severity === "info")).toBe(true);

    const rigidEval = evaluateKidsAssessment(
      makeAssessment({
        footArch: "flat_flexible",
        jackTest: "negative_rigid",
        tiptoeTest: "arch_absent",
      }),
      youngProfile
    );
    expect(rigidEval.overallStatus).toBe("referral");
    expect(rigidEval.flags.some((f) => f.code === "flatfoot_rigid_or_painful" && f.severity === "referral")).toBe(true);
  });

  it("flags rigid kyphosis and lumbar hyperlordosis with tailored aquatic recommendations", () => {
    const profile = { ...createDefaultChildProfile(), birthDate: "2014-01-01", sex: "male" as const };
    const evalRes = evaluateKidsAssessment(
      makeAssessment({
        thoracicKyphosis: "hyperkyphosis_rigid",
        thoracicReducibility: "rigid",
        lumbarLordosis: "hyperlordosis",
        sagittalArrowL3Mm: 52,
      }),
      profile
    );
    expect(evalRes.overallStatus).toBe("referral");
    expect(evalRes.bodyZones.thoracic).toBe("referral");
    expect(evalRes.bodyZones.lumbar).toBe("watch");
    expect(evalRes.recommendations.some((r) => r.code === "kyphosis_backstroke_extension")).toBe(true);
    expect(evalRes.recommendations.some((r) => r.code === "hyperlordosis_core_pelvic_control")).toBe(true);
  });

  it("validates API payloads cleanly with Zod", () => {
    const valid = kidsSuiviActionSchema.safeParse({
      action: "save_assessment",
      memberId: "mem_123",
      assessment: {
        assessedAt: "2026-10-15",
        evaluatorName: "Kine Selma",
        heightCm: 132,
        weightKg: 28,
        scoliometerAtrDeg: 3,
      },
    });
    expect(valid.success).toBe(true);

    const invalid = kidsSuiviActionSchema.safeParse({
      action: "save_assessment",
      memberId: "mem_123",
      assessment: {
        assessedAt: "not-a-date",
        evaluatorName: "",
        heightCm: 999,
      },
    });
    expect(invalid.success).toBe(false);
  });
});
