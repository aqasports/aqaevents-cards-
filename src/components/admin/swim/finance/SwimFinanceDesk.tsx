"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "@/lib/i18n";
import { Card, Badge, Button, Input } from "@/components/admin/ui";
import {
  AccountingBasis,
  AQA_COACH_RATES,
  buildMonthlyFinancialSeries,
  CoachRole,
  CoachSalaryConfig,
  CoachSalaryMode,
  compareFinancialPeriods,
  computeFinancialHealthScore,
  computePeriodFinancialReport,
  DEFAULT_FINANCE_LEDGER_STATE,
  ExpenseCategory,
  extractRealActiveMonthKeys,
  FinanceCoachInput,
  FinanceEquipmentSaleInput,
  FinanceMemberInput,
  FINANCIAL_KNOWLEDGE_PILLS,
  FinancialHealthScore,
  FinancialInsightItem,
  FinancialKnowledgePill,
  generateFinancialInsights,
  PeriodFilter,
  PoolExpenseBasis,
  RevenueRecognitionMode,
  runWhatIfSimulation,
  SwimCustomExpense,
  SwimFinanceGoals,
  SwimFinanceLedgerState,
  SwimFinanceSnapshot,
} from "@/lib/swim-finance";
import {
  PoolBordereau,
  STORAGE_KEYS,
  SwimmerBillingConfig,
  SwimGroupReference,
} from "@/lib/swim-pool-dispatch";

interface SwimFinanceDeskProps {
  members?: FinanceMemberInput[];
  groups?: SwimGroupReference[];
}

const AVAILABLE_QUARTERS = [
  { key: "2026-Q3", label: "T3 2026 (Juil - Sep)" },
  { key: "2026-Q4", label: "T4 2026 (Oct - Dec)" },
];

function formatDA(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-DZ")} DA`;
}

function formatSignedDA(amount: number): string {
  const rounded = Math.round(amount);
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded.toLocaleString("fr-DZ")} DA`;
}

export function SwimFinanceDesk({
  members: propMembers,
  groups: propGroups,
}: SwimFinanceDeskProps) {
  const { locale, t } = useTranslations("swimFinance");
  const isRtl = locale === "ar";

  // ─── 1. SUB-NAVIGATION STATE ─────────────────────────────────────────────────
  const [subTab, setSubTab] = useState<
    "overview" | "comparison" | "expenses" | "goals_sim" | "ledger"
  >("overview");

  // ─── 2. DATA & PERSISTED LEDGER STATE ────────────────────────────────────────
  const [rawMembers, setRawMembers] = useState<FinanceMemberInput[]>(propMembers || []);
  const [rawGroups, setRawGroups] = useState<SwimGroupReference[]>(propGroups || []);
  const [coaches, setCoaches] = useState<FinanceCoachInput[]>([]);
  const [equipmentSales, setEquipmentSales] = useState<FinanceEquipmentSaleInput[]>([]);
  const [bordereaux, setBordereaux] = useState<PoolBordereau[]>([]);
  const [ledger, setLedger] = useState<SwimFinanceLedgerState>(DEFAULT_FINANCE_LEDGER_STATE);
  const [billingConfigs, setBillingConfigs] = useState<Record<string, SwimmerBillingConfig>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sync props when parent updates
  useEffect(() => {
    if (propMembers !== undefined) setRawMembers(propMembers);
    if (propGroups !== undefined) setRawGroups(propGroups);
  }, [propMembers, propGroups]);

  // Read local pool billing overrides from localStorage if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedBilling = localStorage.getItem(STORAGE_KEYS.BILLING_CONFIGS);
        if (savedBilling) {
          const parsed = JSON.parse(savedBilling);
          if (parsed && typeof parsed === "object") {
            setBillingConfigs(parsed);
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Single batched fetch on mount for finance ledger, bordereaux, coaches, and equipment sales
  useEffect(() => {
    const needMembers = propMembers === undefined || propGroups === undefined;
    setLoading(true);
    fetch(`/api/admin/swim/finance${needMembers ? "?includeMembers=true" : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.ledger) {
          setLedger(data.ledger);
          setAccountingBasis(data.ledger.defaultAccountingBasis || "accrual");
          setPoolBasis(data.ledger.defaultPoolBasis || "poolpaid_only");
          setRecognitionMode(data.ledger.defaultRecognitionMode || "monthly_amortized");
          setIncludeEquipmentMargin(data.ledger.includeEquipmentMargin ?? true);
          setGoalsDraft(data.ledger.goals || DEFAULT_FINANCE_LEDGER_STATE.goals);
        }
        if (Array.isArray(data.bordereaux)) setBordereaux(data.bordereaux);
        if (Array.isArray(data.coaches)) setCoaches(data.coaches);
        if (Array.isArray(data.equipmentSales)) setEquipmentSales(data.equipmentSales);
        if (needMembers && Array.isArray(data.members)) setRawMembers(data.members);
        if (needMembers && Array.isArray(data.groups)) setRawGroups(data.groups);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propMembers, propGroups]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const persistLedgerUpdate = useCallback(
    async (partial: Partial<SwimFinanceLedgerState>, successNotice?: string) => {
      const nextLedger: SwimFinanceLedgerState = {
        ...ledger,
        ...partial,
        updatedAt: new Date().toISOString(),
      };
      setLedger(nextLedger);
      setSaving(true);
      try {
        const res = await fetch("/api/admin/swim/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partial),
        });
        if (res.ok && successNotice) {
          showToast(successNotice);
        }
      } catch {
        // ignore
      } finally {
        setSaving(false);
      }
    },
    [ledger, showToast]
  );

  // ─── 3. DYNAMIC ACCOUNTING CONTROLS & PERIOD FILTERS ─────────────────────────
  const [showFutureProjections, setShowFutureProjections] = useState(false);

  // Dynamic discovery of real recorded months from real database records (strictly up to current date)
  const availableMonthKeys = useMemo(() => {
    return extractRealActiveMonthKeys({
      members: rawMembers,
      bordereaux,
      equipmentSales,
      customExpenses: ledger.customExpenses,
      includeFutureProjections: false,
    });
  }, [rawMembers, bordereaux, equipmentSales, ledger.customExpenses]);

  const seriesMonthKeys = useMemo(() => {
    return extractRealActiveMonthKeys({
      members: rawMembers,
      bordereaux,
      equipmentSales,
      customExpenses: ledger.customExpenses,
      includeFutureProjections: showFutureProjections,
    });
  }, [rawMembers, bordereaux, equipmentSales, ledger.customExpenses, showFutureProjections]);

  const currentDefaultMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const candidate = `${y}-${m}`;
    return availableMonthKeys.includes(candidate)
      ? candidate
      : availableMonthKeys[availableMonthKeys.length - 1] || "2026-10";
  }, [availableMonthKeys]);

  const [periodAFilter, setPeriodAFilter] = useState<PeriodFilter>({
    mode: "all",
    monthKey: currentDefaultMonth,
    quarterKey: "2026-Q4",
    fromDate: "2026-10-01",
    toDate: "2026-12-31",
    category: "all",
  });

  const [periodBFilter, setPeriodBFilter] = useState<PeriodFilter>({
    mode: "month",
    monthKey: "2026-09",
    quarterKey: "2026-Q3",
    fromDate: "2026-09-01",
    toDate: "2026-09-30",
    category: "all",
  });

  const [accountingBasis, setAccountingBasis] = useState<AccountingBasis>("accrual");
  const [poolBasis, setPoolBasis] = useState<PoolExpenseBasis>("poolpaid_only");
  const [recognitionMode, setRecognitionMode] =
    useState<RevenueRecognitionMode>("monthly_amortized");
  const [includeEquipmentMargin, setIncludeEquipmentMargin] = useState<boolean>(true);

  // ─── 4. COMPUTED REPORTS & MULTI-PERIOD SERIES ───────────────────────────────
  const reportA = useMemo(() => {
    return computePeriodFinancialReport({
      members: rawMembers,
      groups: rawGroups,
      coaches,
      equipmentSales,
      bordereaux,
      billingConfigs,
      ledger,
      filter: periodAFilter,
      accountingBasis,
      poolBasis,
      recognitionMode,
      includeEquipmentMargin,
    });
  }, [
    rawMembers,
    rawGroups,
    coaches,
    equipmentSales,
    bordereaux,
    billingConfigs,
    ledger,
    periodAFilter,
    accountingBasis,
    poolBasis,
    recognitionMode,
    includeEquipmentMargin,
  ]);

  const reportB = useMemo(() => {
    return computePeriodFinancialReport({
      members: rawMembers,
      groups: rawGroups,
      coaches,
      equipmentSales,
      bordereaux,
      billingConfigs,
      ledger,
      filter: periodBFilter,
      accountingBasis,
      poolBasis,
      recognitionMode,
      includeEquipmentMargin,
    });
  }, [
    rawMembers,
    rawGroups,
    coaches,
    equipmentSales,
    bordereaux,
    billingConfigs,
    ledger,
    periodBFilter,
    accountingBasis,
    poolBasis,
    recognitionMode,
    includeEquipmentMargin,
  ]);

  const comparison = useMemo(() => {
    return compareFinancialPeriods(reportA, reportB);
  }, [reportA, reportB]);

  const monthlySeries = useMemo(() => {
    return buildMonthlyFinancialSeries({
      monthKeys: seriesMonthKeys,
      members: rawMembers,
      groups: rawGroups,
      coaches,
      equipmentSales,
      bordereaux,
      billingConfigs,
      ledger,
      accountingBasis,
      poolBasis,
      recognitionMode,
    });
  }, [
    seriesMonthKeys,
    rawMembers,
    rawGroups,
    coaches,
    equipmentSales,
    bordereaux,
    billingConfigs,
    ledger,
    accountingBasis,
    poolBasis,
    recognitionMode,
  ]);

  // ─── 4b. FINANCIAL HEALTH AUDIT & DIAGNOSTICS ──────────────────────────────
  const healthScore = useMemo(() => computeFinancialHealthScore(reportA), [reportA]);
  const financialInsights = useMemo(() => generateFinancialInsights(reportA), [reportA]);
  const [showKnowledgeHub, setShowKnowledgeHub] = useState(false);
  const [expandedKnowledgeId, setExpandedKnowledgeId] = useState<string | null>(null);

  // ─── 5. EXPENSE & PAYROLL EDITOR STATES ──────────────────────────────────────
  const [newExpLabel, setNewExpLabel] = useState("");
  const [newExpCategory, setNewExpCategory] = useState<ExpenseCategory>("pool_extra");
  const [newExpAmount, setNewExpAmount] = useState("");
  const [newExpDate, setNewExpDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [newExpRecurring, setNewExpRecurring] = useState(false);
  const [newExpStatus, setNewExpStatus] = useState<"paid" | "pending">("paid");

  const handleAddCustomExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newExpAmount);
    if (!newExpLabel.trim() || isNaN(amount) || amount <= 0) return;
    const monthKey = newExpDate.slice(0, 7);
    const item: SwimCustomExpense = {
      id: `exp_${Date.now()}`,
      label: newExpLabel.trim(),
      category: newExpCategory,
      amountDA: Math.round(amount),
      date: newExpDate,
      monthKey,
      recurring: newExpRecurring,
      status: newExpStatus,
    };
    const updatedExpenses = [item, ...(ledger.customExpenses || [])];
    setNewExpLabel("");
    setNewExpAmount("");
    persistLedgerUpdate({ customExpenses: updatedExpenses }, "Charge enregistrée");
  };

  const handleDeleteCustomExpense = (id: string) => {
    const updatedExpenses = (ledger.customExpenses || []).filter((x) => x.id !== id);
    persistLedgerUpdate({ customExpenses: updatedExpenses }, "Charge supprimée");
  };

  const handleToggleExpenseStatus = (id: string) => {
    const updatedExpenses = (ledger.customExpenses || []).map((x) =>
      x.id === id ? { ...x, status: x.status === "paid" ? ("pending" as const) : ("paid" as const) } : x
    );
    persistLedgerUpdate({ customExpenses: updatedExpenses });
  };

  const handleUpdateCoachConfig = (
    coachKey: string,
    coachId: string,
    coachName: string,
    patch: Partial<CoachSalaryConfig>
  ) => {
    const existing: CoachSalaryConfig = ledger.coachSalaries?.[coachKey] || {
      coachId,
      coachName,
      mode: "auto_aqa",
      fixedMonthlyDA: 0,
      perGroupDA: 0,
      perSessionDA: 0,
      revenueSharePct: 0,
      bonusDA: 0,
      deductionDA: 0,
      isPaid: false,
    };
    const nextSalaries: Record<string, CoachSalaryConfig> = {
      ...(ledger.coachSalaries || {}),
      [coachKey]: {
        ...existing,
        ...patch,
      },
    };
    persistLedgerUpdate({ coachSalaries: nextSalaries });
  };

  const handleToggleGroupFifthWeek = (
    coachKey: string,
    coachId: string,
    coachName: string,
    groupId: string,
    currentValue: boolean
  ) => {
    const existing: CoachSalaryConfig = ledger.coachSalaries?.[coachKey] || {
      coachId,
      coachName,
      mode: "auto_aqa",
      fixedMonthlyDA: 0,
      perGroupDA: 0,
      perSessionDA: 0,
      revenueSharePct: 0,
      bonusDA: 0,
      deductionDA: 0,
      isPaid: false,
    };
    const nextOverrides = {
      ...(existing.fifthWeekOverrides || {}),
      [groupId]: !currentValue,
    };
    handleUpdateCoachConfig(coachKey, coachId, coachName, {
      fifthWeekOverrides: nextOverrides,
    });
  };

  const [expandedCoachKey, setExpandedCoachKey] = useState<string | null>(null);

  const handleApplyBulkCoachPreset = (
    patch: Partial<CoachSalaryConfig>,
    notice: string
  ) => {
    const nextSalaries: Record<string, CoachSalaryConfig> = {
      ...(ledger.coachSalaries || {}),
    };
    for (const c of reportA.coachRows) {
      const existing: CoachSalaryConfig = nextSalaries[c.coachKey] || {
        coachId: c.coachId,
        coachName: c.coachName,
        role: c.role,
        mode: c.mode,
        fixedMonthlyDA: 0,
        perGroupDA: 0,
        perSessionDA: 0,
        revenueSharePct: 0,
        bonusDA: c.bonusDA,
        deductionDA: c.deductionDA,
        isPaid: c.isPaid,
      };
      nextSalaries[c.coachKey] = {
        ...existing,
        ...patch,
      };
    }
    persistLedgerUpdate({ coachSalaries: nextSalaries }, notice);
  };

  // ─── 6. GOALS & WHAT-IF SIMULATOR STATES ─────────────────────────────────────
  const [goalsDraft, setGoalsDraft] = useState<SwimFinanceGoals>(
    DEFAULT_FINANCE_LEDGER_STATE.goals
  );
  const [simExtraSwimmers, setSimExtraSwimmers] = useState(15);
  const [simPriceChangePct, setSimPriceChangePct] = useState(0);
  const [simPoolChangePct, setSimPoolChangePct] = useState(0);
  const [simCoachChangePct, setSimCoachChangePct] = useState(0);
  const [simCollectionRatePct, setSimCollectionRatePct] = useState(90);

  const simulationResult = useMemo(() => {
    return runWhatIfSimulation(reportA, {
      extraSwimmers: simExtraSwimmers,
      priceChangePct: simPriceChangePct,
      poolCostChangePct: simPoolChangePct,
      coachSalaryChangePct: simCoachChangePct,
      targetCollectionRatePct: simCollectionRatePct,
    });
  }, [
    reportA,
    simExtraSwimmers,
    simPriceChangePct,
    simPoolChangePct,
    simCoachChangePct,
    simCollectionRatePct,
  ]);

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    persistLedgerUpdate({ goals: goalsDraft }, "Objectifs financiers enregistrés");
  };

  const handleSaveSnapshot = () => {
    const snap: SwimFinanceSnapshot = {
      id: `snap_${Date.now()}`,
      label: `${reportA.periodLabel} (${accountingBasis === "accrual" ? "Engagement" : "Trésorerie"})`,
      periodKey:
        periodAFilter.mode === "month"
          ? periodAFilter.monthKey || "2026-10"
          : periodAFilter.mode,
      createdAt: new Date().toISOString(),
      assignedClientsCount: reportA.assignedClientsCount,
      revenuePaidDA: reportA.revenuePaidDA,
      revenueStillToPayDA: reportA.revenueStillToPayDA,
      totalRevenueDA: reportA.totalRecognizedRevenueDA,
      poolExpenseDA: reportA.appliedPoolExpenseDA,
      coachSalaryDA: reportA.coachSalaryTotalDA,
      otherExpenseDA: reportA.otherExpensesTotalDA,
      totalExpensesDA: reportA.totalExpensesDA,
      netProfitDA: reportA.activeNetProfitDA,
      marginPct: reportA.activeNetMarginPct,
    };
    const nextSnaps = [snap, ...(ledger.snapshots || [])].slice(0, 24);
    persistLedgerUpdate({ snapshots: nextSnaps }, "Bilan de période archivé");
  };

  // ─── 7. SWIMMER LEDGER FILTER STATE ──────────────────────────────────────────
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerPoolFilter, setLedgerPoolFilter] = useState<"all" | "poolpaid" | "unpaid_pool">("all");
  const [ledgerPayFilter, setLedgerPayFilter] = useState<"all" | "paid" | "still_to_pay">("all");

  const filteredSwimmerRows = useMemo(() => {
    const q = ledgerSearch.toLowerCase().trim();
    return reportA.swimmerRows.filter((r) => {
      if (q) {
        const match =
          r.fullName.toLowerCase().includes(q) ||
          r.swimId.toLowerCase().includes(q) ||
          r.groupNames.some((g) => g.toLowerCase().includes(q)) ||
          r.coachNames.some((c) => c.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (ledgerPoolFilter === "poolpaid" && !r.isPoolPaid) return false;
      if (ledgerPoolFilter === "unpaid_pool" && r.isPoolPaid) return false;
      if (ledgerPayFilter === "paid" && r.stillToPayDA > 0) return false;
      if (ledgerPayFilter === "still_to_pay" && r.stillToPayDA === 0) return false;
      return true;
    });
  }, [reportA.swimmerRows, ledgerSearch, ledgerPoolFilter, ledgerPayFilter]);

  // Export CSV
  const handleExportFinanceCSV = () => {
    const headers = [
      "Swimmer ID",
      "Full Name",
      "Category",
      "Formula",
      "Duration",
      "Groups",
      "Coaches",
      "Recognized Revenue DA",
      "Paid DA",
      "Still To Pay DA",
      "PoolPaid Status",
      "Applied Pool Expense DA",
      "Net Contribution DA",
    ];
    const rows = reportA.swimmerRows.map((r) => [
      r.swimId,
      `"${r.fullName.replace(/"/g, '""')}"`,
      r.category,
      r.formula,
      r.duration,
      `"${r.groupNames.join(" + ")}"`,
      `"${r.coachNames.join(", ")}"`,
      r.recognizedRevenueDA,
      r.paidDA,
      r.stillToPayDA,
      r.isPoolPaid ? "POOLPAID" : "PENDING",
      r.appliedPoolExpenseDA,
      r.netContributionDA,
    ]);

    const summaryRows = [
      [],
      ["--- COMPTE DE RESULTAT SYNTHETIQUE ---", `"${reportA.periodLabel}"`],
      ["Assigned Clients Count", reportA.assignedClientsCount],
      ["Revenue Paid (DA)", reportA.revenuePaidDA],
      ["Revenue Still To Pay (DA)", reportA.revenueStillToPayDA],
      ["Equipment Net Margin (DA)", includeEquipmentMargin ? reportA.equipmentNetMarginDA : 0],
      ["Total Recognized Revenue (DA)", reportA.totalRecognizedRevenueDA],
      ["Pool Paid Expense (DA)", reportA.appliedPoolExpenseDA],
      ["Coaches Payroll (DA)", reportA.coachSalaryTotalDA],
      ["Other Expenses (DA)", reportA.otherExpensesTotalDA],
      ["Total Expenses (DA)", reportA.totalExpensesDA],
      ["Sector Net Profit (DA)", reportA.activeNetProfitDA],
      ["Net Margin (%)", `${reportA.activeNetMarginPct}%`],
    ];

    const csv =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((line) => line.join(",")),
        ...summaryRows.map((line) => line.join(",")),
      ].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute(
      "download",
      `aqa_swim_finance_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const expenseCategoryLabel = (cat: ExpenseCategory): string => {
    switch (cat) {
      case "pool_extra":
        return t("expCategoryPool");
      case "marketing":
        return t("expCategoryMarketing");
      case "equipment":
        return t("expCategoryEquipment");
      case "admin":
        return t("expCategoryAdmin");
      case "tax_bank":
        return t("expCategoryTax");
      default:
        return t("expCategoryOther");
    }
  };

  // ─── 8. SVG WATERFALL CHART DATA ─────────────────────────────────────────────
  const waterfallSteps = useMemo(() => {
    const paid = reportA.revenuePaidDA;
    const toPay = reportA.revenueStillToPayDA;
    const equip = includeEquipmentMargin ? reportA.equipmentNetMarginDA : 0;
    const grossRev = reportA.totalRecognizedRevenueDA;
    const poolExp = reportA.appliedPoolExpenseDA;
    const coachExp = reportA.coachSalaryTotalDA;
    const otherExp = reportA.otherExpensesTotalDA;
    const netProfit = reportA.activeNetProfitDA;

    return [
      {
        key: "paid",
        label: "Encaissé (Payé)",
        value: paid,
        color: "#10b981",
        badge: "Recette",
      },
      {
        key: "topay",
        label: "Reste à Payer",
        value: toPay,
        color: "#f59e0b",
        badge: "Créance",
      },
      ...(equip !== 0
        ? [
            {
              key: "equip",
              label: "Marge Équip.",
              value: equip,
              color: "#38bdf8",
              badge: "Boutique",
            },
          ]
        : []),
      {
        key: "gross",
        label: "Total Revenus",
        value: grossRev,
        color: "#0ea5e9",
        badge: "Total CA",
      },
      {
        key: "pool",
        label: "- Piscine (poolpaid)",
        value: -poolExp,
        color: "#f43f5e",
        badge: "Charge",
      },
      {
        key: "coach",
        label: "- Salaires Coaches",
        value: -coachExp,
        color: "#fb7185",
        badge: "Charge",
      },
      {
        key: "other",
        label: "- Autres Charges",
        value: -otherExp,
        color: "#a855f7",
        badge: "Frais",
      },
      {
        key: "net",
        label: "= Bénéfice Net",
        value: netProfit,
        color: netProfit >= 0 ? "#00f2ff" : "#ef4444",
        badge: "Résultat",
      },
    ];
  }, [reportA, includeEquipmentMargin]);

  // ─── 9. SVG DONUT CHART DATA ─────────────────────────────────────────────────
  const donutSegments = useMemo(() => {
    const items = [
      {
        label: "Piscine (poolpaid)",
        value: reportA.appliedPoolExpenseDA,
        color: "#0ea5e9",
      },
      {
        label: "Salaires Coaches",
        value: reportA.coachSalaryTotalDA,
        color: "#00f2ff",
      },
      {
        label: t("expCategoryPool"),
        value: reportA.otherExpensesByCategory.pool_extra || 0,
        color: "#6366f1",
      },
      {
        label: t("expCategoryMarketing"),
        value: reportA.otherExpensesByCategory.marketing || 0,
        color: "#f59e0b",
      },
      {
        label: t("expCategoryEquipment"),
        value: reportA.otherExpensesByCategory.equipment || 0,
        color: "#10b981",
      },
      {
        label: t("expCategoryAdmin"),
        value:
          (reportA.otherExpensesByCategory.admin || 0) +
          (reportA.otherExpensesByCategory.tax_bank || 0) +
          (reportA.otherExpensesByCategory.other || 0),
        color: "#ec4899",
      },
    ].filter((x) => x.value > 0);

    const total = items.reduce((s, x) => s + x.value, 0);
    let cumulativePct = 0;

    return items.map((item) => {
      const pct = total > 0 ? (item.value / total) * 100 : 0;
      const startPct = cumulativePct;
      cumulativePct += pct;
      return {
        ...item,
        pct: Math.round(pct * 10) / 10,
        startPct,
      };
    });
  }, [reportA, t]);

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* ─── TOP HEADER & GLOBAL CONTROLS ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-900 via-slate-900/95 to-sky-950/30 p-5 shadow-[0_0_25px_rgba(0,242,255,0.08)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,242,255,0.2)]">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">
                  {t("tabTitle")} · AQA Swim
                </h2>
                <p className="text-xs text-slate-400 max-w-3xl">{t("subtitle")}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {toastMsg && (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                {toastMsg}
              </span>
            )}
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              Imprimer Bilan A4
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSaveSnapshot} disabled={saving}>
              {t("saveSnapshotBtn")}
            </Button>
            <Button variant="primary" size="sm" onClick={handleExportFinanceCSV}>
              {t("exportCsvBtn")}
            </Button>
          </div>
        </div>

        {/* Dynamic Period & Accounting Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 pt-2 border-t border-white/10">
          {/* 1. Period Mode */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-2.5 space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Période Analysée ({reportA.periodLabel})
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={periodAFilter.mode}
                onChange={(e) =>
                  setPeriodAFilter((prev) => ({
                    ...prev,
                    mode: e.target.value as PeriodFilter["mode"],
                  }))
                }
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="all">{t("periodModeAll")}</option>
                <option value="month">{t("periodModeMonth")}</option>
                <option value="quarter">{t("periodModeQuarter")}</option>
                <option value="custom">{t("periodModeCustom")}</option>
              </select>

              {periodAFilter.mode === "month" && (
                <select
                  value={periodAFilter.monthKey}
                  onChange={(e) =>
                    setPeriodAFilter((prev) => ({ ...prev, monthKey: e.target.value }))
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/40 text-xs font-mono text-cyan-300 focus:outline-none"
                >
                  {availableMonthKeys.map((mk) => (
                    <option key={mk} value={mk}>
                      {mk}
                    </option>
                  ))}
                </select>
              )}

              {periodAFilter.mode === "quarter" && (
                <select
                  value={periodAFilter.quarterKey}
                  onChange={(e) =>
                    setPeriodAFilter((prev) => ({ ...prev, quarterKey: e.target.value }))
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/40 text-xs font-mono text-cyan-300 focus:outline-none"
                >
                  {AVAILABLE_QUARTERS.map((q) => (
                    <option key={q.key} value={q.key}>
                      {q.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {periodAFilter.mode === "custom" && (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <input
                  type="date"
                  value={periodAFilter.fromDate || ""}
                  onChange={(e) =>
                    setPeriodAFilter((prev) => ({ ...prev, fromDate: e.target.value }))
                  }
                  className="px-2 py-1 rounded bg-slate-900 border border-white/10 text-[11px] text-white font-mono"
                />
                <input
                  type="date"
                  value={periodAFilter.toDate || ""}
                  onChange={(e) =>
                    setPeriodAFilter((prev) => ({ ...prev, toDate: e.target.value }))
                  }
                  className="px-2 py-1 rounded bg-slate-900 border border-white/10 text-[11px] text-white font-mono"
                />
              </div>
            )}
          </div>

          {/* 2. Category Scope */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-2.5 space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Secteur / Catégorie
            </label>
            <select
              value={periodAFilter.category || "all"}
              onChange={(e) =>
                setPeriodAFilter((prev) => ({ ...prev, category: e.target.value }))
              }
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Toutes Catégories (Global Swim)</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
              <option value="enfants">Enfants (Kids)</option>
              <option value="apnea">AQA Apnée</option>
            </select>
          </div>

          {/* 3. Accounting Basis (Accrual: Paid + Still to Pay vs Cash: Paid Only) */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-2.5 space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("accountingBasisLabel")}
            </label>
            <select
              value={accountingBasis}
              onChange={(e) => {
                const val = e.target.value as AccountingBasis;
                setAccountingBasis(val);
                persistLedgerUpdate({ defaultAccountingBasis: val });
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="accrual">{t("basisAccrual")}</option>
              <option value="cash">{t("basisCash")}</option>
            </select>
          </div>

          {/* 4. Pool Expense Basis (Confirmed PoolPaid vs All Assigned) */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-2.5 space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("poolBasisLabel")}
            </label>
            <select
              value={poolBasis}
              onChange={(e) => {
                const val = e.target.value as PoolExpenseBasis;
                setPoolBasis(val);
                persistLedgerUpdate({ defaultPoolBasis: val });
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="poolpaid_only">{t("poolBasisConfirmed")}</option>
              <option value="all_assigned">{t("poolBasisAllAssigned")}</option>
            </select>
          </div>

          {/* 5. Contract Recognition & Equipment Toggle */}
          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t("recognitionLabel")}
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[10px] text-cyan-300">
                <input
                  type="checkbox"
                  checked={includeEquipmentMargin}
                  onChange={(e) => {
                    setIncludeEquipmentMargin(e.target.checked);
                    persistLedgerUpdate({ includeEquipmentMargin: e.target.checked });
                  }}
                  className="h-3 w-3 accent-cyan-400 rounded"
                />
                <span>+Boutique</span>
              </label>
            </div>
            <select
              value={recognitionMode}
              onChange={(e) => {
                const val = e.target.value as RevenueRecognitionMode;
                setRecognitionMode(val);
                persistLedgerUpdate({ defaultRecognitionMode: val });
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="full_contract">{t("recognitionFull")}</option>
              <option value="monthly_amortized">{t("recognitionAmortized")}</option>
            </select>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          {(
            [
              { id: "overview", label: t("subTabOverview") },
              { id: "comparison", label: t("subTabComparison") },
              {
                id: "expenses",
                label: `${t("subTabExpenses")} (${reportA.coachRows.length} Coaches · ${reportA.filteredCustomExpenses.length} Charges)`,
              },
              { id: "goals_sim", label: t("subTabGoalsSim") },
              {
                id: "ledger",
                label: `${t("subTabLedger")} (${reportA.assignedClientsCount})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subTab === tab.id
                  ? "bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.4)]"
                  : "bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── LIVE EQUATION BANNER (ALWAYS VISIBLE FOR CLARITY) ──────────────── */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
            {t("formulaBannerTitle")} · {reportA.periodLabel}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {reportA.assignedClientsCount} clients assignés ({reportA.fullyPaidClientsCount} réglés,{" "}
            {reportA.partialClientsCount} partiels, {reportA.unpaidClientsCount} non payés) ·{" "}
            {reportA.poolPaidClientsCount} poolpaid
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 items-center text-center font-mono">
          {/* Paid */}
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
            <div className="text-[10px] font-sans text-emerald-300/80">Payé (Encaissé)</div>
            <div className="text-sm font-black text-emerald-400">
              {formatDA(reportA.revenuePaidDA)}
            </div>
          </div>

          {/* + Still to Pay */}
          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30">
            <div className="text-[10px] font-sans text-amber-300/80">
              + Reste à Payer {accountingBasis === "cash" ? "(Exclu Trés.)" : ""}
            </div>
            <div className="text-sm font-black text-amber-400">
              +{formatDA(reportA.revenueStillToPayDA)}
            </div>
          </div>

          {/* = Gross Assigned Revenue */}
          <div className="p-2.5 rounded-xl bg-sky-950/50 border border-sky-500/40">
            <div className="text-[10px] font-sans text-sky-300/90">
              = Revenu Assigné {includeEquipmentMargin && reportA.equipmentNetMarginDA > 0 ? "(+Équip)" : ""}
            </div>
            <div className="text-sm font-black text-sky-300">
              {formatDA(reportA.totalRecognizedRevenueDA)}
            </div>
          </div>

          {/* - PoolPaid */}
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30">
            <div className="text-[10px] font-sans text-rose-300/80">
              - Piscine ({poolBasis === "poolpaid_only" ? "poolpaid" : "tous assignés"})
            </div>
            <div className="text-sm font-black text-rose-400">
              -{formatDA(reportA.appliedPoolExpenseDA)}
            </div>
          </div>

          {/* - Coach Salaries */}
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30">
            <div className="text-[10px] font-sans text-rose-300/80">- Salaires Coaches</div>
            <div className="text-sm font-black text-rose-400">
              -{formatDA(reportA.coachSalaryTotalDA)}
            </div>
          </div>

          {/* - Other Expenses */}
          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30">
            <div className="text-[10px] font-sans text-purple-300/80">- Autres Charges</div>
            <div className="text-sm font-black text-purple-300">
              -{formatDA(reportA.otherExpensesTotalDA)}
            </div>
          </div>

          {/* = Sector Net Profit */}
          <div
            className={`p-2.5 rounded-xl border shadow-[0_0_15px_rgba(0,242,255,0.15)] ${
              reportA.activeNetProfitDA >= 0
                ? "bg-cyan-950/60 border-cyan-400/60"
                : "bg-rose-950/70 border-rose-500/60"
            }`}
          >
            <div className="text-[10px] font-sans font-bold text-white">
              = {t("kpiNetProfit")}
            </div>
            <div
              className={`text-base font-black ${
                reportA.activeNetProfitDA >= 0 ? "text-[var(--accent)]" : "text-rose-400"
              }`}
            >
              {formatSignedDA(reportA.activeNetProfitDA)}
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          SUB-TAB 1: P&L OVERVIEW & VISUAL CHARTS
         ═════════════════════════════════════════════════════════════════════════ */}
      {subTab === "overview" && (
        <div className="space-y-6">
          {/* 8 Executive Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{t("kpiGrossRevenue")}</span>
                <Badge tone="info">{reportA.assignedClientsCount} Assignés</Badge>
              </div>
              <div className="text-xl font-black font-mono text-white">
                {formatDA(reportA.totalRecognizedRevenueDA)}
              </div>
              <div className="text-[11px] text-slate-400">
                Payé: <span className="text-emerald-400 font-mono">{formatDA(reportA.revenuePaidDA)}</span>{" "}
                · Reste:{" "}
                <span className="text-amber-400 font-mono">{formatDA(reportA.revenueStillToPayDA)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{t("kpiPoolExpense")}</span>
                <Badge tone="warning">{reportA.poolPaidClientsCount} poolpaid</Badge>
              </div>
              <div className="text-xl font-black font-mono text-rose-400">
                {formatDA(reportA.appliedPoolExpenseDA)}
              </div>
              <div className="text-[11px] text-slate-400">
                Confirmé poolpaid:{" "}
                <span className="font-mono text-slate-200">
                  {formatDA(reportA.poolPaidConfirmedDA)}
                </span>{" "}
                / Total proj.:{" "}
                <span className="font-mono text-slate-300">
                  {formatDA(reportA.poolProjectedAllAssignedDA)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Coaches + Autres Charges</span>
                <Badge tone="default">Ratio {reportA.expenseRatioPct}%</Badge>
              </div>
              <div className="text-xl font-black font-mono text-orange-400">
                {formatDA(reportA.coachSalaryTotalDA + reportA.otherExpensesTotalDA)}
              </div>
              <div className="text-[11px] text-slate-400">
                Coaches:{" "}
                <span className="font-mono text-slate-200">
                  {formatDA(reportA.coachSalaryTotalDA)}
                </span>{" "}
                · Autres:{" "}
                <span className="font-mono text-slate-200">
                  {formatDA(reportA.otherExpensesTotalDA)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-900 to-cyan-950/30 p-4 space-y-1 shadow-[0_0_20px_rgba(0,242,255,0.12)]">
              <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold">
                <span>{t("kpiNetProfit")}</span>
                <Badge tone={reportA.activeNetProfitDA >= 0 ? "success" : "danger"}>
                  Marge {reportA.activeNetMarginPct}%
                </Badge>
              </div>
              <div
                className={`text-xl font-black font-mono ${
                  reportA.activeNetProfitDA >= 0 ? "text-[var(--accent)]" : "text-rose-400"
                }`}
              >
                {formatSignedDA(reportA.activeNetProfitDA)}
              </div>
              <div className="text-[11px] text-slate-300">
                Engagement:{" "}
                <span className="font-mono text-cyan-300">
                  {formatDA(reportA.netProfitAccrualDA)}
                </span>{" "}
                · Trésorerie:{" "}
                <span className="font-mono text-emerald-300">
                  {formatDA(reportA.netProfitCashDA)}
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Accounting Ratio Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">{t("kpiCollectionRate")}</div>
                <div className="text-sm font-black font-mono text-emerald-400">
                  {reportA.collectionRatePct}%
                </div>
              </div>
              <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${Math.min(100, reportA.collectionRatePct)}%` }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">{t("kpiArpu")}</div>
                <div className="text-sm font-black font-mono text-sky-400">
                  {formatDA(reportA.arpuDA)}
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Net/Nageur: {formatDA(reportA.profitPerSwimmerDA)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">Marge Brute (Après Piscine & Coaches)</div>
                <div className="text-sm font-black font-mono text-cyan-300">
                  {formatDA(reportA.grossProfitDA)} ({reportA.grossMarginPct}%)
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">{t("kpiBreakEven")}</div>
                <div className="text-sm font-black font-mono text-white">
                  {reportA.breakEven.breakEvenSwimmersCount} nageurs
                </div>
              </div>
              <Badge
                tone={reportA.breakEven.safetyMarginSwimmers >= 0 ? "success" : "warning"}
              >
                {reportA.breakEven.safetyMarginSwimmers >= 0
                  ? `+${reportA.breakEven.safetyMarginSwimmers} au-dessus`
                  : `${reportA.breakEven.safetyMarginSwimmers} sous seuil`}
              </Badge>
            </div>
          </div>

          {/* ─── SECTION: AUDIT DE SANTÉ FINANCIÈRE & DIAGNOSTICS STRATÉGIQUES ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Health Score Card (5 cols on lg) */}
            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/90 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Score de Santé Financière</h3>
                  <p className="text-xs text-slate-400">
                    Audit automatique de solvabilité & rentabilité
                  </p>
                </div>
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl font-mono border ${
                    healthScore.grade === "A"
                      ? "border-emerald-500/50 bg-emerald-950/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      : healthScore.grade === "B"
                      ? "border-cyan-500/50 bg-cyan-950/60 text-cyan-300 shadow-[0_0_15px_rgba(0,242,255,0.3)]"
                      : healthScore.grade === "C"
                      ? "border-amber-500/50 bg-amber-950/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                      : "border-rose-500/50 bg-rose-950/60 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                  }`}
                >
                  {healthScore.grade}
                </div>
              </div>

              {/* Numerical Score & Status */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-3xl font-black text-white">{healthScore.score}</span>
                    <span className="text-sm text-slate-400">/ 100</span>
                  </div>
                  <Badge
                    tone={
                      healthScore.status === "excellent"
                        ? "success"
                        : healthScore.status === "healthy"
                        ? "info"
                        : healthScore.status === "warning"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {healthScore.statusLabel}
                  </Badge>
                </div>

                <div className="h-2.5 w-full rounded-full bg-slate-950 overflow-hidden border border-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      healthScore.score >= 85
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : healthScore.score >= 70
                        ? "bg-gradient-to-r from-sky-500 to-cyan-400"
                        : healthScore.score >= 50
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                        : "bg-gradient-to-r from-rose-500 to-red-400"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, healthScore.score))}%` }}
                  />
                </div>
              </div>

              {/* 4 Analytical Sub-Scores */}
              <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs">
                {Object.entries(healthScore.subScores).map(([key, item]) => {
                  const subPct = Math.min(100, Math.round((item.score / item.max) * 100));
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">{item.label}</span>
                        <span className="font-mono font-bold text-slate-200">
                          {item.score} / {item.max}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full transition-all"
                          style={{ width: `${subPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Knowledge Center Toggle Button */}
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowKnowledgeHub((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-cyan-500/30 text-xs text-cyan-300 font-semibold transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    <span>Hub de Compétences Comptables</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {showKnowledgeHub ? "Masquer ▲" : "Explorer (4 fiches) ▼"}
                  </span>
                </button>
              </div>
            </div>

            {/* Strategic Diagnostic & Insights (7 cols on lg) */}
            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-900/90 p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Diagnostics & Leviers Stratégiques</h3>
                  <p className="text-xs text-slate-400">
                    Recommandations calculées en direct sur les données de la période
                  </p>
                </div>
                <Badge tone="info">{financialInsights.length} Analyses</Badge>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {financialInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                      insight.type === "opportunity"
                        ? "bg-cyan-950/20 border-cyan-500/30 text-cyan-200"
                        : insight.type === "warning"
                        ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
                        : insight.type === "success"
                        ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                        : "bg-slate-950/50 border-white/10 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-white">
                        {insight.type === "opportunity" && (
                          <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        )}
                        {insight.type === "warning" && (
                          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {insight.type === "success" && (
                          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        )}
                        {insight.type === "info" && (
                          <svg className="w-4 h-4 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span>{insight.title}</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900/80 border border-white/10 text-slate-300">
                        {insight.type === "opportunity"
                          ? "Opportunité"
                          : insight.type === "warning"
                          ? "Vigilance"
                          : insight.type === "success"
                          ? "Performance"
                          : "Audit"}
                      </span>
                    </div>

                    <p className="text-slate-300 leading-relaxed">{insight.detail}</p>

                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-white/10 flex items-start gap-2">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 shrink-0 mt-0.5">
                        Levier :
                      </span>
                      <span className="text-[11px] text-slate-200">
                        {insight.actionableRecommendation}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── KNOWLEDGE HUB: COMPÉTENCES & CONCEPTS FINANCIERS ─── */}
          {showKnowledgeHub && (
            <Card className="border-cyan-500/30 bg-gradient-to-br from-slate-900/95 to-slate-950/95">
              <div className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Centre de Compétences Financières & Comptables (AQA Swim)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Maîtrisez les concepts comptables clés régissant la rentabilité et la gestion du club
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowKnowledgeHub(false)}
                  >
                    Fermer le Hub
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {FINANCIAL_KNOWLEDGE_PILLS.map((pill) => {
                    const isExpanded = expandedKnowledgeId === pill.id;
                    return (
                      <div
                        key={pill.id}
                        className="rounded-xl border border-white/10 bg-slate-950/70 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-cyan-300">{pill.title}</h4>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedKnowledgeId((prev) => (prev === pill.id ? null : pill.id))
                            }
                            className="text-[10px] text-slate-400 hover:text-white cursor-pointer px-2 py-0.5 rounded bg-slate-900 border border-white/10"
                          >
                            {isExpanded ? "Réduire" : "Détails"}
                          </button>
                        </div>

                        {/* Key Formula Box */}
                        <div className="px-3 py-2 rounded-lg bg-slate-900/90 border border-cyan-500/20 font-mono text-[11px] text-slate-200">
                          <span className="text-[10px] text-cyan-400 uppercase font-bold block mb-0.5">
                            Formule Comptable :
                          </span>
                          {pill.keyFormula}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {pill.concept}
                        </p>

                        <div className="pt-2 border-t border-white/5 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                            Application Pratique AQA Swim :
                          </span>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {pill.aqaApplication}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* CHARTS ROW 1: P&L WATERFALL + EXPENSE DONUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CHART 1: P&L Waterfall Chart (2 columns wide) */}
            <Card className="lg:col-span-2">
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{t("waterfallTitle")}</h3>
                    <p className="text-xs text-slate-400">
                      Décomposition visuelle du chiffre d&apos;affaires assigné jusqu&apos;au bénéfice net
                    </p>
                  </div>
                  <Badge tone="info">{reportA.periodLabel}</Badge>
                </div>

                {/* SVG Bar / Waterfall Visualization */}
                {(() => {
                  const maxAbs = Math.max(
                    10000,
                    ...waterfallSteps.map((s) => Math.abs(s.value))
                  );
                  return (
                    <div className="space-y-2.5 pt-2">
                      {waterfallSteps.map((step) => {
                        const widthPct = Math.min(
                          100,
                          Math.max(3, (Math.abs(step.value) / maxAbs) * 100)
                        );
                        return (
                          <div key={step.key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-sm"
                                  style={{ backgroundColor: step.color }}
                                />
                                <span className="font-semibold text-slate-200">{step.label}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                  {step.badge}
                                </span>
                              </div>
                              <span
                                className="font-mono font-bold"
                                style={{ color: step.color }}
                              >
                                {step.value >= 0
                                  ? formatDA(step.value)
                                  : `-${formatDA(Math.abs(step.value))}`}
                              </span>
                            </div>
                            <div className="h-3.5 w-full rounded-lg bg-slate-950/90 border border-white/5 overflow-hidden p-0.5">
                              <div
                                className="h-full rounded-md transition-all duration-500"
                                style={{
                                  width: `${widthPct}%`,
                                  backgroundColor: step.color,
                                  boxShadow: `0 0 10px ${step.color}55`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </Card>

            {/* CHART 2: Expense Structure Donut Chart */}
            <Card>
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">{t("donutChartTitle")}</h3>
                  <p className="text-xs text-slate-400">
                    Total des charges: <span className="font-mono text-rose-400 font-bold">{formatDA(reportA.totalExpensesDA)}</span>
                  </p>
                </div>

                {reportA.totalExpensesDA <= 0 ? (
                  <div className="h-48 flex items-center justify-center text-xs text-slate-400 text-center border border-dashed border-white/10 rounded-xl p-4">
                    Aucune dépense enregistrée sur cette période. Configurez les poolpaid, salaires coaches ou autres charges.
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
                        <circle
                          cx="21"
                          cy="21"
                          r="15.91549431"
                          fill="transparent"
                          stroke="rgba(255,255,255,0.06)"
                          strokeWidth="5"
                        />
                        {donutSegments.map((seg, idx) => (
                          <circle
                            key={idx}
                            cx="21"
                            cy="21"
                            r="15.91549431"
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth="5.2"
                            strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                            strokeDashoffset={-seg.startPct}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                        <span className="text-[10px] text-slate-400 uppercase">Charges</span>
                        <span className="text-xs font-black font-mono text-white">
                          {formatDA(reportA.totalExpensesDA)}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">
                          {reportA.expenseRatioPct}% du CA
                        </span>
                      </div>
                    </div>

                    <div className="w-full space-y-1.5">
                      {donutSegments.map((seg, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-white/5"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: seg.color }}
                            />
                            <span className="text-slate-300 truncate max-w-[130px]">
                              {seg.label}
                            </span>
                          </div>
                          <div className="font-mono text-right">
                            <span className="text-white font-semibold">
                              {formatDA(seg.value)}
                            </span>
                            <span className="text-slate-400 text-[10px] ml-1.5">
                              ({seg.pct}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* CHART 3: MULTI-MONTH EVOLUTION SVG BAR + LINE CHART */}
          <Card>
            <div className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">{t("trendChartTitle")}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-500/30 font-mono">
                      {showFutureProjections ? "Projections Incluses" : "Données Réelles Réalisées"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {showFutureProjections
                      ? "Mois réels réalisés + projection prévisionnelle des abonnements pluriannuels actifs"
                      : "Historique strict des mois réels clôturés ou en cours (aucun mois futur anticipé)"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {/* Mode Selector: Mois Réels vs Projections */}
                  <div className="flex items-center rounded-lg bg-slate-900 border border-white/10 p-0.5">
                    <button
                      type="button"
                      onClick={() => setShowFutureProjections(false)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        !showFutureProjections
                          ? "bg-sky-500 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Mois Réels ({availableMonthKeys.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFutureProjections(true)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        showFutureProjections
                          ? "bg-sky-500 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      + Projections Contrats
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" />
                      Revenus
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                      Dépenses
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      <span className="w-3 h-0.5 bg-[var(--accent)] inline-block" />
                      Bénéfice Net
                    </span>
                  </div>
                </div>
              </div>

              {(() => {
                const W = 760;
                const H = 220;
                const PAD_L = 68;
                const PAD_R = 24;
                const PAD_T = 20;
                const PAD_B = 34;
                const innerW = W - PAD_L - PAD_R;
                const innerH = H - PAD_T - PAD_B;

                const maxVal = Math.max(
                  50000,
                  ...monthlySeries.map((m) =>
                    Math.max(m.totalRevenueDA, m.totalExpensesDA, Math.abs(m.netProfitDA))
                  )
                );
                const yMax = Math.ceil(maxVal * 1.15);

                const colW = innerW / Math.max(1, monthlySeries.length);
                const yPos = (val: number) =>
                  PAD_T + innerH - (Math.max(0, val) / yMax) * innerH;

                const linePoints = monthlySeries
                  .map((m, idx) => {
                    const cx = PAD_L + idx * colW + colW / 2;
                    const cy = yPos(Math.max(0, m.netProfitDA));
                    return `${idx === 0 ? "M" : "L"}${cx.toFixed(1)},${cy.toFixed(1)}`;
                  })
                  .join(" ");

                const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(yMax * r));

                return (
                  <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 overflow-x-auto" dir="ltr">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto min-w-[540px]">
                      {yTicks.map((tv) => (
                        <g key={tv}>
                          <line
                            x1={PAD_L}
                            x2={W - PAD_R}
                            y1={yPos(tv)}
                            y2={yPos(tv)}
                            stroke="rgba(255,255,255,0.07)"
                            strokeWidth="1"
                          />
                          <text
                            x={PAD_L - 8}
                            y={yPos(tv) + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill="#64748b"
                            fontFamily="monospace"
                          >
                            {Math.round(tv / 1000)}k DA
                          </text>
                        </g>
                      ))}

                      {monthlySeries.map((m, idx) => {
                        const center = PAD_L + idx * colW + colW / 2;
                        const barWidth = Math.min(26, colW * 0.28);
                        const isFuture = m.monthKey > currentDefaultMonth;
                        const revH = (m.totalRevenueDA / yMax) * innerH;
                        const expH = (m.totalExpensesDA / yMax) * innerH;
                        return (
                          <g key={m.monthKey}>
                            {/* Revenue Bar */}
                            <rect
                              x={center - barWidth - 2}
                              y={PAD_T + innerH - revH}
                              width={barWidth}
                              height={Math.max(2, revH)}
                              rx="3"
                              fill="#0ea5e9"
                              opacity={isFuture ? "0.55" : "0.88"}
                              stroke={isFuture ? "rgba(14,165,233,0.8)" : "none"}
                              strokeDasharray={isFuture ? "2 2" : undefined}
                            />
                            {/* Expense Bar */}
                            <rect
                              x={center + 2}
                              y={PAD_T + innerH - expH}
                              width={barWidth}
                              height={Math.max(2, expH)}
                              rx="3"
                              fill="#f43f5e"
                              opacity={isFuture ? "0.5" : "0.85"}
                              stroke={isFuture ? "rgba(244,63,94,0.8)" : "none"}
                              strokeDasharray={isFuture ? "2 2" : undefined}
                            />
                            {/* Month Label */}
                            <text
                              x={center}
                              y={H - 10}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="600"
                              fill={isFuture ? "#f59e0b" : "#cbd5e1"}
                            >
                              {m.label}
                            </text>
                            {isFuture && (
                              <text
                                x={center}
                                y={PAD_T + 10}
                                textAnchor="middle"
                                fontSize="7"
                                fontFamily="monospace"
                                fill="#f59e0b"
                              >
                                PROJ
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Net Profit Line */}
                      <path
                        d={linePoints}
                        fill="none"
                        stroke="#00f2ff"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {monthlySeries.map((m, idx) => {
                        const cx = PAD_L + idx * colW + colW / 2;
                        const cy = yPos(Math.max(0, m.netProfitDA));
                        return (
                          <g key={`pt-${m.monthKey}`}>
                            <circle
                              cx={cx}
                              cy={cy}
                              r="4"
                              fill="#030712"
                              stroke="#00f2ff"
                              strokeWidth="2"
                            />
                            <text
                              x={cx}
                              y={Math.max(12, cy - 8)}
                              textAnchor="middle"
                              fontSize="8.5"
                              fontFamily="monospace"
                              fill="#00f2ff"
                            >
                              {Math.round(m.netProfitDA / 1000)}k
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}
            </div>
          </Card>

          {/* CHART 4: CATEGORY PROFITABILITY MATRIX */}
          <Card>
            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">{t("categoryMatrixTitle")}</h3>
                <p className="text-xs text-slate-400">
                  Rentabilité analytique par segment : clients assignés, encaissé vs reste à payer, frais piscine (poolpaid), quote-part coaches et marge brute
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Catégorie</th>
                      <th className="py-2.5 px-3 text-right">Clients Assignés</th>
                      <th className="py-2.5 px-3 text-right">Payé (Encaissé)</th>
                      <th className="py-2.5 px-3 text-right">Reste à Payer</th>
                      <th className="py-2.5 px-3 text-right">Total Revenu</th>
                      <th className="py-2.5 px-3 text-right">Frais Piscine</th>
                      <th className="py-2.5 px-3 text-right">Coaches (Alloué)</th>
                      <th className="py-2.5 px-3 text-right">Marge Brute</th>
                      <th className="py-2.5 px-3 text-right">Taux Marge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {reportA.categoryBreakdown.map((cat) => (
                      <tr key={cat.category} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-3 font-sans font-bold text-white capitalize">
                          {cat.category}
                          <span className="ml-2 text-[10px] font-mono text-cyan-400">
                            ({cat.poolPaidCount} poolpaid)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-200 font-bold">
                          {cat.assignedCount}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400">
                          {formatDA(cat.revenuePaidDA)}
                        </td>
                        <td className="py-3 px-3 text-right text-amber-400">
                          {formatDA(cat.revenueStillToPayDA)}
                        </td>
                        <td className="py-3 px-3 text-right text-sky-300 font-bold">
                          {formatDA(cat.totalRevenueDA)}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-400">
                          -{formatDA(cat.poolExpenseDA)}
                        </td>
                        <td className="py-3 px-3 text-right text-orange-400">
                          -{formatDA(cat.coachExpenseAllocatedDA)}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-bold ${
                            cat.grossMarginDA >= 0 ? "text-[var(--accent)]" : "text-rose-400"
                          }`}
                        >
                          {formatSignedDA(cat.grossMarginDA)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Badge tone={cat.grossMarginPct >= 40 ? "success" : cat.grossMarginPct >= 0 ? "info" : "danger"}>
                            {cat.grossMarginPct}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          SUB-TAB 2: MULTI-PERIOD COMPARISON ENGINE (PERIOD A VS PERIOD B)
         ═════════════════════════════════════════════════════════════════════════ */}
      {subTab === "comparison" && (
        <div className="space-y-6">
          <Card>
            <div className="p-5 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">{t("compareHeader")}</h3>
                  <p className="text-xs text-slate-400">
                    Comparez la rentabilité, l&apos;encaissement, les frais piscine et les charges entre deux périodes distinctes
                  </p>
                </div>

                {/* Period B Selector */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-white/10">
                  <span className="text-xs font-bold text-amber-300">
                    {t("comparePeriodB")} :
                  </span>
                  <select
                    value={periodBFilter.mode}
                    onChange={(e) =>
                      setPeriodBFilter((prev) => ({
                        ...prev,
                        mode: e.target.value as PeriodFilter["mode"],
                      }))
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white"
                  >
                    <option value="month">{t("periodModeMonth")}</option>
                    <option value="quarter">{t("periodModeQuarter")}</option>
                    <option value="all">{t("periodModeAll")}</option>
                    <option value="custom">{t("periodModeCustom")}</option>
                  </select>

                  {periodBFilter.mode === "month" && (
                    <select
                      value={periodBFilter.monthKey}
                      onChange={(e) =>
                        setPeriodBFilter((prev) => ({ ...prev, monthKey: e.target.value }))
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/40 text-xs font-mono text-amber-300"
                    >
                      {availableMonthKeys.map((mk) => (
                        <option key={mk} value={mk}>
                          {mk}
                        </option>
                      ))}
                    </select>
                  )}

                  {periodBFilter.mode === "quarter" && (
                    <select
                      value={periodBFilter.quarterKey}
                      onChange={(e) =>
                        setPeriodBFilter((prev) => ({ ...prev, quarterKey: e.target.value }))
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/40 text-xs font-mono text-amber-300"
                    >
                      {AVAILABLE_QUARTERS.map((q) => (
                        <option key={q.key} value={q.key}>
                          {q.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">{t("compareMetric")}</th>
                      <th className="py-3 px-4 text-right text-cyan-300">
                        {t("comparePeriodA")} ({reportA.periodLabel})
                      </th>
                      <th className="py-3 px-4 text-right text-amber-300">
                        {t("comparePeriodB")} ({reportB.periodLabel})
                      </th>
                      <th className="py-3 px-4 text-right">{t("compareDelta")}</th>
                      <th className="py-3 px-4 text-right">{t("compareGrowth")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    <tr>
                      <td className="py-3 px-4 font-sans font-semibold text-white">
                        Clients Assignés Actifs
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        {reportA.assignedClientsCount}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {reportB.assignedClientsCount}
                      </td>
                      <td className="py-3 px-4 text-right text-cyan-300">
                        {comparison.deltas.assignedClientsDelta >= 0
                          ? `+${comparison.deltas.assignedClientsDelta}`
                          : comparison.deltas.assignedClientsDelta}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge
                          tone={comparison.deltas.assignedClientsPct >= 0 ? "success" : "danger"}
                        >
                          {comparison.deltas.assignedClientsPct >= 0 ? "+" : ""}
                          {comparison.deltas.assignedClientsPct}%
                        </Badge>
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-4 font-sans font-semibold text-emerald-300">
                        Chiffre d&apos;Affaires Encaissé (Payé)
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {formatDA(reportA.revenuePaidDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {formatDA(reportB.revenuePaidDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-300">
                        {formatSignedDA(comparison.deltas.paidDeltaDA)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge tone={comparison.deltas.paidPct >= 0 ? "success" : "danger"}>
                          {comparison.deltas.paidPct >= 0 ? "+" : ""}
                          {comparison.deltas.paidPct}%
                        </Badge>
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-4 font-sans font-semibold text-amber-300">
                        Créances Clients (Reste à Payer)
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-400">
                        {formatDA(reportA.revenueStillToPayDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {formatDA(reportB.revenueStillToPayDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-300">
                        {formatSignedDA(comparison.deltas.stillToPayDeltaDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">-</td>
                    </tr>

                    <tr className="bg-sky-950/20">
                      <td className="py-3 px-4 font-sans font-bold text-sky-300">
                        Total Revenus Assignés (Payé + À Payer)
                      </td>
                      <td className="py-3 px-4 text-right font-black text-sky-300">
                        {formatDA(reportA.totalRecognizedRevenueDA)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-200">
                        {formatDA(reportB.totalRecognizedRevenueDA)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-sky-300">
                        {formatSignedDA(comparison.deltas.revenueDeltaDA)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge tone={comparison.deltas.revenuePct >= 0 ? "success" : "danger"}>
                          {comparison.deltas.revenuePct >= 0 ? "+" : ""}
                          {comparison.deltas.revenuePct}%
                        </Badge>
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-4 font-sans font-semibold text-rose-300">
                        Dépenses Piscine (poolpaid)
                      </td>
                      <td className="py-3 px-4 text-right text-rose-400">
                        -{formatDA(reportA.appliedPoolExpenseDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        -{formatDA(reportB.appliedPoolExpenseDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-300">
                        {formatSignedDA(comparison.deltas.poolExpenseDeltaDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">-</td>
                    </tr>

                    <tr>
                      <td className="py-3 px-4 font-sans font-semibold text-orange-300">
                        Salaires des Entraîneurs (Coaches)
                      </td>
                      <td className="py-3 px-4 text-right text-orange-400">
                        -{formatDA(reportA.coachSalaryTotalDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        -{formatDA(reportB.coachSalaryTotalDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-orange-300">
                        {formatSignedDA(comparison.deltas.coachSalaryDeltaDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">-</td>
                    </tr>

                    <tr>
                      <td className="py-3 px-4 font-sans font-semibold text-purple-300">
                        Autres Charges d&apos;Exploitation
                      </td>
                      <td className="py-3 px-4 text-right text-purple-300">
                        -{formatDA(reportA.otherExpensesTotalDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        -{formatDA(reportB.otherExpensesTotalDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-purple-300">
                        {formatSignedDA(comparison.deltas.otherExpenseDeltaDA)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">-</td>
                    </tr>

                    <tr className="bg-cyan-950/30 border-t-2 border-cyan-500/30">
                      <td className="py-3.5 px-4 font-sans font-black text-white">
                        BÉNÉFICE NET DU SECTEUR
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right text-sm font-black ${
                          reportA.activeNetProfitDA >= 0 ? "text-[var(--accent)]" : "text-rose-400"
                        }`}
                      >
                        {formatSignedDA(reportA.activeNetProfitDA)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-sm font-bold text-slate-200">
                        {formatSignedDA(reportB.activeNetProfitDA)}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right text-sm font-black ${
                          comparison.deltas.netProfitDeltaDA >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {formatSignedDA(comparison.deltas.netProfitDeltaDA)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Badge
                          tone={comparison.deltas.netProfitPct >= 0 ? "success" : "danger"}
                        >
                          {comparison.deltas.netProfitPct >= 0 ? "+" : ""}
                          {comparison.deltas.netProfitPct}%
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Saved Snapshots Archive */}
              {ledger.snapshots && ledger.snapshots.length > 0 && (
                <div className="pt-4 border-t border-white/10 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Bilans Archivés (Snapshots)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {ledger.snapshots.slice(0, 6).map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-slate-950/70 border border-white/10 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{s.label}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(s.createdAt).toLocaleDateString("fr-DZ")}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-300">
                          Revenu: {formatDA(s.totalRevenueDA)} · Charges: {formatDA(s.totalExpensesDA)}
                        </div>
                        <div className="text-xs font-mono font-bold text-cyan-300">
                          Net: {formatSignedDA(s.netProfitDA)} ({s.marginPct}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          SUB-TAB 3: COACHES PAYROLL & OTHER OPERATIONAL EXPENSES
         ═════════════════════════════════════════════════════════════════════════ */}
      {subTab === "expenses" && (
        <div className="space-y-6">
          {/* SECTION 1: COACHES PAYROLL MANAGER */}
          <Card>
            <div className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white">{t("coachesSectionTitle")}</h3>
                  <p className="text-xs text-slate-400">{t("coachesSectionDesc")}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-slate-400 block">Total Masse Salariale Coaches</span>
                  <span className="text-lg font-black text-orange-400">
                    {formatDA(reportA.coachSalaryTotalDA)}
                  </span>
                </div>
              </div>

              {/* Quick Bulk Coach Presets */}
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-950/80 border border-white/10">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Barèmes Rapides (Tous les Coaches) :
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyBulkCoachPreset(
                      { mode: "auto_aqa" },
                      "Barème Officiel AQA appliqué à tous les coaches"
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/50 text-xs font-mono font-bold text-cyan-300 cursor-pointer shadow-[0_0_10px_rgba(0,242,255,0.15)]"
                >
                  Barème Officiel AQA
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyBulkCoachPreset(
                      { mode: "per_group", perGroupDA: 10000 },
                      "Barème 10 000 DA / Groupe appliqué"
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-mono text-cyan-300 cursor-pointer"
                >
                  10 000 DA / Groupe
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyBulkCoachPreset(
                      { mode: "fixed_monthly", fixedMonthlyDA: 25000 },
                      "Forfait 25 000 DA / Mois appliqué"
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-mono text-emerald-300 cursor-pointer"
                >
                  25 000 DA / Mois Fixe
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyBulkCoachPreset(
                      { isPaid: true },
                      "Tous les salaires coaches marqués réglés"
                    )
                  }
                  className="ml-auto px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-500/40 text-xs font-bold text-emerald-300 cursor-pointer"
                >
                  Tout Marquer Réglé
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">{t("coachColName")}</th>
                      <th className="py-2.5 px-3">{t("coachColRole")}</th>
                      <th className="py-2.5 px-3">{t("coachColGroups")}</th>
                      <th className="py-2.5 px-3">{t("coachColMode")}</th>
                      <th className="py-2.5 px-3">{t("coachColBase")}</th>
                      <th className="py-2.5 px-3">Prime (DA)</th>
                      <th className="py-2.5 px-3">Retenue (DA)</th>
                      <th className="py-2.5 px-3 text-right">{t("coachColTotal")}</th>
                      <th className="py-2.5 px-3 text-right">{t("coachColStatus")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportA.coachRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-400">
                          Aucun coach actif détecté dans les groupes d&apos;entraînement.
                        </td>
                      </tr>
                    ) : (
                      reportA.coachRows.map((c) => {
                        const cfg = ledger.coachSalaries?.[c.coachKey];
                        const isExpanded = expandedCoachKey === c.coachKey;

                        return (
                          <React.Fragment key={c.coachKey}>
                            <tr className={`hover:bg-white/[0.02] transition-colors ${isExpanded ? "bg-cyan-950/20" : ""}`}>
                              {/* Coach Name & Expand Button */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-xs">{c.coachName}</span>
                                  {c.groupBreakdown.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedCoachKey((prev) => (prev === c.coachKey ? null : c.coachKey))
                                      }
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                                        isExpanded
                                          ? "bg-cyan-950 border-cyan-500/50 text-cyan-300"
                                          : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                                      }`}
                                      title={isExpanded ? "Masquer détail groupes" : "Voir détail groupes"}
                                    >
                                      {c.groupBreakdown.length} grp {isExpanded ? "▲" : "▼"}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Role: Head Coach vs Coach */}
                              <td className="py-3 px-3">
                                <select
                                  value={c.role}
                                  onChange={(e) =>
                                    handleUpdateCoachConfig(c.coachKey, c.coachId, c.coachName, {
                                      role: e.target.value as CoachRole,
                                    })
                                  }
                                  className={`px-2 py-1 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer border ${
                                    c.role === "head_coach"
                                      ? "bg-sky-950/90 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(0,242,255,0.15)]"
                                      : "bg-slate-900 text-slate-300 border-white/10"
                                  }`}
                                >
                                  <option value="head_coach">{t("roleHeadCoach")}</option>
                                  <option value="coach">{t("roleCoach")}</option>
                                </select>
                              </td>

                              {/* Active Groups & 5th Week Badge */}
                              <td className="py-3 px-3">
                                <div className="space-y-0.5 font-mono text-[11px]">
                                  <div className="text-slate-300">
                                    {c.activeGroupsCount} grp · {c.assignedSwimmersCount} nageurs
                                  </div>
                                  {c.fifthWeekBonusTotalDA > 0 && (
                                    <div className="text-[10px] text-emerald-400 font-semibold">
                                      5e sem: +{formatDA(c.fifthWeekBonusTotalDA)}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Mode: Auto AQA vs Manual vs Legacy */}
                              <td className="py-3 px-3">
                                <select
                                  value={c.mode}
                                  onChange={(e) =>
                                    handleUpdateCoachConfig(c.coachKey, c.coachId, c.coachName, {
                                      mode: e.target.value as CoachSalaryMode,
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                                >
                                  <option value="auto_aqa">{t("modeAutoAqa")}</option>
                                  <option value="manual">{t("modeManual")}</option>
                                  <option value="fixed_monthly">{t("modeFixed")}</option>
                                  <option value="per_group">{t("modePerGroup")}</option>
                                  <option value="per_session">{t("modePerSession")}</option>
                                  <option value="revenue_share">{t("modeRevShare")}</option>
                                </select>
                              </td>

                              {/* Base Rate (Auto display or editable input) */}
                              <td className="py-3 px-3">
                                {c.mode === "auto_aqa" ? (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 font-mono text-cyan-300 font-bold text-xs">
                                      <span>{formatDA(c.baseSalaryDA)}</span>
                                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-sans">
                                        Auto
                                      </span>
                                    </div>
                                    {c.fifthWeekBonusTotalDA > 0 && (
                                      <div className="text-[10px] font-mono text-emerald-400">
                                        +{formatDA(c.fifthWeekBonusTotalDA)} (5e sem)
                                      </div>
                                    )}
                                  </div>
                                ) : c.mode === "manual" ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={0}
                                      value={cfg?.manualBaseSalaryDA !== undefined ? cfg.manualBaseSalaryDA : c.baseSalaryDA}
                                      onChange={(e) =>
                                        handleUpdateCoachConfig(c.coachKey, c.coachId, c.coachName, {
                                          manualBaseSalaryDA: Math.max(0, Number(e.target.value) || 0),
                                        })
                                      }
                                      className="w-24 px-2 py-1 rounded-lg bg-slate-900 border border-cyan-500/40 text-cyan-200 font-mono text-xs focus:outline-none"
                                    />
                                    <span className="text-[10px] text-slate-400 font-mono">DA</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={0}
                                      value={
                                        c.mode === "fixed_monthly"
                                          ? cfg?.fixedMonthlyDA ?? 0
                                          : c.mode === "per_group"
                                          ? cfg?.perGroupDA ?? 0
                                          : c.mode === "per_session"
                                          ? cfg?.perSessionDA ?? 0
                                          : cfg?.revenueSharePct ?? 0
                                      }
                                      onChange={(e) => {
                                        const num = Math.max(0, Number(e.target.value) || 0);
                                        if (c.mode === "fixed_monthly") {
                                          handleUpdateCoachConfig(c.coachKey, c.coachId, c.coachName, {
                                            fixedMonthlyDA: num,
                                          });
                                        } else if (c.mode === "per_group") {
                                          handleUpdateCoachConfig(c.coachKey, c.coachId, c.coachName, {
                                            perGroupDA: num,
                                          });
                                        } else if (c.mode === "per_session") {
                                          handleUpdateCoachConfig(c.coachKey, c.coachId, c.coachName, {
                                            perSessionDA: num,
                                          });
                                        } else {
                                          handleUpdateCoachConfig(c.coachKey, c.coachId, c.coachName, {
                                            revenueSharePct: Math.min(100, num),
                                          });
                                        }
                                      }}
                                      className="w-24 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-white font-mono text-xs"
                                    />
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {c.mode === "revenue_share" ? "%" : "DA"}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Prime (Bonus) */}
                              <td className="py-3 px-3">
                                <input
                                  type="number"
                                  min={0}
                                  value={c.bonusDA}
                                  onChange={(e) =>
                                    handleUpdateCoachConfig(c.coachKey, c.coachId, c.coachName, {
                                      bonusDA: Math.max(0, Number(e.target.value) || 0),
                                    })
                                  }
                                  className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
                                />
                              </td>

                              {/* Retenue (Deduction) */}
                              <td className="py-3 px-3">
                                <input
                                  type="number"
                                  min={0}
                                  value={c.deductionDA}
                                  onChange={(e) =>
                                    handleUpdateCoachConfig(c.coachKey, c.coachId, c.coachName, {
                                      deductionDA: Math.max(0, Number(e.target.value) || 0),
                                    })
                                  }
                                  className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-rose-300 font-mono text-xs focus:outline-none focus:border-rose-500"
                                />
                              </td>

                              {/* Total Salary */}
                              <td className="py-3 px-3 text-right font-mono font-black text-sm text-orange-400">
                                {formatDA(c.totalSalaryDA)}
                              </td>

                              {/* Status Toggle */}
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateCoachConfig(c.coachKey, c.coachId, c.coachName, {
                                      isPaid: !c.isPaid,
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer border transition-all ${
                                    c.isPaid
                                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                      : "bg-amber-950/80 text-amber-300 border-amber-500/40"
                                  }`}
                                >
                                  {c.isPaid ? t("paidBadge") : t("pendingBadge")}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Breakdown Sub-Row */}
                            {isExpanded && (
                              <tr className="bg-slate-950/80 border-b border-cyan-500/20">
                                <td colSpan={9} className="p-4">
                                  <div className="rounded-xl border border-cyan-500/30 bg-slate-900/90 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                          {t("groupBreakdownTitle")} · {c.coachName} ({c.role === "head_coach" ? "Head Coach" : "Coach"})
                                        </h4>
                                      </div>
                                      <span className="text-[11px] font-mono text-cyan-300">
                                        Total Groupes: {formatDA(c.baseSalaryDA + c.fifthWeekBonusTotalDA)}
                                      </span>
                                    </div>

                                    {c.groupBreakdown.length === 0 ? (
                                      <div className="py-3 text-center text-xs text-slate-400">
                                        {t("groupBreakdownEmpty")}
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        {c.groupBreakdown.map((gb) => (
                                          <div
                                            key={gb.groupId}
                                            className="p-3 rounded-lg bg-slate-950/90 border border-white/5 space-y-2"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div>
                                                <div className="text-xs font-bold text-slate-200">
                                                  {gb.groupName}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                  {gb.schedule || "Horaire non spécifié"}
                                                </div>
                                              </div>
                                              <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                                  gb.groupType === "kids"
                                                    ? "bg-amber-950 text-amber-300 border border-amber-500/30"
                                                    : gb.groupType === "indiv"
                                                    ? "bg-purple-950 text-purple-300 border border-purple-500/30"
                                                    : "bg-sky-950 text-sky-300 border border-sky-500/30"
                                                }`}
                                              >
                                                {gb.groupTypeLabel} · {formatDA(gb.baseRateDA)}
                                              </span>
                                            </div>

                                            {/* 5th Week Toggle Button */}
                                            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] text-slate-400">
                                                  {t("fifthWeekBonus")}:
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleToggleGroupFifthWeek(
                                                      c.coachKey,
                                                      c.coachId,
                                                      c.coachName,
                                                      gb.groupId,
                                                      gb.hasFifthWeek
                                                    )
                                                  }
                                                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                                                    gb.hasFifthWeek
                                                      ? "bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                                      : "bg-slate-900 text-slate-400 border-white/10 hover:border-slate-500"
                                                  }`}
                                                >
                                                  {gb.hasFifthWeek
                                                    ? `5e Semaine Active (+${formatDA(gb.fifthWeekBonusDA)})`
                                                    : "4 Semaines (Normal)"}
                                                  {gb.isFifthWeekOverridden && " [Manuel]"}
                                                </button>
                                              </div>
                                              <span className="font-mono font-bold text-xs text-white">
                                                {formatDA(gb.totalGroupDA)}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* SECTION 2: OTHER OPERATIONAL EXPENSES LEDGER */}
          <Card>
            <div className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white">{t("otherExpensesTitle")}</h3>
                  <p className="text-xs text-slate-400">{t("otherExpensesDesc")}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-slate-400 block">Total Autres Charges</span>
                  <span className="text-lg font-black text-purple-400">
                    {formatDA(reportA.otherExpensesTotalDA)}
                  </span>
                </div>
              </div>

              {/* Add Expense Form */}
              <form
                onSubmit={handleAddCustomExpense}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 p-3.5 rounded-xl bg-slate-950/80 border border-white/10 items-end"
              >
                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Libellé de la Charge *
                  </label>
                  <Input
                    required
                    value={newExpLabel}
                    onChange={(e) => setNewExpLabel(e.target.value)}
                    placeholder={t("expLabelPlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Catégorie Comptable
                  </label>
                  <select
                    value={newExpCategory}
                    onChange={(e) => setNewExpCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                  >
                    <option value="pool_extra">{t("expCategoryPool")}</option>
                    <option value="marketing">{t("expCategoryMarketing")}</option>
                    <option value="equipment">{t("expCategoryEquipment")}</option>
                    <option value="admin">{t("expCategoryAdmin")}</option>
                    <option value="tax_bank">{t("expCategoryTax")}</option>
                    <option value="other">{t("expCategoryOther")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Montant (DA) *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    required
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    placeholder="ex: 15000"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Date & Récurrence
                  </label>
                  <div className="space-y-1">
                    <input
                      type="date"
                      value={newExpDate}
                      onChange={(e) => setNewExpDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white font-mono"
                    />
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newExpRecurring}
                        onChange={(e) => setNewExpRecurring(e.target.checked)}
                        className="h-3 w-3 accent-cyan-400 rounded"
                      />
                      <span>{t("expRecurring")}</span>
                    </label>
                  </div>
                </div>

                <div>
                  <Button type="submit" variant="primary" className="w-full">
                    {t("addExpenseBtn")}
                  </Button>
                </div>
              </form>

              {/* Expenses Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Date / Mois</th>
                      <th className="py-2.5 px-3">Libellé</th>
                      <th className="py-2.5 px-3">Catégorie</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Montant (DA)</th>
                      <th className="py-2.5 px-3 text-right">Statut</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportA.filteredCustomExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          Aucune autre charge enregistrée sur cette période.
                        </td>
                      </tr>
                    ) : (
                      reportA.filteredCustomExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-mono text-slate-300">{exp.date}</td>
                          <td className="py-2.5 px-3 font-semibold text-white">{exp.label}</td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {expenseCategoryLabel(exp.category)}
                          </td>
                          <td className="py-2.5 px-3">
                            {exp.recurring ? (
                              <Badge tone="info">Mensuel Récurrent</Badge>
                            ) : (
                              <Badge tone="default">Ponctuel</Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-300">
                            -{formatDA(exp.amountDA)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleExpenseStatus(exp.id)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase cursor-pointer border ${
                                exp.status === "paid"
                                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                                  : "bg-amber-950/80 text-amber-300 border-amber-500/40"
                              }`}
                            >
                              {exp.status === "paid" ? t("paidBadge") : t("pendingBadge")}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomExpense(exp.id)}
                              className="text-rose-400 hover:text-rose-300 text-xs font-semibold cursor-pointer"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          SUB-TAB 4: FINANCIAL GOALS, BREAK-EVEN & WHAT-IF SIMULATOR
         ═════════════════════════════════════════════════════════════════════════ */}
      {subTab === "goals_sim" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: FINANCIAL GOALS & PROGRESS GAUGES */}
            <Card>
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">{t("goalsTitle")}</h3>
                  <p className="text-xs text-slate-400">
                    Définissez vos cibles de rentabilité et suivez le taux d&apos;accomplissement en temps réel
                  </p>
                </div>

                {/* Progress Bars against Current Report */}
                <div className="space-y-3 pt-1">
                  {[
                    {
                      label: t("goalNetProfit"),
                      current: reportA.activeNetProfitDA,
                      target: goalsDraft.netProfitTargetDA,
                      fmt: (v: number) => formatDA(v),
                      color: "#00f2ff",
                    },
                    {
                      label: t("goalRevenue"),
                      current: reportA.totalRecognizedRevenueDA,
                      target: goalsDraft.revenueTargetDA,
                      fmt: (v: number) => formatDA(v),
                      color: "#0ea5e9",
                    },
                    {
                      label: t("goalSwimmers"),
                      current: reportA.assignedClientsCount,
                      target: goalsDraft.assignedClientsTarget,
                      fmt: (v: number) => `${v} nageurs`,
                      color: "#10b981",
                    },
                    {
                      label: t("goalCollection"),
                      current: reportA.collectionRatePct,
                      target: goalsDraft.collectionRateTargetPct,
                      fmt: (v: number) => `${v}%`,
                      color: "#f59e0b",
                    },
                  ].map((g) => {
                    const pct =
                      g.target > 0
                        ? Math.min(100, Math.max(0, Math.round((g.current / g.target) * 100)))
                        : 0;
                    return (
                      <div
                        key={g.label}
                        className="p-3 rounded-xl bg-slate-950/70 border border-white/10 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{g.label}</span>
                          <span className="font-mono text-white">
                            {g.fmt(g.current)}{" "}
                            {g.target > 0 ? (
                              <>
                                / <span className="text-slate-400">{g.fmt(g.target)}</span> ({pct}%)
                              </>
                            ) : (
                              <span className="text-slate-500 text-[11px] font-sans ml-1">
                                (Non défini)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: g.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Edit Goals Form */}
                <form onSubmit={handleSaveGoals} className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      {t("goalNetProfit")}
                    </label>
                    <Input
                      type="number"
                      value={goalsDraft.netProfitTargetDA}
                      onChange={(e) =>
                        setGoalsDraft((p) => ({
                          ...p,
                          netProfitTargetDA: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      {t("goalRevenue")}
                    </label>
                    <Input
                      type="number"
                      value={goalsDraft.revenueTargetDA}
                      onChange={(e) =>
                        setGoalsDraft((p) => ({
                          ...p,
                          revenueTargetDA: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      {t("goalSwimmers")}
                    </label>
                    <Input
                      type="number"
                      value={goalsDraft.assignedClientsTarget}
                      onChange={(e) =>
                        setGoalsDraft((p) => ({
                          ...p,
                          assignedClientsTarget: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      {t("goalCollection")}
                    </label>
                    <Input
                      type="number"
                      max={100}
                      value={goalsDraft.collectionRateTargetPct}
                      onChange={(e) =>
                        setGoalsDraft((p) => ({
                          ...p,
                          collectionRateTargetPct: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Button type="submit" variant="primary" className="w-full" disabled={saving}>
                      {t("saveGoalsBtn")}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>

            {/* RIGHT: DYNAMIC WHAT-IF SIMULATOR */}
            <Card>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">{t("simulatorTitle")}</h3>
                    <p className="text-xs text-slate-400">{t("simulatorDesc")}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSimExtraSwimmers(0);
                      setSimPriceChangePct(0);
                      setSimPoolChangePct(0);
                      setSimCoachChangePct(0);
                      setSimCollectionRatePct(Math.round(reportA.collectionRatePct || 85));
                    }}
                  >
                    {t("simResetBtn")}
                  </Button>
                </div>

                {/* Sliders */}
                <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-white/10">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{t("simExtraSwimmers")}</span>
                      <span className="font-mono font-bold text-cyan-400">
                        +{simExtraSwimmers} nageurs (Total: {simulationResult.projectedSwimmers})
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-30}
                      max={150}
                      value={simExtraSwimmers}
                      onChange={(e) => setSimExtraSwimmers(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{t("simPriceChange")}</span>
                      <span className="font-mono font-bold text-sky-400">
                        {simPriceChangePct >= 0 ? `+${simPriceChangePct}%` : `${simPriceChangePct}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-25}
                      max={35}
                      value={simPriceChangePct}
                      onChange={(e) => setSimPriceChangePct(Number(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{t("simPoolChange")}</span>
                      <span className="font-mono font-bold text-rose-400">
                        {simPoolChangePct >= 0 ? `+${simPoolChangePct}%` : `${simPoolChangePct}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-25}
                      max={35}
                      value={simPoolChangePct}
                      onChange={(e) => setSimPoolChangePct(Number(e.target.value))}
                      className="w-full accent-rose-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{t("simCoachChange")}</span>
                      <span className="font-mono font-bold text-orange-400">
                        {simCoachChangePct >= 0 ? `+${simCoachChangePct}%` : `${simCoachChangePct}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-25}
                      max={50}
                      value={simCoachChangePct}
                      onChange={(e) => setSimCoachChangePct(Number(e.target.value))}
                      className="w-full accent-orange-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{t("simCollectionRate")}</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {simCollectionRatePct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      value={simCollectionRatePct}
                      onChange={(e) => setSimCollectionRatePct(Number(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                  </div>
                </div>

                {/* Simulation Outputs */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-3 rounded-xl bg-slate-900 border border-white/10">
                    <span className="text-[10px] font-sans text-slate-400 block">
                      CA Simulé (Engagement)
                    </span>
                    <span className="text-sm font-black text-sky-300">
                      {formatDA(simulationResult.projectedRevenueDA)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-white/10">
                    <span className="text-[10px] font-sans text-slate-400 block">
                      Charges Simulées Totales
                    </span>
                    <span className="text-sm font-black text-rose-400">
                      -{formatDA(simulationResult.projectedTotalExpensesDA)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-cyan-950/50 border border-cyan-400/50">
                    <span className="text-[10px] font-sans text-cyan-200 block">
                      Bénéfice Net Simulé (Engagement)
                    </span>
                    <span className="text-base font-black text-[var(--accent)]">
                      {formatSignedDA(simulationResult.projectedNetProfitAccrualDA)}
                    </span>
                    <span className="text-[10px] text-emerald-300 block mt-0.5">
                      Écart: {formatSignedDA(simulationResult.netProfitDeltaAccrualDA)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-400/50">
                    <span className="text-[10px] font-sans text-emerald-200 block">
                      Trésorerie Nette Simulée ({simCollectionRatePct}%)
                    </span>
                    <span className="text-base font-black text-emerald-400">
                      {formatSignedDA(simulationResult.projectedNetProfitCashDA)}
                    </span>
                    <span className="text-[10px] text-emerald-300 block mt-0.5">
                      Marge: {simulationResult.projectedMarginPct}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Break-Even CVP Analysis Card */}
          <Card>
            <div className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">{t("breakEvenTitle")}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10">
                  <span className="text-[10px] font-sans text-slate-400 block">
                    Revenu Moyen / Nageur
                  </span>
                  <span className="text-sm font-bold text-white">
                    {formatDA(reportA.breakEven.avgRevenuePerSwimmerDA)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10">
                  <span className="text-[10px] font-sans text-slate-400 block">
                    Coût Variable Piscine / Nageur
                  </span>
                  <span className="text-sm font-bold text-rose-400">
                    -{formatDA(reportA.breakEven.avgVariablePoolCostPerSwimmerDA)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10">
                  <span className="text-[10px] font-sans text-slate-400 block">
                    Marge sur Coût Variable / Nageur
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatDA(reportA.breakEven.contributionMarginPerSwimmerDA)} (
                    {reportA.breakEven.contributionMarginRatioPct}%)
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10">
                  <span className="text-[10px] font-sans text-slate-400 block">
                    Charges Fixes (Coaches + Autres)
                  </span>
                  <span className="text-sm font-bold text-orange-400">
                    {formatDA(reportA.breakEven.fixedCostsDA)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                  <span className="text-[10px] font-sans text-cyan-300 block">
                    Point Mort (Seuil)
                  </span>
                  <span className="text-sm font-black text-cyan-300">
                    {reportA.breakEven.breakEvenSwimmersCount} nageurs ({formatDA(reportA.breakEven.breakEvenRevenueDA)})
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          SUB-TAB 5: SWIMMER FINANCIAL LEDGER (PER-CLIENT PROFITABILITY TABLE)
         ═════════════════════════════════════════════════════════════════════════ */}
      {subTab === "ledger" && (
        <Card>
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {t("subTabLedger")} ({filteredSwimmerRows.length} / {reportA.assignedClientsCount})
                </h3>
                <p className="text-xs text-slate-400">
                  Détail individuel de tous les clients assignés : tarif engagé, payé, reste à payer, statut poolpaid et contribution nette
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={ledgerPayFilter}
                  onChange={(e) =>
                    setLedgerPayFilter(e.target.value as "all" | "paid" | "still_to_pay")
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                >
                  <option value="all">Tous Paiements Clients</option>
                  <option value="paid">Soldés Uniquement</option>
                  <option value="still_to_pay">Avec Reste à Payer</option>
                </select>

                <select
                  value={ledgerPoolFilter}
                  onChange={(e) =>
                    setLedgerPoolFilter(e.target.value as "all" | "poolpaid" | "unpaid_pool")
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                >
                  <option value="all">Tous Statuts Piscine</option>
                  <option value="poolpaid">PoolPaid Confirmés</option>
                  <option value="unpaid_pool">Non PoolPaid</option>
                </select>

                <div className="w-56">
                  <Input
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Rechercher nom, ID, groupe, coach..."
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Client Assigné</th>
                    <th className="py-2.5 px-3">Groupe(s) & Coach</th>
                    <th className="py-2.5 px-3 text-right">Revenu Reconnu</th>
                    <th className="py-2.5 px-3 text-right">Encaissé (Payé)</th>
                    <th className="py-2.5 px-3 text-right">Reste à Payer</th>
                    <th className="py-2.5 px-3 text-center">Statut Piscine</th>
                    <th className="py-2.5 px-3 text-right">Coût Piscine</th>
                    <th className="py-2.5 px-3 text-right">Contribution Nette</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center font-sans text-slate-400">
                        Chargement des écritures comptables...
                      </td>
                    </tr>
                  ) : filteredSwimmerRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center font-sans text-slate-400">
                        Aucun client assigné ne correspond aux filtres sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    filteredSwimmerRows.map((row) => (
                      <tr key={row.memberId} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-cyan-400 font-bold">{row.swimId}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-bold text-white">{row.fullName}</div>
                          <div className="text-[10px] text-slate-400 capitalize flex items-center gap-1.5 flex-wrap">
                            <span>
                              {row.category} · {row.formula} ({row.duration})
                            </span>
                            {row.contractMonths > 1 && (
                              <span className="px-1.5 py-0.2 rounded bg-sky-950/70 text-sky-300 font-mono text-[9px] border border-sky-500/30">
                                {formatDA(row.monthlyRateDA)}/m · Total {formatDA(row.effectivePriceDA)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="text-slate-200 font-medium">
                            {row.groupNames.join(" + ") || "-"}
                          </div>
                          <div className="text-[10px] text-cyan-400">
                            {row.coachNames.join(", ") || "-"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-sky-300">
                          {formatDA(row.recognizedRevenueDA)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">
                          {formatDA(row.paidDA)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {row.stillToPayDA > 0 ? (
                            <span className="text-amber-400 font-semibold">
                              {formatDA(row.stillToPayDA)}
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-[10px]">
                              {t("settledBadge")}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          {row.isPoolPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">
                              poolpaid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">
                              non réglé
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-400">
                          -{formatDA(row.appliedPoolExpenseDA)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            row.netContributionDA >= 0 ? "text-[var(--accent)]" : "text-rose-400"
                          }`}
                        >
                          {formatSignedDA(row.netContributionDA)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* ─── OFFICIAL A4 PRINTABLE ACCOUNTING STATEMENT (VISIBLE ONLY ON PRINT) ── */}
      <div className="hidden print:block bg-white text-black p-6 space-y-5 font-sans">
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">
              AQA SPORTS ACADEMY · SECTEUR AQA SWIM
            </h1>
            <p className="text-xs font-semibold text-gray-700">
              BILAN COMPTABLE ANALYTIQUE &amp; COMPTE DE RÉSULTAT OFFICIEL
            </p>
          </div>
          <div className="text-right text-xs font-mono">
            <div>Période : {reportA.periodLabel}</div>
            <div>Date d&apos;édition : {new Date().toLocaleDateString("fr-DZ")}</div>
            <div>
              Base : {accountingBasis === "accrual" ? "Engagement (Payé + À Payer)" : "Trésorerie"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-xs border border-black p-3 font-mono">
          <div>
            <div className="text-[10px] uppercase text-gray-600">Clients Assignés</div>
            <div className="text-sm font-bold">{reportA.assignedClientsCount} nageurs</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-gray-600">Total Revenus (CA)</div>
            <div className="text-sm font-bold">{formatDA(reportA.totalRecognizedRevenueDA)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-gray-600">Total Charges</div>
            <div className="text-sm font-bold">-{formatDA(reportA.totalExpensesDA)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-gray-600">Bénéfice Net ({reportA.activeNetMarginPct}%)</div>
            <div className="text-sm font-black">{formatSignedDA(reportA.activeNetProfitDA)}</div>
          </div>
        </div>

        <table className="w-full text-xs border-collapse border border-black font-mono">
          <thead>
            <tr className="bg-gray-100 border-b border-black text-left font-sans">
              <th className="p-2 border-r border-black">Poste du Compte de Résultat</th>
              <th className="p-2 border-r border-black">Détail Analytique</th>
              <th className="p-2 text-right">Montant (DA)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="p-2 border-r border-black font-sans font-bold">1. Encaissements Clients (Payé)</td>
              <td className="p-2 border-r border-black font-sans">{reportA.fullyPaidClientsCount} soldés, {reportA.partialClientsCount} partiels</td>
              <td className="p-2 text-right">+{formatDA(reportA.revenuePaidDA)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2 border-r border-black font-sans font-bold">2. Créances Clients (Reste à Payer)</td>
              <td className="p-2 border-r border-black font-sans">{reportA.unpaidClientsCount} non payés + reliquats partiels</td>
              <td className="p-2 text-right">+{formatDA(reportA.revenueStillToPayDA)}</td>
            </tr>
            {includeEquipmentMargin && (
              <tr className="border-b border-gray-300">
                <td className="p-2 border-r border-black font-sans font-bold">3. Marge Nette Boutique Équipement</td>
                <td className="p-2 border-r border-black font-sans">Ventes: {formatDA(reportA.equipmentRevenueDA)} / Coût: {formatDA(reportA.equipmentCostDA)}</td>
                <td className="p-2 text-right">+{formatDA(reportA.equipmentNetMarginDA)}</td>
              </tr>
            )}
            <tr className="border-b border-black bg-gray-100 font-bold">
              <td className="p-2 border-r border-black font-sans">TOTAL PRODUITS D&apos;EXPLOITATION</td>
              <td className="p-2 border-r border-black font-sans">Recouvrement: {reportA.collectionRatePct}%</td>
              <td className="p-2 text-right">{formatDA(reportA.totalRecognizedRevenueDA)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2 border-r border-black font-sans font-bold">4. Redevances Piscine (poolpaid)</td>
              <td className="p-2 border-r border-black font-sans">{reportA.poolPaidClientsCount} adhérents poolpaid</td>
              <td className="p-2 text-right">-{formatDA(reportA.appliedPoolExpenseDA)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-2 border-r border-black font-sans font-bold">5. Masse Salariale Entraîneurs (Coaches)</td>
              <td className="p-2 border-r border-black font-sans">{reportA.coachRows.length} coaches actifs</td>
              <td className="p-2 text-right">-{formatDA(reportA.coachSalaryTotalDA)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black font-sans font-bold">6. Autres Charges Opérationnelles</td>
              <td className="p-2 border-r border-black font-sans">{reportA.filteredCustomExpenses.length} écritures de charges</td>
              <td className="p-2 text-right">-{formatDA(reportA.otherExpensesTotalDA)}</td>
            </tr>
            <tr className="bg-gray-200 font-black text-sm">
              <td className="p-2.5 border-r border-black font-sans">RÉSULTAT NET DU SECTEUR AQA SWIM</td>
              <td className="p-2.5 border-r border-black font-sans">Marge Nette: {reportA.activeNetMarginPct}% · Seuil: {reportA.breakEven.breakEvenSwimmersCount} nageurs</td>
              <td className="p-2.5 text-right">{formatSignedDA(reportA.activeNetProfitDA)}</td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-8 pt-6 text-xs">
          <div className="border border-black p-4 h-24">
            <div className="font-bold uppercase">Direction Financière AQA Sports</div>
            <div className="text-[10px] text-gray-600">Visa, Date &amp; Cachet</div>
          </div>
          <div className="border border-black p-4 h-24">
            <div className="font-bold uppercase">Direction Générale / Audit</div>
            <div className="text-[10px] text-gray-600">Approbation du Bilan</div>
          </div>
        </div>
      </div>
    </div>
  );
}
