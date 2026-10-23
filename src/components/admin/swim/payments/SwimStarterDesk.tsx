"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/admin/ui";
import { isMemberAssignedToGroup } from "@/lib/swim-groups";

export interface StarterMemberRow {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  category: string;
  level: string;
  formula: string;
  duration?: string | null;
  effectivePriceDA: number;
  totalPaid: number;
  debt: number;
  paymentStatus: string;
  subStart: Date;
  subEnd: Date;
  daysLeft: number;
  subStatus: string;
  expiringSoon: boolean;
  isStarter: boolean;
  isAssigned?: boolean;
  effectivelyUnassigned?: boolean;
  groups?: Array<{ id: string; active?: boolean }>;
  group?: {
    id: string;
    name: string;
    coachName?: string | null;
    schedule?: string | null;
    active?: boolean;
  } | null;
}

interface SwimStarterDeskProps {
  members: StarterMemberRow[];
  onRecordPayment?: (member: StarterMemberRow) => void;
}

export function SwimStarterDesk({ members, onRecordPayment }: SwimStarterDeskProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "partial" | "unpaid" | "expiring">("all");

  // Filter only Starter formula subscribers
  const starterMembers = useMemo(() => {
    return members.filter((m) => {
      // STRICT RULE: Non-assigned clients never have a formula or expectations
      const isAssigned = m.isAssigned !== undefined ? m.isAssigned : isMemberAssignedToGroup(m);
      if (!isAssigned) return false;
      return m.isStarter;
    });
  }, [members]);

  // Compute Next Month Expectation Totals
  const totalStarterCount = starterMembers.length;
  const totalExpectedNextMonth = useMemo(() => {
    return starterMembers.reduce((sum, m) => sum + (m.effectivePriceDA || 0), 0);
  }, [starterMembers]);

  const totalCollectedCurrentMonth = useMemo(() => {
    return starterMembers.reduce((sum, m) => sum + (m.totalPaid || 0), 0);
  }, [starterMembers]);

  const averageMonthlyPrice =
    totalStarterCount > 0 ? Math.round(totalExpectedNextMonth / totalStarterCount) : 0;

  const expiringThisMonthCount = useMemo(() => {
    return starterMembers.filter((m) => m.daysLeft <= 14).length;
  }, [starterMembers]);

  // Formula Breakdown (G10, MAX5, INDIVID, Compound...)
  const formulaBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; totalDA: number; unitPrice: number }>();

    starterMembers.forEach((m) => {
      const key = m.formula || "G10";
      const existing = map.get(key) || { count: 0, totalDA: 0, unitPrice: m.effectivePriceDA };
      existing.count += 1;
      existing.totalDA += m.effectivePriceDA;
      map.set(key, existing);
    });

    return Array.from(map.entries()).map(([formula, data]) => ({
      formula,
      count: data.count,
      totalDA: data.totalDA,
      unitPrice: data.unitPrice,
      percent: totalExpectedNextMonth > 0 ? Math.round((data.totalDA / totalExpectedNextMonth) * 100) : 0,
    })).sort((a, b) => b.totalDA - a.totalDA);
  }, [starterMembers, totalExpectedNextMonth]);

  // Filtered members for table
  const filteredMembers = useMemo(() => {
    return starterMembers.filter((m) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.swimId.toLowerCase().includes(q) ||
        m.formula.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (statusFilter === "all") return true;
      if (statusFilter === "paid") return m.paymentStatus === "paid";
      if (statusFilter === "partial") return m.paymentStatus === "partial";
      if (statusFilter === "unpaid") return m.paymentStatus === "unpaid";
      if (statusFilter === "expiring") return m.daysLeft <= 14;
      return true;
    });
  }, [starterMembers, searchTerm, statusFilter]);

  // Next month label calculation
  const nextMonthInfo = useMemo(() => {
    const now = new Date();
    const nextMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const monthName = nextMonthDate.toLocaleDateString("fr-DZ", { month: "long", year: "numeric", timeZone: "UTC" });
    const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return {
      monthLabel: capitalized,
      firstDayDisplay: `01/${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}/${nextMonthDate.getUTCFullYear()}`,
    };
  }, []);

  function getStarterWhatsAppUrl(m: StarterMemberRow): string {
    const cleanPhone = m.phone.replace(/[^0-9]/g, "");
    const intlPhone = cleanPhone.startsWith("0")
      ? "213" + cleanPhone.slice(1)
      : cleanPhone.startsWith("213")
      ? cleanPhone
      : "213" + cleanPhone;

    const subEndDisplay = `${String(m.subEnd.getUTCDate()).padStart(2, "0")}/${String(m.subEnd.getUTCMonth() + 1).padStart(2, "0")}/${m.subEnd.getUTCFullYear()}`;
    const groupName = m.group?.name ? `groupe ${m.group.name}` : "groupe d'entraînement";
    const amountStr = `${m.effectivePriceDA.toLocaleString("fr-DZ")} DA`;

    const message = `Salam ${m.fullName}, nous espérons que vos séances AQA Swim se passent bien. Votre abonnement Starter (${m.formula}) arrive à échéance le ${subEndDisplay}. Votre place dans le ${groupName} est réservée pour le mois prochain (${nextMonthInfo.monthLabel}). Souhaitez-vous renouveler votre abonnement (Tarif: ${amountStr}) ?`;

    return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
  }

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-900/80 to-slate-900/90 border border-sky-500/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Formule Starter · 1 Mois
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-white/10">
              Prévisions {nextMonthInfo.monthLabel}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Suivi des Abonnés Starter & Prévisions Financières
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            La formule Starter suit un cycle mensuel strict se clôturant au dernier jour du mois. Consultez ci-dessous les projections de revenus attendus pour le mois prochain basées sur le total des abonnés actifs.
          </p>
        </div>

        {/* Highlight Summary Pill */}
        <div className="shrink-0 p-3 rounded-xl bg-slate-900/90 border border-sky-500/30 text-right">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Attendu pour {nextMonthInfo.monthLabel}</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-300">
            {totalExpectedNextMonth.toLocaleString("fr-DZ")} DA
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalStarterCount} abonné{totalStarterCount !== 1 ? "s" : ""} au tarif Starter
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Abonnés Starter</p>
            <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          </div>
          <p className="text-xl font-bold font-mono text-white">{totalStarterCount}</p>
          <p className="text-[11px] text-slate-400">Total abonnements 1 mois</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-sky-500/20 space-y-1 shadow-[0_0_15px_rgba(14,165,233,0.1)]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-sky-400 uppercase font-semibold tracking-wider">Total Attendu Mois Prochain</p>
            <span className="text-[10px] text-sky-300 font-mono font-bold">100%</span>
          </div>
          <p className="text-xl font-bold font-mono text-cyan-300">
            {totalExpectedNextMonth.toLocaleString("fr-DZ")} DA
          </p>
          <p className="text-[11px] text-slate-400">Cumul des formules Starter</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-1">
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Tarif Mensuel Moyen</p>
          <p className="text-xl font-bold font-mono text-slate-200">
            {averageMonthlyPrice.toLocaleString("fr-DZ")} DA
          </p>
          <p className="text-[11px] text-slate-400">Moyenne pondérée par nageur</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-1">
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Échéances en Cours</p>
          <p className={`text-xl font-bold font-mono ${expiringThisMonthCount > 0 ? "text-amber-400" : "text-slate-400"}`}>
            {expiringThisMonthCount}
          </p>
          <p className="text-[11px] text-slate-400">Clôture fin de mois sous 14j</p>
        </div>
      </div>

      {/* Formula Breakdown Matrix */}
      {formulaBreakdown.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Répartition par Type de Formule & Projections Détaillées
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Cycle de facturation mensuel
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {formulaBreakdown.map((item) => (
              <div
                key={item.formula}
                className="p-3 rounded-xl bg-slate-800/60 border border-white/6 hover:border-sky-500/30 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">{item.formula}</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-500/30">
                    {item.count} abonné{item.count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-cyan-300">
                  {item.totalDA.toLocaleString("fr-DZ")} DA
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                  <span>Tarif: {item.unitPrice.toLocaleString("fr-DZ")} DA/m</span>
                  <span>{item.percent}% du total</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Rechercher nom, téléphone, ID nageur..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64"
        />
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: "all", label: "Tous les Starter" },
            { key: "paid", label: "Payés (En Règle)" },
            { key: "partial", label: "Partiels" },
            { key: "unpaid", label: "Non Payés" },
            { key: "expiring", label: `Échéance Proche (${expiringThisMonthCount})` },
          ] as const).map(({ key: f, label }) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                statusFilter === f
                  ? f === "paid"
                    ? "bg-emerald-700 text-white"
                    : f === "partial"
                    ? "bg-amber-700 text-white"
                    : f === "unpaid"
                    ? "bg-rose-800 text-white"
                    : f === "expiring"
                    ? "bg-amber-900 text-amber-200"
                    : "bg-[var(--primary)] text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white border border-white/8"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-500 ml-auto font-mono">
          {filteredMembers.length} abonné{filteredMembers.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table of Starter Subscribers */}
      <div className="rounded-2xl bg-slate-900/80 border border-white/8 overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[950px]">
          <thead>
            <tr className="border-b border-white/8 text-[10px] text-slate-400 uppercase tracking-wider">
              <th className="px-3 py-2.5 font-semibold">Nageur</th>
              <th className="px-3 py-2.5 font-semibold">Groupe / Créneau</th>
              <th className="px-3 py-2.5 font-semibold">Formule Mensuelle</th>
              <th className="px-3 py-2.5 font-semibold">Période en Cours</th>
              <th className="px-3 py-2.5 font-semibold text-center">Jours Restants</th>
              <th className="px-3 py-2.5 font-semibold">Statut Mois</th>
              <th className="px-3 py-2.5 font-semibold">Prévision Mois Prochain</th>
              <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-xs">
                  Aucun abonné formule Starter ne correspond aux filtres sélectionnés.
                </td>
              </tr>
            )}
            {filteredMembers.map((m) => {
              const subStartDisplay = `${String(m.subStart.getUTCDate()).padStart(2, "0")}/${String(m.subStart.getUTCMonth() + 1).padStart(2, "0")}/${m.subStart.getUTCFullYear()}`;
              const subEndDisplay = `${String(m.subEnd.getUTCDate()).padStart(2, "0")}/${String(m.subEnd.getUTCMonth() + 1).padStart(2, "0")}/${m.subEnd.getUTCFullYear()}`;
              const waUrl = getStarterWhatsAppUrl(m);

              const rowBg =
                m.daysLeft <= 7 && m.paymentStatus === "paid"
                  ? "bg-amber-950/20"
                  : m.paymentStatus === "unpaid"
                  ? "bg-rose-950/15"
                  : m.paymentStatus === "partial"
                  ? "bg-amber-950/15"
                  : "";

              return (
                <tr key={m.id} className={`hover:bg-slate-800/40 transition-colors ${rowBg}`}>
                  {/* Swimmer */}
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-white leading-tight">{m.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{m.swimId}</div>
                    <div className="text-[10px] text-slate-500">{m.phone}</div>
                  </td>

                  {/* Group / Schedule */}
                  <td className="px-3 py-2.5">
                    {m.group ? (
                      <div>
                        <span className="font-semibold text-slate-200">{m.group.name}</span>
                        {m.group.schedule && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px]" title={m.group.schedule}>
                            {m.group.schedule}
                          </div>
                        )}
                        {m.group.coachName && (
                          <div className="text-[10px] text-cyan-400/80">Coach: {m.group.coachName}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Non assigné</span>
                    )}
                  </td>

                  {/* Formula */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sky-400">{m.formula}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-950/60 text-sky-300 border border-sky-500/20">
                        1 Mois
                      </span>
                    </div>
                    <div className="font-mono text-slate-300 text-[11px] mt-0.5">
                      {m.effectivePriceDA.toLocaleString("fr-DZ")} DA/mois
                    </div>
                  </td>

                  {/* Current Period */}
                  <td className="px-3 py-2.5 font-mono text-[11px]">
                    <div className="text-slate-300">{subStartDisplay}</div>
                    <div className="text-slate-500 text-[10px]">au {subEndDisplay}</div>
                  </td>

                  {/* Days Left */}
                  <td className="px-3 py-2.5 text-center">
                    {m.daysLeft <= 0 ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-950/80 text-rose-300 border border-rose-500/30 font-bold">
                        Échu
                      </span>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className={`font-mono font-bold text-xs ${m.daysLeft <= 7 ? "text-amber-300" : "text-white"}`}>
                          {m.daysLeft}j
                        </span>
                        <span className="text-[9px] text-slate-500">fin de mois</span>
                      </div>
                    )}
                  </td>

                  {/* Payment Status */}
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      m.paymentStatus === "paid"
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                        : m.paymentStatus === "partial"
                        ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                        : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                    }`}>
                      {m.paymentStatus}
                    </span>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Payé: {m.totalPaid.toLocaleString("fr-DZ")} DA
                    </div>
                  </td>

                  {/* Next Month Projection */}
                  <td className="px-3 py-2.5">
                    <div className="p-1.5 rounded-lg bg-sky-950/40 border border-sky-500/20 space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-sky-300 font-semibold">
                        <span>{nextMonthInfo.monthLabel}</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          +{m.effectivePriceDA.toLocaleString("fr-DZ")} DA
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Renouvellement dès le {nextMonthInfo.firstDayDisplay}
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                        title="Envoyer une invitation de renouvellement pour le mois prochain sur WhatsApp"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.554 4.107 1.527 5.832L0 24l6.335-1.509A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.98 0-3.831-.545-5.415-1.49l-.388-.233-3.763.897.934-3.676-.253-.398A9.786 9.786 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                        </svg>
                        Renouveler
                      </a>
                      {onRecordPayment && (
                        <button
                          onClick={() => onRecordPayment(m)}
                          className="px-2 py-1 rounded-lg bg-sky-950/60 border border-sky-500/30 text-sky-300 hover:bg-sky-900/60 text-[10px] font-bold transition-colors"
                        >
                          + Encaisser
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
