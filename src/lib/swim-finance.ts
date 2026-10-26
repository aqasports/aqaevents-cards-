// AQA Swim - Financial & Accounting Analytics Engine (Comptabilite Analytique & Rentabilite)
// Standard Western Arabic numerals only (0-9). No emojis anywhere.

import {
  FRENCH_MONTHS,
  getCurrentFrenchMonth,
  getMemberPaymentSituation,
  isMemberPoolPaid,
  normalizeMonth,
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
import { computeSubscriptionEnd } from "./swim-subscription";

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
  netProfitTargetDA: 0,
  revenueTargetDA: 0,
  assignedClientsTarget: 0,
  collectionRateTargetPct: 0,
  maxExpenseRatioPct: 0,
};

export const DEFAULT_FINANCE_LEDGER_STATE: SwimFinanceLedgerState = {
  coachSalaries: {},
  customExpenses: [],
  goals: DEFAULT_FINANCE_GOALS,
  snapshots: [],
  defaultAccountingBasis: "accrual",
  defaultPoolBasis: "poolpaid_only",
  defaultRecognitionMode: "monthly_amortized",
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
  contractMonths: number;
  monthlyRateDA: number;
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
 * Resolves the number of active subscription months for multi-month tiers:
 * - Silver / Découverte / 3m: 3 months (e.g. 21,900 DA / 3 = 7,300 DA / month)
 * - Gold / Recommandé / 6m: 6 months (e.g. 39,900 DA / 6 = 6,650 DA / month)
 * - Diamond / Économique / 9m: 9 months (e.g. 54,900 DA / 9 = 6,100 DA / month)
 * - Starter / 1m: 1 month
 */
export function resolveFormulaMonths(
  duration?: string | null,
  formula?: string | null
): number {
  const combined = `${duration || ""} ${formula || ""}`.toLowerCase().trim();
  if (
    combined.includes("diamond") ||
    combined.includes("diamant") ||
    combined.includes("econom") ||
    combined.includes("économ") ||
    combined.includes("9m") ||
    combined.includes("9 mois") ||
    combined.includes("9mois") ||
    combined.includes("9 m")
  ) {
    return 9;
  }
  if (
    combined.includes("gold") ||
    combined.includes("or") ||
    combined.includes("recommand") ||
    combined.includes("6m") ||
    combined.includes("6 mois") ||
    combined.includes("6mois") ||
    combined.includes("6 m")
  ) {
    return 6;
  }
  if (
    combined.includes("starter") ||
    combined.includes("1m") ||
    combined.includes("1 mois") ||
    combined.includes("1mois") ||
    combined.includes("1 m") ||
    combined.includes("mensuel") ||
    combined.includes("un mois")
  ) {
    return 1;
  }
  if (
    combined.includes("silver") ||
    combined.includes("argent") ||
    combined.includes("decouvert") ||
    combined.includes("découvert") ||
    combined.includes("trimestriel") ||
    combined.includes("3m") ||
    combined.includes("3 mois") ||
    combined.includes("3mois") ||
    combined.includes("3 m")
  ) {
    return 3;
  }
  return 3;
}

/**
 * Duration code ("1m", "3m", "6m", "9m") or formula name to months count for amortization.
 */
export function durationToMonthsCount(
  duration?: string | null,
  formula?: string | null
): number {
  return resolveFormulaMonths(duration, formula);
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
 * Calculates the active contract date window [start, end] and formula duration for a swimmer.
 * Accurately covers multi-month subscriptions (Silver 3m, Gold 6m, Diamond 9m) across consecutive months.
 */
export function getMemberSubscriptionWindow(member: FinanceMemberInput): {
  start: Date | null;
  end: Date | null;
  contractMonths: number;
} {
  const contractMonths = resolveFormulaMonths(member.duration, member.formula);
  const rawStartStr = member.subscriptionStart || member.dateOfStart || member.createdAt;
  if (!rawStartStr) {
    return { start: null, end: null, contractMonths };
  }

  const subStart = new Date(rawStartStr);
  if (isNaN(subStart.getTime())) {
    return { start: null, end: null, contractMonths };
  }

  let subEnd: Date | null = null;
  if (member.subscriptionEnd) {
    const parsedEnd = new Date(member.subscriptionEnd);
    if (!isNaN(parsedEnd.getTime())) {
      subEnd = parsedEnd;
    }
  }

  if (!subEnd) {
    try {
      subEnd = computeSubscriptionEnd(
        subStart,
        member.duration || `${contractMonths}m`,
        undefined,
        member.formula || undefined
      );
    } catch {
      const fallbackEnd = new Date(subStart.getTime());
      fallbackEnd.setUTCMonth(fallbackEnd.getUTCMonth() + contractMonths);
      fallbackEnd.setUTCHours(23, 59, 59, 999);
      subEnd = fallbackEnd;
    }
  }

  return { start: subStart, end: subEnd, contractMonths };
}

/**
 * Checks whether a member is active during the given date bounds.
 * A swimmer with a multi-month contract (Silver 3m, Gold 6m, Diamond 9m) is active in all
 * months covered by their subscription window [start, end].
 */
export function isMemberInPeriod(
  member: FinanceMemberInput,
  start: Date | null,
  end: Date | null
): boolean {
  if (!start || !end) return true;

  const window = getMemberSubscriptionWindow(member);
  if (window.start && window.end) {
    if (window.start <= end && window.end >= start) {
      return true;
    }
  }

  // Also check if any payment happened inside [start, end]
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

  // If no date was found at all on the member, include by default
  if (!window.start) return true;

  return false;
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

    const contractMonths = resolveFormulaMonths(m.duration, m.formula);
    const effectiveContractDA = sit.effectivePriceDA;
    const monthlyRateDA = Math.round(effectiveContractDA / contractMonths);
    const monthlyPaidRateDA = Math.round(sit.totalPaid / contractMonths);

    let recognizedRevenueDA: number;
    let memberPaidDA: number;
    let memberStillToPayDA: number;

    if (recognitionMode === "monthly_amortized") {
      // Divide formula across contract months so each active month receives its fair share
      // E.g. Silver (21,900 DA / 3 = 7,300 DA / month for Oct, Nov, Dec)
      const spanMonths = Math.min(contractMonths, Math.max(1, monthsSpan));
      recognizedRevenueDA = Math.min(effectiveContractDA, monthlyRateDA * spanMonths);
      memberPaidDA = Math.min(sit.totalPaid, monthlyPaidRateDA * spanMonths);
      memberStillToPayDA = Math.max(0, recognizedRevenueDA - memberPaidDA);
    } else {
      // Full contract lump sum recognition
      recognizedRevenueDA = effectiveContractDA;
      memberPaidDA = sit.totalPaid;
      memberStillToPayDA = sit.debt;
    }

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
      duration: m.duration || `${contractMonths}m`,
      contractMonths,
      monthlyRateDA,
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
  const coachIdentityByKey = new Map<
    string,
    { id: string; name: string; defaultPayRate: number; commissionRate: number }
  >();

  for (const c of coaches) {
    if (c.active === false) continue;
    const key = c.name.trim().toLowerCase();
    allCoachKeys.add(key);
    coachIdentityByKey.set(key, {
      id: c.id,
      name: c.name.trim(),
      defaultPayRate: c.defaultPayRate || 0,
      commissionRate: c.commissionRate || 0,
    });
  }

  for (const [key, stat] of coachStatsMap.entries()) {
    allCoachKeys.add(key);
    if (!coachIdentityByKey.has(key)) {
      coachIdentityByKey.set(key, {
        id: `coach_${key.replace(/\s+/g, "_")}`,
        name: stat.coachName,
        defaultPayRate: 0,
        commissionRate: 0,
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
        commissionRate: 0,
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

    const fallbackMode: CoachSalaryMode =
      identity.defaultPayRate > 0
        ? "per_session"
        : identity.commissionRate > 0
        ? "revenue_share"
        : "per_group";

    const mode: CoachSalaryMode = savedCfg?.mode || fallbackMode;
    const fixedMonthlyDA = savedCfg?.fixedMonthlyDA ?? 0;
    const perGroupDA = savedCfg?.perGroupDA ?? 0;
    const perSessionDA = savedCfg?.perSessionDA ?? identity.defaultPayRate ?? 0;
    const revenueSharePct =
      savedCfg?.revenueSharePct ??
      (identity.commissionRate > 0
        ? identity.commissionRate <= 1
          ? Math.round(identity.commissionRate * 100)
          : identity.commissionRate
        : 0);
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
 * Dynamically extracts all distinct YYYY-MM month keys that contain REAL recorded activity
 * (real member start dates, real payment timestamps, real bordereaux, or real expenses).
 * Strictly excludes any future months that have not occurred yet (<= current calendar month),
 * unless includeFutureProjections is explicitly set to true.
 */
export function extractRealActiveMonthKeys(params: {
  members?: FinanceMemberInput[];
  bordereaux?: PoolBordereau[];
  equipmentSales?: FinanceEquipmentSaleInput[];
  customExpenses?: SwimCustomExpense[];
  ledger?: SwimFinanceLedgerState;
  currentDate?: Date;
  includeFutureProjections?: boolean;
}): string[] {
  const now = params.currentDate || new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const set = new Set<string>();

  // Always include the current active calendar month
  set.add(currentMonthKey);

  // 1. Members start dates & payment dates
  for (const m of params.members || []) {
    if (m.dateOfStart) {
      const match = m.dateOfStart.match(/^(\d{4}-\d{2})/);
      if (match) set.add(match[1]);
    }
    if (m.createdAt) {
      const match = m.createdAt.match(/^(\d{4}-\d{2})/);
      if (match) set.add(match[1]);
    }
    if (Array.isArray(m.payments)) {
      for (const p of m.payments) {
        if (p.paidAt) {
          const match = p.paidAt.match(/^(\d{4}-\d{2})/);
          if (match) set.add(match[1]);
        }
      }
    }
  }

  // 2. Equipment sales
  for (const s of params.equipmentSales || []) {
    if (s.soldAt) {
      const match = s.soldAt.match(/^(\d{4}-\d{2})/);
      if (match) set.add(match[1]);
    }
  }

  // 3. Custom expenses
  const allExpenses = params.ledger?.customExpenses || params.customExpenses || [];
  for (const e of allExpenses) {
    if (e.monthKey) set.add(e.monthKey);
    else if (e.date) {
      const match = e.date.match(/^(\d{4}-\d{2})/);
      if (match) set.add(match[1]);
    }
  }

  // 4. Bordereaux
  for (const b of params.bordereaux || []) {
    if (b.month) {
      const norm = normalizeMonth(b.month);
      const mIdx = FRENCH_MONTHS.findIndex((fm) => normalizeMonth(fm) === norm);
      if (mIdx !== -1) {
        const y = now.getFullYear();
        set.add(`${y}-${String(mIdx + 1).padStart(2, "0")}`);
      }
    }
  }

  if (params.includeFutureProjections) {
    // Include future months covered by active member contracts
    for (const m of params.members || []) {
      const win = getMemberSubscriptionWindow(m);
      if (win.start && win.end) {
        const cursor = new Date(win.start.getTime());
        while (cursor <= win.end) {
          const k = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
          if (k >= "2026-08") set.add(k);
          cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        }
      }
    }
    return Array.from(set)
      .filter((k) => /^\d{4}-\d{2}$/.test(k) && k >= "2026-08")
      .sort();
  }

  // Strict mode (Default): only real realized months up to the current active month
  return Array.from(set)
    .filter((k) => /^\d{4}-\d{2}$/.test(k) && k >= "2026-08" && k <= currentMonthKey)
    .sort();
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

// ─── Financial Health Score & Analytical Knowledge Models ────────────────────

export interface FinancialHealthScore {
  score: number; // 0..100
  grade: "A" | "B" | "C" | "D";
  status: "excellent" | "healthy" | "warning" | "critical";
  statusLabel: string;
  subScores: {
    collection: { score: number; max: 25; label: string };
    margin: { score: number; max: 25; label: string };
    breakEvenSafety: { score: number; max: 25; label: string };
    costControl: { score: number; max: 25; label: string };
  };
}

export function computeFinancialHealthScore(
  report: PeriodFinancialReport
): FinancialHealthScore {
  // 1. Collection Efficiency (0..25)
  let collScore = 5;
  if (report.collectionRatePct >= 90) collScore = 25;
  else if (report.collectionRatePct >= 80) collScore = 20;
  else if (report.collectionRatePct >= 65) collScore = 15;
  else if (report.collectionRatePct >= 50) collScore = 10;

  // 2. Net Operating Margin (0..25)
  let marginScore = 0;
  if (report.activeNetMarginPct >= 45) marginScore = 25;
  else if (report.activeNetMarginPct >= 30) marginScore = 20;
  else if (report.activeNetMarginPct >= 15) marginScore = 15;
  else if (report.activeNetMarginPct >= 0) marginScore = 10;

  // 3. Break-Even Safety Margin (0..25)
  let beScore = 0;
  const safety = report.breakEven.safetyMarginSwimmers;
  if (safety >= 30) beScore = 25;
  else if (safety >= 15) beScore = 20;
  else if (safety >= 5) beScore = 15;
  else if (safety >= 0) beScore = 10;

  // 4. Cost Control & Expense Ratio (0..25)
  let costScore = 5;
  if (report.expenseRatioPct <= 45 && report.expenseRatioPct > 0) costScore = 25;
  else if (report.expenseRatioPct <= 60) costScore = 20;
  else if (report.expenseRatioPct <= 75) costScore = 15;
  else if (report.expenseRatioPct <= 90) costScore = 10;

  const totalScore = collScore + marginScore + beScore + costScore;

  let grade: "A" | "B" | "C" | "D" = "D";
  let status: "excellent" | "healthy" | "warning" | "critical" = "critical";
  let statusLabel = "Alerte Rentabilité";

  if (totalScore >= 85) {
    grade = "A";
    status = "excellent";
    statusLabel = "Excellente & Optimisée";
  } else if (totalScore >= 70) {
    grade = "B";
    status = "healthy";
    statusLabel = "Saine & Rentable";
  } else if (totalScore >= 50) {
    grade = "C";
    status = "warning";
    statusLabel = "Vigilance Requise";
  }

  return {
    score: totalScore,
    grade,
    status,
    statusLabel,
    subScores: {
      collection: {
        score: collScore,
        max: 25,
        label: `Recouvrement (${report.collectionRatePct}%)`,
      },
      margin: {
        score: marginScore,
        max: 25,
        label: `Marge Nette (${report.activeNetMarginPct}%)`,
      },
      breakEvenSafety: {
        score: beScore,
        max: 25,
        label: `Marge Sécurité (${safety >= 0 ? `+${safety}` : safety} nag.)`,
      },
      costControl: {
        score: costScore,
        max: 25,
        label: `Poids Charges (${report.expenseRatioPct}%)`,
      },
    },
  };
}

export interface FinancialInsightItem {
  id: string;
  type: "opportunity" | "warning" | "success" | "info";
  title: string;
  detail: string;
  actionableRecommendation: string;
}

export function generateFinancialInsights(
  report: PeriodFinancialReport
): FinancialInsightItem[] {
  const insights: FinancialInsightItem[] = [];

  // Insight 1: Receivables & DSO
  if (report.revenueStillToPayDA > 0) {
    const uncollectedPct =
      report.grossClientRevenueDA > 0
        ? Math.round((report.revenueStillToPayDA / report.grossClientRevenueDA) * 100)
        : 0;
    insights.push({
      id: "insight_receivables",
      type: uncollectedPct >= 25 ? "warning" : "info",
      title: "Encaissement des Créances Clients",
      detail: `${report.revenueStillToPayDA.toLocaleString("fr-DZ")} DA de créances restent à recouvrer auprès de ${report.unpaidClientsCount + report.partialClientsCount} adhérents (${uncollectedPct}% du chiffre d'affaires).`,
      actionableRecommendation:
        "Utilisez le desk Reinscription Calls & WhatsApp pour déclencher les relances de paiement ciblées et convertir ces créances en trésorerie disponible.",
    });
  }

  // Insight 2: Pool Cost Ratio
  if (report.totalRecognizedRevenueDA > 0) {
    const poolCostPct = Math.round(
      (report.appliedPoolExpenseDA / report.totalRecognizedRevenueDA) * 100
    );
    insights.push({
      id: "insight_pool_cost",
      type: poolCostPct > 35 ? "warning" : "success",
      title: "Poids de la Redevance Bassin (poolpaid)",
      detail: `La redevance piscine représente ${report.appliedPoolExpenseDA.toLocaleString("fr-DZ")} DA, soit ${poolCostPct}% des revenus totaux (coût moyen : ${report.breakEven.avgVariablePoolCostPerSwimmerDA.toLocaleString("fr-DZ")} DA/adhérent).`,
      actionableRecommendation:
        poolCostPct > 35
          ? "Encouragez l'inscription sur les créneaux matinaux (3 500 DA vs 4 000 DA) ou augmentez la taille des groupes solid pour diluer le coût horaire."
          : "Le ratio de redevance piscine est maîtrisé et laisse une marge brute confortable au club.",
    });
  }

  // Insight 3: Break-Even Safety
  if (report.breakEven.safetyMarginSwimmers < 10) {
    insights.push({
      id: "insight_breakeven",
      type: "warning",
      title: "Proximité du Seuil de Rentabilité",
      detail: `Vous êtes à seulement ${report.breakEven.safetyMarginSwimmers} nageur(s) au-dessus de votre point mort (${report.breakEven.breakEvenSwimmersCount} adhérents requis pour couvrir les coûts fixes).`,
      actionableRecommendation:
        "Convertissez en priorité les demandes en attente (waitlist leads) pour accroître votre coussin de sécurité financière.",
    });
  } else {
    insights.push({
      id: "insight_breakeven_healthy",
      type: "success",
      title: "Coussin de Sécurité Financière Solide",
      detail: `Avec ${report.assignedClientsCount} adhérents assignés, vous dépassez votre point mort de ${report.breakEven.safetyMarginSwimmers} nageurs, dégageant une marge de sécurité de ${report.breakEven.safetyMarginDA.toLocaleString("fr-DZ")} DA.`,
      actionableRecommendation:
        "Ce niveau d'activité permet de financer des investissements pédagogiques (chronomètres, matériel pro) ou d'ouvrir de nouveaux créneaux.",
    });
  }

  // Insight 4: Category Profitability Champion
  const sortedCats = [...report.categoryBreakdown].sort(
    (a, b) => b.grossMarginDA - a.grossMarginDA
  );
  if (sortedCats.length > 0 && sortedCats[0].grossMarginDA > 0) {
    const topCat = sortedCats[0];
    insights.push({
      id: "insight_top_category",
      type: "opportunity",
      title: `Secteur Leader : ${topCat.category.toUpperCase()}`,
      detail: `Le segment ${topCat.category} génère la contribution brute la plus élevée avec ${topCat.grossMarginDA.toLocaleString("fr-DZ")} DA de marge (${topCat.grossMarginPct}%), pour ${topCat.assignedCount} adhérents.`,
      actionableRecommendation:
        "Développez la communication et les créneaux pour cette catégorie qui maximise le résultat net de l'académie.",
    });
  }

  return insights;
}

export interface FinancialKnowledgePill {
  id: string;
  title: string;
  concept: string;
  aqaApplication: string;
  keyFormula: string;
}

export const FINANCIAL_KNOWLEDGE_PILLS: FinancialKnowledgePill[] = [
  {
    id: "accrual_vs_cash",
    title: "Comptabilité d'Engagement vs Comptabilité de Trésorerie",
    concept:
      "La comptabilité d'engagement enregistre les recettes dès que la prestation est convenue (Payé + Reste à payer), tandis que la comptabilité de trésorerie n'enregistre que l'argent effectivement encaissé en caisse ou en banque.",
    aqaApplication:
      "En natation, un adhérent inscrit pour 21 900 DA qui paie un acompte de 10 000 DA génère 21 900 DA d'engagement et 10 000 DA de trésorerie immédiate. La bascule en un clic dans l'outil permet d'anticiper les résultats futurs tout en sécurisant la liquidité réelle.",
    keyFormula: "Trésorerie Nette = Encaissé Réel - Charges Décaissées",
  },
  {
    id: "contribution_margin_breakeven",
    title: "Marge sur Coûts Variables & Seuil de Rentabilité (Point Mort)",
    concept:
      "Le seuil de rentabilité est le nombre exact d'adhérents à partir duquel le club ne fait ni perte ni bénéfice. Chaque adhérent supplémentaire apporte une marge contributive unitaire qui couvre les charges fixes.",
    aqaApplication:
      "Chez AQA Swim, la redevance piscine est un coût variable direct (ex: 4 000 DA/mois), tandis que le salaire fixe du coach et les frais administratifs sont fixes. La marge unitaire (Prix moyen - Frais piscine) finance l'équipe pédagogique.",
    keyFormula: "Point Mort (Nageurs) = Charges Fixes / (Prix Moyen - Frais Piscine Moyen)",
  },
  {
    id: "working_capital_bfr",
    title: "Besoin en Fonds de Roulement (BFR) en Club Sportif",
    concept:
      "Le BFR mesure le décalage de trésorerie entre les encaissements clients et les paiements des fournisseurs (piscine, coaches). Un BFR négatif signifie que les clients financent l'activité avant même que les dépenses ne soient payées.",
    aqaApplication:
      "Comme les formules AQA Swim (3m, 6m, 9m) sont généralement réglées au début du cycle alors que la piscine est payée mensuellement, le club bénéficie d'une trésorerie d'avance structurelle à préserver rigoureusement.",
    keyFormula: "BFR = Créances Clients + Stocks - Dettes Fournisseurs & Salaires",
  },
  {
    id: "revenue_proration",
    title: "Lissage Mensuel & Amortissement des Abonnements Pluriannuels",
    concept:
      "Reconnaître l'intégralité d'un contrat de 9 mois le premier mois crée une illusion de pic de profit suivi de mois déficitaires. Le lissage mensuel divise le contrat sur sa durée effective pour refléter la valeur économique réelle.",
    aqaApplication:
      "L'option de 'Lissage Mensuel' dans l'outil permet de comparer objectivement chaque mois d'activité sans distorsion saisonnière liée aux pics de réinscriptions de septembre/octobre.",
    keyFormula: "CA Mensuel Lissé = Prix Total Contrat / Nombre de Mois de Formule",
  },
];

