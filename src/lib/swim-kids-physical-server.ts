import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  createDefaultChildProfile,
  evaluateKidsAssessment,
  type KidsAssessmentEvaluation,
  type KidsChildProfile,
  type KidsPhysicalAssessment,
  type KidsPhysicalProfileData,
} from "@/lib/swim-kids-physical";

export const KIDS_PHYSICAL_KEY_PREFIX = "kids_physical_suivi:";

export function kidsPhysicalSettingKey(memberId: string): string {
  return `${KIDS_PHYSICAL_KEY_PREFIX}${memberId}`;
}

export interface EvaluatedKidsAssessment {
  assessment: KidsPhysicalAssessment;
  evaluation: KidsAssessmentEvaluation;
}

export interface PublicKidsPhysicalPayload {
  childProfile: KidsChildProfile;
  assessments: EvaluatedKidsAssessment[];
  latest: EvaluatedKidsAssessment | null;
  first: EvaluatedKidsAssessment | null;
  evolution: {
    height: { date: string; value: number }[];
    weight: { date: string; value: number }[];
    bmi: { date: string; value: number }[];
    atr: { date: string; value: number }[];
    coreSec: { date: string; value: number }[];
    flexibilityCm: { date: string; value: number }[];
  };
}

function parseProfileJson(raw: string | null | undefined): KidsPhysicalProfileData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<KidsPhysicalProfileData>;
    if (!parsed || typeof parsed !== "object") return null;
    const childProfile: KidsChildProfile = {
      ...createDefaultChildProfile(),
      ...(parsed.childProfile ?? {}),
    };
    const assessments = Array.isArray(parsed.assessments) ? parsed.assessments : [];
    assessments.sort(
      (a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
    );
    return {
      childProfile,
      assessments,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch (err) {
    logger.error("Failed to parse kids physical profile JSON:", err);
    return null;
  }
}

export async function getKidsPhysicalProfile(
  memberId: string
): Promise<KidsPhysicalProfileData> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: kidsPhysicalSettingKey(memberId) },
    select: { value: true },
  });
  const parsed = parseProfileJson(row?.value);
  if (parsed) return parsed;
  return {
    childProfile: createDefaultChildProfile(),
    assessments: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function listAllKidsPhysicalProfiles(): Promise<
  Map<string, KidsPhysicalProfileData>
> {
  const rows = await prisma.platformSetting.findMany({
    where: { key: { startsWith: KIDS_PHYSICAL_KEY_PREFIX } },
    select: { key: true, value: true },
  });
  const map = new Map<string, KidsPhysicalProfileData>();
  for (const row of rows) {
    const memberId = row.key.slice(KIDS_PHYSICAL_KEY_PREFIX.length);
    const parsed = parseProfileJson(row.value);
    if (memberId && parsed) {
      map.set(memberId, parsed);
    }
  }
  return map;
}

export async function saveKidsPhysicalProfile(
  memberId: string,
  profile: KidsPhysicalProfileData
): Promise<KidsPhysicalProfileData> {
  const sortedAssessments = [...profile.assessments].sort(
    (a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
  );
  const next: KidsPhysicalProfileData = {
    childProfile: profile.childProfile,
    assessments: sortedAssessments,
    updatedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(next);
  await prisma.platformSetting.upsert({
    where: { key: kidsPhysicalSettingKey(memberId) },
    create: { key: kidsPhysicalSettingKey(memberId), value: serialized },
    update: { value: serialized },
  });
  return next;
}

export async function upsertKidsAssessment(params: {
  memberId: string;
  childProfile?: KidsChildProfile;
  input: Omit<KidsPhysicalAssessment, "id" | "createdAt" | "updatedAt"> & { id?: string };
}): Promise<{ profile: KidsPhysicalProfileData; savedAssessment: KidsPhysicalAssessment }> {
  const existing = await getKidsPhysicalProfile(params.memberId);
  const now = new Date().toISOString();
  const childProfile = params.childProfile ?? existing.childProfile;

  let savedAssessment: KidsPhysicalAssessment;
  const idx = params.input.id
    ? existing.assessments.findIndex((a) => a.id === params.input.id)
    : -1;

  if (idx >= 0) {
    const prev = existing.assessments[idx];
    savedAssessment = {
      ...params.input,
      id: prev.id,
      createdAt: prev.createdAt,
      updatedAt: now,
    };
    const nextList = [...existing.assessments];
    nextList[idx] = savedAssessment;
    const saved = await saveKidsPhysicalProfile(params.memberId, {
      childProfile,
      assessments: nextList,
      updatedAt: now,
    });
    return { profile: saved, savedAssessment };
  }

  savedAssessment = {
    ...params.input,
    id: `kpb_${nanoid(10)}`,
    createdAt: now,
    updatedAt: now,
  };
  const saved = await saveKidsPhysicalProfile(params.memberId, {
    childProfile,
    assessments: [savedAssessment, ...existing.assessments],
    updatedAt: now,
  });
  return { profile: saved, savedAssessment };
}

export async function deleteKidsAssessment(
  memberId: string,
  assessmentId: string
): Promise<KidsPhysicalProfileData> {
  const existing = await getKidsPhysicalProfile(memberId);
  const filtered = existing.assessments.filter((a) => a.id !== assessmentId);
  return saveKidsPhysicalProfile(memberId, {
    childProfile: existing.childProfile,
    assessments: filtered,
    updatedAt: new Date().toISOString(),
  });
}

export async function toggleKidsAssessmentPublish(
  memberId: string,
  assessmentId: string,
  publishedToPortal: boolean
): Promise<KidsPhysicalProfileData> {
  const existing = await getKidsPhysicalProfile(memberId);
  const now = new Date().toISOString();
  const updated = existing.assessments.map((a) =>
    a.id === assessmentId ? { ...a, publishedToPortal, updatedAt: now } : a
  );
  return saveKidsPhysicalProfile(memberId, {
    childProfile: existing.childProfile,
    assessments: updated,
    updatedAt: now,
  });
}

export function buildEvaluatedPayload(
  profile: KidsPhysicalProfileData,
  onlyPublished: boolean
): PublicKidsPhysicalPayload {
  const filtered = onlyPublished
    ? profile.assessments.filter((a) => a.publishedToPortal)
    : profile.assessments;

  // Chronological ascending for charts & velocity
  const chronological = [...filtered].sort(
    (a, b) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime()
  );

  const evaluatedChrono: EvaluatedKidsAssessment[] = chronological.map((assessment) => ({
    assessment,
    evaluation: evaluateKidsAssessment(assessment, profile.childProfile, chronological),
  }));

  const height: { date: string; value: number }[] = [];
  const weight: { date: string; value: number }[] = [];
  const bmi: { date: string; value: number }[] = [];
  const atr: { date: string; value: number }[] = [];
  const coreSec: { date: string; value: number }[] = [];
  const flexibilityCm: { date: string; value: number }[] = [];

  for (const item of evaluatedChrono) {
    const d = item.assessment.assessedAt;
    if (item.assessment.heightCm !== null) height.push({ date: d, value: item.assessment.heightCm });
    if (item.assessment.weightKg !== null) weight.push({ date: d, value: item.assessment.weightKg });
    if (item.evaluation.bmi !== null) bmi.push({ date: d, value: item.evaluation.bmi });
    if (item.assessment.scoliometerAtrDeg !== null) atr.push({ date: d, value: item.assessment.scoliometerAtrDeg });
    if (item.assessment.coreEnduranceSec !== null) coreSec.push({ date: d, value: item.assessment.coreEnduranceSec });
    if (item.assessment.fingerFloorDistCm !== null) flexibilityCm.push({ date: d, value: item.assessment.fingerFloorDistCm });
  }

  // Descending order for UI display (latest first)
  const descending = [...evaluatedChrono].reverse();

  return {
    childProfile: profile.childProfile,
    assessments: descending,
    latest: descending[0] ?? null,
    first: evaluatedChrono[0] ?? null,
    evolution: { height, weight, bmi, atr, coreSec, flexibilityCm },
  };
}

/**
 * Loads the published AQA Kids Suivi Physique block for the public client portal.
 * Returns null if the member is not in the kids category and has no published bilans.
 */
export async function loadPublicKidsPhysicalProfile(
  memberId: string,
  category: string | null | undefined
): Promise<PublicKidsPhysicalPayload | null> {
  const normCat = (category || "").toLowerCase();
  const isKid = normCat.includes("enfant") || normCat.includes("kid");

  if (!prisma?.platformSetting?.findUnique) {
    return null;
  }

  const row = await prisma.platformSetting.findUnique({
    where: { key: kidsPhysicalSettingKey(memberId) },
    select: { value: true },
  });
  const parsed = parseProfileJson(row?.value);

  if (!parsed) {
    if (!isKid) return null;
    return buildEvaluatedPayload(
      {
        childProfile: createDefaultChildProfile(),
        assessments: [],
        updatedAt: new Date().toISOString(),
      },
      true
    );
  }

  const payload = buildEvaluatedPayload(parsed, true);
  if (!isKid && payload.assessments.length === 0) {
    return null;
  }
  return payload;
}
