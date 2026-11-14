"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "@/lib/i18n";
import {
  DEFAULT_POOLS,
  FRENCH_MONTHS,
  PoolAuditEntry,
  PoolAuditResult,
  PoolBordereau,
  SwimGroupReference,
  SwimMemberReference,
  SwimmerBillingConfig,
  buildPoolPaymentAudit,
  exportPoolAuditToCSV,
  getCurrentFrenchMonth,
  getPoolAuditActiveMonths,
  normalizeMonth,
  summarizePoolPaymentAudit,
} from "@/lib/swim-pool-dispatch";

interface PoolPaymentAuditPanelProps {
  members: SwimMemberReference[];
  groups: SwimGroupReference[];
  bordereaux: PoolBordereau[];
  billingConfigs: Record<string, SwimmerBillingConfig>;
  legacyMonthOverrides?: Record<string, string>;
  onOpenBordereau: (bordereauId: string) => void;
  onAddMembersToBordereau: (
    bordereauId: string,
    memberIds: string[],
    month: string
  ) => void;
}

type AuditStatusFilter =
  | "all"
  | "paid_full"
  | "paid_sessions"
  | "unpaid_all"
  | "pending"
  | "not_covered"
  | "anomalies";

function isPriorityAnomaly(entry: PoolAuditEntry): boolean {
  return (
    entry.isDuplicate ||
    entry.isTagOnly ||
    (entry.clientPaymentStatus === "paid" &&
      entry.status !== "paid_full" &&
      entry.status !== "paid_sessions")
  );
}

function getSessionDetailLabel(entry: PoolAuditEntry): string {
  if (entry.hoursConsumed && entry.hoursConsumed > 0) {
    return `${entry.hoursConsumed}h`;
  }
  return `${entry.sessionsConsumed || 1}s`;
}

function formatFormulaLabel(entry: PoolAuditEntry): string {
  if (entry.billingMode === "session") {
    if (entry.hoursConsumed && entry.hoursConsumed > 0) {
      return `${entry.hoursConsumed}h (500 DA/h)`;
    }
    const count = entry.sessionsConsumed || 1;
    return `${count} ${count > 1 ? "séances" : "séance"}`;
  }
  if (entry.billingMode === "monthly") {
    return "Mensuel";
  }
  return "-";
}

function matchesGroupFilter(entry: PoolAuditEntry, selectedGroup: string): boolean {
  if (selectedGroup === "all") return true;
  return entry.groupLabel
    .split(" + ")
    .map((part) => part.trim())
    .includes(selectedGroup);
}

export function PoolPaymentAuditPanel({
  members,
  groups,
  bordereaux,
  billingConfigs,
  legacyMonthOverrides = {},
  onOpenBordereau,
  onAddMembersToBordereau,
}: PoolPaymentAuditPanelProps) {
  const { locale, t } = useTranslations("swimPool");

  const [viewMode, setViewMode] = useState<"month" | "matrix">("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getCurrentFrenchMonth()
  );
  const [selectedPoolId, setSelectedPoolId] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [expectedOnly, setExpectedOnly] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<AuditStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [customTargetBordereauId, setCustomTargetBordereauId] =
    useState<string>("");

  useEffect(() => {
    setSelectedMemberIds([]);
  }, [selectedMonth, selectedPoolId]);

  const activeMonths = useMemo(
    () => getPoolAuditActiveMonths(bordereaux, members),
    [bordereaux, members]
  );

  const auditByMonth = useMemo(() => {
    const map = new Map<string, PoolAuditResult>();
    const list = [...activeMonths];
    if (!list.some((m) => normalizeMonth(m) === normalizeMonth(selectedMonth))) {
      list.push(selectedMonth);
    }
    for (const m of list) {
      map.set(
        normalizeMonth(m),
        buildPoolPaymentAudit(members, groups, bordereaux, m, billingConfigs, {
          poolId: selectedPoolId,
          legacyMonthOverrides,
        })
      );
    }
    return map;
  }, [
    activeMonths,
    selectedMonth,
    members,
    groups,
    bordereaux,
    billingConfigs,
    selectedPoolId,
    legacyMonthOverrides,
  ]);

  const currentAudit = useMemo(() => {
    return (
      auditByMonth.get(normalizeMonth(selectedMonth)) ||
      buildPoolPaymentAudit(
        members,
        groups,
        bordereaux,
        selectedMonth,
        billingConfigs,
        { poolId: selectedPoolId, legacyMonthOverrides }
      )
    );
  }, [
    auditByMonth,
    selectedMonth,
    members,
    groups,
    bordereaux,
    billingConfigs,
    selectedPoolId,
    legacyMonthOverrides,
  ]);

  const summary = useMemo(
    () => summarizePoolPaymentAudit(currentAudit),
    [currentAudit]
  );

  const unpaidBordereaux = useMemo(
    () => bordereaux.filter((b) => b.paymentStatus !== "paid"),
    [bordereaux]
  );

  const targetBordereauId = useMemo(() => {
    if (unpaidBordereaux.some((b) => b.id === customTargetBordereauId)) {
      return customTargetBordereauId;
    }
    const targetNorm = normalizeMonth(selectedMonth);
    const poolMatches = (b: PoolBordereau) =>
      selectedPoolId === "all" || b.poolId === selectedPoolId;
    const matchMonthPool = unpaidBordereaux.find(
      (b) => normalizeMonth(b.month) === targetNorm && poolMatches(b)
    );
    if (matchMonthPool) return matchMonthPool.id;
    const matchMonth = unpaidBordereaux.find(
      (b) => normalizeMonth(b.month) === targetNorm
    );
    return matchMonth?.id || unpaidBordereaux[0]?.id || "";
  }, [unpaidBordereaux, customTargetBordereauId, selectedMonth, selectedPoolId]);

  const scopedEntries = useMemo(() => {
    const base = expectedOnly
      ? currentAudit.entries.filter(
          (e) => e.isAssigned || e.bordereaux.length > 0 || e.isTagOnly
        )
      : currentAudit.entries;

    return base.filter((e) => matchesGroupFilter(e, selectedGroup));
  }, [currentAudit.entries, expectedOnly, selectedGroup]);

  const filterCounts = useMemo(() => {
    let paidFull = 0;
    let paidSessions = 0;
    let pending = 0;
    let notCovered = 0;
    let anomalies = 0;
    for (const e of scopedEntries) {
      if (e.status === "paid_full") paidFull++;
      else if (e.status === "paid_sessions") paidSessions++;
      else if (e.status === "pending") pending++;
      else notCovered++;
      if (isPriorityAnomaly(e)) anomalies++;
    }
    return {
      all: scopedEntries.length,
      paid_full: paidFull,
      paid_sessions: paidSessions,
      unpaid_all: pending + notCovered,
      pending,
      not_covered: notCovered,
      anomalies,
    };
  }, [scopedEntries]);

  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      if (g.name) set.add(g.name);
    }
    for (const e of currentAudit.entries) {
      if (!e.groupLabel || e.groupLabel === "-") continue;
      for (const part of e.groupLabel.split(" + ")) {
        const clean = part.trim();
        if (clean) set.add(clean);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [groups, currentAudit.entries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = scopedEntries.filter((e) => {
      if (statusFilter === "paid_full" && e.status !== "paid_full") return false;
      if (statusFilter === "paid_sessions" && e.status !== "paid_sessions")
        return false;
      if (
        statusFilter === "unpaid_all" &&
        e.status !== "pending" &&
        e.status !== "not_covered"
      )
        return false;
      if (statusFilter === "pending" && e.status !== "pending") return false;
      if (statusFilter === "not_covered" && e.status !== "not_covered")
        return false;
      if (statusFilter === "anomalies" && !isPriorityAnomaly(e)) return false;

      if (q) {
        return (
          e.fullName.toLowerCase().includes(q) ||
          e.swimId.toLowerCase().includes(q) ||
          e.groupLabel.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const rank: Record<PoolAuditEntry["status"], number> = {
      not_covered: 0,
      pending: 1,
      paid_sessions: 2,
      paid_full: 3,
    };
    return [...list].sort((a, b) => {
      const rDiff = rank[a.status] - rank[b.status];
      if (rDiff !== 0) return rDiff;
      if (a.clientPaymentStatus === "paid" && b.clientPaymentStatus !== "paid")
        return -1;
      if (b.clientPaymentStatus === "paid" && a.clientPaymentStatus !== "paid")
        return 1;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [scopedEntries, statusFilter, searchQuery]);

  const uncoveredFilteredIds = useMemo(() => {
    return filteredEntries
      .filter((e) => e.status === "not_covered")
      .map((e) => e.memberId);
  }, [filteredEntries]);

  useEffect(() => {
    setSelectedMemberIds((prev) => {
      if (prev.length === 0) return prev;
      const valid = new Set(uncoveredFilteredIds);
      const next = prev.filter((id) => valid.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [uncoveredFilteredIds]);

  const matrixRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const baseEntries = currentAudit.entries.filter((e) => {
      if (expectedOnly) {
        const presentInAnyMonth = activeMonths.some((m) => {
          const audit = auditByMonth.get(normalizeMonth(m));
          const found = audit?.entries.find((x) => x.memberId === e.memberId);
          return Boolean(
            found &&
              (found.isAssigned || found.bordereaux.length > 0 || found.isTagOnly)
          );
        });
        if (!presentInAnyMonth) return false;
      }
      if (!matchesGroupFilter(e, selectedGroup)) return false;
      if (q) {
        return (
          e.fullName.toLowerCase().includes(q) ||
          e.swimId.toLowerCase().includes(q) ||
          e.groupLabel.toLowerCase().includes(q)
        );
      }
      return true;
    });
    return [...baseEntries].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [
    currentAudit.entries,
    expectedOnly,
    activeMonths,
    auditByMonth,
    selectedGroup,
    searchQuery,
  ]);

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleToggleFilterCard = (target: AuditStatusFilter) => {
    setViewMode("month");
    setStatusFilter((prev) => (prev === target ? "all" : target));
  };

  const handleExportAuditCSV = () => {
    const csv = exportPoolAuditToCSV(filteredEntries, selectedMonth);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeMonth = selectedMonth.replace(/[^a-zA-Z0-9_\-]/g, "_");
    link.download = `Audit_PoolPaid_${safeMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkAddToBordereau = () => {
    if (!targetBordereauId || selectedMemberIds.length === 0) return;
    onAddMembersToBordereau(targetBordereauId, selectedMemberIds, selectedMonth);
    setSelectedMemberIds([]);
  };

  const totalExpected = summary.expectedCount;
  const pct = (n: number) =>
    totalExpected > 0 ? Math.round((n / totalExpected) * 1000) / 10 : 0;
  const totalPaidWithCollective = summary.paidDA + summary.collectivePaidDA;

  const isRtl = locale === "ar";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="print:hidden space-y-5">
      {/* 1. Header & Global Audit Controls */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              {t("auditTitle")}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {t("auditSubtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  viewMode === "month"
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t("auditViewMonth")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("matrix")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  viewMode === "matrix"
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t("auditViewMatrix")}
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportAuditCSV}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs border border-white/10 transition-colors"
            >
              {t("auditExportCsvBtn")}
            </button>
          </div>
        </div>

        {/* Active Months Quick-Pills + Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-1.5">
            {activeMonths.map((m) => {
              const mAudit = auditByMonth.get(normalizeMonth(m));
              const mSum = mAudit ? summarizePoolPaymentAudit(mAudit) : null;
              const mPaid = mSum
                ? mSum.paidFullCount + mSum.paidSessionsCount
                : 0;
              const isSelected =
                normalizeMonth(m) === normalizeMonth(selectedMonth);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonth(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-sm"
                      : "bg-slate-950/70 text-slate-300 border-white/10 hover:border-cyan-500/30 hover:text-white"
                  }`}
                >
                  <span>{m}</span>
                  {mSum && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                        mSum.expectedCount > 0 && mPaid === mSum.expectedCount
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {mPaid}/{mSum.expectedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">
                {t("auditMonthLabel")} :
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {FRENCH_MONTHS.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={selectedPoolId}
              onChange={(e) => setSelectedPoolId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">
                {t("auditPoolAll")}
              </option>
              {DEFAULT_POOLS.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-slate-900 text-white"
                >
                  {p.name}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={expectedOnly}
                onChange={(e) => setExpectedOnly(e.target.checked)}
                className="rounded border-white/25 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <span>
                {expectedOnly ? t("auditScopeExpected") : t("auditScopeAll")}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 2. Coverage Progress Bar & 5 KPI Cards */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-300">
              {t("auditCoverageLabel")} ({selectedMonth})
            </span>
            <span className="font-mono font-black text-sm text-cyan-300">
              {summary.coveragePercent}% (
              {summary.paidFullCount + summary.paidSessionsCount}/
              {summary.expectedCount})
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-950 border border-white/10 overflow-hidden flex">
            {pct(summary.paidFullCount) > 0 && (
              <div
                style={{ width: `${pct(summary.paidFullCount)}%` }}
                className="h-full bg-emerald-500 transition-all duration-300"
                title={`${t("auditPaidFullCard")}: ${summary.paidFullCount}`}
              />
            )}
            {pct(summary.paidSessionsCount) > 0 && (
              <div
                style={{ width: `${pct(summary.paidSessionsCount)}%` }}
                className="h-full bg-sky-500 transition-all duration-300"
                title={`${t("auditPaidSessionsCard")}: ${summary.paidSessionsCount}`}
              />
            )}
            {pct(summary.pendingCount) > 0 && (
              <div
                style={{ width: `${pct(summary.pendingCount)}%` }}
                className="h-full bg-amber-500 transition-all duration-300"
                title={`${t("auditPendingCard")}: ${summary.pendingCount}`}
              />
            )}
            {pct(summary.notCoveredCount) > 0 && (
              <div
                style={{ width: `${pct(summary.notCoveredCount)}%` }}
                className="h-full bg-rose-500 transition-all duration-300"
                title={`${t("auditNotCoveredCard")}: ${summary.notCoveredCount}`}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => handleToggleFilterCard("paid_full")}
            className={`text-left p-3.5 rounded-xl bg-slate-950/70 border transition-all ${
              statusFilter === "paid_full"
                ? "border-emerald-400 ring-1 ring-emerald-400/50"
                : "border-emerald-500/20 hover:border-emerald-400/50"
            }`}
          >
            <span className="text-[11px] font-bold uppercase text-emerald-300 block">
              {t("auditPaidFullCard")}
            </span>
            <p className="text-2xl font-mono font-black text-white mt-1">
              {summary.paidFullCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleToggleFilterCard("paid_sessions")}
            className={`text-left p-3.5 rounded-xl bg-slate-950/70 border transition-all ${
              statusFilter === "paid_sessions"
                ? "border-sky-400 ring-1 ring-sky-400/50"
                : "border-sky-500/20 hover:border-sky-400/50"
            }`}
          >
            <span className="text-[11px] font-bold uppercase text-sky-300 block">
              {t("auditPaidSessionsCard")}
            </span>
            <p className="text-2xl font-mono font-black text-white mt-1">
              {summary.paidSessionsCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleToggleFilterCard("pending")}
            className={`text-left p-3.5 rounded-xl bg-slate-950/70 border transition-all ${
              statusFilter === "pending"
                ? "border-amber-400 ring-1 ring-amber-400/50"
                : "border-amber-500/20 hover:border-amber-400/50"
            }`}
          >
            <span className="text-[11px] font-bold uppercase text-amber-300 block">
              {t("auditPendingCard")}
            </span>
            <p className="text-2xl font-mono font-black text-white mt-1">
              {summary.pendingCount}
            </p>
            {summary.pendingDA > 0 && (
              <p className="text-[11px] font-mono text-amber-300/90 mt-0.5">
                {summary.pendingDA.toLocaleString("fr-DZ")} DA
              </p>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleToggleFilterCard("not_covered")}
            className={`text-left p-3.5 rounded-xl bg-slate-950/70 border transition-all ${
              statusFilter === "not_covered"
                ? "border-rose-400 ring-1 ring-rose-400/50"
                : "border-rose-500/20 hover:border-rose-400/50"
            }`}
          >
            <span className="text-[11px] font-bold uppercase text-rose-300 block">
              {t("auditNotCoveredCard")}
            </span>
            <p className="text-2xl font-mono font-black text-white mt-1">
              {summary.notCoveredCount}
            </p>
          </button>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-cyan-500/30">
            <span className="text-[11px] font-bold uppercase text-cyan-300 block">
              {t("auditTotalPaidDACard")}
            </span>
            <p className="text-2xl font-mono font-black text-cyan-300 mt-1">
              {totalPaidWithCollective.toLocaleString("fr-DZ")} DA
            </p>
            {summary.collectivePaidDA > 0 && (
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                {t("auditCollectiveIncluded").replace(
                  "{amount}",
                  summary.collectivePaidDA.toLocaleString("fr-DZ")
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Month Detail View */}
      {viewMode === "month" && (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-sm">
          {/* Filter Bar */}
          <div className="p-3.5 border-b border-[var(--border)] bg-slate-950/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["all", t("auditFilterAll").replace("{count}", String(filterCounts.all))],
                    [
                      "paid_full",
                      t("auditFilterPaidFull").replace("{count}", String(filterCounts.paid_full)),
                    ],
                    [
                      "paid_sessions",
                      t("auditFilterPaidSessions").replace(
                        "{count}",
                        String(filterCounts.paid_sessions)
                      ),
                    ],
                    [
                      "unpaid_all",
                      t("auditFilterUnpaidAll").replace(
                        "{count}",
                        String(filterCounts.unpaid_all)
                      ),
                    ],
                    [
                      "pending",
                      t("auditFilterPending").replace("{count}", String(filterCounts.pending)),
                    ],
                    [
                      "not_covered",
                      t("auditFilterNotCovered").replace(
                        "{count}",
                        String(filterCounts.not_covered)
                      ),
                    ],
                    [
                      "anomalies",
                      t("auditFilterAnomalies").replace("{count}", String(filterCounts.anomalies)),
                    ],
                  ] as Array<[AuditStatusFilter, string]>
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      statusFilter === key
                        ? "bg-cyan-500 text-slate-950 border-cyan-400"
                        : "bg-slate-900 text-slate-300 border-white/10 hover:border-cyan-500/30 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">
                    {t("auditGroupAll")}
                  </option>
                  {groupOptions.map((gName) => (
                    <option
                      key={gName}
                      value={gName}
                      className="bg-slate-900 text-white"
                    >
                      {gName}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Bulk Remediation Strip for Uncovered Swimmers */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {uncoveredFilteredIds.length > 0 && unpaidBordereaux.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMemberIds(uncoveredFilteredIds)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30 font-semibold transition-colors"
                  >
                    {t("auditSelectUncovered").replace(
                      "{count}",
                      String(uncoveredFilteredIds.length)
                    )}
                  </button>
                )}
                {selectedMemberIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMemberIds([])}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 font-semibold"
                  >
                    {t("auditClearSelection")}
                  </button>
                )}
              </div>

              {unpaidBordereaux.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400 font-semibold">
                    {t("auditTargetBordereau")}
                  </span>
                  <select
                    value={targetBordereauId}
                    onChange={(e) => setCustomTargetBordereauId(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/30 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {unpaidBordereaux.map((b) => (
                      <option
                        key={b.id}
                        value={b.id}
                        className="bg-slate-900 text-white"
                      >
                        {b.referenceNumber} - {b.title} ({b.month})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={selectedMemberIds.length === 0 || !targetBordereauId}
                    onClick={handleBulkAddToBordereau}
                    className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold transition-colors"
                  >
                    {t("auditAddSelectedBtn").replace(
                      "{count}",
                      String(selectedMemberIds.length)
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-amber-300/90">
                  {t("auditNoUnpaidBordereau")}
                </span>
              )}
            </div>
          </div>

          {/* Audit Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-[var(--border)] text-slate-400 font-bold uppercase text-[10px]">
                  <th className="p-2.5 w-8 text-center"></th>
                  <th className="p-3 w-10 text-center">N</th>
                  <th className="p-3">{t("auditColSwimmer")}</th>
                  <th className="p-3">{t("auditColGroup")}</th>
                  <th className="p-3">{t("auditColClientStatus")}</th>
                  <th className="p-3">{t("auditColPoolStatus")}</th>
                  <th className="p-3">{t("auditColFormula")}</th>
                  <th className="p-3 text-right">{t("auditColAmountDA")}</th>
                  <th className="p-3">{t("auditColBordereau")}</th>
                  <th className="p-3 text-center">{t("auditColAction")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-10 text-center text-slate-400 text-xs"
                    >
                      {t("auditEmptyResult")}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((e, idx) => {
                    const isUncovered = e.status === "not_covered";
                    const canSelect = isUncovered && unpaidBordereaux.length > 0;
                    const sessionDetail = getSessionDetailLabel(e);

                    return (
                      <tr
                        key={e.memberId}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="p-2.5 text-center">
                          {canSelect && (
                            <input
                              type="checkbox"
                              checked={selectedMemberIds.includes(e.memberId)}
                              onChange={() => toggleMemberSelection(e.memberId)}
                              className="rounded border-white/25 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                          )}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">{e.fullName}</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {e.swimId}
                          </div>
                        </td>
                        <td className="p-3 text-slate-300">{e.groupLabel}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              e.clientPaymentStatus === "paid"
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : e.clientPaymentStatus === "partial"
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            }`}
                          >
                            {e.clientPaymentStatus === "paid"
                              ? t("auditBadgeClientPaid")
                              : e.clientPaymentStatus === "partial"
                                ? t("auditBadgeClientPartial")
                                : t("auditBadgeClientUnpaid")}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {e.status === "paid_full" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                {t("auditStatusPaidFull")}
                              </span>
                            )}
                            {e.status === "paid_sessions" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                                {t("auditStatusPaidSessions").replace(
                                  "{detail}",
                                  sessionDetail
                                )}
                              </span>
                            )}
                            {e.status === "pending" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                {t("auditStatusPending").replace(
                                  "{detail}",
                                  e.billingMode === "session"
                                    ? sessionDetail
                                    : "Mensuel"
                                )}
                              </span>
                            )}
                            {e.status === "not_covered" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                {t("auditStatusNotCovered")}
                              </span>
                            )}

                            {e.isDuplicate && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/40">
                                {t("auditBadgeDuplicate").replace(
                                  "{count}",
                                  String(e.bordereaux.length)
                                )}
                              </span>
                            )}
                            {e.isTagOnly && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-amber-300 border border-amber-500/30">
                                {t("auditBadgeTagOnly")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-slate-300 font-medium">
                          {formatFormulaLabel(e)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          {e.paidDA > 0 ? (
                            <span className="text-emerald-300">
                              {e.paidDA.toLocaleString("fr-DZ")}
                            </span>
                          ) : e.pendingDA > 0 ? (
                            <span className="text-amber-300">
                              {e.pendingDA.toLocaleString("fr-DZ")}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-1">
                            {e.bordereaux.length === 0 ? (
                              <span className="text-slate-500">-</span>
                            ) : (
                              e.bordereaux.map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => onOpenBordereau(b.id)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                    b.paid
                                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:border-emerald-400"
                                      : "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:border-amber-400"
                                  }`}
                                  title={b.title}
                                >
                                  {b.referenceNumber}
                                </button>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {isUncovered && targetBordereauId ? (
                            <button
                              type="button"
                              onClick={() =>
                                onAddMembersToBordereau(
                                  targetBordereauId,
                                  [e.memberId],
                                  selectedMonth
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition-colors"
                            >
                              {t("auditQuickAddBtn")}
                            </button>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Multi-Month Matrix View */}
      {viewMode === "matrix" && (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-[var(--border)] bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {t("auditMatrixLegendFull")}
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                {t("auditMatrixLegendSessions")}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {t("auditMatrixLegendPending")}
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                {t("auditMatrixLegendMissing")}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">
                  {t("auditGroupAll")}
                </option>
                {groupOptions.map((gName) => (
                  <option
                    key={gName}
                    value={gName}
                    className="bg-slate-900 text-white"
                  >
                    {gName}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-[var(--border)] text-slate-400 font-bold uppercase text-[10px]">
                  <th className="p-3 w-10 text-center">N</th>
                  <th className="p-3 sticky left-0 bg-slate-950 z-10 min-w-[180px]">
                    {t("auditColSwimmer")}
                  </th>
                  <th className="p-3">{t("auditColGroup")}</th>
                  {activeMonths.map((m) => (
                    <th key={m} className="p-3 text-center whitespace-nowrap">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {matrixRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + activeMonths.length}
                      className="p-10 text-center text-slate-400 text-xs"
                    >
                      {t("auditEmptyResult")}
                    </td>
                  </tr>
                ) : (
                  matrixRows.map((row, idx) => (
                    <tr
                      key={row.memberId}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-3 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-3 sticky left-0 bg-[var(--surface)] z-10">
                        <div className="font-bold text-white">
                          {row.fullName}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {row.swimId}
                        </div>
                      </td>
                      <td className="p-3 text-slate-300">{row.groupLabel}</td>
                      {activeMonths.map((m) => {
                        const cellEntry = auditByMonth
                          .get(normalizeMonth(m))
                          ?.entries.find((e) => e.memberId === row.memberId);
                        const st = cellEntry?.status || "not_covered";

                        let badgeCls =
                          "bg-rose-500/15 text-rose-300 border-rose-500/30";
                        let cellText = "--";
                        if (st === "paid_full") {
                          badgeCls =
                            "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
                          cellText = t("auditMatrixLegendFull");
                        } else if (st === "paid_sessions" && cellEntry) {
                          badgeCls =
                            "bg-sky-500/20 text-sky-300 border-sky-500/40";
                          cellText = getSessionDetailLabel(cellEntry);
                        } else if (st === "pending") {
                          badgeCls =
                            "bg-amber-500/20 text-amber-300 border-amber-500/40";
                          cellText = t("auditMatrixLegendPending");
                        }

                        return (
                          <td key={m} className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMonth(m);
                                setViewMode("month");
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border hover:opacity-80 transition-opacity ${badgeCls}`}
                            >
                              {cellText}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
