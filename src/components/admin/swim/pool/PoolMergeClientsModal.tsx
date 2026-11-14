"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "@/lib/i18n";
import {
  FRENCH_MONTHS,
  PoolClientMerge,
  PoolSwimmerRow,
  buildMergedDisplayNameSuggestion,
  getSwimmerDispatchGroupDisplay,
  normalizeMonth,
} from "@/lib/swim-pool-dispatch";

interface PoolMergeClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableRows: PoolSwimmerRow[];
  initialSelectedIds: string[];
  editingMerge?: PoolClientMerge | null;
  onSaveMerge: (payload: {
    id?: string;
    displayName: string;
    memberIds: string[];
    groupDisplayOverride?: string;
    manualPriceOverride?: number;
    monthOverride?: string;
  }) => void;
}

export function PoolMergeClientsModal({
  isOpen,
  onClose,
  availableRows,
  initialSelectedIds,
  editingMerge,
  onSaveMerge,
}: PoolMergeClientsModalProps) {
  const { t } = useTranslations("swimPool");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [hasEditedName, setHasEditedName] = useState(false);
  const [groupOverride, setGroupOverride] = useState("");
  const [priceOverrideInput, setPriceOverrideInput] = useState("");
  const [monthOverride, setMonthOverride] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm("");
    if (editingMerge) {
      const validIds = editingMerge.memberIds.filter((id) =>
        availableRows.some((r) => r.memberId === id || r.swimId === id)
      );
      setSelectedIds(validIds);
      setDisplayName(editingMerge.displayName || "");
      setHasEditedName(true);
      setGroupOverride(editingMerge.groupDisplayOverride || "");
      setPriceOverrideInput(
        editingMerge.manualPriceOverride !== undefined &&
          editingMerge.manualPriceOverride !== null &&
          !isNaN(editingMerge.manualPriceOverride)
          ? String(editingMerge.manualPriceOverride)
          : ""
      );
      setMonthOverride(editingMerge.monthOverride || "");
    } else {
      const preselected = availableRows
        .filter(
          (r) =>
            initialSelectedIds.includes(r.memberId) ||
            initialSelectedIds.includes(r.swimId)
        )
        .map((r) => r.memberId);
      setSelectedIds(preselected);
      const selectedRows = availableRows.filter((r) =>
        preselected.includes(r.memberId)
      );
      setDisplayName(buildMergedDisplayNameSuggestion(selectedRows));
      setHasEditedName(false);
      setGroupOverride("");
      setPriceOverrideInput("");
      setMonthOverride("");
    }
  }, [isOpen, editingMerge, initialSelectedIds, availableRows]);

  const selectedRows = useMemo(() => {
    const idSet = new Set(selectedIds);
    return availableRows.filter(
      (r) => idSet.has(r.memberId) || idSet.has(r.swimId)
    );
  }, [availableRows, selectedIds]);

  // Keep auto-suggested name updated when toggling checkboxes if user hasn't typed a custom name
  useEffect(() => {
    if (!isOpen || hasEditedName || editingMerge) return;
    setDisplayName(buildMergedDisplayNameSuggestion(selectedRows));
  }, [isOpen, hasEditedName, editingMerge, selectedRows]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return availableRows;
    const q = searchTerm.toLowerCase().trim();
    return availableRows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.swimId.toLowerCase().includes(q) ||
        getSwimmerDispatchGroupDisplay(r).toLowerCase().includes(q) ||
        (r.currentMonth || "").toLowerCase().includes(q)
    );
  }, [availableRows, searchTerm]);

  const autoSumPriceDA = useMemo(() => {
    return selectedRows.reduce((sum, r) => sum + (Number(r.poolPriceDA) || 0), 0);
  }, [selectedRows]);

  const autoGroupLabel = useMemo(() => {
    const unique: string[] = [];
    for (const r of selectedRows) {
      const label = getSwimmerDispatchGroupDisplay(r);
      if (label && label !== "-" && !unique.includes(label)) {
        unique.push(label);
      }
    }
    return unique.join(" + ") || "-";
  }, [selectedRows]);

  const autoMonthLabel = useMemo(() => {
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const r of selectedRows) {
      const m = (r.currentMonth || "").trim();
      if (!m) continue;
      const norm = normalizeMonth(m) || m.toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        unique.push(m);
      }
    }
    return unique.join(" / ") || "-";
  }, [selectedRows]);

  if (!isOpen) return null;

  const toggleMember = (memberId: string) => {
    setSelectedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const parsedManualPrice =
    priceOverrideInput.trim() !== "" && !isNaN(Number(priceOverrideInput))
      ? Math.max(0, Number(priceOverrideInput))
      : undefined;

  const effectivePreviewName =
    displayName.trim() || buildMergedDisplayNameSuggestion(selectedRows) || "...";
  const effectivePreviewGroup = groupOverride.trim() || autoGroupLabel;
  const effectivePreviewPrice =
    parsedManualPrice !== undefined ? parsedManualPrice : autoSumPriceDA;
  const effectivePreviewMonth = monthOverride.trim() || autoMonthLabel;

  const canSubmit = selectedRows.length >= 2 && displayName.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSaveMerge({
      id: editingMerge?.id,
      displayName: displayName.trim(),
      memberIds: selectedRows.map((r) => r.memberId),
      groupDisplayOverride: groupOverride.trim() || undefined,
      manualPriceOverride: parsedManualPrice,
      monthOverride: monthOverride.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-[var(--surface)] border border-cyan-500/30 p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <circle cx="8" cy="7" r="3" />
                <circle cx="16" cy="7" r="3" />
                <path d="M4 19v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1" />
                <path d="M12 11v8" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {editingMerge ? t("mergeModalTitleEdit") : t("mergeModalTitleCreate")}
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {t("mergeModalDesc")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label={t("close")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 pt-4 space-y-4">
          {/* 1. Combined PDF Display Name */}
          <div className="shrink-0">
            <label className="block text-xs font-bold text-cyan-300 mb-1.5">
              {t("mergeDisplayNameLabel")} *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder={t("mergeDisplayNamePlaceholder")}
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setHasEditedName(true);
              }}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-cyan-500/40 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* 2. Member Selection Checklist */}
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-300">
                {t("mergeSelectMembersLabel")} ({selectedRows.length})
              </span>
              <input
                type="text"
                placeholder={t("mergeSearchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1 rounded-lg bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[150px] max-h-[240px] rounded-xl bg-slate-950/60 border border-white/5 p-2">
              {filteredRows.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  {t("mergeNoEligibleMembers")}
                </div>
              ) : (
                filteredRows.map((r) => {
                  const isChecked =
                    selectedIds.includes(r.memberId) ||
                    selectedIds.includes(r.swimId);
                  return (
                    <label
                      key={r.memberId}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-cyan-500/15 border-cyan-500/40"
                          : "bg-slate-900/60 border-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMember(r.memberId)}
                          className="rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {r.fullName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                              {r.swimId}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {getSwimmerDispatchGroupDisplay(r)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                          {r.currentMonth}
                        </span>
                        <span className="font-mono font-bold text-xs text-emerald-300 min-w-[68px] text-right">
                          {r.poolPriceDA.toLocaleString("fr-DZ")} DA
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Optional Overrides */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {t("mergeGroupOverrideLabel")}
              </label>
              <input
                type="text"
                placeholder={autoGroupLabel}
                value={groupOverride}
                onChange={(e) => setGroupOverride(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {t("mergePriceOverrideLabel")}
              </label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder={`Auto (${autoSumPriceDA})`}
                value={priceOverrideInput}
                onChange={(e) => setPriceOverrideInput(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {t("mergeMonthOverrideLabel")}
              </label>
              <select
                value={monthOverride}
                onChange={(e) => setMonthOverride(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="" className="bg-slate-900 text-slate-300">
                  {t("mergeAutoOption")}
                </option>
                {FRENCH_MONTHS.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Live PDF Row Preview */}
          <div className="rounded-xl bg-slate-950 border border-cyan-500/20 p-3 shrink-0 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              {t("mergePdfPreviewLabel")}
            </div>
            <div className="grid grid-cols-12 gap-2 items-center text-xs bg-white text-slate-950 rounded-lg px-3 py-2 font-sans">
              <div className="col-span-4 font-bold truncate">{effectivePreviewName}</div>
              <div className="col-span-4 text-[11px] text-slate-700 truncate">
                {effectivePreviewGroup}
              </div>
              <div className="col-span-2 text-right font-mono font-bold text-emerald-800">
                {effectivePreviewPrice} DA
              </div>
              <div className="col-span-2 text-center font-semibold text-slate-800 text-[11px] truncate">
                {effectivePreviewMonth}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-slate-400">
              {selectedRows.length < 2
                ? t("mergeSelectHint")
                : `${selectedRows.length} · ${effectivePreviewPrice.toLocaleString("fr-DZ")} DA`}
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-extrabold transition-colors shadow-sm"
              >
                {editingMerge ? t("mergeConfirmSave") : t("mergeConfirmCreate")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
