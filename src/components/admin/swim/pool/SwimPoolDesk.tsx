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
  computeRealFinalPoolSummary,
  formatMonthLabel,
  exportPoolRowsToCSV,
  generatePoolDispatchMessage,
  PoolColumnKey,
  SwimMemberReference,
  SwimGroupReference,
  buildPoolSlotReservations,
  computeSlotReservationsSummary,
  exportSlotReservationsToCSV,
  generatePlaceReservationMessage,
  PoolDocumentMeta,
  DEFAULT_DOCUMENT_META,
  CustomPoolRow,
  exportOfficialCorrespondenceToCSV,
} from "@/lib/swim-pool-dispatch";
import { PoolPricingModal } from "./PoolPricingModal";
import { PoolColumnConfigModal } from "./PoolColumnConfigModal";
import { PoolSnapshotDrawer } from "./PoolSnapshotDrawer";
import { PoolPrintTemplate } from "./PoolPrintTemplate";
import { PoolCustomRowModal } from "./PoolCustomRowModal";

interface SwimPoolDeskProps {
  members?: SwimMemberReference[];
  groups?: SwimGroupReference[];
}

export function SwimPoolDesk({
  members: propMembers,
  groups: propGroups,
}: SwimPoolDeskProps) {
  const { t, locale } = useTranslations("swimPool");

  // Mode: "preview" (Method 1: Place Reservations, NO NAMES) or "real_final" (Method 2: RealFinalPool with names)
  const [mode, setMode] = useState<PoolCorrespondenceMode>("preview");

  // Display style for Method 2: "official_grid" (matching uploaded PDF Demande d'accès) or "detailed"
  const [displayStyle, setDisplayStyle] = useState<"official_grid" | "detailed">("official_grid");

  // Members and groups data (fallback fetch if standalone)
  const [rawMembers, setRawMembers] = useState<SwimMemberReference[]>(propMembers || []);
  const [rawGroups, setRawGroups] = useState<SwimGroupReference[]>(propGroups || []);
  const [loadingData, setLoadingData] = useState(false);

  // Month navigation (current local date)
  const [targetDate, setTargetDate] = useState<Date>(() => new Date());

  // Document metadata for official correspondence (Demande d'accès, n:0031/26, 10/07/2026, 2026)
  const [docMeta, setDocMeta] = useState<PoolDocumentMeta>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.DOCUMENT_META);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return DEFAULT_DOCUMENT_META;
  });

  // Custom collective rows (e.g. AQA KIDS with custom fee, as shown in official correspondence)
  const [customRows, setCustomRows] = useState<CustomPoolRow[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_ROWS);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [
      {
        id: "cust_aqa_kids_default",
        fullName: "AQA KIDS",
        groupOrNote: "Section Enfants",
        poolPriceDA: 80500,
        month: "Juillet",
      },
    ];
  });

  // Modal for adding custom rows
  const [isAddCustomRowModalOpen, setIsAddCustomRowModalOpen] = useState(false);

  // Method 1: Peak overrides per slot (resId -> boolean). Fully editable by user.
  const [peakOverrides, setPeakOverrides] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PEAK_OVERRIDES);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  // Per-row month overrides (memberId/swimId -> month string, e.g. JUIN vs Juillet)
  const [monthOverrides, setMonthOverrides] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ROW_MONTH_OVERRIDES);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  // Inline editing state for row month
  const [editingMonthRowId, setEditingMonthRowId] = useState<string | null>(null);

  // Pricing configuration for Method 2
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

  // Method 1: Place count overrides per slot reservation (resId -> custom place count)
  const [placeOverrides, setPlaceOverrides] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.RESERVATION_OVERRIDES);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  // Selected reservation IDs for Method 1
  const [selectedReservationIds, setSelectedReservationIds] = useState<Set<string>>(new Set());

  // Selected swimmer IDs for Method 2
  const [selectedSwimmerIds, setSelectedSwimmerIds] = useState<Set<string>>(new Set());

  // Column configuration for RealFinalPool
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

  const activeColumns = mode === "preview" ? previewColumns : finalColumns;

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [busySlotFilter, setBusySlotFilter] = useState<"all" | "busy" | "normal">("all");

  // Modals & Drawers
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isSnapshotsDrawerOpen, setIsSnapshotsDrawerOpen] = useState(false);
  const [inlineEditSwimmerId, setInlineEditSwimmerId] = useState<string | null>(null);
  const [inlinePriceInput, setInlinePriceInput] = useState<string>("");

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Snapshots list for RealFinalPool
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

  // Document metadata handler
  const handleUpdateDocMeta = (key: keyof PoolDocumentMeta, value: string) => {
    const updated = { ...docMeta, [key]: value };
    setDocMeta(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.DOCUMENT_META, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Custom collective row handlers
  const handleAddCustomRow = (row: {
    fullName: string;
    groupOrNote: string;
    poolPriceDA: number;
    month: string;
  }) => {
    const newRow: CustomPoolRow = {
      id: `cust_${Date.now()}`,
      fullName: row.fullName,
      groupOrNote: row.groupOrNote,
      poolPriceDA: row.poolPriceDA,
      month: row.month,
    };
    const updated = [...customRows, newRow];
    setCustomRows(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ROWS, JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast(`Ligne ajoutee: ${newRow.fullName}`);
  };

  const handleDeleteCustomRow = (rowId: string) => {
    const updated = customRows.filter((c) => c.id !== rowId);
    setCustomRows(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ROWS, JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast("Ligne supprimee");
  };

  // Peak override toggle handlers
  const handleToggleSlotPeak = (slotId: string, currentVal: boolean) => {
    const updated = { ...peakOverrides, [slotId]: !currentVal };
    setPeakOverrides(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.PEAK_OVERRIDES, JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast(!currentVal ? "Creneau marque comme Heure de Pointe" : "Creneau marque comme Horaire Normal");
  };

  const handleMarkAllSlotsNormal = () => {
    const updated: Record<string, boolean> = {};
    for (const r of allReservations) {
      updated[r.id] = false;
    }
    setPeakOverrides(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.PEAK_OVERRIDES, JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast("Tous les creneaux marques comme horaires normaux");
  };

  const handleMarkEveningsPeak = () => {
    const updated: Record<string, boolean> = {};
    for (const r of allReservations) {
      const match = r.time.match(/^(\d{1,2}):/);
      const hour = match ? parseInt(match[1], 10) : 0;
      const isEvening = hour >= 17;
      const isWeekend =
        r.day.toLowerCase().includes("samedi") || r.day.toLowerCase().includes("vendredi");
      updated[r.id] = isEvening || isWeekend;
    }
    setPeakOverrides(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.PEAK_OVERRIDES, JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast("Creneaux soir et weekend marques comme heures de pointe");
  };

  // Row month override handler
  const handleUpdateRowMonth = (rowId: string, monthVal: string) => {
    const updated = { ...monthOverrides, [rowId]: monthVal };
    setMonthOverrides(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.ROW_MONTH_OVERRIDES, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setEditingMonthRowId(null);
  };

  // Save inline price
  const handleSaveInlinePrice = (memberId: string, swimId: string, newPrice: number) => {
    const isCustom = customRows.some((c) => c.id === memberId);
    if (isCustom) {
      const updated = customRows.map((c) =>
        c.id === memberId ? { ...c, poolPriceDA: newPrice } : c
      );
      setCustomRows(updated);
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_ROWS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      setInlineEditSwimmerId(null);
      showToast("Tarif mis a jour");
      return;
    }

    const key = swimId || memberId;
    const updatedPricing = {
      ...pricingConfig,
      individualOverrides: {
        ...pricingConfig.individualOverrides,
        [key]: newPrice,
      },
    };
    setPricingConfig(updatedPricing);
    try {
      localStorage.setItem(STORAGE_KEYS.PRICING, JSON.stringify(updatedPricing));
    } catch {
      // ignore
    }
    setInlineEditSwimmerId(null);
    showToast("Tarif mis a jour");
  };

  // ─── METHOD ONE: PLACE RESERVATIONS (NO CLIENT NAMES) ────────────────────────
  const allReservations = useMemo(() => {
    return buildPoolSlotReservations(rawGroups, rawMembers, placeOverrides, peakOverrides);
  }, [rawGroups, rawMembers, placeOverrides, peakOverrides]);

  // Initialize selected reservation IDs
  useEffect(() => {
    if (allReservations.length > 0 && selectedReservationIds.size === 0) {
      setSelectedReservationIds(new Set(allReservations.map((r) => r.id)));
    }
  }, [allReservations, selectedReservationIds.size]);

  // Summary of place reservations
  const reservationSummary = useMemo(() => {
    return computeSlotReservationsSummary(allReservations, selectedReservationIds);
  }, [allReservations, selectedReservationIds]);

  // Filtered place reservations
  const filteredReservations = useMemo(() => {
    return allReservations.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesGroup = r.groupName.toLowerCase().includes(q);
        const matchesDay = r.day.toLowerCase().includes(q);
        const matchesCat = r.category.toLowerCase().includes(q);
        if (!matchesGroup && !matchesDay && !matchesCat) return false;
      }
      if (categoryFilter !== "all") {
        if (r.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }
      if (groupFilter !== "all") {
        if (r.groupId !== groupFilter) return false;
      }
      if (dayFilter !== "all") {
        if (r.day.toLowerCase() !== dayFilter.toLowerCase()) return false;
      }
      if (busySlotFilter === "busy" && !r.isPeak) return false;
      if (busySlotFilter === "normal" && r.isPeak) return false;
      return true;
    });
  }, [allReservations, searchQuery, categoryFilter, groupFilter, dayFilter, busySlotFilter]);

  // Adjust place count for a slot
  const handleUpdateReservedPlaces = (resId: string, delta: number) => {
    const cur = allReservations.find((r) => r.id === resId)?.reservedPlaces || 0;
    const nextVal = Math.max(0, cur + delta);
    const updated = { ...placeOverrides, [resId]: nextVal };
    setPlaceOverrides(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.RESERVATION_OVERRIDES, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleResetReservationPlaces = (resId: string) => {
    const updated = { ...placeOverrides };
    delete updated[resId];
    setPlaceOverrides(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.RESERVATION_OVERRIDES, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleToggleReservation = (id: string) => {
    const next = new Set(selectedReservationIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedReservationIds(next);
  };

  const handleSelectAllReservations = () => {
    setSelectedReservationIds(new Set(allReservations.map((r) => r.id)));
  };

  const handleDeselectAllReservations = () => {
    setSelectedReservationIds(new Set());
  };

  const handleSelectPeakReservations = () => {
    setSelectedReservationIds(
      new Set(allReservations.filter((r) => r.isPeak).map((r) => r.id))
    );
  };

  // ─── METHOD TWO: REALFINALPOOL (WITH CLIENT NAMES & SETTLEMENT) ──────────────
  const allRows = useMemo(() => {
    return buildPoolDispatchRows(
      rawMembers,
      rawGroups,
      pricingConfig,
      monthLabel,
      monthOverrides,
      customRows,
      peakOverrides
    );
  }, [rawMembers, rawGroups, pricingConfig, monthLabel, monthOverrides, customRows, peakOverrides]);

  // Initialize selected swimmers for Method 2
  useEffect(() => {
    if (allRows.length > 0) {
      setSelectedSwimmerIds((prev) => {
        if (prev.size === 0) {
          const assignedIds = new Set<string>();
          for (const r of allRows) {
            if (r.assignedGroupIds.length > 0 || r.isCustom) {
              assignedIds.add(r.swimId || r.memberId);
            }
          }
          return assignedIds;
        }
        const next = new Set(prev);
        for (const r of allRows) {
          if (r.isCustom && !prev.has(r.swimId) && !prev.has(r.memberId)) {
            next.add(r.swimId || r.memberId);
          }
        }
        return next;
      });
    }
  }, [allRows]);

  // Summary for RealFinalPool
  const realFinalSummary = useMemo(() => {
    return computeRealFinalPoolSummary(allRows, selectedSwimmerIds);
  }, [allRows, selectedSwimmerIds]);

  // Filtered swimmers for Method 2
  const filteredSwimmers = useMemo(() => {
    return allRows.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = r.fullName.toLowerCase().includes(q);
        const matchesId = r.swimId.toLowerCase().includes(q);
        const matchesGroup = r.assignedGroupNames.some((g) =>
          g.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesId && !matchesGroup) return false;
      }
      if (categoryFilter !== "all") {
        if (r.category?.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }
      if (groupFilter !== "all") {
        if (!r.assignedGroupIds.includes(groupFilter)) return false;
      }
      if (dayFilter !== "all") {
        const matchesDay = r.parsedSlots.some(
          (s) => s.day.toLowerCase() === dayFilter.toLowerCase()
        );
        if (!matchesDay) return false;
      }
      return true;
    });
  }, [allRows, searchQuery, categoryFilter, groupFilter, dayFilter]);

  const handleToggleSwimmer = (id: string) => {
    const next = new Set(selectedSwimmerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSwimmerIds(next);
  };

  const handleSelectAllSwimmers = () => {
    const next = new Set(selectedSwimmerIds);
    for (const r of filteredSwimmers) next.add(r.swimId || r.memberId);
    setSelectedSwimmerIds(next);
  };

  const handleDeselectAllSwimmers = () => {
    const next = new Set(selectedSwimmerIds);
    for (const r of filteredSwimmers) next.delete(r.swimId || r.memberId);
    setSelectedSwimmerIds(next);
  };

  const handleSelectPaidSwimmersOnly = () => {
    const next = new Set<string>();
    for (const r of allRows) {
      if (r.paymentStatus === "paid") next.add(r.swimId || r.memberId);
    }
    setSelectedSwimmerIds(next);
  };

  // Pricing configuration save
  const handleSavePricing = (newConfig: PoolPricingConfig) => {
    setPricingConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEYS.PRICING, JSON.stringify(newConfig));
      showToast(t("pricingModalTitle") + " - saved");
    } catch {
      // ignore
    }
  };

  // Column toggles
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

  // Export CSV
  const handleExportCSV = () => {
    if (mode === "preview") {
      // Method 1: Place reservations, NO NAMES
      const csv = exportSlotReservationsToCSV(
        allReservations,
        monthLabel,
        true,
        selectedReservationIds
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `AQA_Places_Reservation_${targetDate.getFullYear()}-${String(
          targetDate.getMonth() + 1
        ).padStart(2, "0")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Place reservations CSV downloaded (no names)");
    } else {
      // Method 2: RealFinalPool with client names & fees
      const csv = exportPoolRowsToCSV(
        allRows,
        activeColumns,
        monthLabel,
        true,
        selectedSwimmerIds
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `AQA_RealFinalPool_${targetDate.getFullYear()}-${String(
          targetDate.getMonth() + 1
        ).padStart(2, "0")}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("RealFinalPool CSV downloaded");
    }
  };

  // Copy WhatsApp Dispatch
  const handleCopyWhatsApp = () => {
    if (mode === "preview") {
      // Method 1: Simple place reservations, NO NAMES
      const selectedResList = allReservations.filter((r) =>
        selectedReservationIds.has(r.id)
      );
      const text = generatePlaceReservationMessage({
        monthLabel,
        reservations: selectedResList,
        totalPlaces: reservationSummary.totalReservedPlaces,
      });
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          showToast(t("copiedToClipboard"));
        });
      }
    } else {
      // Method 2: RealFinalPool settlement
      const text = generatePoolDispatchMessage({
        mode: "real_final",
        monthLabel,
        totalSwimmers: realFinalSummary.selectedCount,
        totalDueDA: realFinalSummary.totalDuePoolDA,
      });
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          showToast(t("copiedToClipboard"));
        });
      }
    }
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Snapshot Saving (Method 2)
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
        .filter((r) => selectedSwimmerIds.has(r.swimId) || selectedSwimmerIds.has(r.memberId))
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
                2 Methods
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

        {/* Document Metadata Bar (Demande d'accès, n:0031/26, 10/07/2026, 2026) */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-500/20 shadow-md space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span className="text-xs font-bold text-white tracking-wide uppercase">
                Parametres de la Correspondance Piscine (Demande d&apos;acces)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Modifiable pour correspondre a la demande officielle envoyee a la piscine
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                Titre Document
              </label>
              <input
                type="text"
                value={docMeta.title}
                onChange={(e) => handleUpdateDocMeta("title", e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white font-semibold text-xs focus:outline-none focus:border-cyan-400"
                placeholder="Demande d'acces"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                N° de Reference
              </label>
              <input
                type="text"
                value={docMeta.referenceNumber}
                onChange={(e) => handleUpdateDocMeta("referenceNumber", e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-cyan-300 font-mono font-bold text-xs focus:outline-none focus:border-cyan-400"
                placeholder="n:0031/26"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                Date d&apos;Emission
              </label>
              <input
                type="text"
                value={docMeta.date}
                onChange={(e) => handleUpdateDocMeta("date", e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
                placeholder="10/07/2026"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                Annee
              </label>
              <input
                type="text"
                value={docMeta.year}
                onChange={(e) => handleUpdateDocMeta("year", e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-slate-200 font-mono font-bold text-xs focus:outline-none focus:border-cyan-400"
                placeholder="2026"
              />
            </div>
          </div>
        </div>

        {/* The Two Correspondence Methods Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* METHOD ONE: PLACE RESERVATIONS ONLY (NO NAMES) */}
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
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-950 text-sky-300 border border-sky-800/40 font-mono font-bold">
                Places Only · No Names
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Simple place reservations by hour and group sent at the start of the month to coordinate busy lanes. No client names are included.
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
              Official verified roster of clients who actually attended with per-client pool fee and grand total paid to the pool.
            </p>
          </button>
        </div>

        {/* Informative Banner and Controls for Method ONE */}
        {mode === "preview" && (
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-sky-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-sky-400 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>{t("previewBannerNote")}</span>
              </div>
              <span className="font-mono text-[11px] text-sky-300">
                {reservationSummary.totalReservedPlaces} places across {reservationSummary.selectedReservationsCount} slots
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-amber-200">
                Affluence modifiable : Cliquez sur le statut d&apos;un creneau dans le tableau ci-dessous pour basculer entre Pointe et Normal.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllSlotsNormal}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 font-medium transition-colors"
                >
                  Tout en Normal
                </button>
                <button
                  type="button"
                  onClick={handleMarkEveningsPeak}
                  className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/40 font-semibold transition-colors"
                >
                  Soir & Weekend en Pointe
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar & KPI Row */}
        {mode === "preview" ? (
          /* METHOD ONE KPIS: PLACE RESERVATIONS */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-[11px] text-sky-400 uppercase font-semibold">
                {t("totalPlaces")}
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {reservationSummary.totalReservedPlaces} Places
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                For {monthLabel} schedule preview
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-[11px] text-amber-400 uppercase font-semibold">
                {t("peakPlaces")}
              </div>
              <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
                {reservationSummary.peakReservedPlaces} Places
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Evening & weekend busy hours
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">
                {t("normalPlaces")}
              </div>
              <div className="text-2xl font-bold font-mono text-slate-200 mt-1">
                {reservationSummary.normalReservedPlaces} Places
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Standard daytime capacity
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-teal-400 uppercase font-semibold">
                  {t("activeSlots")}
                </div>
                <div className="text-2xl font-bold font-mono text-teal-300 mt-1">
                  {reservationSummary.selectedReservationsCount} Slots
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                No client names are transmitted
              </div>
            </div>
          </div>
        ) : (
          /* METHOD TWO KPIS: REALFINALPOOL */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-[11px] text-sky-400 uppercase font-semibold">
                {t("selectedSwimmers")}
              </div>
              <div className="text-2xl font-bold font-mono text-sky-300 mt-1">
                {realFinalSummary.selectedCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Actually used pool in {monthLabel}
              </div>
            </div>

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
                {realFinalSummary.selectedCount} clients x {realFinalSummary.averageFeePerSwimmerDA} DA
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Left tools: Mode dependent */}
          <div className="flex flex-wrap items-center gap-2">
            {mode === "real_final" && (
              <>
                {/* Add Custom Row Button (e.g. AQA KIDS with custom fee) */}
                <button
                  type="button"
                  onClick={() => setIsAddCustomRowModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/50 transition-colors flex items-center gap-1.5"
                  title="Ajouter une ligne manuelle au bordereau (ex: AQA KIDS, section competition...)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>+ Ligne (ex: AQA KIDS)</span>
                </button>

                {/* View Switcher: Official Grid vs Detailed View */}
                <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setDisplayStyle("official_grid")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                      displayStyle === "official_grid"
                        ? "bg-cyan-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Bordereau Officiel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayStyle("detailed")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                      displayStyle === "detailed"
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Vue Detail
                  </button>
                </div>

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
              </>
            )}

            {mode === "preview" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  Transmission des reservations simples de places par creneau a la piscine hote
                </span>
              </div>
            )}
          </div>

          {/* Right tools: Export, Print, WhatsApp */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/40 transition-colors flex items-center gap-1.5"
              title="Copy formatted dispatch message"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{t("copyWhatsapp")}</span>
            </button>

            {mode === "real_final" && (
              <button
                type="button"
                onClick={() => {
                  const csv = exportOfficialCorrespondenceToCSV(
                    allRows,
                    docMeta,
                    false,
                    selectedSwimmerIds
                  );
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute(
                    "download",
                    `AQA_Demande_Acces_${docMeta.year}_${docMeta.referenceNumber.replace(/[^a-zA-Z0-9]/g, "_")}.csv`
                  );
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  showToast("Bordereau officiel (Demande d'acces) telecharge");
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-800/40 transition-colors flex items-center gap-1.5"
                title="Exporter au format exact de la correspondance officielle"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export Format Demande d&apos;acces</span>
              </button>
            )}

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

        {/* Filter Toolbar for Table */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/70 border border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="w-56 sm:w-64">
              <input
                type="text"
                placeholder={mode === "preview" ? "Search group or slot..." : t("searchPlaceholder")}
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

            {/* Busy Hour filter in Method 1 */}
            {mode === "preview" && (
              <select
                value={busySlotFilter}
                onChange={(e) => setBusySlotFilter(e.target.value as "all" | "busy" | "normal")}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-amber-300 focus:outline-none focus:border-amber-400 font-medium"
              >
                <option value="all">{t("filterSlotAll")}</option>
                <option value="busy">{t("filterSlotBusy")}</option>
                <option value="normal">{t("filterSlotNormal")}</option>
              </select>
            )}
          </div>

          {/* Quick Selection Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {mode === "preview" ? (
              <>
                <button
                  type="button"
                  onClick={handleSelectAllReservations}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  {t("selectAll")}
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllReservations}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {t("deselectAll")}
                </button>
                <button
                  type="button"
                  onClick={handleSelectPeakReservations}
                  className="px-2.5 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/40 transition-colors"
                >
                  Peak Slots Only
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSelectAllSwimmers}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  {t("selectAll")}
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllSwimmers}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {t("deselectAll")}
                </button>
                <button
                  type="button"
                  onClick={handleSelectPaidSwimmersOnly}
                  className="px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800/40 transition-colors"
                >
                  {t("selectPaidOnly")}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ─── METHOD ONE TABLE: PLACE RESERVATIONS ONLY (NO NAMES) ────────────────── */}
        {mode === "preview" && (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-900/60 text-[var(--muted)] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredReservations.length > 0 &&
                          filteredReservations.every((r) =>
                            selectedReservationIds.has(r.id)
                          )
                        }
                        onChange={(e) => {
                          if (e.target.checked) handleSelectAllReservations();
                          else handleDeselectAllReservations();
                        }}
                        className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 bg-slate-800 border-slate-700"
                      />
                    </th>
                    <th className="py-3 px-3 w-12 text-center">{t("colNumber")}</th>
                    <th className="py-3 px-4">Jour</th>
                    <th className="py-3 px-4">Créneau Horaire</th>
                    <th className="py-3 px-4">Groupe d&apos;Entraînement</th>
                    <th className="py-3 px-3">Catégorie</th>
                    <th className="py-3 px-4 text-center">Places Réservées</th>
                    <th className="py-3 px-4 text-center">Affluence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        {loadingData ? "Loading groups & slots..." : "No training group slots found"}
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((r, idx) => {
                      const isSelected = selectedReservationIds.has(r.id);

                      return (
                        <tr
                          key={r.id}
                          className={`transition-colors ${
                            isSelected
                              ? "hover:bg-slate-800/40 bg-slate-900/20"
                              : "opacity-40 hover:opacity-75 bg-slate-950/40"
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleReservation(r.id)}
                              className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 bg-slate-800 border-slate-700 cursor-pointer"
                            />
                          </td>

                          {/* Number # */}
                          <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400">
                            {idx + 1}
                          </td>

                          {/* Day */}
                          <td className="py-3 px-4 font-bold text-white">
                            {r.day}
                          </td>

                          {/* Time */}
                          <td className="py-3 px-4 font-mono text-xs text-sky-300 font-semibold">
                            {r.time}
                          </td>

                          {/* Training Group */}
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-200">
                              {r.groupName}
                            </span>
                            {r.coachName && (
                              <span className="text-[10px] text-slate-500 block">
                                Coach: {r.coachName}
                              </span>
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800/80 text-slate-300 border border-white/5">
                              {r.category}
                            </span>
                          </td>

                          {/* Reserved Places with quick adjust tool */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center justify-center gap-2 bg-slate-950/80 px-3 py-1 rounded-xl border border-white/5">
                              <button
                                type="button"
                                onClick={() => handleUpdateReservedPlaces(r.id, -1)}
                                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors"
                                title="Decrease place"
                              >
                                -
                              </button>

                              <span className="font-mono font-extrabold text-sm text-cyan-300 min-w-[32px] text-center">
                                {r.reservedPlaces}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleUpdateReservedPlaces(r.id, 1)}
                                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors"
                                title="Increase place"
                              >
                                +
                              </button>

                              {r.hasCustomPlaces && (
                                <button
                                  type="button"
                                  onClick={() => handleResetReservationPlaces(r.id)}
                                  className="text-[10px] text-amber-400 hover:underline ml-1"
                                  title="Reset to assigned count"
                                >
                                  {t("adjustedBadge")}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Peak Affluence Badge - Clickable Toggle */}
                          <td className="py-3 px-4 text-center">
                            {r.isPeak ? (
                              <button
                                type="button"
                                onClick={() => handleToggleSlotPeak(r.id, true)}
                                className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/60 hover:bg-amber-900/80 transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                                title="Cliquer pour basculer en horaire normal"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                <span>Heure de Pointe</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleSlotPeak(r.id, false)}
                                className="px-2.5 py-1 rounded-full text-[10px] text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-slate-200 border border-white/5 transition-all cursor-pointer inline-flex items-center gap-1"
                                title="Cliquer pour marquer comme heure de pointe"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                <span>Normal</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 border-t-2 border-sky-500/40 font-bold">
                    <td colSpan={5} className="py-3.5 px-4 text-xs text-slate-300">
                      Total Créneaux Réservés :{" "}
                      <span className="text-white font-mono font-bold">
                        {reservationSummary.selectedReservationsCount} / {allReservations.length}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs uppercase text-sky-400 font-semibold">
                      Total Places Réservées :
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-base text-cyan-300 font-extrabold">
                      {reservationSummary.totalReservedPlaces} Places
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs text-amber-400">
                      ({reservationSummary.peakReservedPlaces} en pointe)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ─── METHOD TWO TABLE: REALFINALPOOL / DEMANDE D'ACCES ─────────────────────────── */}
        {mode === "real_final" && (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xl">
            {displayStyle === "official_grid" ? (
              /* OFFICIAL SPREADSHEET GRID VIEW (Matches uploaded PDF Demande d'accès) */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/90 text-slate-300 font-bold uppercase text-[11px]">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredSwimmers.length > 0 &&
                            filteredSwimmers.every((r) =>
                              selectedSwimmerIds.has(r.swimId || r.memberId)
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) handleSelectAllSwimmers();
                            else handleDeselectAllSwimmers();
                          }}
                          className="w-3.5 h-3.5 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-800 border-slate-700 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3 w-12 text-center text-slate-400 font-mono">N</th>
                      <th className="py-3 px-4 font-bold text-white">Nom & Prenom</th>
                      <th className="py-3 px-4 text-slate-300 w-48">Groupe / Note</th>
                      <th className="py-3 px-4 text-right w-36 bg-emerald-950/80 text-emerald-300 font-extrabold border-x border-emerald-900/40">
                        prix
                      </th>
                      <th className="py-3 px-4 text-center w-28">Mois</th>
                      <th className="py-3 px-3 w-16 text-center text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredSwimmers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          {loadingData ? "Chargement des adherents..." : t("noSwimmersFound")}
                        </td>
                      </tr>
                    ) : (
                      filteredSwimmers.map((r, idx) => {
                        const rowId = r.swimId || r.memberId;
                        const isSelected = selectedSwimmerIds.has(rowId);
                        const isInlineEditing = inlineEditSwimmerId === rowId;
                        const isMonthEditing = editingMonthRowId === rowId;

                        return (
                          <tr
                            key={rowId}
                            className={`transition-colors ${
                              isSelected
                                ? "hover:bg-slate-800/50 bg-slate-900/30"
                                : "opacity-35 hover:opacity-70 bg-slate-950/50"
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSwimmer(rowId)}
                                className="w-3.5 h-3.5 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-800 border-slate-700 cursor-pointer"
                              />
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                              {idx + 1}
                            </td>

                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-white flex items-center gap-2">
                                <span>{r.fullName}</span>
                                {r.isCustom && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/40 uppercase">
                                    Section
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 text-slate-300 text-xs">
                              {r.assignedGroupNames.join(" + ") || r.groupOrNote || (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>

                            {/* Prix Cell with Inline Edit */}
                            <td className="py-2.5 px-4 text-right bg-emerald-950/20 border-x border-emerald-900/20">
                              {isInlineEditing ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={inlinePriceInput}
                                    onChange={(e) => setInlinePriceInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleSaveInlinePrice(
                                          r.memberId,
                                          r.swimId,
                                          Number(inlinePriceInput) || 0
                                        );
                                      }
                                      if (e.key === "Escape") setInlineEditSwimmerId(null);
                                    }}
                                    onBlur={() =>
                                      handleSaveInlinePrice(
                                        r.memberId,
                                        r.swimId,
                                        Number(inlinePriceInput) || 0
                                      )
                                    }
                                    className="w-24 px-2 py-0.5 rounded bg-slate-950 border border-cyan-400 text-xs font-mono font-bold text-white text-right focus:outline-none"
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <div
                                  onClick={() => {
                                    setInlinePriceInput(String(r.poolPriceDA));
                                    setInlineEditSwimmerId(rowId);
                                  }}
                                  className="cursor-pointer group flex items-center justify-end gap-1.5"
                                  title="Cliquer pour modifier le prix"
                                >
                                  <span className="font-mono font-bold text-sm text-emerald-300 group-hover:text-emerald-200">
                                    {r.poolPriceDA.toLocaleString("fr-DZ")}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">DA</span>
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                  </svg>
                                </div>
                              )}
                            </td>

                            {/* Mois Cell with Inline Edit */}
                            <td className="py-2.5 px-4 text-center">
                              {isMonthEditing ? (
                                <input
                                  type="text"
                                  defaultValue={r.currentMonth}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleUpdateRowMonth(
                                        rowId,
                                        (e.target as HTMLInputElement).value
                                      );
                                    }
                                    if (e.key === "Escape") setEditingMonthRowId(null);
                                  }}
                                  onBlur={(e) => handleUpdateRowMonth(rowId, e.target.value)}
                                  className="w-24 px-2 py-0.5 rounded bg-slate-950 border border-cyan-400 text-xs font-mono text-white text-center focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingMonthRowId(rowId)}
                                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 font-mono text-[11px] transition-colors"
                                  title="Cliquer pour changer le mois"
                                >
                                  {r.currentMonth}
                                </button>
                              )}
                            </td>

                            {/* Actions (Delete for custom rows) */}
                            <td className="py-2.5 px-3 text-center">
                              {r.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomRow(r.memberId)}
                                  className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors"
                                  title="Supprimer cette ligne personnalisee"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="w-3.5 h-3.5"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Table Footer with exact grand total matching the PDF */}
                  <tfoot>
                    <tr className="bg-slate-900 border-t-2 border-cyan-500/40 font-bold">
                      <td
                        colSpan={4}
                        className="py-3.5 px-4 text-right text-xs uppercase text-slate-300"
                      >
                        Total General Redevance Piscine :
                      </td>
                      <td className="py-3.5 px-4 text-right bg-cyan-400 text-slate-950 font-mono text-base font-extrabold shadow-inner border-x border-cyan-500">
                        {realFinalSummary.totalDuePoolDA.toLocaleString("fr-DZ")} DA
                      </td>
                      <td
                        colSpan={2}
                        className="py-3.5 px-4 text-xs text-slate-400 font-mono"
                      >
                        {realFinalSummary.selectedCount} lignes retenues
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* DETAILED VIEW */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-slate-900/60 text-[var(--muted)] uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredSwimmers.length > 0 &&
                            filteredSwimmers.every((r) =>
                              selectedSwimmerIds.has(r.swimId || r.memberId)
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) handleSelectAllSwimmers();
                            else handleDeselectAllSwimmers();
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
                    {filteredSwimmers.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-slate-500">
                          {loadingData ? "Loading swimmers..." : t("noSwimmersFound")}
                        </td>
                      </tr>
                    ) : (
                      filteredSwimmers.map((r, idx) => {
                        const rowId = r.swimId || r.memberId;
                        const isSelected = selectedSwimmerIds.has(rowId);
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
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSwimmer(rowId)}
                                className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 bg-slate-800 border-slate-700 cursor-pointer"
                              />
                            </td>

                            {activeColumns.number && (
                              <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                                {idx + 1}
                              </td>
                            )}

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

                            {activeColumns.swimId && (
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                                {r.swimId}
                              </td>
                            )}

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

                            {activeColumns.schedule && (
                              <td className="py-2.5 px-4 text-xs text-slate-300">
                                {r.assignedSchedules.length > 0 ? (
                                  r.assignedSchedules.join(" | ")
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                            )}

                            {activeColumns.category && (
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800/80 text-slate-300 border border-white/5">
                                  {r.category}
                                </span>
                              </td>
                            )}

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
                                        handleSaveInlinePrice(
                                          r.memberId,
                                          r.swimId,
                                          Number(inlinePriceInput) || 0
                                        )
                                      }
                                      className="p-1 rounded bg-sky-600 hover:bg-sky-500 text-white"
                                      title="Save price"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        className="w-3 h-3"
                                      >
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setInlineEditSwimmerId(null)}
                                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                                      title="Cancel"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        className="w-3 h-3"
                                      >
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
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="w-3 h-3"
                                      >
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}

                            {activeColumns.currentMonth && (
                              <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                                {r.currentMonth || monthLabel}
                              </td>
                            )}

                            {activeColumns.phone && (
                              <td className="py-2.5 px-3 font-mono text-xs text-slate-400">
                                {r.phone}
                              </td>
                            )}

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
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Printable Bordereau View (Rendered only on print / PDF) */}
      <PoolPrintTemplate
        mode={mode}
        monthLabel={monthLabel}
        rows={allRows}
        selectedIds={selectedSwimmerIds}
        columnConfig={activeColumns}
        totalSwimmersCount={realFinalSummary.selectedCount}
        totalDuePoolDA={realFinalSummary.totalDuePoolDA}
        slotReservations={allReservations}
        selectedReservationIds={selectedReservationIds}
        meta={docMeta}
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

      {/* Custom Collective Row Modal (e.g. AQA KIDS with custom fee) */}
      <PoolCustomRowModal
        isOpen={isAddCustomRowModalOpen}
        onClose={() => setIsAddCustomRowModalOpen(false)}
        onAdd={handleAddCustomRow}
        defaultMonth={monthLabel}
      />
    </div>
  );
}
