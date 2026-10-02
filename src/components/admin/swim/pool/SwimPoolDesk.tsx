"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "@/lib/i18n";
import {
  PoolCorrespondenceMode,
  PoolOption,
  DEFAULT_POOLS,
  SwimmerBillingConfig,
  PoolSwimmerRow,
  PoolSlotReservation,
  CustomPoolRow,
  PoolDocumentMeta,
  DEFAULT_DOCUMENT_META,
  STORAGE_KEYS,
  buildPoolDispatchRows,
  buildPoolSlotReservations,
  computeRealFinalPoolSummary,
  computeSlotReservationsSummary,
  exportOfficialCorrespondenceToCSV,
  exportSlotReservationsToCSV,
  formatMonthLabel,
  SwimMemberReference,
  SwimGroupReference,
} from "@/lib/swim-pool-dispatch";
import { PoolCustomRowModal } from "./PoolCustomRowModal";
import { PoolPrintTemplate } from "./PoolPrintTemplate";

interface SwimPoolDeskProps {
  members?: SwimMemberReference[];
  groups?: SwimGroupReference[];
}

export function SwimPoolDesk({
  members: propMembers,
  groups: propGroups,
}: SwimPoolDeskProps) {
  const { locale } = useTranslations("swimPool");

  // ─── 1. POOL SELECTION ───────────────────────────────────────────────────────
  const [selectedPoolId, setSelectedPoolId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_POOL);
        if (saved) return saved;
      } catch {
        // ignore
      }
    }
    return "azal";
  });

  const activePool: PoolOption = useMemo(() => {
    const found = DEFAULT_POOLS.find((p) => p.id === selectedPoolId);
    return found || DEFAULT_POOLS[0];
  }, [selectedPoolId]);

  const handleSelectPool = (poolId: string) => {
    setSelectedPoolId(poolId);
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_POOL, poolId);
    } catch {
      // ignore
    }
  };

  // ─── 2. MODE SELECTION ───────────────────────────────────────────────────────
  // Mode: "preview" (Pre-reservation: places without pricing) or "real_final" (RealFinalPool with auto pricing)
  const [mode, setMode] = useState<PoolCorrespondenceMode>("real_final");

  // ─── 3. RAW DATA & STANDALONE FETCHING ───────────────────────────────────────
  const [rawMembers, setRawMembers] = useState<SwimMemberReference[]>(propMembers || []);
  const [rawGroups, setRawGroups] = useState<SwimGroupReference[]>(propGroups || []);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (propMembers && propMembers.length > 0) setRawMembers(propMembers);
    if (propGroups && propGroups.length > 0) setRawGroups(propGroups);

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

  // ─── 4. DOCUMENT METADATA ────────────────────────────────────────────────────
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

  const handleUpdateDocMeta = (field: keyof PoolDocumentMeta, value: string) => {
    const updated = { ...docMeta, [field]: value };
    setDocMeta(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.DOCUMENT_META, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // ─── 5. BILLING CONFIGS (MONTHLY VS SESSION CONVERTOR) ───────────────────────
  // Map of swimmerId -> SwimmerBillingConfig
  const [billingConfigs, setBillingConfigs] = useState<Record<string, SwimmerBillingConfig>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.BILLING_CONFIGS);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  const saveBillingConfigs = (updated: Record<string, SwimmerBillingConfig>) => {
    setBillingConfigs(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.BILLING_CONFIGS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Toggle member between monthly and session settlement
  const handleToggleBillingMode = (rowId: string) => {
    const current = billingConfigs[rowId];
    const isCurrentlySession = current?.mode === "session";
    const updated = {
      ...billingConfigs,
      [rowId]: {
        ...current,
        mode: (isCurrentlySession ? "monthly" : "session") as "monthly" | "session",
        sessionsConsumed: current?.sessionsConsumed || 1,
        hoursConsumed: undefined,
      },
    };
    saveBillingConfigs(updated);
    showToast(isCurrentlySession ? "Passé au forfait mensuel" : "Passé à la séance (500 DA/h)");
  };

  // Adjust sessions consumed (1 session = 2h = 1000 DA)
  const handleSetSessionsConsumed = (rowId: string, sessions: number) => {
    const current = billingConfigs[rowId] || { mode: "session" };
    const updated = {
      ...billingConfigs,
      [rowId]: {
        ...current,
        mode: "session" as const,
        sessionsConsumed: Math.max(1, sessions),
        hoursConsumed: undefined,
        manualPriceOverride: undefined,
      },
    };
    saveBillingConfigs(updated);
  };

  // ─── 6. CUSTOM COLLECTIVE ROWS (e.g. AQA KIDS: 80500 DA) ─────────────────────
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

  const [isAddCustomRowModalOpen, setIsAddCustomRowModalOpen] = useState(false);

  const handleAddCustomRow = (newRow: {
    fullName: string;
    groupOrNote: string;
    poolPriceDA: number;
    month: string;
  }) => {
    const row: CustomPoolRow = {
      id: `cust_${Date.now()}`,
      fullName: newRow.fullName,
      groupOrNote: newRow.groupOrNote,
      poolPriceDA: newRow.poolPriceDA,
      month: newRow.month,
    };
    const updated = [...customRows, row];
    setCustomRows(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ROWS, JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast("Ligne collective ajoutée");
  };

  const handleDeleteCustomRow = (rowId: string) => {
    const updated = customRows.filter((r) => r.id !== rowId);
    setCustomRows(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_ROWS, JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast("Ligne collective supprimée");
  };

  // ─── 7. PER-ROW MONTH OVERRIDES ──────────────────────────────────────────────
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

  const [editingMonthRowId, setEditingMonthRowId] = useState<string | null>(null);

  const handleSaveRowMonth = (rowId: string, monthVal: string) => {
    const updated = { ...monthOverrides, [rowId]: monthVal.trim() };
    setMonthOverrides(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.ROW_MONTH_OVERRIDES, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setEditingMonthRowId(null);
  };

  // ─── 8. INLINE MANUAL PRICE OVERRIDES ────────────────────────────────────────
  const [inlinePriceRowId, setInlinePriceRowId] = useState<string | null>(null);
  const [inlinePriceInput, setInlinePriceInput] = useState<string>("");

  const handleSaveInlinePrice = (rowId: string, price: number) => {
    // Check if it's a custom collective row
    const custIndex = customRows.findIndex((c) => c.id === rowId);
    if (custIndex !== -1) {
      const updated = [...customRows];
      updated[custIndex].poolPriceDA = price;
      setCustomRows(updated);
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_ROWS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      setInlinePriceRowId(null);
      showToast("Prix modifié");
      return;
    }

    const current = billingConfigs[rowId] || { mode: "monthly" };
    const updated = {
      ...billingConfigs,
      [rowId]: {
        ...current,
        manualPriceOverride: price,
      },
    };
    saveBillingConfigs(updated);
    setInlinePriceRowId(null);
    showToast("Prix modifié");
  };

  const handleResetPriceToAuto = (rowId: string) => {
    const current = billingConfigs[rowId];
    if (!current) return;
    const updatedCurrent = { ...current };
    delete updatedCurrent.manualPriceOverride;
    const updated = { ...billingConfigs, [rowId]: updatedCurrent };
    saveBillingConfigs(updated);
    showToast("Prix réinitialisé au calcul automatique");
  };

  // ─── 9. PRE-RESERVATION OVERRIDES (PLACES COUNT) ─────────────────────────────
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

  const handleUpdatePlaceCount = (resId: string, delta: number) => {
    const current = placeOverrides[resId] ?? 0;
    const nextVal = Math.max(0, current + delta);
    const updated = { ...placeOverrides, [resId]: nextVal };
    setPlaceOverrides(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.RESERVATION_OVERRIDES, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // ─── 10. DATE & MONTH CONTEXT ────────────────────────────────────────────────
  const [targetDate] = useState<Date>(() => new Date());
  const monthLabel = useMemo(() => {
    return formatMonthLabel(targetDate.getFullYear(), targetDate.getMonth(), locale);
  }, [targetDate, locale]);

  // ─── 11. BUILD REALFINALPOOL ROWS (AUTOMATIC FREQUENCY PRICING) ──────────────
  const finalRows: PoolSwimmerRow[] = useMemo(() => {
    return buildPoolDispatchRows(
      rawMembers,
      rawGroups,
      billingConfigs,
      monthLabel,
      monthOverrides,
      customRows,
      {},
      activePool.defaultRules
    );
  }, [rawMembers, rawGroups, billingConfigs, monthLabel, monthOverrides, customRows, activePool]);

  // Selected row IDs for filtering / printing
  const [selectedSwimmerIds, setSelectedSwimmerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (finalRows.length > 0 && selectedSwimmerIds.size === 0) {
      setSelectedSwimmerIds(new Set(finalRows.map((r) => r.swimId || r.memberId)));
    }
  }, [finalRows, selectedSwimmerIds.size]);

  // Summary statistics
  const summary = useMemo(() => {
    return computeRealFinalPoolSummary(finalRows, selectedSwimmerIds);
  }, [finalRows, selectedSwimmerIds]);

  // ─── 12. BUILD PRE-RESERVATION SLOTS (WITHOUT PRICING) ───────────────────────
  const slotReservations: PoolSlotReservation[] = useMemo(() => {
    return buildPoolSlotReservations(rawGroups, rawMembers, placeOverrides);
  }, [rawGroups, rawMembers, placeOverrides]);

  const [selectedReservationIds, setSelectedReservationIds] = useState<Set<string>>(new Set());
  const [hasInitializedResIds, setHasInitializedResIds] = useState(false);

  // Option: show names in pre-reservation
  const [showNamesInPreview, setShowNamesInPreview] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PREVIEW_SHOW_NAMES);
        if (saved !== null) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return false;
  });

  const handleToggleShowNamesInPreview = (val: boolean) => {
    setShowNamesInPreview(val);
    try {
      localStorage.setItem(STORAGE_KEYS.PREVIEW_SHOW_NAMES, JSON.stringify(val));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!hasInitializedResIds && slotReservations.length > 0) {
      const activeIds = slotReservations
        .filter((r) => r.reservedPlaces > 0)
        .map((r) => r.id);
      setSelectedReservationIds(new Set(activeIds));
      setHasInitializedResIds(true);
    }
  }, [slotReservations, hasInitializedResIds]);

  const handleToggleReservation = (resId: string) => {
    setSelectedReservationIds((prev) => {
      const next = new Set(prev);
      if (next.has(resId)) {
        next.delete(resId);
      } else {
        next.add(resId);
      }
      return next;
    });
  };

  const handleSelectAllReservations = () => {
    const activeFiltered = filteredReservations.filter((r) => r.reservedPlaces > 0);
    const allSelected =
      activeFiltered.length > 0 &&
      activeFiltered.every((r) => selectedReservationIds.has(r.id));
    if (allSelected) {
      setSelectedReservationIds((prev) => {
        const next = new Set(prev);
        activeFiltered.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedReservationIds((prev) => {
        const next = new Set(prev);
        activeFiltered.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const resSummary = useMemo(() => {
    return computeSlotReservationsSummary(slotReservations, selectedReservationIds);
  }, [slotReservations, selectedReservationIds]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFinalRows = useMemo(() => {
    if (!searchQuery.trim()) return finalRows;
    const q = searchQuery.toLowerCase().trim();
    return finalRows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.assignedGroupNames.some((g) => g.toLowerCase().includes(q))
    );
  }, [finalRows, searchQuery]);

  const filteredReservations = useMemo(() => {
    if (!searchQuery.trim()) return slotReservations;
    const q = searchQuery.toLowerCase().trim();
    return slotReservations.filter(
      (r) =>
        r.groupName.toLowerCase().includes(q) ||
        r.day.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (showNamesInPreview && r.memberNames?.some((name) => name.toLowerCase().includes(q)))
    );
  }, [slotReservations, searchQuery, showNamesInPreview]);

  // ─── 13. MODALS & PREVIEW CONTROLS ───────────────────────────────────────────
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // ─── 14. EXPORT & PRINT HANDLERS ─────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (mode === "preview") {
      const csv = exportSlotReservationsToCSV(
        slotReservations,
        monthLabel,
        true,
        selectedReservationIds,
        showNamesInPreview
      );
      downloadBlob(csv, `PreReservation_AQA_${docMeta.year}.csv`);
    } else {
      const csv = exportOfficialCorrespondenceToCSV(
        finalRows,
        docMeta,
        true,
        selectedSwimmerIds
      );
      downloadBlob(csv, `Demande_Acces_AQA_${docMeta.referenceNumber.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
    }
    showToast("Fichier CSV téléchargé");
  };

  const downloadBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/50 text-white text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* ─── TOP CONTROL BAR (CLEAN & INTUITIVE) ──────────────────────────────── */}
      <div className="print:hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5 space-y-4 shadow-sm">
        {/* Row 1: Pool Selection & Mode Segmented Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          {/* Step 1: Select the Pool */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Piscine :
            </label>
            <div className="relative">
              <select
                value={selectedPoolId}
                onChange={(e) => handleSelectPool(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-white font-semibold text-xs focus:outline-none focus:border-cyan-400 cursor-pointer pr-8"
              >
                {DEFAULT_POOLS.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name} {pool.id === "azal" ? "(Tarifs Azal actifs)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Select Mode */}
          <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-white/10">
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === "preview"
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              1. Pré-réservation (Sans tarifs)
            </button>
            <button
              type="button"
              onClick={() => setMode("real_final")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === "real_final"
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              2. RealFinalPool (Bordereau Réel)
            </button>
          </div>
        </div>

        {/* Row 2: Document Metadata Bar (Title, Ref, Date, Year) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-white/5 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Titre Document
            </label>
            <input
              type="text"
              value={docMeta.title}
              onChange={(e) => handleUpdateDocMeta("title", e.target.value)}
              className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              N° Référence
            </label>
            <input
              type="text"
              value={docMeta.referenceNumber}
              onChange={(e) => handleUpdateDocMeta("referenceNumber", e.target.value)}
              className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono font-bold focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Date d&apos;émission
            </label>
            <input
              type="text"
              value={docMeta.date}
              onChange={(e) => handleUpdateDocMeta("date", e.target.value)}
              className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono font-bold focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Année
            </label>
            <input
              type="text"
              value={docMeta.year}
              onChange={(e) => handleUpdateDocMeta("year", e.target.value)}
              className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono font-bold focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Row 3: Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">
              Piscine active : <strong className="text-white">{activePool.name}</strong>
            </span>
            <span className="text-xs text-slate-600">|</span>
            <span className="text-xs text-slate-400 font-medium">
              Tarif séance : <strong className="text-emerald-400">500 DA / heure</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === "real_final" && (
              <button
                type="button"
                onClick={() => setIsAddCustomRowModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/20 transition-colors"
              >
                + Ligne Collective (ex: AQA KIDS)
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 transition-colors"
            >
              Aperçu 100% PDF
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition-colors shadow-sm"
            >
              Imprimer / PDF
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-white/10 transition-colors"
            >
              Exporter CSV
            </button>
          </div>
        </div>
      </div>

      {/* ─── LOADING STATE ────────────────────────────────────────────────────── */}
      {loadingData && (
        <div className="p-8 text-center text-slate-400 text-sm">
          Chargement des adhérents et créneaux...
        </div>
      )}

      {/* ─── WORKSPACE: METHOD ONE (PRE-RESERVATION - NO PRICING) ─────────────── */}
      {!loadingData && mode === "preview" && (
        <div className="print:hidden space-y-4">
          {/* Table Container - Clean, focused only on the table */}
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="p-3 sm:p-4 border-b border-[var(--border)] bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-white">
                  Pré-réservation des Places par Créneau {showNamesInPreview ? "(Avec noms)" : "(Sans noms)"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {resSummary.totalReservedPlaces} places réservées ({resSummary.selectedReservationsCount} créneaux retenus)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Option to show names in pre-reservation */}
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 px-3 py-1 rounded-lg border border-white/10 hover:border-cyan-500/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={showNamesInPreview}
                    onChange={(e) => handleToggleShowNamesInPreview(e.target.checked)}
                    className="rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Afficher les noms</span>
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllReservations}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 transition-colors"
                >
                  Tout cocher / décocher
                </button>
                <input
                  type="text"
                  placeholder="Filtrer créneau / groupe / nom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-[var(--border)] text-slate-400 font-bold uppercase text-[10px]">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredReservations.filter((r) => r.reservedPlaces > 0).length > 0 &&
                          filteredReservations
                            .filter((r) => r.reservedPlaces > 0)
                            .every((r) => selectedReservationIds.has(r.id))
                        }
                        onChange={handleSelectAllReservations}
                        aria-label="Sélectionner tous les créneaux"
                        className="rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 w-12 text-center">N</th>
                    <th className="p-3">Créneau (Jour & Heure)</th>
                    <th className="p-3">Groupe d&apos;Entrainement</th>
                    {showNamesInPreview && (
                      <th className="p-3 bg-slate-900/60 text-slate-200">Adhérents assignés</th>
                    )}
                    <th className="p-3 text-center bg-cyan-500/10 text-cyan-300">Places Réservées</th>
                    <th className="p-3 text-center">Inclusion PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredReservations.map((r, idx) => {
                    const isSelected = selectedReservationIds.has(r.id);
                    const isIncludedInPdf = isSelected && r.reservedPlaces > 0;
                    return (
                      <tr
                        key={r.id}
                        className={`transition-colors ${
                          isIncludedInPdf
                            ? "hover:bg-cyan-500/[0.04]"
                            : "opacity-60 bg-slate-950/20 hover:bg-slate-950/40"
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleReservation(r.id)}
                            aria-label={`Sélectionner ${r.groupName}`}
                            className="rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-white">
                          {r.day} <span className="font-mono text-cyan-300 font-semibold ml-1">{r.time}</span>
                        </td>
                        <td className="p-3 font-medium text-slate-300">
                          {r.groupName}
                        </td>
                        {showNamesInPreview && (
                          <td className="p-3">
                            {r.memberNames && r.memberNames.length > 0 ? (
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1 max-w-sm">
                                  {r.memberNames.map((name, i) => (
                                    <span
                                      key={i}
                                      className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 border border-white/5 font-medium"
                                    >
                                      {name}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {r.memberNames.length} adhérent{r.memberNames.length > 1 ? "s" : ""}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Aucun adhérent assigné</span>
                            )}
                          </td>
                        )}
                        <td className="p-3 text-center bg-cyan-500/5">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdatePlaceCount(r.id, -1)}
                              className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                              title="Diminuer d'une place"
                            >
                              -
                            </button>
                            <span className="font-mono font-extrabold text-sm text-cyan-300 min-w-[28px]">
                              {r.reservedPlaces}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdatePlaceCount(r.id, 1)}
                              className="w-5 h-5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold"
                              title="Augmenter d'une place"
                            >
                              +
                            </button>
                          </div>
                          {r.reservedPlaces <= 0 && (
                            <span className="block text-[9px] text-amber-400 font-semibold mt-0.5">
                              0 place (exclu du PDF)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isIncludedInPdf ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Inclus au PDF
                            </span>
                          ) : r.reservedPlaces <= 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              0 place (Exclu)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/10">
                              Décoché
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── WORKSPACE: METHOD TWO (REALFINALPOOL - OFFICIAL TARIFFS) ─────────── */}
      {!loadingData && mode === "real_final" && (
        <div className="print:hidden space-y-4">
          {/* Summary KPIs matching the uploaded correspondence */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-cyan-500/30 shadow-md">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total Facture Piscine</span>
              <p className="text-2xl font-mono font-black text-cyan-300 mt-1">
                {summary.totalDuePoolDA.toLocaleString("fr-DZ")} DA
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total Adhérents & Lignes</span>
              <p className="text-2xl font-mono font-extrabold text-white mt-1">{finalRows.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-[11px] font-bold uppercase text-slate-400">Sélectionnés</span>
              <p className="text-2xl font-mono font-extrabold text-emerald-400 mt-1">
                {summary.selectedCount} / {finalRows.length}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <span className="text-[11px] font-bold uppercase text-slate-400">Mois Référence</span>
              <p className="text-xl font-bold text-slate-200 mt-1">{docMeta.date || "Juillet"}</p>
            </div>
          </div>

          {/* RealFinalPool Table */}
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="p-3 border-b border-[var(--border)] bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Bordereau Réel des Adhérents & Lignes Collectives
                </span>
                <span className="text-xs text-slate-400">
                  (Calcul automatique par fréquence & heure de la journée)
                </span>
              </div>
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-[var(--border)] text-slate-400 font-bold uppercase text-[10px]">
                    <th className="p-3 w-10 text-center">N</th>
                    <th className="p-3">Nom et Prénom</th>
                    <th className="p-3">Groupe & Créneau</th>
                    <th className="p-3">Formule / Mode Règlement</th>
                    <th className="p-3 text-right bg-emerald-500/10 text-emerald-300 font-extrabold">
                      prix (DA)
                    </th>
                    <th className="p-3 text-center">Mois</th>
                    <th className="p-3 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredFinalRows.map((r, idx) => {
                    const rowId = r.swimId || r.memberId;
                    const isInlineEditingPrice = inlinePriceRowId === rowId;
                    const isInlineEditingMonth = editingMonthRowId === rowId;

                    return (
                      <tr key={rowId} className="hover:bg-white/[0.02] transition-colors">
                        {/* Col 1: Index */}
                        <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>

                        {/* Col 2: Name */}
                        <td className="p-3 font-bold text-white">
                          {r.fullName}
                          {r.isCustom && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Collectif
                            </span>
                          )}
                        </td>

                        {/* Col 3: Group & Schedule */}
                        <td className="p-3 text-slate-300 text-xs">
                          {r.assignedGroupNames.join(" + ") || r.groupOrNote || "-"}
                        </td>

                        {/* Col 4: Formula / Settlement Switcher */}
                        <td className="p-3">
                          {!r.isCustom ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  r.billingMode === "session"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                                }`}
                              >
                                {r.formulaLabel}
                              </span>

                              {/* Toggle between Monthly and Session */}
                              <button
                                type="button"
                                onClick={() => handleToggleBillingMode(rowId)}
                                className="text-[10px] text-slate-400 hover:text-white underline"
                                title="Changer le mode de facturation"
                              >
                                {r.billingMode === "session" ? "Passer au mois" : "À la séance"}
                              </button>

                              {/* If in session mode, show quick consumed stepper */}
                              {r.billingMode === "session" && (
                                <div className="inline-flex items-center gap-1 ml-1 bg-slate-900 px-1.5 py-0.5 rounded border border-white/10 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSetSessionsConsumed(
                                        rowId,
                                        (r.sessionsConsumed || 1) - 1
                                      )
                                    }
                                    className="px-1 text-slate-400 hover:text-white font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="font-mono font-bold text-amber-300">
                                    {r.sessionsConsumed || 1}s
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSetSessionsConsumed(
                                        rowId,
                                        (r.sessionsConsumed || 1) + 1
                                      )
                                    }
                                    className="px-1 text-slate-400 hover:text-white font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">Ligne collective forfaitaire</span>
                          )}
                        </td>

                        {/* Col 5: Prix (DA) with inline editing */}
                        <td className="p-3 text-right bg-emerald-500/5">
                          {isInlineEditingPrice ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                step="100"
                                value={inlinePriceInput}
                                onChange={(e) => setInlinePriceInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveInlinePrice(rowId, Number(inlinePriceInput) || 0);
                                  }
                                  if (e.key === "Escape") setInlinePriceRowId(null);
                                }}
                                onBlur={() =>
                                  handleSaveInlinePrice(rowId, Number(inlinePriceInput) || 0)
                                }
                                autoFocus
                                className="w-24 px-2 py-0.5 rounded bg-slate-950 border border-cyan-400 text-xs font-mono font-bold text-white text-right focus:outline-none"
                              />
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setInlinePriceInput(String(r.poolPriceDA));
                                setInlinePriceRowId(rowId);
                              }}
                              className="cursor-pointer group flex items-center justify-end gap-1.5"
                              title="Cliquer pour modifier le prix manuellement"
                            >
                              <span className="font-mono font-extrabold text-sm text-emerald-300 group-hover:text-emerald-200">
                                {r.poolPriceDA.toLocaleString("fr-DZ")}
                              </span>
                              {r.hasPriceOverride && (
                                <span className="text-[9px] font-bold text-amber-400">*</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Col 6: Mois with inline edit */}
                        <td className="p-3 text-center">
                          {isInlineEditingMonth ? (
                            <input
                              type="text"
                              defaultValue={r.currentMonth}
                              onBlur={(e) => handleSaveRowMonth(rowId, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveRowMonth(rowId, (e.target as HTMLInputElement).value);
                                }
                                if (e.key === "Escape") setEditingMonthRowId(null);
                              }}
                              autoFocus
                              className="w-20 px-1 py-0.5 rounded bg-slate-950 border border-cyan-400 text-xs text-center text-white focus:outline-none"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingMonthRowId(rowId)}
                              className="cursor-pointer px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white"
                              title="Cliquer pour modifier le mois"
                            >
                              {r.currentMonth}
                            </span>
                          )}
                        </td>

                        {/* Col 7: Actions */}
                        <td className="p-3 text-center">
                          {r.isCustom ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomRow(r.memberId)}
                              className="text-xs text-rose-400 hover:text-rose-300"
                              title="Supprimer la ligne"
                            >
                              Suppr
                            </button>
                          ) : r.hasPriceOverride ? (
                            <button
                              type="button"
                              onClick={() => handleResetPriceToAuto(rowId)}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300"
                              title="Réinitialiser au calcul automatique"
                            >
                              Auto
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 border-t-2 border-slate-700">
                    <td colSpan={4} className="p-4 text-right font-extrabold uppercase text-xs text-slate-300">
                      Grand Total Redevance Piscine :
                    </td>
                    <td className="p-4 text-right bg-cyan-500/20 font-mono font-black text-lg text-cyan-300 border-x-2 border-cyan-500">
                      {summary.totalDuePoolDA.toLocaleString("fr-DZ")} DA
                    </td>
                    <td colSpan={2} className="p-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: 100% IDENTICAL PDF ON-SCREEN PREVIEW ───────────────────────── */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Aperçu Document Officiel (100% Identique au format Demande d&apos;accès)
                </h3>
                <p className="text-xs text-slate-400">
                  {activePool.name} - {docMeta.referenceNumber} ({docMeta.date})
                </p>
              </div>
              <div className="flex items-center gap-2">
                {mode === "preview" && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 px-2.5 py-1.5 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={showNamesInPreview}
                      onChange={(e) => handleToggleShowNamesInPreview(e.target.checked)}
                      className="rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Noms</span>
                  </label>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  Imprimer / Exporter PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* Scrollable Container with exact PDF replica */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-800/80">
              <PoolPrintTemplate
                mode={mode}
                monthLabel={monthLabel}
                rows={finalRows}
                selectedIds={selectedSwimmerIds}
                totalDuePoolDA={summary.totalDuePoolDA}
                slotReservations={slotReservations}
                selectedReservationIds={selectedReservationIds}
                showNamesInPreview={showNamesInPreview}
                meta={docMeta}
                isScreenPreview={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD CUSTOM COLLECTIVE ROW (AQA KIDS, ETC.) ───────────────── */}
      <PoolCustomRowModal
        isOpen={isAddCustomRowModalOpen}
        onClose={() => setIsAddCustomRowModalOpen(false)}
        onAdd={handleAddCustomRow}
        defaultMonth={docMeta.date?.includes("/") ? "Juillet" : monthLabel}
      />

      {/* ─── PRINT TEMPLATE (RENDERED DIRECTLY WHEN USER PRINTS) ─────────────── */}
      <PoolPrintTemplate
        mode={mode}
        monthLabel={monthLabel}
        rows={finalRows}
        selectedIds={selectedSwimmerIds}
        totalDuePoolDA={summary.totalDuePoolDA}
        slotReservations={slotReservations}
        selectedReservationIds={selectedReservationIds}
        showNamesInPreview={showNamesInPreview}
        meta={docMeta}
        isScreenPreview={false}
      />
    </div>
  );
}
