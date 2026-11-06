import { calculateSwimPrice, resolveMultiGroupFormula } from "./swim-pricing";
import { parseDebtFromNotes } from "./swim-groups";
import {
  encodeLinkedEventCard,
  encodeNextMonthPaidTag,
  encodeSidePocketBalance,
  getEffectiveSubscriptionStart,
  getLastDayOfSameMonth,
  getStarterBillingCycles,
  isStarterFormula,
  parseSidePocketBalance,
  type EffectivePaymentStatus,
} from "./swim-subscription";

export type PaymentCycleMode = "keep" | "none" | "month" | "next_month";

export interface ParsedPaymentTags {
  monthTag: { type: "MONTH" | "NEXT_MONTH"; monthKey: string } | null;
  upgradeDuration: "3m" | "6m" | "9m" | null;
  sidePocketDeposit: number | null;
  usedSidePocket: number | null;
  eventCardCode: string | null;
  cleanNotes: string;
}

const MONTH_TAG_RE = /\[(NEXT_MONTH|MONTH):([0-9]{4}-[0-9]{2})\]/;
const UPGRADE_TAG_RE = /\[UPGRADE:(3m|6m|9m)\]/i;
const SIDE_POCKET_DEPOSIT_RE = /\[SIDE_POCKET_DEPOSIT:([0-9]+)\]/;
const USED_SIDE_POCKET_RE = /\[USED_SIDE_POCKET:([0-9]+)\]/;
const EVENT_CARD_RE = /\[AQA_EVENT_CARD:([A-Za-z0-9_-]+)\]/;

/**
 * Extracts structured system tags and clean human-readable notes from a SwimPayment.notes string.
 */
export function parsePaymentTags(notes?: string | null): ParsedPaymentTags {
  const raw = notes || "";

  const monthMatch = raw.match(MONTH_TAG_RE);
  const monthTag: { type: "MONTH" | "NEXT_MONTH"; monthKey: string } | null =
    monthMatch && (monthMatch[1] === "MONTH" || monthMatch[1] === "NEXT_MONTH") && monthMatch[2]
      ? { type: monthMatch[1], monthKey: monthMatch[2] }
      : null;

  const upgMatch = raw.match(UPGRADE_TAG_RE);
  const upgRaw = upgMatch?.[1]?.toLowerCase();
  const upgradeDuration =
    upgRaw === "3m" || upgRaw === "6m" || upgRaw === "9m" ? upgRaw : null;

  const depMatch = raw.match(SIDE_POCKET_DEPOSIT_RE);
  const sidePocketDeposit = depMatch?.[1] ? parseInt(depMatch[1], 10) : null;

  const usedMatch = raw.match(USED_SIDE_POCKET_RE);
  const usedSidePocket = usedMatch?.[1] ? parseInt(usedMatch[1], 10) : null;

  const cardMatch = raw.match(EVENT_CARD_RE);
  const eventCardCode = cardMatch?.[1] ? cardMatch[1].trim() : null;

  const cleanNotes = stripPaymentSystemTags(raw);

  return {
    monthTag,
    upgradeDuration,
    sidePocketDeposit: sidePocketDeposit !== null && !isNaN(sidePocketDeposit) ? sidePocketDeposit : null,
    usedSidePocket: usedSidePocket !== null && !isNaN(usedSidePocket) ? usedSidePocket : null,
    eventCardCode,
    cleanNotes,
  };
}

/**
 * Removes all bracketed system metadata tags from a SwimPayment.notes string for clean UI display/editing.
 */
export function stripPaymentSystemTags(notes?: string | null): string {
  if (!notes) return "";
  return notes
    .replace(/\[(?:NEXT_MONTH|MONTH):[0-9]{4}-[0-9]{2}\]\s*/g, "")
    .replace(/\[UPGRADE:(?:3m|6m|9m)\]\s*/gi, "")
    .replace(/\[SIDE_POCKET_DEPOSIT:[0-9]+\]\s*/g, "")
    .replace(/\[USED_SIDE_POCKET:[0-9]+\]\s*/g, "")
    .replace(/\[AQA_EVENT_CARD:[A-Za-z0-9_-]+\]\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export interface RebuildPaymentNotesParams {
  oldNotes: string | null | undefined;
  oldAmount: number;
  newAmount: number;
  newCleanNotes?: string | null;
  cycleMode?: PaymentCycleMode;
  cycleMonth?: string | null;
}

/**
 * Rebuilds SwimPayment.notes when a payment is edited, preserving or updating structured tags.
 */
export function rebuildPaymentNotesOnEdit(params: RebuildPaymentNotesParams): string | null {
  const {
    oldNotes,
    oldAmount,
    newAmount,
    newCleanNotes,
    cycleMode = "keep",
    cycleMonth,
  } = params;

  const oldTags = parsePaymentTags(oldNotes);
  const tags: string[] = [];

  if (oldTags.upgradeDuration) {
    tags.push(`[UPGRADE:${oldTags.upgradeDuration}]`);
  }

  if (oldTags.sidePocketDeposit !== null) {
    const updatedDeposit =
      oldTags.sidePocketDeposit === oldAmount ? Math.max(0, newAmount) : oldTags.sidePocketDeposit;
    tags.push(`[SIDE_POCKET_DEPOSIT:${updatedDeposit}]`);
  }

  if (oldTags.eventCardCode) {
    tags.push(`[AQA_EVENT_CARD:${oldTags.eventCardCode}]`);
  }

  const validMonth =
    cycleMonth && /^[0-9]{4}-[0-9]{2}$/.test(cycleMonth.trim()) ? cycleMonth.trim() : null;

  if (cycleMode === "month" && validMonth) {
    tags.push(`[MONTH:${validMonth}]`);
  } else if (cycleMode === "next_month" && validMonth) {
    tags.push(`[NEXT_MONTH:${validMonth}]`);
  } else if (cycleMode === "keep") {
    if (validMonth && oldTags.monthTag) {
      tags.push(`[${oldTags.monthTag.type}:${validMonth}]`);
    } else if (validMonth) {
      tags.push(`[MONTH:${validMonth}]`);
    } else if (oldTags.monthTag) {
      tags.push(`[${oldTags.monthTag.type}:${oldTags.monthTag.monthKey}]`);
    }
  }
  // cycleMode === "none" intentionally drops [MONTH:...] / [NEXT_MONTH:...]

  if (oldTags.usedSidePocket !== null) {
    tags.push(`[USED_SIDE_POCKET:${oldTags.usedSidePocket}]`);
  }

  const cleanText =
    newCleanNotes !== undefined
      ? stripPaymentSystemTags(newCleanNotes)
      : oldTags.cleanNotes;

  const combined = [...tags, cleanText].filter(Boolean).join(" ").trim();
  return combined.length > 0 ? combined : null;
}

function stripMemberTag(notes: string, pattern: RegExp): string {
  return notes
    .replace(pattern, "")
    .replace(/\|\s*\|/g, "|")
    .replace(/^\s*\|\s*/, "")
    .replace(/\s*\|\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export interface ReconcilePaymentRecord {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  paidAt: Date | string;
}

export interface ReconcileMemberInput {
  category: string;
  duration: string | null;
  formula: string;
  priceDA: number;
  paymentStatus: string;
  notes: string | null;
  dateOfStart: Date | string;
  subscriptionStart?: Date | string | null;
  subscriptionEnd?: Date | string | null;
}

export interface ReconcileMemberParams {
  member: ReconcileMemberInput;
  assignedGroupLevels?: string[];
  oldPayment: ReconcilePaymentRecord;
  /** Pass updated payment on PATCH, or null on DELETE */
  updatedPayment: ReconcilePaymentRecord | null;
  /** All other payments belonging to this member (excluding oldPayment) */
  otherPayments: ReconcilePaymentRecord[];
  /** On DELETE of an [UPGRADE:...] payment, revert formula/duration back to Starter 1m (default true) */
  revertUpgrade?: boolean;
  referenceDate?: Date;
}

export interface ReconciledMemberPatch {
  paymentStatus: EffectivePaymentStatus;
  notes: string | null;
  duration: string | null;
  formula: string;
  priceDA: number;
  subscriptionEnd: Date | null;
  upgradeReverted: boolean;
}

/**
 * Reconciles all SwimMember fields & note tags when a SwimPayment is edited or erased.
 */
export function reconcileMemberAfterPaymentChange(
  params: ReconcileMemberParams
): ReconciledMemberPatch {
  const {
    member,
    assignedGroupLevels = [],
    oldPayment,
    updatedPayment,
    otherPayments,
    revertUpgrade = true,
    referenceDate = new Date(),
  } = params;

  const remainingPayments: ReconcilePaymentRecord[] = updatedPayment
    ? [...otherPayments, updatedPayment]
    : [...otherPayments];

  const oldTags = parsePaymentTags(oldPayment.notes);
  const newTags = updatedPayment ? parsePaymentTags(updatedPayment.notes) : null;

  let notes = (member.notes || "").trim();
  let duration = member.duration;
  let formula = member.formula;
  let priceDA = member.priceDA;
  let upgradeReverted = false;

  // 1. Reconcile Side Pocket (Avoir Club) balance
  const oldDeposit = oldTags.sidePocketDeposit ?? 0;
  const newDeposit = newTags?.sidePocketDeposit ?? 0;
  const oldUsed = oldTags.usedSidePocket ?? 0;
  const newUsed = newTags?.usedSidePocket ?? 0;

  if (oldDeposit !== newDeposit || oldUsed !== newUsed) {
    const currentPocket = parseSidePocketBalance(notes);
    const depositDelta = newDeposit - oldDeposit;
    const usedRefundDelta = oldUsed - newUsed;
    const nextPocket = Math.max(0, currentPocket + depositDelta + usedRefundDelta);
    notes = encodeSidePocketBalance(notes, nextPocket);
  }

  // 2. Reconcile Linked AQA Event Card tag
  if (oldTags.eventCardCode) {
    if (updatedPayment && newTags?.eventCardCode) {
      notes = encodeLinkedEventCard(notes, newTags.eventCardCode, updatedPayment.amount);
    } else {
      const fallbackCardPayment = remainingPayments.find(
        (p) => parsePaymentTags(p.notes).eventCardCode !== null
      );
      if (fallbackCardPayment) {
        const fbCode = parsePaymentTags(fallbackCardPayment.notes).eventCardCode!;
        notes = encodeLinkedEventCard(notes, fbCode, fallbackCardPayment.amount);
      } else {
        notes = stripMemberTag(notes, /\[AQA_EVENT_CARD:[^\]]+\]/g);
      }
    }
  }

  // 3. Reconcile Formula Upgrade reversal if an [UPGRADE:3m|6m|9m] payment is erased
  if (!updatedPayment && oldTags.upgradeDuration && revertUpgrade) {
    const hasAnotherUpgrade = remainingPayments.some(
      (p) => parsePaymentTags(p.notes).upgradeDuration !== null
    );
    if (!hasAnotherUpgrade) {
      duration = "1m";
      const strippedFormula =
        (formula || "G10")
          .replace(/\s+(?:Silver|Gold|Diamond)\s*\((?:3m|6m|9m)\)$/i, "")
          .replace(/\s*\((?:3m|6m|9m)\)$/i, "")
          .trim() || "G10";

      if (assignedGroupLevels.length > 0) {
        const resolved = resolveMultiGroupFormula(assignedGroupLevels);
        formula = resolved.formula;
        priceDA = calculateSwimPrice({
          category: member.category || "homme",
          groupTypes: assignedGroupLevels,
          duration: "1m",
        });
      } else {
        formula = strippedFormula;
        priceDA = calculateSwimPrice({
          category: member.category || "homme",
          groupType: strippedFormula,
          duration: "1m",
        });
      }
      upgradeReverted = true;
    }
  }

  // 4. Reconcile [NEXT_MONTH_PAID:YYYY-MM] tag in member.notes
  const activeNextMonthKeys: string[] = [];
  for (const p of remainingPayments) {
    if ((p.amount || 0) <= 0) continue;
    const pt = parsePaymentTags(p.notes);
    if (pt.monthTag?.type === "NEXT_MONTH") {
      activeNextMonthKeys.push(pt.monthTag.monthKey);
    }
  }
  activeNextMonthKeys.sort();
  const latestNextMonthKey =
    activeNextMonthKeys.length > 0
      ? activeNextMonthKeys[activeNextMonthKeys.length - 1]
      : null;

  const isStarter = isStarterFormula(duration, formula);
  notes = stripMemberTag(notes, /\[NEXT_MONTH_PAID:[0-9]{4}-[0-9]{2}\]/g);
  if (isStarter && latestNextMonthKey) {
    notes = encodeNextMonthPaidTag(notes, latestNextMonthKey);
  }

  // 5. Reconcile subscriptionEnd & paymentStatus
  const subStart = getEffectiveSubscriptionStart(
    member.subscriptionStart ?? member.dateOfStart
  );
  let subscriptionEnd: Date | null = member.subscriptionEnd
    ? new Date(member.subscriptionEnd)
    : null;

  const debtInfo = parseDebtFromNotes(notes);
  const ancientDebt = debtInfo.hasDebt ? debtInfo.amount : 0;
  const totalPaid = remainingPayments.reduce(
    (sum, p) => sum + Math.max(0, p.amount || 0),
    0
  );

  let paymentStatus: EffectivePaymentStatus = "unpaid";

  if (isStarter && (priceDA > 0 || assignedGroupLevels.length > 0)) {
    // Pass paymentStatus: "unpaid" so Pass 0 in getStarterBillingCycles never synthesizes
    // phantom coverage when remainingPayments is empty.
    const billing = getStarterBillingCycles(
      {
        duration,
        formula,
        priceDA,
        paymentStatus: "unpaid",
        notes,
        dateOfStart: member.dateOfStart,
        subscriptionStart: member.subscriptionStart,
        subscriptionEnd,
        payments: remainingPayments,
      },
      referenceDate
    );

    // Recompute Starter subscriptionEnd if upgrade reverted or cycle/Starter state applies
    let computedStarterEnd = getLastDayOfSameMonth(subStart);
    for (const cycle of billing.cycles) {
      if (cycle.status === "paid" && cycle.lastDay.getTime() > computedStarterEnd.getTime()) {
        computedStarterEnd = cycle.lastDay;
      }
    }
    for (const key of activeNextMonthKeys) {
      const d = new Date(`${key}-01T00:00:00.000Z`);
      if (!isNaN(d.getTime())) {
        const monthEnd = getLastDayOfSameMonth(d);
        if (monthEnd.getTime() > computedStarterEnd.getTime()) {
          computedStarterEnd = monthEnd;
        }
      }
    }
    subscriptionEnd = computedStarterEnd;

    if (totalPaid <= 0) {
      paymentStatus = "unpaid";
    } else if (billing.totalDebtDA + ancientDebt === 0) {
      paymentStatus = "paid";
    } else {
      const dueCycle = billing.cycles.find(
        (c) => c.monthKey === billing.currentDueMonthKey
      );
      if (billing.isAfterCutoff && dueCycle && dueCycle.paidAmount <= 0) {
        paymentStatus = "unpaid";
      } else {
        paymentStatus = "partial";
      }
    }
  } else {
    const targetDue = priceDA > 0 ? priceDA : ancientDebt;
    if (totalPaid <= 0) {
      paymentStatus = "unpaid";
    } else if (targetDue > 0 && totalPaid >= targetDue) {
      paymentStatus = "paid";
    } else if (targetDue > 0) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "paid";
    }
  }

  return {
    paymentStatus,
    notes: notes.length > 0 ? notes : null,
    duration,
    formula,
    priceDA,
    subscriptionEnd,
    upgradeReverted,
  };
}
