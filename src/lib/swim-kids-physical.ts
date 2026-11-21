import { z } from "zod";

// ─── Domain Types ────────────────────────────────────────────────────────────

export type ChildSex = "male" | "female";
export type DominantSide = "right" | "left" | "ambidextrous";

export type ClinicalSeverity = "optimal" | "info" | "watch" | "referral";
export type OverallStatus = "optimal" | "watch" | "referral";

export type WhoBmiBand =
  | "severe_thinness"
  | "thinness"
  | "normal"
  | "overweight"
  | "obesity";

export type ShouldersLevel = "balanced" | "left_higher" | "right_higher";
export type ScapulaeSymmetry =
  | "balanced"
  | "left_prominent"
  | "right_prominent"
  | "winged_bilateral";
export type WaistTriangles = "symmetric" | "left_deeper" | "right_deeper";
export type PelvisLevel = "balanced" | "left_higher" | "right_higher";
export type AdamsTestResult =
  | "negative"
  | "postural_asymmetry"
  | "rib_hump_thoracic"
  | "rib_hump_lumbar"
  | "rib_hump_double";

export type HeadPosture = "aligned" | "forward_mild" | "forward_marked";
export type ThoracicKyphosis =
  | "normal"
  | "postural_round_back"
  | "hyperkyphosis_reducible"
  | "hyperkyphosis_rigid"
  | "flat_back";
export type LumbarLordosis = "normal" | "hyperlordosis" | "hypolordosis";
export type ThoracicReducibility = "full" | "partial" | "rigid";

export type KneeAlignment =
  | "normal"
  | "genu_valgum"
  | "genu_varum"
  | "asymmetric";
export type KneeSagittal = "normal" | "genu_recurvatum" | "genu_flexum";
export type GaitPattern =
  | "normal"
  | "intoeing"
  | "outtoeing"
  | "toe_walking"
  | "limping";

export type FootArch = "normal" | "flat_flexible" | "flat_rigid" | "high_arch";
export type HeelAlignment = "neutral" | "valgus_mild" | "valgus_marked" | "varus";
export type JackTestResult = "positive_reducible" | "negative_rigid" | "not_tested";
export type TiptoeTestResult = "arch_forms" | "arch_absent" | "not_tested";

export type ShoulderMobility =
  | "optimal"
  | "mild_restriction"
  | "restricted"
  | "hyperlax";
export type BreathingPattern =
  | "diaphragmatic_balanced"
  | "thoracic_shallow"
  | "mouth_breathing";

export interface KidsChildProfile {
  birthDate: string | null; // YYYY-MM-DD
  sex: ChildSex;
  dominantSide: DominantSide;
  medicalNotes: string | null;
}

export interface KidsPhysicalAssessment {
  id: string;
  assessedAt: string; // YYYY-MM-DD
  label: string | null; // e.g. "Bilan Initial T1", "Bilan Semestriel T2"
  evaluatorName: string;
  evaluatorTitle: string | null;
  publishedToPortal: boolean;

  // 1. Growth & Anthropometry
  heightCm: number | null;
  weightKg: number | null;
  armSpanCm: number | null;
  sittingHeightCm: number | null;
  chestExpansionCm: number | null;

  // 2. Frontal Spine — Scoliosis Screening (SOSORT / SRS / Bunnell)
  shouldersLevel: ShouldersLevel;
  scapulaeSymmetry: ScapulaeSymmetry;
  waistTriangles: WaistTriangles;
  pelvisLevel: PelvisLevel;
  plumbLineC7DeviationMm: number | null;
  adamsTest: AdamsTestResult;
  scoliometerAtrDeg: number | null;

  // 3. Sagittal Spine — Kyphosis & Lordosis (Delmas / Stagnara)
  headPosture: HeadPosture;
  thoracicKyphosis: ThoracicKyphosis;
  lumbarLordosis: LumbarLordosis;
  thoracicReducibility: ThoracicReducibility;
  sagittalArrowC7Mm: number | null;
  sagittalArrowT6Mm: number | null;
  sagittalArrowL3Mm: number | null;

  // 4. Lower Limbs & Gait (Salenius & Vankka)
  kneeAlignment: KneeAlignment;
  intermalleolarDistCm: number | null;
  intercondylarDistCm: number | null;
  kneeSagittal: KneeSagittal;
  limbLengthDiffMm: number | null;
  gaitPattern: GaitPattern;

  // 5. Foot & Podology (Staheli / Jack's Windlass Test)
  footArch: FootArch;
  heelAlignment: HeelAlignment;
  jackTest: JackTestResult;
  tiptoeTest: TiptoeTestResult;
  footPainOrFatigue: boolean;

  // 6. Flexibility, Core Strength & Functional Battery
  fingerFloorDistCm: number | null; // negative means palms/fingers past floor, 0 touches floor, >0 cm above floor
  schoberCm: number | null; // normal >= 4.0 cm expansion
  shoulderMobility: ShoulderMobility;
  beightonScore: number | null; // 0..9
  coreEnduranceSec: number | null;
  backExtensorSec: number | null;
  singleLegBalanceSec: number | null;
  breathingPattern: BreathingPattern;

  // 7. Synthesis & Follow-Up
  clinicalSummary: string | null;
  parentAdvice: string | null;
  nextCheckupDate: string | null; // YYYY-MM-DD
  referralRecommended: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface KidsPhysicalProfileData {
  childProfile: KidsChildProfile;
  assessments: KidsPhysicalAssessment[];
  updatedAt: string;
}

export interface KidsDomainScores {
  growth: number;
  spineFrontal: number;
  spineSagittal: number;
  lowerLimbs: number;
  podology: number;
  mobilityCore: number;
}

export interface KidsBodyZoneStatus {
  head: ClinicalSeverity;
  shoulders: ClinicalSeverity;
  spineFrontal: ClinicalSeverity;
  thoracic: ClinicalSeverity;
  lumbar: ClinicalSeverity;
  pelvis: ClinicalSeverity;
  knees: ClinicalSeverity;
  feet: ClinicalSeverity;
}

export interface KidsClinicalFlag {
  code: string;
  domain: keyof KidsDomainScores;
  severity: Exclude<ClinicalSeverity, "optimal">;
  metricValue?: string;
}

export interface KidsAquaticRecommendation {
  code: string;
  priority: "high" | "medium" | "preventive";
  targetDisorder: string;
}

export interface KidsAssessmentEvaluation {
  ageYears: number | null;
  bmi: number | null;
  bmiZScore: number | null;
  bmiBand: WhoBmiBand | null;
  apeIndexCm: number | null;
  growthVelocityCmPerYear: number | null;
  growthSpurtAlert: boolean;
  overallStatus: OverallStatus;
  overallScore: number;
  domainScores: KidsDomainScores;
  bodyZones: KidsBodyZoneStatus;
  flags: KidsClinicalFlag[];
  recommendations: KidsAquaticRecommendation[];
}

// ─── WHO 2007 BMI-for-Age LMS Reference (Ages 4–16, Boys & Girls) ────────────
// Reference: WHO Child Growth Standards (2006) for age 4 and WHO Reference 2007 (5-19y)
// LMS parameters at exact integer years (interpolated linearly between years).

interface LmsRow {
  age: number;
  L: number;
  M: number;
  S: number;
}

const WHO_BMI_LMS_BOYS: LmsRow[] = [
  { age: 4, L: -0.2564, M: 15.32, S: 0.0804 },
  { age: 5, L: -0.7387, M: 15.26, S: 0.0840 },
  { age: 6, L: -1.1629, M: 15.31, S: 0.0875 },
  { age: 7, L: -1.4910, M: 15.49, S: 0.0919 },
  { age: 8, L: -1.7202, M: 15.74, S: 0.0972 },
  { age: 9, L: -1.8551, M: 16.05, S: 0.1032 },
  { age: 10, L: -1.9032, M: 16.44, S: 0.1095 },
  { age: 11, L: -1.8749, M: 16.92, S: 0.1155 },
  { age: 12, L: -1.7852, M: 17.50, S: 0.1205 },
  { age: 13, L: -1.6512, M: 18.18, S: 0.1243 },
  { age: 14, L: -1.4884, M: 18.96, S: 0.1268 },
  { age: 15, L: -1.3106, M: 19.77, S: 0.1281 },
  { age: 16, L: -1.1292, M: 20.54, S: 0.1285 },
];

const WHO_BMI_LMS_GIRLS: LmsRow[] = [
  { age: 4, L: -0.4534, M: 15.25, S: 0.0879 },
  { age: 5, L: -0.8886, M: 15.24, S: 0.0938 },
  { age: 6, L: -1.2139, M: 15.28, S: 0.0994 },
  { age: 7, L: -1.4173, M: 15.44, S: 0.1051 },
  { age: 8, L: -1.5209, M: 15.71, S: 0.1112 },
  { age: 9, L: -1.5471, M: 16.10, S: 0.1173 },
  { age: 10, L: -1.5150, M: 16.61, S: 0.1231 },
  { age: 11, L: -1.4419, M: 17.25, S: 0.1283 },
  { age: 12, L: -1.3418, M: 18.00, S: 0.1326 },
  { age: 13, L: -1.2275, M: 18.81, S: 0.1357 },
  { age: 14, L: -1.1095, M: 19.59, S: 0.1376 },
  { age: 15, L: -0.9964, M: 20.24, S: 0.1384 },
  { age: 16, L: -0.8942, M: 20.74, S: 0.1384 },
];

function interpolateLms(table: LmsRow[], ageYears: number): { L: number; M: number; S: number } {
  const clamped = Math.max(table[0].age, Math.min(table[table.length - 1].age, ageYears));
  const lowerIdx = Math.floor(clamped) - table[0].age;
  const upperIdx = Math.min(table.length - 1, lowerIdx + 1);
  const low = table[lowerIdx];
  const high = table[upperIdx];
  const frac = clamped - low.age;
  return {
    L: low.L + (high.L - low.L) * frac,
    M: low.M + (high.M - low.M) * frac,
    S: low.S + (high.S - low.S) * frac,
  };
}

export function computeAgeYears(
  birthDate: string | null | undefined,
  referenceDate?: string | null
): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  if (Number.isNaN(ref.getTime())) return null;
  const diffDays = (ref.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return null;
  return Math.round((diffDays / 365.25) * 10) / 10;
}

export function computeBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 40 || weightKg <= 5) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function computeWhoBmiZScore(
  bmi: number | null,
  ageYears: number | null,
  sex: ChildSex
): { zScore: number; band: WhoBmiBand } | null {
  if (bmi === null || ageYears === null) return null;
  const table = sex === "female" ? WHO_BMI_LMS_GIRLS : WHO_BMI_LMS_BOYS;
  const { L, M, S } = interpolateLms(table, ageYears);
  const rawZ =
    Math.abs(L) < 1e-6
      ? Math.log(bmi / M) / S
      : (Math.pow(bmi / M, L) - 1) / (L * S);
  const zScore = Math.round(rawZ * 100) / 100;

  let band: WhoBmiBand = "normal";
  if (zScore < -3) band = "severe_thinness";
  else if (zScore < -2) band = "thinness";
  else if (zScore <= 1) band = "normal";
  else if (zScore <= 2) band = "overweight";
  else band = "obesity";

  return { zScore, band };
}

export function computeGrowthVelocityCmPerYear(
  assessments: Pick<KidsPhysicalAssessment, "assessedAt" | "heightCm">[]
): number | null {
  const valid = assessments
    .filter((a) => a.heightCm !== null && a.heightCm > 0)
    .map((a) => ({ date: new Date(a.assessedAt).getTime(), heightCm: a.heightCm as number }))
    .filter((a) => !Number.isNaN(a.date))
    .sort((a, b) => a.date - b.date);

  if (valid.length < 2) return null;
  const prev = valid[valid.length - 2];
  const latest = valid[valid.length - 1];
  const diffDays = (latest.date - prev.date) / (1000 * 60 * 60 * 24);
  if (diffDays < 30) return null; // avoid noise on short re-checks
  const years = diffDays / 365.25;
  return Math.round(((latest.heightCm - prev.heightCm) / years) * 10) / 10;
}

function escalate(current: ClinicalSeverity, next: ClinicalSeverity): ClinicalSeverity {
  const rank: Record<ClinicalSeverity, number> = {
    optimal: 0,
    info: 1,
    watch: 2,
    referral: 3,
  };
  return rank[next] > rank[current] ? next : current;
}

function clampScore(value: number): number {
  return Math.max(20, Math.min(100, Math.round(value)));
}

// ─── Main Clinical Evaluation Engine ─────────────────────────────────────────

export function evaluateKidsAssessment(
  assessment: KidsPhysicalAssessment,
  childProfile: KidsChildProfile,
  allAssessments?: KidsPhysicalAssessment[]
): KidsAssessmentEvaluation {
  const ageYears = computeAgeYears(childProfile.birthDate, assessment.assessedAt);
  const bmi = computeBmi(assessment.heightCm, assessment.weightKg);
  const who = computeWhoBmiZScore(bmi, ageYears, childProfile.sex);
  const apeIndexCm =
    assessment.armSpanCm !== null && assessment.heightCm !== null
      ? Math.round((assessment.armSpanCm - assessment.heightCm) * 10) / 10
      : null;

  const historyUpToNow = (allAssessments ?? [assessment]).filter(
    (a) => new Date(a.assessedAt).getTime() <= new Date(assessment.assessedAt).getTime()
  );
  const growthVelocityCmPerYear = computeGrowthVelocityCmPerYear(historyUpToNow);
  const growthSpurtAlert = growthVelocityCmPerYear !== null && growthVelocityCmPerYear >= 7.5;

  const flags: KidsClinicalFlag[] = [];
  const recsMap = new Map<string, KidsAquaticRecommendation>();
  const addRec = (rec: KidsAquaticRecommendation) => {
    if (!recsMap.has(rec.code)) recsMap.set(rec.code, rec);
  };

  const scores: KidsDomainScores = {
    growth: 95,
    spineFrontal: 98,
    spineSagittal: 98,
    lowerLimbs: 98,
    podology: 98,
    mobilityCore: 92,
  };

  const bodyZones: KidsBodyZoneStatus = {
    head: "optimal",
    shoulders: "optimal",
    spineFrontal: "optimal",
    thoracic: "optimal",
    lumbar: "optimal",
    pelvis: "optimal",
    knees: "optimal",
    feet: "optimal",
  };

  // ── 1. Growth & WHO BMI-for-Age ──
  if (who) {
    if (who.band === "severe_thinness" || who.band === "obesity") {
      scores.growth -= 35;
      flags.push({
        code: who.band === "obesity" ? "bmi_obesity" : "bmi_severe_thinness",
        domain: "growth",
        severity: "referral",
        metricValue: `${bmi} kg/m2 (Z: ${who.zScore})`,
      });
      if (who.band === "obesity") {
        addRec({
          code: "aquatic_metabolic_cardio",
          priority: "high",
          targetDisorder: "bmi_obesity",
        });
      }
    } else if (who.band === "overweight" || who.band === "thinness") {
      scores.growth -= 18;
      flags.push({
        code: who.band === "overweight" ? "bmi_overweight" : "bmi_thinness",
        domain: "growth",
        severity: "watch",
        metricValue: `${bmi} kg/m2 (Z: ${who.zScore})`,
      });
      if (who.band === "overweight") {
        addRec({
          code: "aquatic_metabolic_cardio",
          priority: "medium",
          targetDisorder: "bmi_overweight",
        });
      }
    }
  }

  if (growthSpurtAlert && growthVelocityCmPerYear !== null) {
    flags.push({
      code: "rapid_growth_spurt",
      domain: "growth",
      severity: "info",
      metricValue: `+${growthVelocityCmPerYear} cm/yr`,
    });
  }

  if (assessment.chestExpansionCm !== null && assessment.chestExpansionCm < 3.5) {
    scores.growth -= 12;
    flags.push({
      code: "low_chest_expansion",
      domain: "growth",
      severity: "watch",
      metricValue: `${assessment.chestExpansionCm} cm`,
    });
    addRec({
      code: "respiratory_aquatic_ventilation",
      priority: "medium",
      targetDisorder: "low_chest_expansion",
    });
  }

  // ── 2. Frontal Spine — Scoliosis Screening (SOSORT / SRS) ──
  const hasRibHump =
    assessment.adamsTest === "rib_hump_thoracic" ||
    assessment.adamsTest === "rib_hump_lumbar" ||
    assessment.adamsTest === "rib_hump_double";

  const atr = assessment.scoliometerAtrDeg;

  if (hasRibHump || (atr !== null && atr >= 7)) {
    scores.spineFrontal -= 55;
    bodyZones.spineFrontal = escalate(bodyZones.spineFrontal, "referral");
    flags.push({
      code: "scoliosis_structural_suspect",
      domain: "spineFrontal",
      severity: "referral",
      metricValue: atr !== null ? `ATR ${atr} deg` : undefined,
    });
    addRec({
      code: "scoliosis_axial_elongation",
      priority: "high",
      targetDisorder: "scoliosis",
    });
  } else if (atr !== null && atr >= 5) {
    scores.spineFrontal -= 35;
    bodyZones.spineFrontal = escalate(bodyZones.spineFrontal, "watch");
    flags.push({
      code: "scoliosis_atr_threshold",
      domain: "spineFrontal",
      severity: "watch",
      metricValue: `ATR ${atr} deg`,
    });
    addRec({
      code: "scoliosis_axial_elongation",
      priority: "high",
      targetDisorder: "scoliosis",
    });
  } else if (
    assessment.adamsTest === "postural_asymmetry" ||
    (atr !== null && atr === 4) ||
    (assessment.plumbLineC7DeviationMm !== null && Math.abs(assessment.plumbLineC7DeviationMm) >= 12)
  ) {
    scores.spineFrontal -= 20;
    bodyZones.spineFrontal = escalate(bodyZones.spineFrontal, "watch");
    flags.push({
      code: "scoliotic_attitude",
      domain: "spineFrontal",
      severity: "watch",
      metricValue:
        atr !== null
          ? `ATR ${atr} deg`
          : assessment.plumbLineC7DeviationMm !== null
            ? `${assessment.plumbLineC7DeviationMm} mm`
            : undefined,
    });
    addRec({
      code: "scoliosis_axial_elongation",
      priority: "medium",
      targetDisorder: "scoliotic_attitude",
    });
  }

  let frontalAsymmetryCount = 0;
  if (assessment.shouldersLevel !== "balanced") {
    frontalAsymmetryCount += 1;
    bodyZones.shoulders = escalate(bodyZones.shoulders, "watch");
    scores.spineFrontal -= 8;
  }
  if (assessment.scapulaeSymmetry !== "balanced") {
    frontalAsymmetryCount += 1;
    bodyZones.shoulders = escalate(bodyZones.shoulders, "watch");
    scores.spineFrontal -= 8;
    if (assessment.scapulaeSymmetry === "winged_bilateral") {
      flags.push({
        code: "winged_scapulae",
        domain: "spineFrontal",
        severity: "watch",
      });
      addRec({
        code: "scapular_stabilization_backstroke",
        priority: "medium",
        targetDisorder: "winged_scapulae",
      });
    }
  }
  if (assessment.waistTriangles !== "symmetric") {
    frontalAsymmetryCount += 1;
    bodyZones.spineFrontal = escalate(bodyZones.spineFrontal, "watch");
    scores.spineFrontal -= 8;
  }
  if (assessment.pelvisLevel !== "balanced") {
    frontalAsymmetryCount += 1;
    bodyZones.pelvis = escalate(bodyZones.pelvis, "watch");
    scores.spineFrontal -= 10;
  }

  if (
    frontalAsymmetryCount >= 2 &&
    !flags.some((f) => f.domain === "spineFrontal" && f.code.startsWith("scolios"))
  ) {
    flags.push({
      code: "scoliotic_attitude",
      domain: "spineFrontal",
      severity: "watch",
    });
    addRec({
      code: "scoliosis_axial_elongation",
      priority: "medium",
      targetDisorder: "scoliotic_attitude",
    });
  }

  // ── 3. Sagittal Spine — Kyphosis & Hyperlordosis (Delmas / Stagnara) ──
  if (assessment.headPosture === "forward_marked") {
    scores.spineSagittal -= 18;
    bodyZones.head = escalate(bodyZones.head, "watch");
    flags.push({
      code: "forward_head_posture",
      domain: "spineSagittal",
      severity: "watch",
    });
    addRec({
      code: "kyphosis_backstroke_extension",
      priority: "medium",
      targetDisorder: "forward_head_posture",
    });
  } else if (assessment.headPosture === "forward_mild") {
    scores.spineSagittal -= 8;
    bodyZones.head = escalate(bodyZones.head, "info");
  }

  if (assessment.thoracicKyphosis === "hyperkyphosis_rigid" || assessment.thoracicReducibility === "rigid") {
    scores.spineSagittal -= 45;
    bodyZones.thoracic = escalate(bodyZones.thoracic, "referral");
    flags.push({
      code: "kyphosis_rigid_scheuermann_check",
      domain: "spineSagittal",
      severity: "referral",
      metricValue:
        assessment.sagittalArrowC7Mm !== null ? `C7 ${assessment.sagittalArrowC7Mm} mm` : undefined,
    });
    addRec({
      code: "kyphosis_backstroke_extension",
      priority: "high",
      targetDisorder: "kyphosis",
    });
  } else if (
    assessment.thoracicKyphosis === "hyperkyphosis_reducible" ||
    assessment.thoracicKyphosis === "postural_round_back"
  ) {
    scores.spineSagittal -= 22;
    bodyZones.thoracic = escalate(bodyZones.thoracic, "watch");
    flags.push({
      code: "kyphosis_postural_reducible",
      domain: "spineSagittal",
      severity: "watch",
      metricValue:
        assessment.sagittalArrowC7Mm !== null ? `C7 ${assessment.sagittalArrowC7Mm} mm` : undefined,
    });
    addRec({
      code: "kyphosis_backstroke_extension",
      priority: "high",
      targetDisorder: "kyphosis",
    });
  } else if (assessment.thoracicKyphosis === "flat_back") {
    scores.spineSagittal -= 12;
    bodyZones.thoracic = escalate(bodyZones.thoracic, "info");
    flags.push({
      code: "flat_back_posture",
      domain: "spineSagittal",
      severity: "info",
    });
  }

  if (
    assessment.lumbarLordosis === "hyperlordosis" ||
    (assessment.sagittalArrowL3Mm !== null && assessment.sagittalArrowL3Mm > 45)
  ) {
    scores.spineSagittal -= 22;
    bodyZones.lumbar = escalate(bodyZones.lumbar, "watch");
    flags.push({
      code: "lumbar_hyperlordosis",
      domain: "spineSagittal",
      severity: "watch",
      metricValue:
        assessment.sagittalArrowL3Mm !== null ? `L3 ${assessment.sagittalArrowL3Mm} mm` : undefined,
    });
    addRec({
      code: "hyperlordosis_core_pelvic_control",
      priority: "high",
      targetDisorder: "hyperlordosis",
    });
  } else if (assessment.lumbarLordosis === "hypolordosis") {
    scores.spineSagittal -= 12;
    bodyZones.lumbar = escalate(bodyZones.lumbar, "info");
  }

  // ── 4. Lower Limbs & Gait (Salenius & Vankka) ──
  const imd = assessment.intermalleolarDistCm;
  const icd = assessment.intercondylarDistCm;

  if (assessment.kneeAlignment === "asymmetric") {
    scores.lowerLimbs -= 40;
    bodyZones.knees = escalate(bodyZones.knees, "referral");
    flags.push({
      code: "knee_alignment_asymmetric",
      domain: "lowerLimbs",
      severity: "referral",
    });
  } else if (assessment.kneeAlignment === "genu_valgum") {
    const isPhysiologicalAge = ageYears !== null && ageYears <= 6;
    if ((imd !== null && imd > 8) || (!isPhysiologicalAge && imd !== null && imd > 6)) {
      scores.lowerLimbs -= 40;
      bodyZones.knees = escalate(bodyZones.knees, "referral");
      flags.push({
        code: "genu_valgum_significant",
        domain: "lowerLimbs",
        severity: "referral",
        metricValue: imd !== null ? `DIM ${imd} cm` : undefined,
      });
      addRec({
        code: "genu_valgum_flutter_kick_protocol",
        priority: "high",
        targetDisorder: "genu_valgum",
      });
    } else if (isPhysiologicalAge && (imd === null || imd <= 6)) {
      scores.lowerLimbs -= 8;
      bodyZones.knees = escalate(bodyZones.knees, "info");
      flags.push({
        code: "genu_valgum_physiological",
        domain: "lowerLimbs",
        severity: "info",
        metricValue: imd !== null ? `DIM ${imd} cm` : undefined,
      });
      addRec({
        code: "genu_valgum_flutter_kick_protocol",
        priority: "preventive",
        targetDisorder: "genu_valgum",
      });
    } else {
      scores.lowerLimbs -= 22;
      bodyZones.knees = escalate(bodyZones.knees, "watch");
      flags.push({
        code: "genu_valgum_watch",
        domain: "lowerLimbs",
        severity: "watch",
        metricValue: imd !== null ? `DIM ${imd} cm` : undefined,
      });
      addRec({
        code: "genu_valgum_flutter_kick_protocol",
        priority: "medium",
        targetDisorder: "genu_valgum",
      });
    }
  } else if (assessment.kneeAlignment === "genu_varum") {
    if (icd !== null && icd > 5) {
      scores.lowerLimbs -= 40;
      bodyZones.knees = escalate(bodyZones.knees, "referral");
      flags.push({
        code: "genu_varum_significant",
        domain: "lowerLimbs",
        severity: "referral",
        metricValue: `DIC ${icd} cm`,
      });
    } else {
      scores.lowerLimbs -= 24;
      bodyZones.knees = escalate(bodyZones.knees, "watch");
      flags.push({
        code: "genu_varum_watch",
        domain: "lowerLimbs",
        severity: "watch",
        metricValue: icd !== null ? `DIC ${icd} cm` : undefined,
      });
    }
  }

  if (assessment.kneeSagittal === "genu_recurvatum") {
    scores.lowerLimbs -= 12;
    bodyZones.knees = escalate(bodyZones.knees, "watch");
    flags.push({
      code: "genu_recurvatum",
      domain: "lowerLimbs",
      severity: "watch",
    });
  } else if (assessment.kneeSagittal === "genu_flexum") {
    scores.lowerLimbs -= 18;
    bodyZones.knees = escalate(bodyZones.knees, "watch");
  }

  if (assessment.limbLengthDiffMm !== null && assessment.limbLengthDiffMm > 15) {
    scores.lowerLimbs -= 35;
    bodyZones.pelvis = escalate(bodyZones.pelvis, "referral");
    flags.push({
      code: "limb_length_discrepancy_high",
      domain: "lowerLimbs",
      severity: "referral",
      metricValue: `${assessment.limbLengthDiffMm} mm`,
    });
  } else if (assessment.limbLengthDiffMm !== null && assessment.limbLengthDiffMm >= 8) {
    scores.lowerLimbs -= 15;
    bodyZones.pelvis = escalate(bodyZones.pelvis, "watch");
    flags.push({
      code: "limb_length_discrepancy_watch",
      domain: "lowerLimbs",
      severity: "watch",
      metricValue: `${assessment.limbLengthDiffMm} mm`,
    });
  }

  if (assessment.gaitPattern === "limping") {
    scores.lowerLimbs -= 40;
    bodyZones.knees = escalate(bodyZones.knees, "referral");
    flags.push({
      code: "gait_limping",
      domain: "lowerLimbs",
      severity: "referral",
    });
  } else if (assessment.gaitPattern !== "normal") {
    scores.lowerLimbs -= 15;
    bodyZones.knees = escalate(bodyZones.knees, "watch");
    flags.push({
      code: `gait_${assessment.gaitPattern}`,
      domain: "lowerLimbs",
      severity: "watch",
    });
  }

  // ── 5. Foot & Podology (Staheli / Jack's Windlass Test) ──
  const rigidFlatfoot =
    assessment.footArch === "flat_rigid" ||
    (assessment.footArch === "flat_flexible" &&
      (assessment.jackTest === "negative_rigid" || assessment.tiptoeTest === "arch_absent"));

  if (rigidFlatfoot || (assessment.footArch !== "normal" && assessment.footPainOrFatigue)) {
    scores.podology -= 45;
    bodyZones.feet = escalate(bodyZones.feet, "referral");
    flags.push({
      code: "flatfoot_rigid_or_painful",
      domain: "podology",
      severity: "referral",
    });
    addRec({
      code: "flatfoot_intrinsic_plantar_drills",
      priority: "high",
      targetDisorder: "flatfoot",
    });
  } else if (assessment.footArch === "flat_flexible") {
    const isPhysiologicalFootAge = ageYears !== null && ageYears <= 6;
    if (isPhysiologicalFootAge && assessment.heelAlignment !== "valgus_marked") {
      scores.podology -= 10;
      bodyZones.feet = escalate(bodyZones.feet, "info");
      flags.push({
        code: "flatfoot_flexible_physiological",
        domain: "podology",
        severity: "info",
      });
      addRec({
        code: "flatfoot_intrinsic_plantar_drills",
        priority: "preventive",
        targetDisorder: "flatfoot",
      });
    } else {
      scores.podology -= 24;
      bodyZones.feet = escalate(bodyZones.feet, "watch");
      flags.push({
        code: "flatfoot_flexible_watch",
        domain: "podology",
        severity: "watch",
      });
      addRec({
        code: "flatfoot_intrinsic_plantar_drills",
        priority: "medium",
        targetDisorder: "flatfoot",
      });
    }
  } else if (assessment.footArch === "high_arch") {
    scores.podology -= 22;
    bodyZones.feet = escalate(bodyZones.feet, "watch");
    flags.push({
      code: "pes_cavus_watch",
      domain: "podology",
      severity: "watch",
    });
  }

  if (assessment.heelAlignment === "valgus_marked") {
    scores.podology -= 18;
    bodyZones.feet = escalate(bodyZones.feet, "watch");
    if (!flags.some((f) => f.domain === "podology")) {
      flags.push({
        code: "calcaneal_valgus_marked",
        domain: "podology",
        severity: "watch",
      });
    }
  } else if (assessment.heelAlignment === "valgus_mild") {
    scores.podology -= 6;
    bodyZones.feet = escalate(bodyZones.feet, "info");
  }

  // ── 6. Flexibility, Core & Neuromuscular ──
  if (assessment.fingerFloorDistCm !== null && assessment.fingerFloorDistCm > 12) {
    scores.mobilityCore -= 20;
    flags.push({
      code: "posterior_chain_tightness",
      domain: "mobilityCore",
      severity: "watch",
      metricValue: `DDS ${assessment.fingerFloorDistCm} cm`,
    });
    addRec({
      code: "posterior_chain_stretching",
      priority: "medium",
      targetDisorder: "posterior_chain_tightness",
    });
  }

  if (assessment.schoberCm !== null && assessment.schoberCm < 4) {
    scores.mobilityCore -= 22;
    bodyZones.lumbar = escalate(bodyZones.lumbar, "watch");
    flags.push({
      code: "lumbar_stiffness_schober",
      domain: "mobilityCore",
      severity: "watch",
      metricValue: `+${assessment.schoberCm} cm`,
    });
  }

  if (assessment.beightonScore !== null && assessment.beightonScore >= 6) {
    scores.mobilityCore -= 14;
    flags.push({
      code: "joint_hypermobility_beighton",
      domain: "mobilityCore",
      severity: "watch",
      metricValue: `${assessment.beightonScore}/9`,
    });
    addRec({
      code: "hypermobility_joint_stability",
      priority: "medium",
      targetDisorder: "hypermobility",
    });
  }

  if (assessment.shoulderMobility === "restricted") {
    scores.mobilityCore -= 18;
    bodyZones.shoulders = escalate(bodyZones.shoulders, "watch");
    flags.push({
      code: "shoulder_mobility_restricted",
      domain: "mobilityCore",
      severity: "watch",
    });
    addRec({
      code: "scapular_stabilization_backstroke",
      priority: "medium",
      targetDisorder: "shoulder_mobility",
    });
  } else if (assessment.shoulderMobility === "mild_restriction") {
    scores.mobilityCore -= 8;
  }

  if (assessment.coreEnduranceSec !== null) {
    if (assessment.coreEnduranceSec < 20) {
      scores.mobilityCore -= 18;
      flags.push({
        code: "core_weakness",
        domain: "mobilityCore",
        severity: "watch",
        metricValue: `${assessment.coreEnduranceSec} s`,
      });
      addRec({
        code: "hyperlordosis_core_pelvic_control",
        priority: "medium",
        targetDisorder: "core_weakness",
      });
    } else if (assessment.coreEnduranceSec >= 45) {
      scores.mobilityCore += 6;
    }
  }

  if (assessment.breathingPattern !== "diaphragmatic_balanced") {
    scores.mobilityCore -= 10;
    addRec({
      code: "respiratory_aquatic_ventilation",
      priority: "preventive",
      targetDisorder: "breathing",
    });
  }

  // Always include a balanced preventive swimming foundation if no specific flags triggered
  if (recsMap.size === 0) {
    addRec({
      code: "harmonious_4_stroke_development",
      priority: "preventive",
      targetDisorder: "optimal",
    });
  }

  const domainScores: KidsDomainScores = {
    growth: clampScore(scores.growth),
    spineFrontal: clampScore(scores.spineFrontal),
    spineSagittal: clampScore(scores.spineSagittal),
    lowerLimbs: clampScore(scores.lowerLimbs),
    podology: clampScore(scores.podology),
    mobilityCore: clampScore(scores.mobilityCore),
  };

  const overallScore = Math.round(
    (domainScores.growth +
      domainScores.spineFrontal +
      domainScores.spineSagittal +
      domainScores.lowerLimbs +
      domainScores.podology +
      domainScores.mobilityCore) /
      6
  );

  const hasReferralFlag =
    assessment.referralRecommended || flags.some((f) => f.severity === "referral");
  const hasWatchFlag = flags.some((f) => f.severity === "watch");

  const overallStatus: OverallStatus = hasReferralFlag
    ? "referral"
    : hasWatchFlag
      ? "watch"
      : "optimal";

  // Sort flags: referral first, then watch, then info
  const severityOrder: Record<Exclude<ClinicalSeverity, "optimal">, number> = {
    referral: 0,
    watch: 1,
    info: 2,
  };
  flags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const priorityOrder: Record<KidsAquaticRecommendation["priority"], number> = {
    high: 0,
    medium: 1,
    preventive: 2,
  };
  const recommendations = Array.from(recsMap.values()).sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return {
    ageYears,
    bmi,
    bmiZScore: who?.zScore ?? null,
    bmiBand: who?.band ?? null,
    apeIndexCm,
    growthVelocityCmPerYear,
    growthSpurtAlert,
    overallStatus,
    overallScore,
    domainScores,
    bodyZones,
    flags,
    recommendations,
  };
}

// ─── Defaults & Zod Schemas ──────────────────────────────────────────────────

export function createDefaultChildProfile(): KidsChildProfile {
  return {
    birthDate: null,
    sex: "male",
    dominantSide: "right",
    medicalNotes: null,
  };
}

export function createEmptyAssessmentDraft(evaluatorName = "Kinesitherapeute AQA"): Omit<
  KidsPhysicalAssessment,
  "id" | "createdAt" | "updatedAt"
> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    assessedAt: today,
    label: "",
    evaluatorName,
    evaluatorTitle: "Kinesitherapeute / Suivi Physique AQA Kids",
    publishedToPortal: true,
    heightCm: null,
    weightKg: null,
    armSpanCm: null,
    sittingHeightCm: null,
    chestExpansionCm: null,
    shouldersLevel: "balanced",
    scapulaeSymmetry: "balanced",
    waistTriangles: "symmetric",
    pelvisLevel: "balanced",
    plumbLineC7DeviationMm: 0,
    adamsTest: "negative",
    scoliometerAtrDeg: 0,
    headPosture: "aligned",
    thoracicKyphosis: "normal",
    lumbarLordosis: "normal",
    thoracicReducibility: "full",
    sagittalArrowC7Mm: null,
    sagittalArrowT6Mm: null,
    sagittalArrowL3Mm: null,
    kneeAlignment: "normal",
    intermalleolarDistCm: null,
    intercondylarDistCm: null,
    kneeSagittal: "normal",
    limbLengthDiffMm: 0,
    gaitPattern: "normal",
    footArch: "normal",
    heelAlignment: "neutral",
    jackTest: "positive_reducible",
    tiptoeTest: "arch_forms",
    footPainOrFatigue: false,
    fingerFloorDistCm: null,
    schoberCm: null,
    shoulderMobility: "optimal",
    beightonScore: null,
    coreEnduranceSec: null,
    backExtensorSec: null,
    singleLegBalanceSec: null,
    breathingPattern: "diaphragmatic_balanced",
    clinicalSummary: "",
    parentAdvice: "",
    nextCheckupDate: null,
    referralRecommended: false,
  };
}

const optionalNumber = (min: number, max: number) =>
  z
    .union([z.number().min(min).max(max), z.null(), z.undefined()])
    .transform((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));

const optionalDateString = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v && v.length === 10 ? v : null));

const optionalText = (maxLen: number) =>
  z
    .union([z.string().max(maxLen), z.null(), z.undefined()])
    .transform((v) => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim();
      return trimmed.length > 0 ? trimmed : null;
    });

export const childProfileSchema = z.object({
  birthDate: optionalDateString,
  sex: z.enum(["male", "female"]).default("male"),
  dominantSide: z.enum(["right", "left", "ambidextrous"]).default("right"),
  medicalNotes: optionalText(1000),
});

export const assessmentInputSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  assessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: optionalText(120),
  evaluatorName: z.string().trim().min(1).max(120),
  evaluatorTitle: optionalText(160),
  publishedToPortal: z.boolean().default(true),

  heightCm: optionalNumber(60, 220),
  weightKg: optionalNumber(8, 150),
  armSpanCm: optionalNumber(60, 230),
  sittingHeightCm: optionalNumber(30, 120),
  chestExpansionCm: optionalNumber(0, 20),

  shouldersLevel: z.enum(["balanced", "left_higher", "right_higher"]).default("balanced"),
  scapulaeSymmetry: z
    .enum(["balanced", "left_prominent", "right_prominent", "winged_bilateral"])
    .default("balanced"),
  waistTriangles: z.enum(["symmetric", "left_deeper", "right_deeper"]).default("symmetric"),
  pelvisLevel: z.enum(["balanced", "left_higher", "right_higher"]).default("balanced"),
  plumbLineC7DeviationMm: optionalNumber(-80, 80),
  adamsTest: z
    .enum([
      "negative",
      "postural_asymmetry",
      "rib_hump_thoracic",
      "rib_hump_lumbar",
      "rib_hump_double",
    ])
    .default("negative"),
  scoliometerAtrDeg: optionalNumber(0, 45),

  headPosture: z.enum(["aligned", "forward_mild", "forward_marked"]).default("aligned"),
  thoracicKyphosis: z
    .enum([
      "normal",
      "postural_round_back",
      "hyperkyphosis_reducible",
      "hyperkyphosis_rigid",
      "flat_back",
    ])
    .default("normal"),
  lumbarLordosis: z.enum(["normal", "hyperlordosis", "hypolordosis"]).default("normal"),
  thoracicReducibility: z.enum(["full", "partial", "rigid"]).default("full"),
  sagittalArrowC7Mm: optionalNumber(0, 150),
  sagittalArrowT6Mm: optionalNumber(0, 100),
  sagittalArrowL3Mm: optionalNumber(0, 120),

  kneeAlignment: z
    .enum(["normal", "genu_valgum", "genu_varum", "asymmetric"])
    .default("normal"),
  intermalleolarDistCm: optionalNumber(0, 30),
  intercondylarDistCm: optionalNumber(0, 30),
  kneeSagittal: z.enum(["normal", "genu_recurvatum", "genu_flexum"]).default("normal"),
  limbLengthDiffMm: optionalNumber(0, 60),
  gaitPattern: z
    .enum(["normal", "intoeing", "outtoeing", "toe_walking", "limping"])
    .default("normal"),

  footArch: z.enum(["normal", "flat_flexible", "flat_rigid", "high_arch"]).default("normal"),
  heelAlignment: z.enum(["neutral", "valgus_mild", "valgus_marked", "varus"]).default("neutral"),
  jackTest: z.enum(["positive_reducible", "negative_rigid", "not_tested"]).default("not_tested"),
  tiptoeTest: z.enum(["arch_forms", "arch_absent", "not_tested"]).default("not_tested"),
  footPainOrFatigue: z.boolean().default(false),

  fingerFloorDistCm: optionalNumber(-25, 60),
  schoberCm: optionalNumber(0, 12),
  shoulderMobility: z
    .enum(["optimal", "mild_restriction", "restricted", "hyperlax"])
    .default("optimal"),
  beightonScore: optionalNumber(0, 9),
  coreEnduranceSec: optionalNumber(0, 600),
  backExtensorSec: optionalNumber(0, 600),
  singleLegBalanceSec: optionalNumber(0, 300),
  breathingPattern: z
    .enum(["diaphragmatic_balanced", "thoracic_shallow", "mouth_breathing"])
    .default("diaphragmatic_balanced"),

  clinicalSummary: optionalText(2000),
  parentAdvice: optionalText(2000),
  nextCheckupDate: optionalDateString,
  referralRecommended: z.boolean().default(false),
});

export const kidsSuiviActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_child_profile"),
    memberId: z.string().min(1),
    childProfile: childProfileSchema,
  }),
  z.object({
    action: z.literal("save_assessment"),
    memberId: z.string().min(1),
    childProfile: childProfileSchema.optional(),
    assessment: assessmentInputSchema,
  }),
  z.object({
    action: z.literal("delete_assessment"),
    memberId: z.string().min(1),
    assessmentId: z.string().min(1),
  }),
  z.object({
    action: z.literal("toggle_publish"),
    memberId: z.string().min(1),
    assessmentId: z.string().min(1),
    publishedToPortal: z.boolean(),
  }),
]);
