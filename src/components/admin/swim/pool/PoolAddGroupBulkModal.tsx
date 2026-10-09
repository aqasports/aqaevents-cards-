"use client";

import React, { useState, useMemo } from "react";
import { SwimMemberReference, SwimGroupReference, resolveMemberGroups } from "@/lib/swim-pool-dispatch";

interface PoolAddGroupBulkModalProps {
  isOpen: boolean;
  onClose: () => void;
  allGroups: SwimGroupReference[];
  allMembers: SwimMemberReference[];
  alreadySelectedIds: Set<string>;
  alreadyPoolPaidIds?: Set<string>;
  onAddGroupMembers: (memberIds: string[], label: string) => void;
}

export function PoolAddGroupBulkModal({
  isOpen,
  onClose,
  allGroups,
  allMembers,
  alreadySelectedIds,
  alreadyPoolPaidIds,
  onAddGroupMembers,
}: PoolAddGroupBulkModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  // Compute members belonging to each group
  const groupStats = useMemo(() => {
    const stats: Record<
      string,
      {
        totalMembers: SwimMemberReference[];
        toAddMembers: SwimMemberReference[];
        alreadyInCount: number;
        alreadyPoolPaidCount: number;
      }
    > = {};

    for (const group of allGroups) {
      const groupSwimmers = allMembers.filter((m) => {
        const assigned = resolveMemberGroups(m, allGroups);
        return assigned.some((g) => g.id === group.id);
      });

      const alreadyInCount = groupSwimmers.filter(
        (m) => alreadySelectedIds.has(m.id) || alreadySelectedIds.has(m.swimId)
      ).length;

      const alreadyPoolPaidCount = groupSwimmers.filter(
        (m) => alreadyPoolPaidIds?.has(m.id) || alreadyPoolPaidIds?.has(m.swimId)
      ).length;

      const toAdd = groupSwimmers.filter(
        (m) =>
          !alreadySelectedIds.has(m.id) &&
          !alreadySelectedIds.has(m.swimId) &&
          !alreadyPoolPaidIds?.has(m.id) &&
          !alreadyPoolPaidIds?.has(m.swimId)
      );

      stats[group.id] = {
        totalMembers: groupSwimmers,
        toAddMembers: toAdd,
        alreadyInCount,
        alreadyPoolPaidCount,
      };
    }

    return stats;
  }, [allGroups, allMembers, alreadySelectedIds, alreadyPoolPaidIds]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return allGroups;
    const q = searchTerm.toLowerCase().trim();
    return allGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.coachName && g.coachName.toLowerCase().includes(q)) ||
        (g.schedule && g.schedule.toLowerCase().includes(q)) ||
        (g.category && g.category.toLowerCase().includes(q))
    );
  }, [allGroups, searchTerm]);

  const totalMembersToAddInSelection = useMemo(() => {
    const uniqueIds = new Set<string>();
    for (const gid of selectedGroupIds) {
      const stat = groupStats[gid];
      if (stat) {
        stat.toAddMembers.forEach((m) => uniqueIds.add(m.id));
      }
    }
    return uniqueIds.size;
  }, [selectedGroupIds, groupStats]);

  if (!isOpen) return null;

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const groupsWithAddable = filteredGroups.filter(
      (g) => (groupStats[g.id]?.toAddMembers.length || 0) > 0
    );
    const allChecked =
      groupsWithAddable.length > 0 &&
      groupsWithAddable.every((g) => selectedGroupIds.has(g.id));

    if (allChecked) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(groupsWithAddable.map((g) => g.id)));
    }
  };

  const handleAddSingleGroup = (group: SwimGroupReference) => {
    const stat = groupStats[group.id];
    if (!stat || stat.toAddMembers.length === 0) return;

    const idsToAdd = stat.toAddMembers.map((m) => m.id);
    onAddGroupMembers(idsToAdd, group.name);
    onClose();
  };

  const handleAddSelectedGroups = () => {
    if (selectedGroupIds.size === 0) return;

    const allIdsToAdd = new Set<string>();
    for (const gid of selectedGroupIds) {
      const stat = groupStats[gid];
      if (stat) {
        stat.toAddMembers.forEach((m) => allIdsToAdd.add(m.id));
      }
    }

    if (allIdsToAdd.size === 0) return;

    const label = `${selectedGroupIds.size} groupe${selectedGroupIds.size > 1 ? "s" : ""}`;
    onAddGroupMembers(Array.from(allIdsToAdd), label);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Ajouter des Adherents par Groupe (Bulk)
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Injectez en bloc tous les adherents d&apos;un ou plusieurs groupes dans le bordereau
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

        {/* Search & Actions Bar */}
        <div className="py-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] shrink-0">
          <input
            type="text"
            placeholder="Filtrer par nom de groupe, coach, horaire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[240px] px-3.5 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline"
          >
            Tout cocher / decocher
          </button>
        </div>

        {/* Group Cards List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 min-h-[220px]">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Aucun groupe trouve.
            </div>
          ) : (
            filteredGroups.map((group) => {
              const stat = groupStats[group.id] || {
                totalMembers: [],
                toAddMembers: [],
                alreadyInCount: 0,
              };
              const isChecked = selectedGroupIds.has(group.id);
              const canAdd = stat.toAddMembers.length > 0;

              return (
                <div
                  key={group.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    !canAdd
                      ? "bg-slate-950/40 border-white/5 opacity-60"
                      : isChecked
                      ? "bg-teal-500/10 border-teal-500/40"
                      : "bg-slate-900/60 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      disabled={!canAdd}
                      checked={isChecked}
                      onChange={() => toggleGroup(group.id)}
                      className="rounded border-white/20 text-teal-400 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {group.name}
                        </span>
                        {group.category && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-sky-950 text-sky-300 border border-sky-800/40">
                            {group.category}
                          </span>
                        )}
                        {group.coachName && (
                          <span className="text-[11px] text-slate-400">
                            Coach: <strong className="text-slate-300">{group.coachName}</strong>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span>{group.schedule || "Horaire non defini"}</span>
                        <span className="text-slate-600">|</span>
                        <span className="font-mono text-slate-300">
                          {stat.totalMembers.length} adherent{stat.totalMembers.length > 1 ? "s" : ""} au total
                        </span>
                        {stat.alreadyInCount > 0 && (
                          <span className="text-[10px] text-cyan-400">
                            ({stat.alreadyInCount} deja inclus)
                          </span>
                        )}
                        {stat.alreadyPoolPaidCount > 0 && (
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            ({stat.alreadyPoolPaidCount} deja poolpaid ce mois)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {canAdd ? (
                      <button
                        type="button"
                        onClick={() => handleAddSingleGroup(group)}
                        className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-400 hover:text-slate-950 text-teal-300 font-bold text-xs border border-teal-500/30 transition-colors"
                      >
                        + Ajouter {stat.toAddMembers.length}
                      </button>
                    ) : stat.alreadyPoolPaidCount > 0 && stat.alreadyInCount === 0 ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 text-[11px] font-semibold border border-emerald-500/20">
                        Tous poolpaid
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-[11px] font-semibold border border-white/5">
                        Tous inclus
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {selectedGroupIds.size} groupe{selectedGroupIds.size > 1 ? "s" : ""} coche{selectedGroupIds.size > 1 ? "s" : ""}
            <span className="text-white font-bold ml-1">
              ({totalMembersToAddInSelection} adherent{totalMembersToAddInSelection > 1 ? "s" : ""} a ajouter)
            </span>
          </div>
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
              disabled={totalMembersToAddInSelection === 0}
              onClick={handleAddSelectedGroups}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:hover:bg-teal-500 text-slate-950 text-xs font-extrabold transition-colors shadow-sm"
            >
              Ajouter les groupes ({totalMembersToAddInSelection} adherents)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
