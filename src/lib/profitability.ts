/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./prisma";
import { getCreditRate } from "./settings";
import { getEffectiveCreditRateForClient } from "./organizations";
import { calculateCoachPayout } from "./coach-payouts";

export async function calculateSessionProfitability(sessionId: string): Promise<{
  session: any;
  grossRevenue: number;
  variableExpenses: number;
  coachPayout: number;
  netProfit: number;
  profitMarginPercent: number;
}> {
  const session = await prisma.activitySession.findUnique({
    where: { id: sessionId },
    include: {
      activity: true,
      checkIns: true,
      sessionExpenses: true,
      coach: true,
      equipmentUsages: {
        include: {
          equipmentAsset: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error(`Session with id ${sessionId} not found`);
  }

  const firstClientId = session.checkIns[0]?.clientId;
  const effectiveRate = firstClientId
    ? await getEffectiveCreditRateForClient(firstClientId)
    : await getCreditRate();

  const grossRevenue = (session.checkIns.length || 0) * session.activity.creditCost * effectiveRate;
  const variableExpenses = session.sessionExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const payoutResult = await calculateCoachPayout(session);
  const coachPayout = payoutResult.totalPayout;

  const netProfit = grossRevenue - variableExpenses - coachPayout;
  const profitMarginPercent = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

  return {
    session,
    grossRevenue,
    variableExpenses,
    coachPayout,
    netProfit,
    profitMarginPercent,
  };
}
