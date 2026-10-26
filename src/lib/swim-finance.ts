// AQA Swim - Financial & Accounting Analytics Engine (Comptabilite Analytique & Rentabilite)
// Standard Western Arabic numerals only (0-9). No emojis anywhere.

import {
  FRENCH_MONTHS,
  getCurrentFrenchMonth,
  getMemberPaymentSituation,
  isMemberPoolPaid,
  parseScheduleSlots,
} from "./swim-groups";
import {
  AzalTariffRules,
  calculateAzalPrice,
  DEFAULT_AZAL_RULES,
  PoolBordereau,
  resolveMemberGroups,
  SwimmerBillingConfig,
  SwimGroupReference,
  SwimMemberReference,
} from "./swim-pool-dispatch";

export type AccountingBasis = "accrual" | "cash";
export type PoolExpenseBasis = "poolpaid_only" | "all_assigned";
export type RevenueRecognitionMode = "full_contract" | "monthly_amortized";

export type ExpenseCategory =
  | "pool_extra"
  | "marketing"
  | "equipment"
  | "admin"
  | "tax_bank"
  | "other";

export interface SwimCustomExpense {
  id: string;
  label: string;
  category: ExpenseCategory;
  amountDA: number;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  recurring: boolean;
  status: "paid" | "pending";
  notes?: string;
}

export type CoachSalaryMode = "fixed_monthly" | "per_group" | "per_session" | "revenue_share";

export interface CoachSalaryConfig {
  coachId: string;
  coachName: string;
  mode: CoachSalaryMode;
  fixedMonthlyDA: number;
  perGroupDA: number;
  perSessionDA: number;
  revenueSharePct: number; // e.g. 15 for 15%
  bonusDA: number;
  deductionDA: number;
  isPaid: boolean;
  notes?: string;
}

export interface SwimFinanceGoals {
  netProfitTargetDA: number;
  revenueTargetDA: number;
  assignedClientsTarget: number;
  collectionRateTargetPct: number;
  maxExpenseRatioPct: number;
}

export interface SwimFinanceSnapshot {
  id: string;
  label: string;
  periodKey: string;
  createdAt: string;
  assignedClientsCount: number;
  revenuePaidDA: number;
  revenueStillToPayDA: number;
  totalRevenueDA: number;
  poolExpenseDA: number;
  coachSalaryDA: number;
  otherExpenseDA: number;
  totalExpensesDA: number;
  netProfitDA: number;
  marginPct: number;
}

export interface SwimFinanceLedgerState {
  coachSalaries: Record<string, CoachSalaryConfig>;
  customExpenses: SwimCustomExpense[];
  goals: SwimFinanceGoals;
  snapshots: SwimFinanceSnapshot[];
  defaultAccountingBasis: AccountingBasis;
  defaultPoolBasis: PoolExpenseBasis;
  defaultRecognitionMode: RevenueRecognitionMode;
  includeEquipmentMargin: boolean;
  updatedAt: string;
}

export const DEFAULT_FINANCE_GOALS: SwimFinanceGoals = {
  netProfitTargetDA: 1500000,
  revenueTargetDA: 2500000,
  assignedClientsTarget: 150,
  collectionRateTargetPct: 85,
  maxExpenseRatioPct: 45,
};

export const DEFAULT_FINANCE_LEDGER_STATE: SwimFinanceLedgerState = {
  coachSalaries: {},
  customExpenses: [],
  goals: DEFAULT_FINANCE_GOALS,
  snapshots: [],
  defaultAccountingBasis: "accrual",
  defaultPoolBasis: "poolpaid_only",
  defaultRecognitionMode: "full_contract",
  includeEquipmentMargin: true,
  updatedAt: new Date().toISOString(),
};

export interface FinanceMemberInput extends SwimMemberReference {
  dateOfStart?: string;
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  createdAt?: string;
  duration?: string | null;
  priceDA?: number;
  effectiveGroup?: {
    id: string;
    name: string;
    coachName?: string | null;
    schedule: string;
    category?: string;
    active?: boolean;
  } | null;
  effectivelyUnassigned?: boolean;
  payments?: Array<{
    id?: string;
    amount: number;
    method?: string;
    paidAt?: string;
  }>;
}

export interface FinanceEquipmentSaleInput {
  id: string;
  article: string;
  sellPrice: number;
  costPrice: number;
  quantity: number;
  soldAt: string;
}

export interface FinanceCoachInput {
  id: string;
  name: string;
  defaultPayRate?: number;
  commissionRate?: number;
  active?: boolean;
}

export interface PeriodFilter {
  mode: "all" | "month" | "quarter" | "custom";
  monthKey?: string; // "YYYY-MM", e.g. "2026-10"
  quarterKey?: string; // "2026-Q4"
  fromDate?: string; // "YYYY-MM-DD"
  toDate?: string; // "YYYY-MM-DD"
  category?: string; // "all" | "homme" | "femme" | "enfants" | "apnea"
}

export interface ComputedSwimmerFinanceRow {
  memberId: string;
  swimId: string;
  fullName: string;
  category: string;
  formula: string;
  duration: string;
  groupNames: string[];
  coachNames: string[];
  isAssigned: boolean;
  isLinkedToPayment: boolean;
  effectivePriceDA: number;
  recognizedRevenueDA: number;
  paidDA: number;
  stillToPayDA: number;
  isPoolPaid: boolean;
  poolCostDA: number;
  appliedPoolExpenseDA: number;
  netContributionDA: number;
  dateOfStart: string;
}

export interface ComputedCoachSalaryRow {
  coachKey: string;
  coachId: string;
  coachName: string;
  mode: CoachSalaryMode;
  activeGroupsCount: number;
  assignedSwimmersCount: number;
  estimatedSessionsCount: number;
  groupRevenueDA: number;
  baseSalaryDA: number;
  bonusDA: number;
  deductionDA: number;
  totalSalaryDA: number;
  isPaid: boolean;
  notes?: string;
}

export interface CategoryProfitabilityRow {
  category: string;
  assignedCount: number;
  paidCount: number;
  unpaidOrPartialCount: number;
  poolPaidCount: number;
  revenuePaidDA: number;
  revenueStillToPayDA: number;
  totalRevenueDA: number;
  poolExpenseDA: number;
  coachExpenseAllocatedDA: number;
  grossMarginDA: number;
  grossMarginPct: number;
}

export interface MonthlyTrendPoint {
  monthKey: string; // "2026-10"
  label: string; // "Oct 2026"
  frenchMonth: string; // "Octobre"
  assignedCount: number;
  revenuePaidDA: number;
  revenueStillToPayDA: number;
  totalRevenueDA: number;
  poolExpenseDA: number;
  coachSalaryDA: number;
  otherExpenseDA: number;
  totalExpensesDA: number;
  netProfitDA: number;
}

export interface BreakEvenMetrics {
  avgRevenuePerSwimmerDA: number;
  avgVariablePoolCostPerSwimmerDA: number;
  contributionMarginPerSwimmerDA: number;
  contributionMarginRatioPct: number;
  fixedCostsDA: number; // Coach salaries + other fixed expenses
  breakEvenSwimmersCount: number;
  breakEvenRevenueDA: number;
  safetyMarginSwimmers: number;
  safetyMarginDA: number;
}

export interface PeriodFinancialReport {
  periodLabel: string;
  monthsSpan: number;
  // Client counts
  totalRegisteredCount: number;
  assignedClientsCount: number;
  fullyPaidClientsCount: number;
  partialClientsCount: number;
  unpaidClientsCount: number;
  poolPaidClientsCount: number;
  // Revenue breakdown
  revenuePaidDA: number;
  revenueStillToPayDA: number;
  grossClientRevenueDA: number; // Paid + Still to Pay (or Recognized if amortized)
  equipmentRevenueDA: number;
  equipmentCostDA: number;
  equipmentNetMarginDA: number;
  totalRecognizedRevenueDA: number;
  collectionRatePct: number;
  // Expense breakdown
  poolPaidConfirmedDA: number;
  poolProjectedAllAssignedDA: number;
  poolCustomBordereauRowsDA: number;
  appliedPoolExpenseDA: number;
  coachSalaryTotalDA: number;
  coachSalaryPaidDA: number;
  coachSalaryPendingDA: number;
  otherExpensesTotalDA: number;
  otherExpensesByCategory: Record<ExpenseCategory, number>;
  totalExpensesDA: number;
  expenseRatioPct: number;
  // Profitability metrics
  grossProfitDA: number; // Total Revenue - (Pool + Coaches)
  grossMarginPct: number;
  netProfitAccrualDA: number; // (Paid + Still to Pay + EquipMargin) - Total Expenses
  netProfitCashDA: number; // (Paid + EquipMargin) - Total Expenses
  activeNetProfitDA: number; // Based on selected AccountingBasis
  activeNetMarginPct: number;
  arpuDA: number; // Average revenue per assigned client
  profitPerSwimmerDA: number;
  // Analytical tables
  swimmerRows: ComputedSwimmerFinanceRow[];
  coachRows: ComputedCoachSalaryRow[];
  categoryBreakdown: CategoryProfitabilityRow[];
  filteredCustomExpenses: SwimCustomExpense[];
  breakEven: BreakEvenMetrics;
}

export interface PeriodComparisonResult {
  periodA: PeriodFinancialReport;
  periodB: PeriodFinancialReport;
  deltas: {
    assignedClientsDelta: number;
    assignedClientsPct: number;
    revenueDeltaDA: number;
    revenuePct: number;
    paidDeltaDA: number;
    paidPct: number;
    stillToPayDeltaDA: number;
    poolExpenseDeltaDA: number;
    coachSalaryDeltaDA: number;
    otherExpenseDeltaDA: number;
    totalExpensesDeltaDA: number;
    totalExpensesPct: number;
    netProfitDeltaDA: number;
    netProfitPct: number;
    marginDeltaPts: number;
  };
}

export interface WhatIfSimulationParams {
  extraSwimmers: number;
  priceChangePct: number;
  poolCostChangePct: number;
  coachSalaryChangePct: number;
  targetCollectionRatePct: number;
}

export interface WhatIfSimulationResult {
  projectedSwimmers: number;
  projectedRevenueDA: number;
  projectedCashCollectedDA: number;
  projectedPoolExpenseDA: number;
  projectedCoachSalaryDA: number;
  projectedOtherExpenseDA: number;
  projectedTotalExpensesDA: number;
  projectedNetProfitAccrualDA: number;
  projectedNetProfitCashDA: number;
  netProfitDeltaAccrualDA: number;
  netProfitDeltaCashDA: number;
  projectedMarginPct: number;
}

/**
 * Duration code ("1m", "3m", "6m", "9m") to months count for amortization.
 */
export function durationToMonthsCount(duration?: string | null): number {
  const d = (duration || "3m").toLowerCase().trim();
  if (d === "1m" || d.includes("starter")) return 1;
  if (d === "6m" || d.includes("recommand") || d.includes("gold")) return 6;
  if (d === "9m" || d.includes("econom") || d.includes("diamond")) return 9;
  return 3;
}

/**
 * Converts a YYYY-MM string (e.g. "2026-10") into French month name ("Octobre")
 * and human-readable label ("Octobre 2026").
 */
export function parseMonthKeyInfo(monthKey: string): {
  year: number;
  monthIndex: number; // 0..11
  frenchMonth: string;
  shortLabel: string;
  fullLabel: string;
} {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    const now = new Date();
    const mIdx = now.getMonth();
    const y = now.getFullYear();
    const fm = FRENCH_MONTHS[mIdx];
    return {
      year: y,
      monthIndex: mIdx,
      frenchMonth: fm,
      shortLabel: `${fm.slice(0, 3)} ${y}`,
      fullLabel: `${fm} ${y}`,
    };
  }
  const year = parseInt(match[1], 10);
  const monthIndex = Math.max(0, Math.min(11, parseInt(match[2], 10) - 1));
  const frenchMonth = FRENCH_MONTHS[monthIndex];
  return {
    year,
    monthIndex,
    frenchMonth,
    shortLabel: `${frenchMonth.slice(0, 3)} ${year}`,
    fullLabel: `${frenchMonth} ${year}`,
  };
}

/**
 * Resolves the date bounds [start, end] and number of months covered by a PeriodFilter.
 */
export function resolvePeriodBounds(filter: PeriodFilter): {
  start: Date | null;
  end: Date | null;
  monthsSpan: number;
  targetFrenchMonth?: string;
  periodLabel: string;
} {
  if (filter.mode === "month" && filter.monthKey) {
    const info = parseMonthKeyInfo(filter.monthKey);
    const start = new Date(Date.UTC(info.year, info.monthIndex, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(info.year, info.monthIndex + 1, 0, 23, 59, 59, 999));
    return {
      start,
      end,
      monthsSpan: 1,
      targetFrenchMonth: info.frenchMonth,
      periodLabel: info.fullLabel,
    };
  }

  if (filter.mode === "quarter" && filter.quarterKey) {
    const match = filter.quarterKey.match(/^(\d{4})-Q([1-4])$/i);
    if (match) {
      const year = parseInt(match[1], 10);
      const q = parseInt(match[2], 10);
      const startMonth = (q - 1) * 3;
      const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999));
      return {
        start,
        end,
        monthsSpan: 3,
        periodLabel: `T${q} ${year}`,
      };
    }
  }

  if (filter.mode === "custom" && (filter.fromDate || filter.toDate)) {
    const start = filter.fromDate
      ? new Date(`${filter.fromDate}T00:00:00.000Z`)
      : new Date("2026-01-01T00:00:00.000Z");
    const end = filter.toDate
      ? new Date(`${filter.toDate}T23:59:59.999Z`)
      : new Date("2027-12-31T23:59:59.999Z");
    const diffDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const monthsSpan = Math.max(1, Math.round(diffDays / 30));
    return {
      start,
      end,
      monthsSpan,
      periodLabel: `${filter.fromDate || "..."} -> ${filter.toDate || "..."}`,
    };
  }

  return {
    start: null,
    end: null,
    monthsSpan: 1,
    targetFrenchMonth: getCurrentFrenchMonth(),
    periodLabel: "Saison Active (Global)",
  };
}

/**
 * Checks whether a member is active/relevant during the given date bounds.
 */
export function isMemberInPeriod(
  member: FinanceMemberInput,
  start: Date | null,
  end: Date | null
): boolean {
  if (!start || !end) return true;

  const rawStartStr = member.subscriptionStart || member.dateOfStart || member.createdAt;
  const subStart = rawStartStr ? new Date(rawStartStr) : null;
  const subEnd = member.subscriptionEnd ? new Date(member.subscriptionEnd) : null;

  // Check if any payment happened inside [start, end]
  if (Array.isArray(member.payments)) {
    for (const p of member.payments) {
      if (p.paidAt) {
        const pd = new Date(p.paidAt);
        if (!isNaN(pd.getTime()) && pd >= start && pd <= end) {
          return true;
        }
      }
    }
  }

  if (subStart && !isNaN(subStart.getTime())) {
    if (subEnd && !isNaN(subEnd.getTime())) {
      // Active subscription overlaps with [start, end]
      return subStart <= end && subEnd >= start;
    }
    // No explicit end date: infer from duration
    const months = durationToMonthsCount(member.duration);
    const inferredEnd = new Date(subStart.getTime() + months * 30 * 24 * 60 * 60 * 1000);
    return subStart <= end && inferredEnd >= start;
  }

  return true;
}

/**
 * Calculates the complete financial & accounting report for a given period and configuration.
 */
export function computePeriodFinancialReport(params: {
  members: FinanceMemberInput[];
  groups: SwimGroupReference[];
  coaches?: FinanceCoachInput[];
  equipmentSales?: FinanceEquipmentSaleInput[];
  bordereaux?: PoolBordereau[];
  billingConfigs?: Record<string, SwimmerBillingConfig>;
  poolRules?: AzalTariffRules;
  ledger: SwimFinanceLedgerState;
  filter: PeriodFilter;
  accountingBasis?: AccountingBasis;
  poolBasis?: PoolExpenseBasis;
  recognitionMode?: RevenueRecognitionMode;
  includeEquipmentMargin?: boolean;
}): PeriodFinancialReport {
  const {
    members,
    groups,
    coaches = [],
    equipmentSales = [],
    bordereaux = [],
    billingConfigs = {},
    poolRules = DEFAULT_AZAL_RULES,
    ledger,
    filter,
  } = params;

  const accountingBasis = params.accountingBasis ?? ledger.defaultAccountingBasis ?? "accrual";
  const poolBasis = params.poolBasis ?? ledger.defaultPoolBasis ?? "poolpaid_only";
  const recognitionMode = params.recognitionMode ?? ledger.defaultRecognitionMode ?? "full_contract";
  const includeEquipment = params.includeEquipmentMargin ?? ledger.includeEquipmentMargin ?? true;

  const { start, end, monthsSpan, targetFrenchMonth, periodLabel } = resolvePeriodBounds(filter);

  // Collect member IDs from paid bordereaux matching the target month (if month filter) or any paid bordereau
  const paidBordereauMemberIds = new Set<string>();
  let poolCustomBordereauRowsDA = 0;

  for (const b of bordereaux) {
    if (b.paymentStatus !== "paid") continue;
    if (targetFrenchMonth && filter.mode === "month") {
      const bMonth = (b.month || "").toLowerCase().trim();
      const tMonth = targetFrenchMonth.toLowerCase().trim();
      if (bMonth && bMonth !== tMonth) continue;
    }
    for (const mid of b.memberIds || []) {
      paidBordereauMemberIds.add(mid);
    }
    for (const cRow of b.customRows || []) {
      poolCustomBordereauRowsDA += Number(cRow.poolPriceDA) || 0;
    }
  }

  // Filter members by period and category
  const scopedMembers = members.filter((m) => {
    if (filter.category && filter.category !== "all") {
      if ((m.category || "").toLowerCase() !== filter.category.toLowerCase()) {
        return false;
      }
    }
    return isMemberInPeriod(m, start, end);
  });

  let assignedClientsCount = 0;
  let fullyPaidClientsCount = 0;
  let partialClientsCount = 0;
  let unpaidClientsCount = 0;
  let poolPaidClientsCount = 0;

  let revenuePaidDA = 0;
  let revenueStillToPayDA = 0;
  let grossClientRevenueDA = 0;

  let poolPaidConfirmedDA = 0;
  let poolProjectedAllAssignedDA = 0;

  const swimmerRows: ComputedSwimmerFinanceRow[] = [];

  // Map to track revenue & swimmer counts per coach name
  const coachStatsMap = new Map<
    string,
    {
      coachName: string;
      swimmerCount: number;
      groupRevenueDA: number;
      groupIds: Set<string>;
      weeklySlotsCount: number;
    }
  >();

  // Initialize coachStatsMap from groups
  for (const g of groups) {
    if (g.active === false) continue;
    if (filter.category && filter.category !== "all" && g.category !== filter.category) continue;
    const cName = (g.coachName || "").trim();
    if (!cName) continue;
    const key = cName.toLowerCase();
    let entry = coachStatsMap.get(key);
    if (!entry) {
      entry = {
        coachName: cName,
        swimmerCount: 0,
        groupRevenueDA: 0,
        groupIds: new Set<string>(),
        weeklySlotsCount: 0,
      };
      coachStatsMap.set(key, entry);
    }
    if (!entry.groupIds.has(g.id)) {
      entry.groupIds.add(g.id);
      const slots = parseScheduleSlots(g.schedule || "");
      entry.weeklySlotsCount += Math.max(1, slots.length);
    }
  }

  // Category aggregation map
  const catMap = new Map<
    string,
    {
      assignedCount: number;
      paidCount: number;
      unpaidOrPartialCount: number;
      poolPaidCount: number;
      revenuePaidDA: number;
      revenueStillToPayDA: number;
      totalRevenueDA: number;
      poolExpenseDA: number;
    }
  >();

  for (const catKey of ["homme", "femme", "enfants", "apnea"]) {
    catMap.set(catKey, {
      assignedCount: 0,
      paidCount: 0,
      unpaidOrPartialCount: 0,
      poolPaidCount: 0,
      revenuePaidDA: 0,
      revenueStillToPayDA: 0,
      totalRevenueDA: 0,
      poolExpenseDA: 0,
    });
  }

  for (const m of scopedMembers) {
    const sit = getMemberPaymentSituation(m);
    const resolvedGroups = resolveMemberGroups(m, groups);
    const groupNames = resolvedGroups.map((g) => g.name);
    const coachNames = Array.from(
      new Set(resolvedGroups.map((g) => (g.coachName || "").trim()).filter(Boolean))
    );

    // Parse schedule slots for Azal pool fee calculation
    const parsedSlots = resolvedGroups.flatMap((g) =>
      parseScheduleSlots(g.schedule || "").map((s) => ({
        day: s.day,
        time: s.time,
        location: s.location,
        isPeak: false,
      }))
    );

    const billingCfg = billingConfigs[m.swimId] || billingConfigs[m.id];
    const calcPool = calculateAzalPrice(parsedSlots, billingCfg, poolRules);
    const memberPoolCostDA = calcPool.priceDA;

    const isPoolPaid =
      isMemberPoolPaid(m.notes, targetFrenchMonth) ||
      paidBordereauMemberIds.has(m.id) ||
      paidBordereauMemberIds.has(m.swimId);

    // Only count clients who are assigned or linked to payment situation
    // Rule: "count all assigned clients paid or still to pay"
    if (!sit.isLinkedToPayment) {
      continue;
    }

    assignedClientsCount += 1;

    const contractMonths = durationToMonthsCount(m.duration);
    const prorationFactor =
      recognitionMode === "monthly_amortized"
        ? Math.min(1, monthsSpan / contractMonths)
        : 1;

    const effectiveContractDA = sit.effectivePriceDA;
    const recognizedRevenueDA = Math.round(effectiveContractDA * prorationFactor);
    const memberPaidDA = Math.round(sit.totalPaid * prorationFactor);
    const memberStillToPayDA = Math.max(0, recognizedRevenueDA - memberPaidDA);

    if (sit.debt === 0 && sit.totalPaid > 0) {
      fullyPaidClientsCount += 1;
    } else if (sit.totalPaid > 0 && sit.debt > 0) {
      partialClientsCount += 1;
    } else {
      unpaidClientsCount += 1;
    }

    revenuePaidDA += memberPaidDA;
    revenueStillToPayDA += memberStillToPayDA;
    grossClientRevenueDA += recognizedRevenueDA;

    const scaledPoolCostDA = Math.round(memberPoolCostDA * Math.max(1, monthsSpan));
    poolProjectedAllAssignedDA += scaledPoolCostDA;

    if (isPoolPaid) {
      poolPaidClientsCount += 1;
      poolPaidConfirmedDA += scaledPoolCostDA;
    }

    const appliedMemberPoolDA =
      poolBasis === "poolpaid_only"
        ? isPoolPaid
          ? scaledPoolCostDA
          : 0
        : scaledPoolCostDA;

    const activeMemberRevenueDA =
      accountingBasis === "accrual" ? recognizedRevenueDA : memberPaidDA;

    swimmerRows.push({
      memberId: m.id,
      swimId: m.swimId,
      fullName: m.fullName,
      category: m.category || "homme",
      formula: m.formula || "G10",
      duration: m.duration || "3m",
      groupNames,
      coachNames,
      isAssigned: sit.isAssigned,
      isLinkedToPayment: sit.isLinkedToPayment,
      effectivePriceDA: effectiveContractDA,
      recognizedRevenueDA,
      paidDA: memberPaidDA,
      stillToPayDA: memberStillToPayDA,
      isPoolPaid,
      poolCostDA: scaledPoolCostDA,
      appliedPoolExpenseDA: appliedMemberPoolDA,
      netContributionDA: activeMemberRevenueDA - appliedMemberPoolDA,
      dateOfStart: m.dateOfStart || m.createdAt || new Date().toISOString(),
    });

    // Attribute to coach stats
    if (coachNames.length > 0) {
      const shareRevenue = Math.round(recognizedRevenueDA / coachNames.length);
      for (const cName of coachNames) {
        const key = cName.toLowerCase();
        let cEntry = coachStatsMap.get(key);
        if (!cEntry) {
          cEntry = {
            coachName: cName,
            swimmerCount: 0,
            groupRevenueDA: 0,
            groupIds: new Set<string>(),
            weeklySlotsCount: 1,
          };
          coachStatsMap.set(key, cEntry);
        }
        cEntry.swimmerCount += 1;
        cEntry.groupRevenueDA += shareRevenue;
      }
    }

    // Attribute to category stats
    const catKey = (m.category || "homme").toLowerCase().trim();
    const catEntry = catMap.get(catKey) || {
      assignedCount: 0,
      paidCount: 0,
      unpaidOrPartialCount: 0,
      poolPaidCount: 0,
      revenuePaidDA: 0,
      revenueStillToPayDA: 0,
      totalRevenueDA: 0,
      poolExpenseDA: 0,
    };
    catEntry.assignedCount += 1;
    if (sit.debt === 0 && sit.totalPaid > 0) {
      catEntry.paidCount += 1;
    } else {
      catEntry.unpaidOrPartialCount += 1;
    }
    if (isPoolPaid) {
      catEntry.poolPaidCount += 1;
    }
    catEntry.revenuePaidDA += memberPaidDA;
    catEntry.revenueStillToPayDA += memberStillToPayDA;
    catEntry.totalRevenueDA += recognizedRevenueDA;
    catEntry.poolExpenseDA += appliedMemberPoolDA;
    catMap.set(catKey, catEntry);
  }

  // Add custom bordereau rows to confirmed pool paid
  poolPaidConfirmedDA += poolCustomBordereauRowsDA;
  poolProjectedAllAssignedDA += poolCustomBordereauRowsDA;

  const appliedPoolExpenseDA =
    poolBasis === "poolpaid_only" ? poolPaidConfirmedDA : poolProjectedAllAssignedDA;

  // Equipment sales in period
  let equipmentRevenueDA = 0;
  let equipmentCostDA = 0;
  for (const sale of equipmentSales) {
    if (start && end && sale.soldAt) {
      const sd = new Date(sale.soldAt);
      if (!isNaN(sd.getTime()) && (sd < start || sd > end)) {
        continue;
      }
    }
    const qty = Math.max(1, sale.quantity || 1);
    equipmentRevenueDA += (sale.sellPrice || 0) * qty;
    equipmentCostDA += (sale.costPrice || 0) * qty;
  }
  const equipmentNetMarginDA = equipmentRevenueDA - equipmentCostDA;

  // Coach salaries calculation
  // Merge known coaches from DB + coaches found in groups + coaches configured in ledger
  const allCoachKeys = new Set<string>();
  const coachIdentityByKey = new Map<string, { id: string; name: string; defaultPayRate: number }>();

  for (const c of coaches) {
    if (c.active === false) continue;
    const key = c.name.trim().toLowerCase();
    allCoachKeys.add(key);
    coachIdentityByKey.set(key, {
      id: c.id,
      name: c.name.trim(),
      defaultPayRate: c.defaultPayRate || 0,
    });
  }

  for (const [key, stat] of coachStatsMap.entries()) {
    allCoachKeys.add(key);
    if (!coachIdentityByKey.has(key)) {
      coachIdentityByKey.set(key, {
        id: `coach_${key.replace(/\s+/g, "_")}`,
        name: stat.coachName,
        defaultPayRate: 0,
      });
    }
  }

  for (const [cfgKey, cfg] of Object.entries(ledger.coachSalaries || {})) {
    const key = (cfg.coachName || cfgKey).trim().toLowerCase();
    allCoachKeys.add(key);
    if (!coachIdentityByKey.has(key)) {
      coachIdentityByKey.set(key, {
        id: cfg.coachId || cfgKey,
        name: cfg.coachName || cfgKey,
        defaultPayRate: 0,
      });
    }
  }

  const coachRows: ComputedCoachSalaryRow[] = [];
  let coachSalaryTotalDA = 0;
  let coachSalaryPaidDA = 0;
  let coachSalaryPendingDA = 0;

  for (const key of Array.from(allCoachKeys).sort()) {
    const identity = coachIdentityByKey.get(key)!;
    const stat = coachStatsMap.get(key);
    const savedCfg =
      ledger.coachSalaries?.[key] ||
      ledger.coachSalaries?.[identity.id] ||
      ledger.coachSalaries?.[identity.name];

    const activeGroupsCount = stat ? stat.groupIds.size : 0;
    const assignedSwimmersCount = stat ? stat.swimmerCount : 0;
    const estimatedSessionsCount = (stat ? stat.weeklySlotsCount * 4 : 4) * monthsSpan;
    const groupRevenueDA = stat ? stat.groupRevenueDA : 0;

    const mode: CoachSalaryMode = savedCfg?.mode || "fixed_monthly";
    const fixedMonthlyDA = savedCfg?.fixedMonthlyDA ?? 0;
    const perGroupDA = savedCfg?.perGroupDA ?? 0;
    const perSessionDA = savedCfg?.perSessionDA ?? identity.defaultPayRate ?? 0;
    const revenueSharePct = savedCfg?.revenueSharePct ?? 0;
    const bonusDA = savedCfg?.bonusDA ?? 0;
    const deductionDA = savedCfg?.deductionDA ?? 0;
    const isPaid = savedCfg?.isPaid ?? false;

    let baseSalaryDA = 0;
    if (mode === "fixed_monthly") {
      baseSalaryDA = Math.round(fixedMonthlyDA * monthsSpan);
    } else if (mode === "per_group") {
      baseSalaryDA = Math.round(perGroupDA * activeGroupsCount * monthsSpan);
    } else if (mode === "per_session") {
      baseSalaryDA = Math.round(perSessionDA * estimatedSessionsCount);
    } else if (mode === "revenue_share") {
      baseSalaryDA = Math.round((groupRevenueDA * revenueSharePct) / 100);
    }

    const totalSalaryDA = Math.max(0, baseSalaryDA + bonusDA - deductionDA);
    coachSalaryTotalDA += totalSalaryDA;
    if (isPaid) {
      coachSalaryPaidDA += totalSalaryDA;
    } else {
      coachSalaryPendingDA += totalSalaryDA;
    }

    coachRows.push({
      coachKey: key,
      coachId: identity.id,
      coachName: identity.name,
      mode,
      activeGroupsCount,
      assignedSwimmersCount,
      estimatedSessionsCount,
      groupRevenueDA,
      baseSalaryDA,
      bonusDA,
      deductionDA,
      totalSalaryDA,
      isPaid,
      notes: savedCfg?.notes,
    });
  }

  // Other custom expenses in period
  const otherExpensesByCategory: Record<ExpenseCategory, number> = {
    pool_extra: 0,
    marketing: 0,
    equipment: 0,
    admin: 0,
    tax_bank: 0,
    other: 0,
  };

  const filteredCustomExpenses: SwimCustomExpense[] = [];
  let otherExpensesTotalDA = 0;

  for (const exp of ledger.customExpenses || []) {
    let matchesPeriod = true;
    if (filter.mode === "month" && filter.monthKey) {
      matchesPeriod = exp.recurring || exp.monthKey === filter.monthKey;
    } else if (start && end && !exp.recurring) {
      const ed = new Date(exp.date || `${exp.monthKey}-01`);
      if (!isNaN(ed.getTime())) {
        matchesPeriod = ed >= start && ed <= end;
      }
    }

    if (!matchesPeriod) continue;

    const effectiveAmount = exp.recurring
      ? Math.round((exp.amountDA || 0) * monthsSpan)
      : Math.round(exp.amountDA || 0);

    otherExpensesByCategory[exp.category || "other"] =
      (otherExpensesByCategory[exp.category || "other"] || 0) + effectiveAmount;
    otherExpensesTotalDA += effectiveAmount;

    filteredCustomExpenses.push({
      ...exp,
      amountDA: effectiveAmount,
    });
  }

  const totalExpensesDA = appliedPoolExpenseDA + coachSalaryTotalDA + otherExpensesTotalDA;

  const extraMarginDA = includeEquipment ? equipmentNetMarginDA : 0;
  const totalRecognizedRevenueDA = grossClientRevenueDA + extraMarginDA;
  const totalCashRevenueDA = revenuePaidDA + extraMarginDA;

  const collectionRatePct =
    grossClientRevenueDA > 0
      ? Math.min(100, Math.round((revenuePaidDA / grossClientRevenueDA) * 1000) / 10)
      : 0;

  const grossProfitDA = totalRecognizedRevenueDA - (appliedPoolExpenseDA + coachSalaryTotalDA);
  const grossMarginPct =
    totalRecognizedRevenueDA > 0
      ? Math.round((grossProfitDA / totalRecognizedRevenueDA) * 1000) / 10
      : 0;

  const netProfitAccrualDA = totalRecognizedRevenueDA - totalExpensesDA;
  const netProfitCashDA = totalCashRevenueDA - totalExpensesDA;

  const activeRevenueForMargin =
    accountingBasis === "accrual" ? totalRecognizedRevenueDA : totalCashRevenueDA;
  const activeNetProfitDA =
    accountingBasis === "accrual" ? netProfitAccrualDA : netProfitCashDA;

  const activeNetMarginPct =
    activeRevenueForMargin > 0
      ? Math.round((activeNetProfitDA / activeRevenueForMargin) * 1000) / 10
      : 0;

  const expenseRatioPct =
    activeRevenueForMargin > 0
      ? Math.round((totalExpensesDA / activeRevenueForMargin) * 1000) / 10
      : 0;

  const arpuDA =
    assignedClientsCount > 0 ? Math.round(grossClientRevenueDA / assignedClientsCount) : 0;
  const profitPerSwimmerDA =
    assignedClientsCount > 0 ? Math.round(activeNetProfitDA / assignedClientsCount) : 0;

  // Category profitability rows with allocated coach cost proportional to swimmer count
  const categoryBreakdown: CategoryProfitabilityRow[] = [];
  for (const [catKey, catStat] of catMap.entries()) {
    const shareOfSwimmers =
      assignedClientsCount > 0 ? catStat.assignedCount / assignedClientsCount : 0;
    const coachExpenseAllocatedDA = Math.round(coachSalaryTotalDA * shareOfSwimmers);
    const catGrossMarginDA =
      catStat.totalRevenueDA - catStat.poolExpenseDA - coachExpenseAllocatedDA;
    const catGrossMarginPct =
      catStat.totalRevenueDA > 0
        ? Math.round((catGrossMarginDA / catStat.totalRevenueDA) * 1000) / 10
        : 0;

    categoryBreakdown.push({
      category: catKey,
      assignedCount: catStat.assignedCount,
      paidCount: catStat.paidCount,
      unpaidOrPartialCount: catStat.unpaidOrPartialCount,
      poolPaidCount: catStat.poolPaidCount,
      revenuePaidDA: catStat.revenuePaidDA,
      revenueStillToPayDA: catStat.revenueStillToPayDA,
      totalRevenueDA: catStat.totalRevenueDA,
      poolExpenseDA: catStat.poolExpenseDA,
      coachExpenseAllocatedDA,
      grossMarginDA: catGrossMarginDA,
      grossMarginPct: catGrossMarginPct,
    });
  }

  // Break-Even Point (Seuil de Rentabilite) calculation
  const avgRevenuePerSwimmerDA = arpuDA > 0 ? arpuDA : 21900;
  const avgVariablePoolCostPerSwimmerDA =
    assignedClientsCount > 0
      ? Math.round(appliedPoolExpenseDA / assignedClientsCount)
      : 4000;
  const contributionMarginPerSwimmerDA = Math.max(
    1,
    avgRevenuePerSwimmerDA - avgVariablePoolCostPerSwimmerDA
  );
  const contributionMarginRatioPct =
    avgRevenuePerSwimmerDA > 0
      ? Math.round((contributionMarginPerSwimmerDA / avgRevenuePerSwimmerDA) * 1000) / 10
      : 0;
  const fixedCostsDA = coachSalaryTotalDA + otherExpensesTotalDA;
  const breakEvenSwimmersCount =
    fixedCostsDA > 0 ? Math.ceil(fixedCostsDA / contributionMarginPerSwimmerDA) : 0;
  const breakEvenRevenueDA = breakEvenSwimmersCount * avgRevenuePerSwimmerDA;
  const safetyMarginSwimmers = assignedClientsCount - breakEvenSwimmersCount;
  const safetyMarginDA = grossClientRevenueDA - breakEvenRevenueDA;

  return {
    periodLabel,
    monthsSpan,
    totalRegisteredCount: scopedMembers.length,
    assignedClientsCount,
    fullyPaidClientsCount,
    partialClientsCount,
    unpaidClientsCount,
    poolPaidClientsCount,
    revenuePaidDA,
    revenueStillToPayDA,
    grossClientRevenueDA,
    equipmentRevenueDA,
    equipmentCostDA,
    equipmentNetMarginDA,
    totalRecognizedRevenueDA,
    collectionRatePct,
    poolPaidConfirmedDA,
    poolProjectedAllAssignedDA,
    poolCustomBordereauRowsDA,
    appliedPoolExpenseDA,
    coachSalaryTotalDA,
    coachSalaryPaidDA,
    coachSalaryPendingDA,
    otherExpensesTotalDA,
    otherExpensesByCategory,
    totalExpensesDA,
    expenseRatioPct,
    grossProfitDA,
    grossMarginPct,
    netProfitAccrualDA,
    netProfitCashDA,
    activeNetProfitDA,
    activeNetMarginPct,
    arpuDA,
    profitPerSwimmerDA,
    swimmerRows,
    coachRows,
    categoryBreakdown,
    filteredCustomExpenses,
    breakEven: {
      avgRevenuePerSwimmerDA,
      avgVariablePoolCostPerSwimmerDA,
      contributionMarginPerSwimmerDA,
      contributionMarginRatioPct,
      fixedCostsDA,
      breakEvenSwimmersCount,
      breakEvenRevenueDA,
      safetyMarginSwimmers,
      safetyMarginDA,
    },
  };
}

/**
 * Compares two financial reports (Period A vs Period B) and computes deltas and growth rates.
 */
export function compareFinancialPeriods(
  periodA: PeriodFinancialReport,
  periodB: PeriodFinancialReport
): PeriodComparisonResult {
  const pctChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : curr < 0 ? -100 : 0;
    return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
  };

  return {
    periodA,
    periodB,
    deltas: {
      assignedClientsDelta: periodA.assignedClientsCount - periodB.assignedClientsCount,
      assignedClientsPct: pctChange(periodA.assignedClientsCount, periodB.assignedClientsCount),
      revenueDeltaDA: periodA.totalRecognizedRevenueDA - periodB.totalRecognizedRevenueDA,
      revenuePct: pctChange(periodA.totalRecognizedRevenueDA, periodB.totalRecognizedRevenueDA),
      paidDeltaDA: periodA.revenuePaidDA - periodB.revenuePaidDA,
      paidPct: pctChange(periodA.revenuePaidDA, periodB.revenuePaidDA),
      stillToPayDeltaDA: periodA.revenueStillToPayDA - periodB.revenueStillToPayDA,
      poolExpenseDeltaDA: periodA.appliedPoolExpenseDA - periodB.appliedPoolExpenseDA,
      coachSalaryDeltaDA: periodA.coachSalaryTotalDA - periodB.coachSalaryTotalDA,
      otherExpenseDeltaDA: periodA.otherExpensesTotalDA - periodB.otherExpensesTotalDA,
      totalExpensesDeltaDA: periodA.totalExpensesDA - periodB.totalExpensesDA,
      totalExpensesPct: pctChange(periodA.totalExpensesDA, periodB.totalExpensesDA),
      netProfitDeltaDA: periodA.activeNetProfitDA - periodB.activeNetProfitDA,
      netProfitPct: pctChange(periodA.activeNetProfitDA, periodB.activeNetProfitDA),
      marginDeltaPts:
        Math.round((periodA.activeNetMarginPct - periodB.activeNetMarginPct) * 10) / 10,
    },
  };
}

/**
 * Builds a multi-month time-series trend across the given month keys (e.g. ["2026-09", "2026-10", "2026-11", ...]).
 */
export function buildMonthlyFinancialSeries(params: {
  monthKeys: string[];
  members: FinanceMemberInput[];
  groups: SwimGroupReference[];
  coaches?: FinanceCoachInput[];
  equipmentSales?: FinanceEquipmentSaleInput[];
  bordereaux?: PoolBordereau[];
  billingConfigs?: Record<string, SwimmerBillingConfig>;
  ledger: SwimFinanceLedgerState;
  accountingBasis?: AccountingBasis;
  poolBasis?: PoolExpenseBasis;
  recognitionMode?: RevenueRecognitionMode;
}): MonthlyTrendPoint[] {
  return params.monthKeys.map((monthKey) => {
    const info = parseMonthKeyInfo(monthKey);
    const report = computePeriodFinancialReport({
      members: params.members,
      groups: params.groups,
      coaches: params.coaches,
      equipmentSales: params.equipmentSales,
      bordereaux: params.bordereaux,
      billingConfigs: params.billingConfigs,
      ledger: params.ledger,
      accountingBasis: params.accountingBasis,
      poolBasis: params.poolBasis,
      recognitionMode: params.recognitionMode,
      filter: {
        mode: "month",
        monthKey,
      },
    });

    return {
      monthKey,
      label: info.shortLabel,
      frenchMonth: info.frenchMonth,
      assignedCount: report.assignedClientsCount,
      revenuePaidDA: report.revenuePaidDA,
      revenueStillToPayDA: report.revenueStillToPayDA,
      totalRevenueDA: report.totalRecognizedRevenueDA,
      poolExpenseDA: report.appliedPoolExpenseDA,
      coachSalaryDA: report.coachSalaryTotalDA,
      otherExpenseDA: report.otherExpensesTotalDA,
      totalExpensesDA: report.totalExpensesDA,
      netProfitDA: report.activeNetProfitDA,
    };
  });
}

/**
 * Runs a dynamic What-If financial simulation on top of a baseline PeriodFinancialReport.
 */
export function runWhatIfSimulation(
  baseReport: PeriodFinancialReport,
  sim: WhatIfSimulationParams
): WhatIfSimulationResult {
  const baseSwimmers = baseReport.assignedClientsCount;
  const projectedSwimmers = Math.max(0, baseSwimmers + sim.extraSwimmers);

  const baseArpu = baseReport.arpuDA > 0 ? baseReport.arpuDA : 21900;
  const adjustedArpu = Math.round(baseArpu * (1 + sim.priceChangePct / 100));

  const projectedClientRevenueDA = projectedSwimmers * adjustedArpu;
  const projectedRevenueDA =
    projectedClientRevenueDA +
    (baseReport.totalRecognizedRevenueDA - baseReport.grossClientRevenueDA);

  const clampedCollectionRate = Math.max(0, Math.min(100, sim.targetCollectionRatePct));
  const projectedCashCollectedDA = Math.round(
    (projectedClientRevenueDA * clampedCollectionRate) / 100 +
      (baseReport.totalRecognizedRevenueDA - baseReport.grossClientRevenueDA)
  );

  const basePoolPerSwimmer =
    baseSwimmers > 0 ? baseReport.appliedPoolExpenseDA / baseSwimmers : 4000;
  const adjustedPoolPerSwimmer = basePoolPerSwimmer * (1 + sim.poolCostChangePct / 100);
  const projectedPoolExpenseDA = Math.round(projectedSwimmers * adjustedPoolPerSwimmer);

  const projectedCoachSalaryDA = Math.round(
    baseReport.coachSalaryTotalDA * (1 + sim.coachSalaryChangePct / 100)
  );
  const projectedOtherExpenseDA = baseReport.otherExpensesTotalDA;
  const projectedTotalExpensesDA =
    projectedPoolExpenseDA + projectedCoachSalaryDA + projectedOtherExpenseDA;

  const projectedNetProfitAccrualDA = projectedRevenueDA - projectedTotalExpensesDA;
  const projectedNetProfitCashDA = projectedCashCollectedDA - projectedTotalExpensesDA;

  const projectedMarginPct =
    projectedRevenueDA > 0
      ? Math.round((projectedNetProfitAccrualDA / projectedRevenueDA) * 1000) / 10
      : 0;

  return {
    projectedSwimmers,
    projectedRevenueDA,
    projectedCashCollectedDA,
    projectedPoolExpenseDA,
    projectedCoachSalaryDA,
    projectedOtherExpenseDA,
    projectedTotalExpensesDA,
    projectedNetProfitAccrualDA,
    projectedNetProfitCashDA,
    netProfitDeltaAccrualDA: projectedNetProfitAccrualDA - baseReport.netProfitAccrualDA,
    netProfitDeltaCashDA: projectedNetProfitCashDA - baseReport.netProfitCashDA,
    projectedMarginPct,
  };
}
