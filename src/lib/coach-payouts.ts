import { getCreditRate } from "./settings";

export type SessionWithCoach = {
  coachPayOverride?: number | null;
  coach?: {
    defaultPayRate: number;
    commissionRate: number;
  } | null;
  activity: {
    creditCost: number;
  };
  checkIns?: Array<unknown> | null;
};

export async function calculateCoachPayout(session: SessionWithCoach): Promise<{
  basePay: number;
  commission: number;
  totalPayout: number;
}> {
  const creditRate = await getCreditRate();
  const basePay = session.coachPayOverride ?? session.coach?.defaultPayRate ?? 0;
  const attendanceCount = session.checkIns?.length ?? 0;
  const revenue = attendanceCount * session.activity.creditCost * creditRate;
  const commissionRate = session.coach?.commissionRate ?? 0;
  const commission = Math.round(revenue * commissionRate);
  const totalPayout = basePay + commission;

  return {
    basePay,
    commission,
    totalPayout,
  };
}
