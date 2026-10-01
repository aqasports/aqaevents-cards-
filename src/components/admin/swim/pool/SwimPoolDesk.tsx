"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "@/lib/i18n";
import {
  PoolCorrespondenceMode,
  PoolPricingConfig,
  PoolColumnConfig,
  PoolDispatchSnapshot,
  DEFAULT_POOL_PRICING,
  DEFAULT_PREVIEW_COLUMNS,
  DEFAULT_REAL_FINAL_COLUMNS,
  STORAGE_KEYS,
  buildPoolDispatchRows,
  computeSlotOccupancy,
  computeRealFinalPoolSummary,
  formatMonthLabel,
  exportPoolRowsToCSV,
  generatePoolDispatchMessage,
  PoolColumnKey,
  SwimMemberReference,
  SwimGroupReference,
} from "@/lib/swim-pool-dispatch";
import { PoolPricingModal } from "./PoolPricingModal";
import { PoolColumnConfigModal } from "./PoolColumnConfigModal";
import { PoolSnapshotDrawer } from "./PoolSnapshotDrawer";
import { PoolPrintTemplate } from "./PoolPrintTemplate";

interface SwimPoolDeskProps {
  members?: SwimMemberReference[];
  groups?: SwimGroupReference[];
}

export function SwimPoolDesk({
  members: propMembers,
  groups: propGroups,
}: SwimPoolDeskProps) {
  const { t, locale } = useTranslations("swimPool");

  // Mode: "preview" (Method 1) or "real_final" (Method 2: RealFinalPool)
  const [mode, setMode] = useState<PoolCorrespondenceMode>("real_final");

  // Members and groups data (fallback fetch if standalone)
  const [rawMembers, setRawMembers] = useState<SwimMemberReference[]>(propMembers || []);
  const [rawGroups, setRawGroups] = useState<SwimGroupReference[]>(propGroups || []);
  const [loadingData, setLoadingData] = useState(false);

  // Month navigation (current local date)
  const [targetDate, setTargetDate] = useState<Date>(() => new Date());

  // Pricing configuration
  const [pricingConfig, setPricingConfig] = useState<PoolPricingConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PRICING);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return DEFAULT_POOL_PRICING;
  });

  // Column configuration for Preview and RealFinalPool
  const [previewColumns, setPreviewColumns] = useState<PoolColumnConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.COLUMNS_PREVIEW);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return DEFAULT_PREVIEW_COLUMNS;
  });

  const [finalColumns, setFinalColumns] = useState<PoolColumnConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.COLUMNS_FINAL);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return DEFAULT_REAL_FINAL_COLUMNS;
  });

  // Active columns depending on current mode
  const activeColumns = mode === "preview" ? previewColumns : finalColumns;

  // Selected swimmer IDs (for inclusion in the report)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [busySlotFilter, setBusySlotFilter] = useState<"all" | "busy" | "normal">("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);

  // Modals & Drawers
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isSnapshotsDrawerOpen, setIsSnapshotsDrawerOpen] = useState(false);
  const [inlineEditSwimmerId, setInlineEditSwimmerId] = useState<string | null>(null);
  const [inlinePriceInput, setInlinePriceInput] = useState<string>("");

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Snapshots list
  const [snapshots, setSnapshots] = useState<PoolDispatchSnapshot[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Fetch if not supplied as props
  useEffect(() => {
    if (propMembers && propMembers.length > 0) {
      setRawMembers(propMembers);
    }
    if (propGroups && propGroups.length > 0) {
      setRawGroups(propGroups);
    }
    if (!propMembers || propMembers.length === 0) {
      setLoadingData(true);
      Promise.all([
        fetch("/api/admin/swim/members?includePayments=true").then((r) =>
          r.ok ? r.json() : []
        ),
        fetch("/api/admin/swim/groups").then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([mems, grps]) => {
          if (Array.isArray(mems)) setRawMembers(mems);
          if (Array.isArray(grps)) setRawGroups(grps);
        })
        .finally(() => setLoadingData(false));
    }
  }, [propMembers, propGroups]);

  // Current month label
  const monthLabel = useMemo(() => {
    return formatMonthLabel(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      locale
    );
  }, [targetDate, locale]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setTargetDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setTargetDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const handleCurrentMonth = () => {
    setTargetDate(new Date());
  };

  // Build rows from members
  const allRows = useMemo(() => {
    return buildPoolDispatchRows(
      rawMembers,
      rawGroups,
      pricingConfig,
      monthLabel
    );
  }, [rawMembers, rawGroups, pricingConfig, monthLabel]);

  // Initialize selection with all assigned members if selection is empty
  useEffect(() => {
    if (allRows.length > 0 && selectedIds.size === 0) {
      const assignedIds = new Set<string>();
      for (const r of allRows) {
        if (r.assignedGroupIds.length > 0) {
          assignedIds.add(r.swimId || r.memberId);
        }
      }
      setSelectedIds(assignedIds);
    }
  }, [allRows, selectedIds.size]);

  // Save pricing changes to state & localStorage
  const handleSavePricing = (newConfig: PoolPricingConfig) => {
    setPricingConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEYS.PRICING, JSON.stringify(newConfig));
      showToast(t("pricingModalTitle") + " - saved");
    } catch {
      // ignore
    }
  };

  // Change column visibility
  const handleToggleColumn = (key: PoolColumnKey, enabled: boolean) => {
    if (mode === "preview") {
      const updated = { ...previewColumns, [key]: enabled };
      setPreviewColumns(updated);
      try {
        localStorage.setItem(STORAGE_KEYS.COLUMNS_PREVIEW, JSON.stringify(updated));
      } catch {
        // ignore
      }
    } else {
      const updated = { ...finalColumns, [key]: enabled };
      setFinalColumns(updated);
      try {
        localStorage.setItem(STORAGE_KEYS.COLUMNS_FINAL, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  // Reset columns
  const handleResetColumns = () => {
    if (mode === "preview") {
      setPreviewColumns(DEFAULT_PREVIEW_COLUMNS);
      localStorage.removeItem(STORAGE_KEYS.COLUMNS_PREVIEW);
    } else {
      setFinalColumns(DEFAULT_REAL_FINAL_COLUMNS);
      localStorage.removeItem(STORAGE_KEYS.COLUMNS_FINAL);
    }
    showToast("Columns reset to default");
  };

  // Individual swimmer price override inline
  const handleSetIndividualPrice = (swimmerId: string, price: number) => {
    const updatedOverrides = {
      ...pricingConfig.individualOverrides,
      [swimmerId]: price,
    };
    const updatedConfig: PoolPricingConfig = {
      ...pricingConfig,
      individualOverrides: updatedOverrides,
    };
    handleSavePricing(updatedConfig);
    setInlineEditSwimmerId(null);
  };

  const handleClearIndividualPrice = (swimmerId: string) => {
    const updatedOverrides = { ...pricingConfig.individualOverrides };
    delete updatedOverrides[swimmerId];
    const updatedConfig: PoolPricingConfig = {
      ...pricingConfig,
      individualOverrides: updatedOverrides,
    };
    handleSavePricing(updatedConfig);
  };

  // Slot occupancy matrix for Method ONE
  const slotOccupancy = useMemo(() => {
    return computeSlotOccupancy(allRows);
  }, [allRows]);

  // Summary for RealFinalPool
  const realFinalSummary = useMemo(() => {
    return computeRealFinalPoolSummary(allRows, selectedIds);
  }, [allRows, selectedIds]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = r.fullName.toLowerCase().includes(q);
        const matchesId = r.swimId.toLowerCase().includes(q);
        const matchesGroup = r.assignedGroupNames.some((g) =>
          g.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesId && !matchesGroup) return false;
      }

      // Category filter
      if (categoryFilter !== "all") {
        if (r.category?.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      // Group filter
      if (groupFilter !== "all") {
        if (!r.assignedGroupIds.includes(groupFilter)) return false;
      }

      // Busy / Peak hours filter (Method 1)
      if (busySlotFilter === "busy" && !r.hasBusySlot) return false;
      if (busySlotFilter === "normal" && r.hasBusySlot) return false;

      // Day filter
      if (dayFilter !== "all") {
        const matchesDay = r.parsedSlots.some(
          (s) => s.day.toLowerCase() === dayFilter.toLowerCase()
        );
        if (!matchesDay) return false;
      }

      // Specific active slot filter
      if (activeSlotKey) {
        const matchesSlot = r.parsedSlots.some(
          (s) => `${s.day}_${s.time}` === activeSlotKey
        );
        if (!matchesSlot) return false;
      }

      return true;
    });
  }, [
    allRows,
    searchQuery,
    categoryFilter,
    groupFilter,
    busySlotFilter,
    dayFilter,
    activeSlotKey,
  ]);

  // Selection toggles
  const handleToggleSwimmer = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedIds);
    for (const r of filteredRows) {
      next.add(r.swimId || r.memberId);
    }
    setSelectedIds(next);
  };

  const handleDeselectAllFiltered = () => {
    const next = new Set(selectedIds);
    for (const r of filteredRows) {
      next.delete(r.swimId || r.memberId);
    }
    setSelectedIds(next);
  };

  const handleSelectPaidOnly = () => {
    const next = new Set<string>();
    for (const r of allRows) {
      if (r.paymentStatus === "paid") {
        next.add(r.swimId || r.memberId);
      }
    }
    setSelectedIds(next);
  };

  const handleSelectBusyOnly = () => {
    const next = new Set<string>();
    for (const r of allRows) {
      if (r.hasBusySlot) {
        next.add(r.swimId || r.memberId);
      }
    }
    setSelectedIds(next);
  };

  // Toggle all swimmers in a specific slot
  const handleToggleSlotSwimmers = (slot: { swimmerIds: string[] }, select: boolean) => {
    const next = new Set(selectedIds);
    for (const sid of slot.swimmerIds) {
      if (select) next.add(sid);
      else next.delete(sid);
    }
    setSelectedIds(next);
  };

  // Actions: CSV Export
  const handleExportCSV = () => {
    const csv = exportPoolRowsToCSV(
      allRows,
      activeColumns,
      monthLabel,
      true,
      selectedIds
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `AQA_Piscine_${mode.toUpperCase()}_${targetDate.getFullYear()}-${String(
      targetDate.getMonth() + 1
    ).padStart(2, "0")}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV export initiated");
  };

  // Actions: Copy WhatsApp Dispatch
  const handleCopyWhatsApp = () => {
    const busySlotsSummary = slotOccupancy
      .filter((s) => s.isPeak)
      .map((s) => ({ slot: `${s.day} ${s.time}`, count: s.swimmerCount }));

    const text = generatePoolDispatchMessage({
      mode,
      monthLabel,
      totalSwimmers: realFinalSummary.selectedCount,
      totalDueDA: mode === "real_final" ? realFinalSummary.totalDuePoolDA : undefined,
      busySlots: busySlotsSummary,
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(t("copiedToClipboard"));
      });
    }
  };

  // Actions: Print Bordereau
  const handlePrint = () => {
    window.print();
  };

  // Actions: Save Snapshot (Method 2)
  const handleSaveSnapshot = () => {
    const monthKey = `${targetDate.getFullYear()}-${String(
      targetDate.getMonth() + 1
    ).padStart(2, "0")}`;

    const newSnapshot: PoolDispatchSnapshot = {
      id: `snap_${Date.now()}`,
      mode,
      month: monthKey,
      monthLabel,
      createdAt: new Date().toISOString(),
      swimmerCount: realFinalSummary.selectedCount,
      totalPoolPriceDA: realFinalSummary.totalDuePoolDA,
      rows: allRows
        .filter((r) => selectedIds.has(r.swimId) || selectedIds.has(r.memberId))
        .map((r) => ({
          swimId: r.swimId,
          fullName: r.fullName,
          category: r.category,
          groupNames: r.assignedGroupNames.join(" + "),
          schedule: r.assignedSchedules.join(" | "),
          poolPriceDA: r.poolPriceDA,
        })),
    };

    const updated = [newSnapshot, ...snapshots.filter((s) => s.month !== monthKey)];
    setSnapshots(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(updated));
      showToast(t("snapshotSaved"));
    } catch {
      // ignore
    }
  };

  // Actions: Delete Snapshot
  const handleDeleteSnapshot = (id: string) => {
    const updated = snapshots.filter((s) => s.id !== id);
    setSnapshots(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(updated));
      showToast("Snapshot deleted");
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-sky-500/40 text-sky-200 text-xs shadow-2xl animate-in slide-in-from-bottom duration-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header & Mode Selector */}
      <div className="print:hidden space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-white tracking-wide">
                {t("tabTitle")}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                {t("badgeMethods")}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)]">
              {mode === "preview" ? t("previewDesc") : t("realFinalDesc")}
            </p>
          </div>

          {/* Month Selector Controls */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={t("prevMonth")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleCurrentMonth}
              className="px-3 py-1 rounded-lg text-xs font-bold text-slate-200 hover:text-cyan-300 font-mono tracking-wide"
            >
              {monthLabel}
            </button>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={t("nextMonth")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* The Two Correspondence Methods Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* METHOD ONE */}
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden ${
              mode === "preview"
                ? "bg-gradient-to-br from-sky-950/70 to-slate-900 border-sky-500 shadow-md shadow-sky-950/40"
                : "bg-[var(--surface)] hover:bg-slate-900/60 border-[var(--border)] text-slate-400"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                mode === "preview" ? "text-sky-300" : "text-slate-400"
              }`}>
                {t("modePreview")}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                Start of Month
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Preview client volume per hour & coordinate peak/busy hour lane allocations without price commitments.
            </p>
          </button>

          {/* METHOD TWO: RealFinalPool */}
          <button
            type="button"
            onClick={() => setMode("real_final")}
            className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden ${
              mode === "real_final"
                ? "bg-gradient-to-br from-teal-950/70 to-slate-900 border-teal-400 shadow-md shadow-teal-950/40"
                : "bg-[var(--surface)] hover:bg-slate-900/60 border-[var(--border)] text-slate-400"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                mode === "real_final" ? "text-teal-300" : "text-slate-400"
              }`}>
                {t("modeRealFinal")}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-950 text-teal-300 border border-teal-800/50 font-mono font-bold">
                RealFinalPool
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Official verified roster of clients who actually attended, with per-client pool fee and grand total paid to the pool.
            </p>
          </button>
        </div>

        {/* Toolbar & KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Swimmers in Club */}
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-[11px] text-[var(--muted)] uppercase font-semibold">
              {t("totalSwimmers")}
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {allRows.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {allRows.filter((r) => r.assignedGroupIds.length > 0).length} assigned to training groups
            </div>
          </div>

          {/* Card 2: Selected for Pool Dispatch */}
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-[11px] text-sky-400 uppercase font-semibold">
              {t("selectedSwimmers")}
            </div>
            <div className="text-2xl font-bold font-mono text-sky-300 mt-1">
              {realFinalSummary.selectedCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Included in {monthLabel} statement
            </div>
          </div>

          {/* Card 3: Base Rate Tool / Peak indicator */}
          {mode === "real_final" ? (
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-[var(--muted)] uppercase font-semibold">
                  {t("averageFee")}
                </div>
                <div className="text-xl font-bold font-mono text-slate-200 mt-1">
                  {realFinalSummary.averageFeePerSwimmerDA.toLocaleString("fr-DZ")} DA
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPricingModalOpen(true)}
                className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t("poolPriceTool")}</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-[11px] text-amber-400 uppercase font-semibold">
                {t("busyHoursAlert")}
              </div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                {slotOccupancy.filter((s) => s.isPeak).length} Peak Slots
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {allRows.filter((r) => r.hasBusySlot).length} swimmers in busy evening/weekend hours
              </div>
            </div>
          )}

          {/* Card 4: GRAND TOTAL TO PAY POOL (Mode 2) or Fast Preview Action (Mode 1) */}
          {mode === "real_final" ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/80 to-slate-900 border border-cyan-500/50 shadow-lg shadow-cyan-950/30 flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-cyan-300 uppercase font-bold tracking-wider">
                  {t("totalDueToPool")}
                </div>
                <div className="text-2xl font-extrabold font-mono text-white mt-1 tracking-tight">
                  {realFinalSummary.totalDuePoolDA.toLocaleString("fr-DZ")} DA
                </div>
              </div>
              <div className="text-[11px] text-cyan-200/70 mt-2 font-mono">
                {realFinalSummary.selectedCount} x avg {realFinalSummary.averageFeePerSwimmerDA} DA
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-sky-400 uppercase font-semibold">
                  Slots Distribution
                </div>
                <div className="text-xl font-bold font-mono text-slate-200 mt-1">
                  {slotOccupancy.length} Distinct Slots
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Click any slot below to filter or schedule clients
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Left tools: Price tool & Column tool */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPricingModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-sky-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t("poolPriceTool")}</span>
              <span className="text-[10px] font-mono text-cyan-300">
                ({pricingConfig.defaultPrice} DA)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsColumnsModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-teal-400">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
              <span>{t("columnsTool")}</span>
            </button>

            {mode === "real_final" && (
              <button
                type="button"
                onClick={handleSaveSnapshot}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-950/60 hover:bg-teal-900/80 text-teal-200 border border-teal-800/40 transition-colors flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>{t("saveSnapshot")}</span>
              </button>
            )}

            {mode === "real_final" && (
              <button
                type="button"
                onClick={() => setIsSnapshotsDrawerOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <span>{t("viewSnapshots")}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400">
                  {snapshots.length}
                </span>
              </button>
            )}
          </div>

          {/* Right tools: Export, Print, WhatsApp */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/40 transition-colors flex items-center gap-1.5"
              title="Copy formatted dispatch text"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{t("copyWhatsapp")}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-sky-400">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{t("exportCsv")}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white shadow-md shadow-sky-950 transition-all flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>{t("printBordereau")}</span>
            </button>
          </div>
        </div>

        {/* METHOD ONE SPECIFIC: Slot Occupancy Matrix & Peak Hours Planner */}
        {mode === "preview" && (
          <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{t("slotOccupancy")}</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    ({monthLabel})
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("busyHoursDesc")}
                </p>
              </div>

              {/* Slot Filter Pills */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setBusySlotFilter("all");
                    setActiveSlotKey(null);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    busySlotFilter === "all" && !activeSlotKey
                      ? "bg-sky-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t("filterSlotAll")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBusySlotFilter("busy");
                    setActiveSlotKey(null);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                    busySlotFilter === "busy"
                      ? "bg-amber-600 text-white"
                      : "text-amber-400 hover:text-amber-200"
                  }`}
                >
                  <span>{t("filterSlotBusy")}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBusySlotFilter("normal");
                    setActiveSlotKey(null);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    busySlotFilter === "normal"
                      ? "bg-slate-700 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t("filterSlotNormal")}
                </button>
              </div>
            </div>

            {/* Slots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {slotOccupancy
                .filter((s) => {
                  if (busySlotFilter === "busy") return s.isPeak;
                  if (busySlotFilter === "normal") return !s.isPeak;
                  return true;
                })
                .map((slot) => {
                  const isSelectedSlot = activeSlotKey === slot.key;
                  const allSelectedInSlot = slot.swimmerIds.every((id) =>
                    selectedIds.has(id)
                  );

                  return (
                    <div
                      key={slot.key}
                      className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                        isSelectedSlot
                          ? "bg-sky-950/80 border-sky-400 shadow-md"
                          : slot.isPeak
                          ? "bg-amber-950/20 border-amber-800/40 hover:border-amber-700/60"
                          : "bg-slate-900/60 border-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white">{slot.day}</div>
                          <div className="font-mono text-[11px] text-slate-300">
                            {slot.time}
                          </div>
                        </div>
                        {slot.isPeak && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800/50">
                            {t("peakBadge")}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="font-mono font-bold text-cyan-300">
                          {slot.swimmerCount} swimmers
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeSlotKey === slot.key) {
                              setActiveSlotKey(null);
                            } else {
                              setActiveSlotKey(slot.key);
                            }
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                            isSelectedSlot
                              ? "bg-sky-600 text-white font-bold"
                              : "text-slate-400 hover:text-white bg-slate-800"
                          }`}
                        >
                          {isSelectedSlot ? "Viewing" : "Filter"}
                        </button>
                      </div>

                      <div className="mt-1.5 flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleSlotSwimmers(slot, !allSelectedInSlot)}
                          className={`w-full py-1 rounded text-[10px] font-medium transition-colors ${
                            allSelectedInSlot
                              ? "bg-slate-800 text-slate-400 hover:bg-red-950 hover:text-red-300"
                              : "bg-sky-900/60 text-sky-200 hover:bg-sky-800"
                          }`}
                        >
                          {allSelectedInSlot ? t("deselectThisSlot") : t("selectThisSlot")}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Filter Toolbar for Table */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/70 border border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="w-56 sm:w-64">
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-sky-400"
            >
              <option value="all">All Categories</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
              <option value="enfants">Enfants</option>
              <option value="apnea">Apnée</option>
            </select>

            {/* Group filter */}
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-sky-400 max-w-[180px]"
            >
              <option value="all">All Groups</option>
              {rawGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            {/* Day filter */}
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-sky-400"
            >
              <option value="all">{t("filterDayAll")}</option>
              <option value="Samedi">Samedi</option>
              <option value="Dimanche">Dimanche</option>
              <option value="Lundi">Lundi</option>
              <option value="Mardi">Mardi</option>
              <option value="Mercredi">Mercredi</option>
              <option value="Jeudi">Jeudi</option>
              <option value="Vendredi">Vendredi</option>
            </select>

            {/* Clear active slot filter */}
            {activeSlotKey && (
              <button
                type="button"
                onClick={() => setActiveSlotKey(null)}
                className="px-2.5 py-1 rounded-lg text-xs bg-sky-950 text-sky-300 border border-sky-800/40 hover:bg-sky-900 transition-colors flex items-center gap-1"
              >
                <span>Slot: {activeSlotKey.replace("_", " ")}</span>
                <span className="font-bold">×</span>
              </button>
            )}
          </div>

          {/* Quick Selection Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              {t("selectAll")}
            </button>
            <button
              type="button"
              onClick={handleDeselectAllFiltered}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {t("deselectAll")}
            </button>
            {mode === "real_final" && (
              <button
                type="button"
                onClick={handleSelectPaidOnly}
                className="px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800/40 transition-colors"
              >
                {t("selectPaidOnly")}
              </button>
            )}
            {mode === "preview" && (
              <button
                type="button"
                onClick={handleSelectBusyOnly}
                className="px-2.5 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/40 transition-colors"
              >
                Busy Hours Only
              </button>
            )}
          </div>
        </div>

        {/* Main Swimmers Table */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-900/60 text-[var(--muted)] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredRows.length > 0 &&
                        filteredRows.every((r) =>
                          selectedIds.has(r.swimId || r.memberId)
                        )
                      }
                      onChange={(e) => {
                        if (e.target.checked) handleSelectAllFiltered();
                        else handleDeselectAllFiltered();
                      }}
                      className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 bg-slate-800 border-slate-700"
                    />
                  </th>
                  {activeColumns.number && (
                    <th className="py-3 px-3 w-12 text-center">{t("colNumber")}</th>
                  )}
                  {activeColumns.name && (
                    <th className="py-3 px-4">{t("colName")}</th>
                  )}
                  {activeColumns.swimId && (
                    <th className="py-3 px-3 font-mono">{t("colSwimId")}</th>
                  )}
                  {activeColumns.groups && (
                    <th className="py-3 px-4">{t("colGroups")}</th>
                  )}
                  {activeColumns.schedule && (
                    <th className="py-3 px-4">{t("colSchedule")}</th>
                  )}
                  {activeColumns.category && (
                    <th className="py-3 px-3">{t("colCategory")}</th>
                  )}
                  {activeColumns.poolPrice && (
                    <th className="py-3 px-4 text-right">{t("colPoolPrice")}</th>
                  )}
                  {activeColumns.currentMonth && (
                    <th className="py-3 px-3">{t("colCurrentMonth")}</th>
                  )}
                  {activeColumns.phone && (
                    <th className="py-3 px-3">{t("colPhone")}</th>
                  )}
                  {activeColumns.paymentStatus && (
                    <th className="py-3 px-3">{t("colPaymentStatus")}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-500">
                      {loadingData ? "Loading swimmers..." : t("noSwimmersFound")}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, idx) => {
                    const rowId = r.swimId || r.memberId;
                    const isSelected = selectedIds.has(rowId);
                    const isInlineEditing = inlineEditSwimmerId === rowId;

                    return (
                      <tr
                        key={rowId}
                        className={`transition-colors ${
                          isSelected
                            ? "hover:bg-slate-800/40 bg-slate-900/20"
                            : "opacity-40 hover:opacity-75 bg-slate-950/40"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSwimmer(rowId)}
                            className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 bg-slate-800 border-slate-700 cursor-pointer"
                          />
                        </td>

                        {/* Number # */}
                        {activeColumns.number && (
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                            {idx + 1}
                          </td>
                        )}

                        {/* Full Name */}
                        {activeColumns.name && (
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-white">
                              {r.fullName}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              <span>{r.level === "new_aqa" ? "New AQA" : "Old AQA"}</span>
                              {r.hasBusySlot && (
                                <span className="text-amber-400 font-medium">
                                  · Peak Hour
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Swimmer ID */}
                        {activeColumns.swimId && (
                          <td className="py-2.5 px-3 font-mono text-xs text-sky-400">
                            {r.swimId}
                          </td>
                        )}

                        {/* Assigned Group(s) */}
                        {activeColumns.groups && (
                          <td className="py-2.5 px-4">
                            {r.assignedGroupNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {r.assignedGroupNames.map((gname, gi) => (
                                  <span
                                    key={gi}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-200 border border-white/5"
                                  >
                                    {gname}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">
                                Unassigned
                              </span>
                            )}
                          </td>
                        )}

                        {/* Schedule */}
                        {activeColumns.schedule && (
                          <td className="py-2.5 px-4 text-xs text-slate-300">
                            {r.assignedSchedules.length > 0 ? (
                              r.assignedSchedules.join(" | ")
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                        )}

                        {/* Category */}
                        {activeColumns.category && (
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800/80 text-slate-300 border border-white/5">
                              {r.category}
                            </span>
                          </td>
                        )}

                        {/* Pool Price (DA) with inline edit tool */}
                        {activeColumns.poolPrice && (
                          <td className="py-2.5 px-4 text-right">
                            {isInlineEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  step="100"
                                  value={inlinePriceInput}
                                  onChange={(e) => setInlinePriceInput(e.target.value)}
                                  className="w-20 px-2 py-1 rounded bg-slate-950 border border-sky-400 text-xs font-mono text-white text-right focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetIndividualPrice(rowId, Number(inlinePriceInput) || 0)
                                  }
                                  className="p-1 rounded bg-sky-600 hover:bg-sky-500 text-white"
                                  title="Save price"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInlineEditSwimmerId(null)}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                                  title="Cancel"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2 group">
                                <span className="font-mono font-bold text-slate-200">
                                  {r.poolPriceDA.toLocaleString("fr-DZ")} DA
                                </span>
                                {r.hasPriceOverride && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800/40">
                                    Custom
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlinePriceInput(String(r.poolPriceDA));
                                    setInlineEditSwimmerId(rowId);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-opacity"
                                  title={t("editPrice")}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                  </svg>
                                </button>
                                {r.hasPriceOverride && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearIndividualPrice(rowId)}
                                    className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:underline"
                                    title="Reset to category rate"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        )}

                        {/* Current Month */}
                        {activeColumns.currentMonth && (
                          <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                            {monthLabel}
                          </td>
                        )}

                        {/* Phone */}
                        {activeColumns.phone && (
                          <td className="py-2.5 px-3 font-mono text-xs text-slate-400">
                            {r.phone}
                          </td>
                        )}

                        {/* Payment Status */}
                        {activeColumns.paymentStatus && (
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                r.paymentStatus === "paid"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                                  : r.paymentStatus === "partial"
                                  ? "bg-amber-950 text-amber-300 border border-amber-800/40"
                                  : "bg-red-950 text-red-300 border border-red-800/40"
                              }`}
                            >
                              {r.paymentStatus}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer with Grand Total */}
              {mode === "real_final" && (
                <tfoot>
                  <tr className="bg-slate-900 border-t-2 border-cyan-500/40 font-bold">
                    <td colSpan={3} className="py-3 px-4 text-xs text-slate-300">
                      Total Adhérents Retenus :{" "}
                      <span className="text-white font-mono font-bold">
                        {realFinalSummary.selectedCount} / {allRows.length}
                      </span>
                    </td>
                    <td
                      colSpan={
                        (activeColumns.groups ? 1 : 0) +
                        (activeColumns.schedule ? 1 : 0) +
                        (activeColumns.category ? 1 : 0) -
                        1
                      }
                      className="py-3 px-4 text-right text-xs uppercase text-cyan-300"
                    >
                      {t("totalPayable")} :
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-base text-cyan-300 font-extrabold">
                      {realFinalSummary.totalDuePoolDA.toLocaleString("fr-DZ")} DA
                    </td>
                    {activeColumns.currentMonth && <td className="py-3 px-3"></td>}
                    {activeColumns.phone && <td className="py-3 px-3"></td>}
                    {activeColumns.paymentStatus && <td className="py-3 px-3"></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Printable Bordereau View (Rendered only on print / PDF) */}
      <PoolPrintTemplate
        mode={mode}
        monthLabel={monthLabel}
        rows={allRows}
        selectedIds={selectedIds}
        columnConfig={activeColumns}
        totalSwimmersCount={realFinalSummary.selectedCount}
        totalDuePoolDA={realFinalSummary.totalDuePoolDA}
      />

      {/* Modals & Drawers */}
      <PoolPricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        pricingConfig={pricingConfig}
        onSavePricing={handleSavePricing}
        selectedCount={realFinalSummary.selectedCount}
      />

      <PoolColumnConfigModal
        isOpen={isColumnsModalOpen}
        onClose={() => setIsColumnsModalOpen(false)}
        columnConfig={activeColumns}
        onChangeColumn={handleToggleColumn}
        onResetDefault={handleResetColumns}
      />

      <PoolSnapshotDrawer
        isOpen={isSnapshotsDrawerOpen}
        onClose={() => setIsSnapshotsDrawerOpen(false)}
        snapshots={snapshots}
        onSelectSnapshot={(snapshot) => {
          showToast(`Loaded snapshot: ${snapshot.monthLabel}`);
        }}
        onDeleteSnapshot={handleDeleteSnapshot}
      />
    </div>
  );
}
