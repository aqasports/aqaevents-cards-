import { describe, it, expect } from "vitest";
import {
  computePeriodFinancialReport,
  compareFinancialPeriods,
  runWhatIfSimulation,
  computeFinancialHealthScore,
  generateFinancialInsights,
  FINANCIAL_KNOWLEDGE_PILLS,
  DEFAULT_FINANCE_LEDGER_STATE,
  FinanceMemberInput,
  SwimFinanceLedgerState,
} from "./swim-finance";
import { SwimGroupReference } from "./swim-pool-dispatch";

const mockGroups: SwimGroupReference[] = [
  {
    id: "grp_1",
    name: "Lun 18:00 Karim B Azal",
    category: "homme",
    level: "G10",
    coachName: "Karim Benali",
    schedule: "Lundi 18:00 \u00b7 Azal",
    capacity: 10,
    active: true,
  },
  {
    id: "grp_2",
    name: "Mar 10:00 Sarah M Azal",
    category: "femme",
    level: "MAX5",
    coachName: "Sarah Mansouri",
    schedule: "Mardi 10:00 \u00b7 Azal",
    capacity: 5,
    active: true,
  },
];

const mockMembers: FinanceMemberInput[] = [
  // 1. Assigned & fully paid & poolpaid
  {
    id: "m_1",
    swimId: "SWM-001001",
    fullName: "Amine Khelifi",
    phone: "0550000001",
    category: "homme",
    level: "new_aqa",
    formula: "G10",
    duration: "3m",
    priceDA: 21900,
    paymentStatus: "paid",
    notes: "[POOLPAID:Octobre]",
    groupId: "grp_1",
    group: mockGroups[0],
    dateOfStart: "2026-10-05",
    payments: [{ amount: 21900, paidAt: "2026-10-05T10:00:00.000Z" }],
  },
  // 2. Assigned & partial payment (still to pay = 11900) & poolpaid
  {
    id: "m_2",
    swimId: "SWM-001002",
    fullName: "Yacine Brahimi",
    phone: "0550000002",
    category: "homme",
    level: "old_aqa",
    formula: "G10",
    duration: "3m",
    priceDA: 21900,
    paymentStatus: "partial",
    notes: "[POOLPAID:Octobre]",
    groupId: "grp_1",
    group: mockGroups[0],
    dateOfStart: "2026-10-10",
    payments: [{ amount: 10000, paidAt: "2026-10-10T12:00:00.000Z" }],
  },
  // 3. Assigned & unpaid (still to pay = 28500) & NOT poolpaid yet
  {
    id: "m_3",
    swimId: "SWM-001003",
    fullName: "Nadia Touati",
    phone: "0550000003",
    category: "femme",
    level: "new_aqa",
    formula: "MAX5",
    duration: "3m",
    priceDA: 28500,
    paymentStatus: "unpaid",
    notes: null,
    groupId: "grp_2",
    group: mockGroups[1],
    dateOfStart: "2026-10-12",
    payments: [],
  },
  // 4. Unassigned client (no debt) -> should NOT be counted in assigned clients revenue
  {
    id: "m_4",
    swimId: "SWM-001004",
    fullName: "Unassigned Prospect",
    phone: "0550000004",
    category: "homme",
    level: "new_aqa",
    formula: "G10",
    duration: "3m",
    priceDA: 21900,
    paymentStatus: "unpaid",
    notes: null,
    groupId: null,
    group: null,
    dateOfStart: "2026-10-15",
    payments: [],
  },
];

describe("AQA Swim Financial & Accounting Engine", () => {
  it("counts all assigned clients (paid + still to pay) and subtracts poolpaid, coach salaries, and other expenses", () => {
    const customLedger: SwimFinanceLedgerState = {
      ...DEFAULT_FINANCE_LEDGER_STATE,
      includeEquipmentMargin: false,
      coachSalaries: {
        "karim benali": {
          coachId: "c_karim",
          coachName: "Karim Benali",
          mode: "fixed_monthly",
          fixedMonthlyDA: 15000,
          perGroupDA: 0,
          perSessionDA: 0,
          revenueSharePct: 0,
          bonusDA: 2000,
          deductionDA: 0,
          isPaid: true,
        },
        "sarah mansouri": {
          coachId: "c_sarah",
          coachName: "Sarah Mansouri",
          mode: "per_group",
          fixedMonthlyDA: 0,
          perGroupDA: 10000,
          perSessionDA: 0,
          revenueSharePct: 0,
          bonusDA: 0,
          deductionDA: 0,
          isPaid: false,
        },
      },
      customExpenses: [
        {
          id: "exp_1",
          label: "Campagne Ads Octobre",
          category: "marketing",
          amountDA: 5000,
          date: "2026-10-08",
          monthKey: "2026-10",
          recurring: false,
          status: "paid",
        },
      ],
    };

    const report = computePeriodFinancialReport({
      members: mockMembers,
      groups: mockGroups,
      ledger: customLedger,
      filter: {
        mode: "month",
        monthKey: "2026-10",
      },
      accountingBasis: "accrual",
      poolBasis: "poolpaid_only",
      recognitionMode: "full_contract",
      includeEquipmentMargin: false,
    });

    // 3 assigned members (m_4 is unassigned and ignored)
    expect(report.assignedClientsCount).toBe(3);
    expect(report.fullyPaidClientsCount).toBe(1);
    expect(report.partialClientsCount).toBe(1);
    expect(report.unpaidClientsCount).toBe(1);

    // Revenue: 21900 + 21900 + 28500 = 72300 DA
    // Paid: 21900 + 10000 + 0 = 31900 DA
    // Still to pay: 0 + 11900 + 28500 = 40400 DA
    expect(report.revenuePaidDA).toBe(31900);
    expect(report.revenueStillToPayDA).toBe(40400);
    expect(report.grossClientRevenueDA).toBe(72300);

    // PoolPaid: m_1 and m_2 are in Soir 1x (18:00 -> 4000 DA each) => 8000 DA confirmed poolpaid
    // m_3 is in Matin 1x (10:00 -> 3500 DA) not poolpaid yet => projected all assigned = 11500 DA
    expect(report.poolPaidClientsCount).toBe(2);
    expect(report.poolPaidConfirmedDA).toBe(8000);
    expect(report.poolProjectedAllAssignedDA).toBe(11500);
    expect(report.appliedPoolExpenseDA).toBe(8000);

    // Coach salaries: Karim = 15000 + 2000 = 17000 DA; Sarah = 10000 * 1 group = 10000 DA => 27000 DA
    expect(report.coachSalaryTotalDA).toBe(27000);
    expect(report.coachSalaryPaidDA).toBe(17000);
    expect(report.coachSalaryPendingDA).toBe(10000);

    // Other expenses: 5000 DA
    expect(report.otherExpensesTotalDA).toBe(5000);

    // Total expenses: 8000 + 27000 + 5000 = 40000 DA
    expect(report.totalExpensesDA).toBe(40000);

    // Net Profit (Accrual = Paid + Still to pay - Expenses): 72300 - 40000 = 32300 DA
    expect(report.netProfitAccrualDA).toBe(32300);
    expect(report.activeNetProfitDA).toBe(32300);

    // Net Profit (Cash = Paid only - Expenses): 31900 - 40000 = -8100 DA
    expect(report.netProfitCashDA).toBe(-8100);
  });

  it("compares two periods and computes accurate deltas and what-if simulation", () => {
    const reportOct = computePeriodFinancialReport({
      members: mockMembers,
      groups: mockGroups,
      ledger: DEFAULT_FINANCE_LEDGER_STATE,
      filter: { mode: "month", monthKey: "2026-10" },
    });

    const reportSep = computePeriodFinancialReport({
      members: [],
      groups: mockGroups,
      ledger: DEFAULT_FINANCE_LEDGER_STATE,
      filter: { mode: "month", monthKey: "2026-09" },
    });

    const cmp = compareFinancialPeriods(reportOct, reportSep);
    expect(cmp.deltas.assignedClientsDelta).toBe(3);
    expect(cmp.deltas.revenueDeltaDA).toBe(72300);

    const sim = runWhatIfSimulation(reportOct, {
      extraSwimmers: 10,
      priceChangePct: 0,
      poolCostChangePct: 0,
      coachSalaryChangePct: 0,
      targetCollectionRatePct: 90,
    });
    expect(sim.projectedSwimmers).toBe(13);
    expect(sim.projectedRevenueDA).toBeGreaterThan(reportOct.totalRecognizedRevenueDA);
  });

  it("computes financial health score, diagnostics and accounting knowledge pills", () => {
    const report = computePeriodFinancialReport({
      members: mockMembers,
      groups: mockGroups,
      ledger: DEFAULT_FINANCE_LEDGER_STATE,
      filter: { mode: "month", monthKey: "2026-10" },
    });

    const health = computeFinancialHealthScore(report);
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D"]).toContain(health.grade);

    const insights = generateFinancialInsights(report);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].actionableRecommendation).toBeDefined();

    expect(FINANCIAL_KNOWLEDGE_PILLS.length).toBeGreaterThanOrEqual(4);
    expect(FINANCIAL_KNOWLEDGE_PILLS[0].keyFormula).toBeDefined();
  });
});
