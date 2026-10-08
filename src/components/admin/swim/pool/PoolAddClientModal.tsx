"use client";

import React, { useState, useMemo } from "react";
import { SwimMemberReference, SwimGroupReference, resolveMemberGroups } from "@/lib/swim-pool-dispatch";

interface PoolAddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  allMembers: SwimMemberReference[];
  allGroups: SwimGroupReference[];
  alreadySelectedIds: Set<string>;
  onAddMembers: (memberIds: string[]) => void;
}

export function PoolAddClientModal({
  isOpen,
  onClose,
  allMembers,
  allGroups,
  alreadySelectedIds,
  onAddMembers,
}: PoolAddClientModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Filter members
  const filteredMembers = useMemo(() => {
    return allMembers.filter((m) => {
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;

      if (groupFilter !== "all") {
        const assigned = resolveMemberGroups(m, allGroups);
        const hasGroup = assigned.some((g) => g.id === groupFilter);
        if (!hasGroup) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = m.fullName.toLowerCase().includes(q);
        const matchesSwimId = m.swimId.toLowerCase().includes(q);
        const matchesPhone = (m.phone || "").includes(q);
        if (!matchesName && !matchesSwimId && !matchesPhone) return false;
      }

      return true;
    });
  }, [allMembers, allGroups, categoryFilter, groupFilter, searchTerm]);

  if (!isOpen) return null;

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const selectable = filteredMembers.filter(
      (m) => !alreadySelectedIds.has(m.id) && !alreadySelectedIds.has(m.swimId)
    );
    const allChecked = selectable.length > 0 && selectable.every((m) => checkedIds.has(m.id));

    if (allChecked) {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        selectable.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        selectable.forEach((m) => next.add(m.id));
        return next;
      });
    }
  };

  const handleAddChecked = () => {
    if (checkedIds.size === 0) return;
    onAddMembers(Array.from(checkedIds));
    setCheckedIds(new Set());
    onClose();
  };

  const handleQuickAddSingle = (memberId: string) => {
    onAddMembers([memberId]);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.delete(memberId);
      return next;
    });
  };

  const availableToAddCount = filteredMembers.filter(
    (m) => !alreadySelectedIds.has(m.id) && !alreadySelectedIds.has(m.swimId)
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Ajouter un Adherent au Bordereau
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Selectionnez les adherents inscrits a envoyer a la piscine
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-[var(--border)] shrink-0">
          <div>
            <input
              type="text"
              placeholder="Rechercher par nom, SWM, tel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3.5 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Toutes les categories</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
              <option value="enfants">Enfants</option>
              <option value="apnea">Apnee</option>
            </select>
          </div>
          <div>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full px-3.5 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Tous les groupes</option>
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subheader bar with select-all */}
        <div className="py-2.5 px-1 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span>
              {filteredMembers.length} adherent{filteredMembers.length > 1 ? "s" : ""} trouve{filteredMembers.length > 1 ? "s" : ""}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400 font-semibold">
              {availableToAddCount} disponible{availableToAddCount > 1 ? "s" : ""}
            </span>
          </div>
          {availableToAddCount > 0 && (
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline"
            >
              Tout selectionner ({availableToAddCount})
            </button>
          )}
        </div>

        {/* List of Members */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Aucun adherent ne correspond a vos criteres.
            </div>
          ) : (
            filteredMembers.map((m) => {
              const isAlreadyInBordereau =
                alreadySelectedIds.has(m.id) || alreadySelectedIds.has(m.swimId);
              const isChecked = checkedIds.has(m.id);
              const assignedGroups = resolveMemberGroups(m, allGroups);

              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isAlreadyInBordereau
                      ? "bg-slate-950/40 border-white/5 opacity-60"
                      : isChecked
                      ? "bg-cyan-500/10 border-cyan-500/40"
                      : "bg-slate-900/60 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      disabled={isAlreadyInBordereau}
                      checked={isChecked}
                      onChange={() => toggleCheck(m.id)}
                      className="rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {m.fullName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-white/5">
                          {m.swimId}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-sky-950 text-sky-300 border border-sky-800/40">
                          {m.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {assignedGroups.length > 0
                          ? assignedGroups.map((g) => g.name).join(" + ")
                          : "Sans groupe assigne"}
                        {m.phone ? ` · ${m.phone}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isAlreadyInBordereau ? (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-[11px] font-semibold border border-white/5">
                        Deja present
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuickAddSingle(m.id)}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 font-bold text-xs border border-cyan-500/30 transition-colors"
                      >
                        + Ajouter
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400">
            {checkedIds.size} adherent{checkedIds.size > 1 ? "s" : ""} selectionne{checkedIds.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Fermer
            </button>
            <button
              type="button"
              disabled={checkedIds.size === 0}
              onClick={handleAddChecked}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 text-xs font-extrabold transition-colors shadow-sm"
            >
              Ajouter la selection ({checkedIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
