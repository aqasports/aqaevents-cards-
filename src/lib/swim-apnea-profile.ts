import { prisma } from "@/lib/prisma";
import {
  APNEA_STATIC_GOAL_SECONDS,
  buildApneaEvolution,
  getApneaStaticGoalPercent,
  getBestApneaRecords,
  summarizeApneaPacks,
  type ApneaEvolutionPoint,
} from "@/lib/swim-apnea";

export interface ApneaProfileData {
  sessionsTotal: number;
  sessionsAttended: number;
  sessionsRemaining: number;
  hasFins: boolean;
  totalPriceDA: number;
  totalPaidDA: number;
  remainingDebtDA: number;
  bestStaticSeconds: number | null;
  bestDynamicMeters: number | null;
  staticGoalSeconds: number;
  staticGoalPercent: number;
  staticEvolution: ApneaEvolutionPoint[];
  dynamicEvolution: ApneaEvolutionPoint[];
}

/**
 * Loads the AQA Apnea block of a public client profile. Returns null for
 * members that are neither in the apnea category nor holding an apnea pack,
 * so regular swim profiles are completely unchanged.
 */
export async function loadApneaProfile(
  memberId: string,
  category: string | null | undefined
): Promise<ApneaProfileData | null> {
  const [packs, presences, records, payments] = await Promise.all([
    prisma.swimApneaPack.findMany({ where: { memberId } }),
    prisma.swimApneaPresence.findMany({ where: { memberId }, select: { status: true } }),
    prisma.swimApneaRecord.findMany({
      where: { memberId },
      select: { kind: true, value: true, recordedAt: true },
      orderBy: { recordedAt: "asc" },
    }),
    prisma.swimPayment.findMany({ where: { memberId }, select: { amount: true } }),
  ]);

  const isApnea = (category || "").toLowerCase().includes("apne");
  if (!isApnea && packs.length === 0) return null;

  const summary = summarizeApneaPacks(packs, presences);
  const best = getBestApneaRecords(records);
  const totalPaidDA = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    sessionsTotal: summary.sessionsTotal,
    sessionsAttended: summary.sessionsAttended,
    sessionsRemaining: summary.sessionsRemaining,
    hasFins: summary.hasFins,
    totalPriceDA: summary.totalPriceDA,
    totalPaidDA,
    remainingDebtDA: Math.max(0, summary.totalPriceDA - totalPaidDA),
    bestStaticSeconds: best.staticSeconds,
    bestDynamicMeters: best.dynamicMeters,
    staticGoalSeconds: APNEA_STATIC_GOAL_SECONDS,
    staticGoalPercent: getApneaStaticGoalPercent(best.staticSeconds),
    staticEvolution: buildApneaEvolution(records, "static"),
    dynamicEvolution: buildApneaEvolution(records, "dynamic"),
  };
}
