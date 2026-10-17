import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import {
  AQA_HONOR_BADGES,
  aggregateSwimmerCumulativeBilan,
  SwimmerStrokeBars,
} from "@/lib/swim-skills";

export type HonorBadgeType = "swimmer_of_the_month" | "swimmer_of_the_year";

export interface HonorLockStatus {
  currentMonthKey: string;
  currentYearKey: string;
  monthLocked: boolean;
  monthWinnerMemberId: string | null;
  monthWinnerName: string | null;
  monthWinnerCoachName: string | null;
  monthApprovedAt: string | null;
  yearLocked: boolean;
  yearWinnerMemberId: string | null;
  yearWinnerName: string | null;
  yearWinnerCoachName: string | null;
  yearApprovedAt: string | null;
  pendingMonthCount: number;
  pendingYearCount: number;
}

export interface HonorNominationItem {
  id: string;
  honorType: HonorBadgeType;
  periodKey: string;
  memberId: string;
  memberName: string;
  swimId: string;
  groupName: string;
  coachId: string;
  coachName: string;
  bars: SwimmerStrokeBars;
  totalDistanceMeters: number;
  record50m: number | null;
  recordApnea: number | null;
  weightKg: number | null;
  heightCm: number | null;
  wordFromCoach: string | null;
  observation: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt: string | null;
}

export function getPeriodKeys(now = new Date()): {
  currentMonthKey: string;
  currentYearKey: string;
} {
  const iso = now.toISOString();
  return {
    currentMonthKey: iso.slice(0, 7), // YYYY-MM
    currentYearKey: iso.slice(0, 4), // YYYY
  };
}

export async function getCurrentHonorLockStatus(): Promise<HonorLockStatus> {
  const { currentMonthKey, currentYearKey } = getPeriodKeys();
  const monthTarget = `swimmer_of_the_month:${currentMonthKey}`;
  const yearTarget = `swimmer_of_the_year:${currentYearKey}`;

  const logs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          "SWIMMER_HONOR_APPROVED",
          "SWIMMER_HONOR_REQUEST",
          "SWIMMER_HONOR_REJECTED",
        ],
      },
      target: {
        in: [monthTarget, yearTarget],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let monthLocked = false;
  let monthWinnerMemberId: string | null = null;
  let monthWinnerName: string | null = null;
  let monthWinnerCoachName: string | null = null;
  let monthApprovedAt: string | null = null;

  let yearLocked = false;
  let yearWinnerMemberId: string | null = null;
  let yearWinnerName: string | null = null;
  let yearWinnerCoachName: string | null = null;
  let yearApprovedAt: string | null = null;

  const rejectedIds = new Set<string>();
  const approvedRequestIds = new Set<string>();

  for (const log of logs) {
    if (!log.details) continue;
    try {
      const parsed = JSON.parse(log.details) as Record<string, unknown>;
      if (log.action === "SWIMMER_HONOR_REJECTED" && typeof parsed.requestId === "string") {
        rejectedIds.add(parsed.requestId);
      }
      if (log.action === "SWIMMER_HONOR_APPROVED") {
        if (typeof parsed.requestId === "string") {
          approvedRequestIds.add(parsed.requestId);
        }
        if (log.target === monthTarget && !monthLocked) {
          monthLocked = true;
          monthWinnerMemberId = (parsed.memberId as string) || null;
          monthWinnerName = (parsed.memberName as string) || null;
          monthWinnerCoachName = (parsed.coachName as string) || null;
          monthApprovedAt = log.createdAt.toISOString();
        }
        if (log.target === yearTarget && !yearLocked) {
          yearLocked = true;
          yearWinnerMemberId = (parsed.memberId as string) || null;
          yearWinnerName = (parsed.memberName as string) || null;
          yearWinnerCoachName = (parsed.coachName as string) || null;
          yearApprovedAt = log.createdAt.toISOString();
        }
      }
    } catch {
      // ignore malformed JSON
    }
  }

  let pendingMonthCount = 0;
  let pendingYearCount = 0;

  for (const log of logs) {
    if (log.action !== "SWIMMER_HONOR_REQUEST") continue;
    if (rejectedIds.has(log.id) || approvedRequestIds.has(log.id)) continue;
    if (log.target === monthTarget && !monthLocked) {
      pendingMonthCount++;
    }
    if (log.target === yearTarget && !yearLocked) {
      pendingYearCount++;
    }
  }

  return {
    currentMonthKey,
    currentYearKey,
    monthLocked,
    monthWinnerMemberId,
    monthWinnerName,
    monthWinnerCoachName,
    monthApprovedAt,
    yearLocked,
    yearWinnerMemberId,
    yearWinnerName,
    yearWinnerCoachName,
    yearApprovedAt,
    pendingMonthCount,
    pendingYearCount,
  };
}

export async function submitSwimmerHonorNomination(params: {
  honorType: HonorBadgeType;
  memberId: string;
  coachId: string;
  coachName: string;
  bars: SwimmerStrokeBars;
  totalDistanceMeters: number;
  record50m: number | null;
  recordApnea: number | null;
  weightKg: number | null;
  heightCm: number | null;
  wordFromCoach: string | null;
  observation: string | null;
}): Promise<{
  allowed: boolean;
  locked: boolean;
  periodKey: string;
  reason?: string;
}> {
  const lockStatus = await getCurrentHonorLockStatus();
  const isMonth = params.honorType === "swimmer_of_the_month";
  const periodKey = isMonth ? lockStatus.currentMonthKey : lockStatus.currentYearKey;

  if (isMonth && lockStatus.monthLocked) {
    return {
      allowed: false,
      locked: true,
      periodKey,
      reason: `Le badge Swimmer of the Month (${periodKey}) a deja ete valide par l'administration AQA${
        lockStatus.monthWinnerName ? ` pour ${lockStatus.monthWinnerName}` : ""
      }. Aucun autre coach ne peut le declencher jusqu'au mois prochain.`,
    };
  }

  if (!isMonth && lockStatus.yearLocked) {
    return {
      allowed: false,
      locked: true,
      periodKey,
      reason: `Le badge Swimmer of the Year (${periodKey}) a deja ete valide par l'administration AQA${
        lockStatus.yearWinnerName ? ` pour ${lockStatus.yearWinnerName}` : ""
      }. Aucun autre coach ne peut le declencher pour cette periode.`,
    };
  }

  const member = await prisma.swimMember.findUnique({
    where: { id: params.memberId },
    include: {
      group: { select: { name: true } },
    },
  });

  if (!member) {
    return {
      allowed: false,
      locked: false,
      periodKey,
      reason: "Nageur introuvable.",
    };
  }

  const target = `${params.honorType}:${periodKey}`;

  await logAdminAction(
    null,
    "SWIMMER_HONOR_REQUEST",
    target,
    JSON.stringify({
      honorType: params.honorType,
      periodKey,
      memberId: member.id,
      memberName: member.fullName,
      swimId: member.swimId,
      groupName: member.group?.name || "Groupe AQA",
      coachId: params.coachId,
      coachName: params.coachName,
      bars: params.bars,
      totalDistanceMeters: params.totalDistanceMeters,
      record50m: params.record50m,
      recordApnea: params.recordApnea,
      weightKg: params.weightKg,
      heightCm: params.heightCm,
      wordFromCoach: params.wordFromCoach,
      observation: params.observation,
      createdAt: new Date().toISOString(),
    })
  );

  return {
    allowed: true,
    locked: false,
    periodKey,
  };
}

export async function listHonorNominationsForAdmin(): Promise<{
  lockStatus: HonorLockStatus;
  nominations: HonorNominationItem[];
}> {
  const lockStatus = await getCurrentHonorLockStatus();

  const logs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          "SWIMMER_HONOR_REQUEST",
          "SWIMMER_HONOR_APPROVED",
          "SWIMMER_HONOR_REJECTED",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  const decisionByRequestId = new Map<
    string,
    { status: "approved" | "rejected"; decidedAt: string }
  >();
  const approvedTargets = new Map<string, { memberId: string; decidedAt: string }>();

  for (const log of logs) {
    if (!log.details) continue;
    try {
      const parsed = JSON.parse(log.details) as Record<string, unknown>;
      if (
        log.action === "SWIMMER_HONOR_APPROVED" &&
        typeof parsed.requestId === "string"
      ) {
        decisionByRequestId.set(parsed.requestId, {
          status: "approved",
          decidedAt: log.createdAt.toISOString(),
        });
        if (log.target && typeof parsed.memberId === "string") {
          approvedTargets.set(log.target, {
            memberId: parsed.memberId,
            decidedAt: log.createdAt.toISOString(),
          });
        }
      } else if (
        log.action === "SWIMMER_HONOR_REJECTED" &&
        typeof parsed.requestId === "string"
      ) {
        decisionByRequestId.set(parsed.requestId, {
          status: "rejected",
          decidedAt: log.createdAt.toISOString(),
        });
      }
    } catch {
      // ignore
    }
  }

  const nominations: HonorNominationItem[] = [];

  for (const log of logs) {
    if (log.action !== "SWIMMER_HONOR_REQUEST" || !log.details) continue;
    try {
      const d = JSON.parse(log.details) as Record<string, unknown>;
      const honorType: HonorBadgeType =
        d.honorType === "swimmer_of_the_year"
          ? "swimmer_of_the_year"
          : "swimmer_of_the_month";
      const periodKey = String(d.periodKey || lockStatus.currentMonthKey);
      const target = `${honorType}:${periodKey}`;

      const explicitDecision = decisionByRequestId.get(log.id);
      const targetWinner = approvedTargets.get(target);

      let status: "pending" | "approved" | "rejected" = "pending";
      let decidedAt: string | null = null;

      if (explicitDecision) {
        status = explicitDecision.status;
        decidedAt = explicitDecision.decidedAt;
      } else if (targetWinner) {
        // Another candidate won this period
        status =
          targetWinner.memberId === String(d.memberId || "")
            ? "approved"
            : "rejected";
        decidedAt = targetWinner.decidedAt;
      }

      const rawBars = (d.bars as Record<string, unknown>) || {};
      nominations.push({
        id: log.id,
        honorType,
        periodKey,
        memberId: String(d.memberId || ""),
        memberName: String(d.memberName || "Nageur AQA"),
        swimId: String(d.swimId || ""),
        groupName: String(d.groupName || "Groupe AQA"),
        coachId: String(d.coachId || ""),
        coachName: String(d.coachName || "Coach AQA"),
        bars: {
          basics: Number(rawBars.basics) || 0,
          crawl: Number(rawBars.crawl) || 0,
          backstroke: Number(rawBars.backstroke) || 0,
          breaststroke: Number(rawBars.breaststroke) || 0,
          butterfly: Number(rawBars.butterfly) || 0,
        },
        totalDistanceMeters: Number(d.totalDistanceMeters) || 0,
        record50m: d.record50m != null ? Number(d.record50m) : null,
        recordApnea: d.recordApnea != null ? Number(d.recordApnea) : null,
        weightKg: d.weightKg != null ? Number(d.weightKg) : null,
        heightCm: d.heightCm != null ? Number(d.heightCm) : null,
        wordFromCoach: typeof d.wordFromCoach === "string" ? d.wordFromCoach : null,
        observation: typeof d.observation === "string" ? d.observation : null,
        status,
        createdAt: log.createdAt.toISOString(),
        decidedAt,
      });
    } catch {
      // ignore malformed log
    }
  }

  return {
    lockStatus,
    nominations,
  };
}

export async function decideHonorNominationByAdmin(params: {
  requestId: string;
  decision: "approved" | "rejected";
  adminId: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  const reqLog = await prisma.auditLog.findUnique({
    where: { id: params.requestId },
  });

  if (!reqLog || reqLog.action !== "SWIMMER_HONOR_REQUEST" || !reqLog.details) {
    throw new Error("Demande de nomination introuvable.");
  }

  const d = JSON.parse(reqLog.details) as Record<string, unknown>;
  const honorType: HonorBadgeType =
    d.honorType === "swimmer_of_the_year"
      ? "swimmer_of_the_year"
      : "swimmer_of_the_month";
  const periodKey = String(d.periodKey || getPeriodKeys().currentMonthKey);
  const target = `${honorType}:${periodKey}`;
  const memberId = String(d.memberId || "");
  const memberName = String(d.memberName || "Nageur AQA");
  const coachId = String(d.coachId || "");
  const coachName = String(d.coachName || "Coach AQA");

  if (params.decision === "rejected") {
    await logAdminAction(
      params.adminId,
      "SWIMMER_HONOR_REJECTED",
      target,
      JSON.stringify({
        requestId: reqLog.id,
        honorType,
        periodKey,
        memberId,
        memberName,
        coachId,
        coachName,
      })
    );
    return {
      success: true,
      message: `Nomination de ${memberName} refusee.`,
    };
  }

  // Approve nomination and lock for the period
  const honorDef = AQA_HONOR_BADGES.find((h) => h.key === honorType) || AQA_HONOR_BADGES[0];

  // Fetch existing member reviews to preserve their cumulative Bilan & bars
  const existingReviews = await prisma.swimTechReview.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { skills: true, metrics: true, strengths: true },
  });
  const cumulative = aggregateSwimmerCumulativeBilan(existingReviews);
  const reqBars = (d.bars as SwimmerStrokeBars) || cumulative.bars;

  const skillsPayload = {
    bars: reqBars,
    lastTouchedBar: cumulative.lastTouchedBar,
    _meta: {
      bars: reqBars,
      lastTouchedBar: cumulative.lastTouchedBar,
      awardedBadgeKey: honorDef.key,
      recommendedLevel: honorDef.label,
      record50m: d.record50m ?? cumulative.record50m,
      recordApnea: d.recordApnea ?? cumulative.recordApnea,
      weightKg: d.weightKg ?? cumulative.weightKg,
      heightCm: d.heightCm ?? cumulative.heightCm,
      wordFromCoach: d.wordFromCoach ?? cumulative.wordFromCoach,
      observation: d.observation ?? cumulative.latestObservation,
      honorRequestType: honorType,
      honorApproved: true,
      honorPeriodKey: periodKey,
      adminId: params.adminId,
    },
  };

  await prisma.swimTechReview.create({
    data: {
      memberId,
      coachId: coachId || null,
      validatedById: params.adminId,
      validatedAt: new Date(),
      kind: "assessment",
      skills: JSON.stringify(skillsPayload),
      strengths:
        (typeof d.wordFromCoach === "string" && d.wordFromCoach) ||
        `${honorDef.labelFr} (${periodKey}) valide par la direction AQA.`,
      recommendedLevel: honorDef.label,
      status: "final",
    },
  });

  await logAdminAction(
    params.adminId,
    "SWIMMER_HONOR_APPROVED",
    target,
    JSON.stringify({
      requestId: reqLog.id,
      honorType,
      periodKey,
      memberId,
      memberName,
      coachId,
      coachName,
      approvedAt: new Date().toISOString(),
    })
  );

  return {
    success: true,
    message: `${memberName} est officiellement couronne ${honorDef.labelFr} (${periodKey}). Les nouvelles demandes pour cette periode sont desormais verrouillees.`,
  };
}
