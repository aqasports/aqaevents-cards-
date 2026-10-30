"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/admin/ui";
import {
  PerkItem,
  PremiumTierId,
  PerkDeliveryStatus,
  computePerksProgress,
  parsePerksFromNotes,
  resolveFormulaTier,
  PerkProgress,
} from "@/lib/swim-perks";
import { isMemberAssignedToGroup } from "@/lib/swim-groups";

export interface PremiumMemberRow {
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
  notes?: string | null;
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

export interface EnrichedPremiumMember extends PremiumMemberRow {
  tier: PremiumTierId;
  perks: PerkItem[];
  progress: PerkProgress;
}

interface SwimPremiumDeskProps {
  members: PremiumMemberRow[];
  onReload?: () => Promise<void> | void;
}

export function SwimPremiumDesk({ members, onReload }: SwimPremiumDeskProps) {
  const [tierFilter, setTierFilter] = useState<"all" | PremiumTierId>("all");
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "pending" | "delivered">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Managing perks modal state
  const [selectedMember, setSelectedMember] = useState<EnrichedPremiumMember | null>(null);
  const [activePerks, setActivePerks] = useState<PerkItem[]>([]);
  const [savingPerks, setSavingPerks] = useState(false);
  const [quickTogglingId, setQuickTogglingId] = useState<string | null>(null);

  // New custom perk form state in modal
  const [showAddCustomPerk, setShowAddCustomPerk] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");

  // Enrich members with tier, parsed perks and delivery progress
  const enrichedPremiumMembers = useMemo(() => {
    return members
      .filter((m) => {
        // STRICT RULE: Never give a formula or premium perks to a non-assigned client
        const isAssigned = m.isAssigned !== undefined ? m.isAssigned : isMemberAssignedToGroup(m);
        if (!isAssigned) return false;

        const tier = resolveFormulaTier(m.duration, m.formula, m);
        return tier === "silver" || tier === "gold" || tier === "diamond";
      })
      .map((m) => {
        const tier = resolveFormulaTier(m.duration, m.formula, m) as PremiumTierId;
        const perks = parsePerksFromNotes(m.notes, m);
        const progress = computePerksProgress(perks);

        return {
          ...m,
          tier,
          perks,
          progress,
        };
      });
  }, [members]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalSubscribers = enrichedPremiumMembers.length;
    const silverCount = enrichedPremiumMembers.filter((m) => m.tier === "silver").length;
    const goldCount = enrichedPremiumMembers.filter((m) => m.tier === "gold").length;
    const diamondCount = enrichedPremiumMembers.filter((m) => m.tier === "diamond").length;

    let totalPerks = 0;
    let deliveredPerks = 0;
    let pendingPerks = 0;
    let fullyDeliveredCount = 0;

    enrichedPremiumMembers.forEach((m) => {
      totalPerks += m.progress.total;
      deliveredPerks += m.progress.delivered;
      pendingPerks += m.progress.pending + m.progress.inProgress;
      if (m.progress.isFullyDelivered) {
        fullyDeliveredCount += 1;
      }
    });

    const completionRate =
      totalPerks > 0 ? Math.round((deliveredPerks / totalPerks) * 100) : 100;

    return {
      totalSubscribers,
      silverCount,
      goldCount,
      diamondCount,
      totalPerks,
      deliveredPerks,
      pendingPerks,
      fullyDeliveredCount,
      pendingDeliveriesCount: totalSubscribers - fullyDeliveredCount,
      completionRate,
    };
  }, [enrichedPremiumMembers]);

  // Filtered members for display
  const filteredMembers = useMemo(() => {
    return enrichedPremiumMembers.filter((m) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.swimId.toLowerCase().includes(q) ||
        m.formula.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (tierFilter !== "all" && m.tier !== tierFilter) return false;

      if (deliveryFilter === "pending") {
        if (m.progress.isFullyDelivered) return false;
      } else if (deliveryFilter === "delivered") {
        if (!m.progress.isFullyDelivered) return false;
      }

      return true;
    });
  }, [enrichedPremiumMembers, searchTerm, tierFilter, deliveryFilter]);

  // Open manage modal for a member
  function handleOpenManageModal(m: typeof enrichedPremiumMembers[0]) {
    setSelectedMember(m);
    setActivePerks(JSON.parse(JSON.stringify(m.perks)));
    setShowAddCustomPerk(false);
    setCustomTitle("");
    setCustomDescription("");
  }

  // Quick toggle status of a perk directly from table row
  async function handleQuickTogglePerk(
    memberId: string,
    perk: PerkItem,
    e: React.MouseEvent
  ) {
    e.stopPropagation();
    const newStatus: PerkDeliveryStatus =
      perk.status === "delivered" ? "pending" : "delivered";

    setQuickTogglingId(`${memberId}_${perk.id}`);

    try {
      const res = await fetch("/api/admin/swim/perks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          perkId: perk.id,
          status: newStatus,
          deliveredAt: newStatus === "delivered" ? new Date().toISOString() : null,
          deliveredBy: newStatus === "delivered" ? "Staff Admin" : null,
        }),
      });

      if (res.ok && onReload) {
        await onReload();
      }
    } catch (err) {
      console.error("Failed to quick toggle perk:", err);
    } finally {
      setQuickTogglingId(null);
    }
  }

  // Save changes from inside modal
  async function handleSaveModalPerks() {
    if (!selectedMember) return;
    setSavingPerks(true);

    try {
      const res = await fetch("/api/admin/swim/perks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember.id,
          replacePerks: activePerks,
        }),
      });

      if (res.ok) {
        setSelectedMember(null);
        if (onReload) {
          await onReload();
        }
      }
    } catch (err) {
      console.error("Failed to save member perks:", err);
    } finally {
      setSavingPerks(false);
    }
  }

  // Add custom perk into activePerks list
  function handleAddCustomPerk() {
    if (!customTitle.trim()) return;
    const newCustom: PerkItem = {
      id: `custom_${Date.now()}`,
      title: customTitle.trim(),
      description: customDescription.trim(),
      status: "pending",
      isCustom: true,
    };
    setActivePerks((prev) => [...prev, newCustom]);
    setCustomTitle("");
    setCustomDescription("");
    setShowAddCustomPerk(false);
  }

  // Remove perk from activePerks list
  function handleRemovePerk(perkId: string) {
    setActivePerks((prev) => prev.filter((p) => p.id !== perkId));
  }

  // Update a single perk property in modal state
  function handleUpdateActivePerk(
    perkId: string,
    updates: Partial<PerkItem>
  ) {
    setActivePerks((prev) =>
      prev.map((p) => (p.id === perkId ? { ...p, ...updates } : p))
    );
  }

  // WhatsApp notification URL generator
  function getPerkNotifyWhatsAppUrl(m: PremiumMemberRow, perk: PerkItem): string {
    const cleanPhone = m.phone.replace(/[^0-9]/g, "");
    const intlPhone = cleanPhone.startsWith("0")
      ? "213" + cleanPhone.slice(1)
      : cleanPhone.startsWith("213")
      ? cleanPhone
      : "213" + cleanPhone;

    let message = "";
    if (perk.id === "video_analysis") {
      message = `Salam ${m.fullName}, votre analyse technique vidéo personnalisée AQA Swim (${m.formula}) a été effectuée par nos coachs d'élite ! Nous sommes ravis de vous transmettre votre rapport technique.`;
    } else if (perk.id === "arena_pack") {
      message = `Salam ${m.fullName}, votre Pack Équipement Arena officiel inclus dans votre formule AQA Swim (${m.formula}) est prêt et vous attend au bureau d'accueil du bassin.`;
    } else if (perk.id === "mobile_app") {
      message = `Salam ${m.fullName}, vos accès premium à l'application mobile AQA Sports sont désormais activés avec votre formule (${m.formula}). Vous pouvez suivre vos séances et temps de passage en direct.`;
    } else if (perk.id === "apnea_month") {
      message = `Salam ${m.fullName}, votre mois d'initiation offert à l'apnée AQA Apnea est disponible ! Quand souhaitez-vous planifier votre première séance avec nos instructeurs ?`;
    } else if (perk.id === "guest_passes") {
      message = `Salam ${m.fullName}, vos 2 séances test découvertes pour vos proches sont prêtes à être utilisées au bassin AQA. Contactez-nous pour réserver leurs créneaux.`;
    } else {
      message = `Salam ${m.fullName}, votre avantage "${perk.title}" inclus dans votre formule AQA Swim est disponible.`;
    }

    return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
  }

  // Helper color for tier badges
  function getTierBadgeClass(tier: PremiumTierId): { badge: string; text: string; bg: string; border: string } {
    if (tier === "diamond") {
      return {
        badge: "Diamond Pass · 9 Mois",
        text: "text-purple-300",
        bg: "bg-purple-950/60",
        border: "border-purple-500/40",
      };
    }
    if (tier === "gold") {
      return {
        badge: "Gold Pass · 6 Mois",
        text: "text-amber-300",
        bg: "bg-amber-950/60",
        border: "border-amber-500/40",
      };
    }
    return {
      badge: "Silver Pass · 3 Mois",
      text: "text-slate-200",
      bg: "bg-slate-800",
      border: "border-slate-500/30",
    };
  }

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-900/80 to-slate-900/90 border border-purple-500/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Formules Premium
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-white/10">
              Silver (3m) · Gold (6m) · Diamond (9m)
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Gestion des 3 Formules Premium & Délivrance des Avantages
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Suivi personnalisé des abonnés Silver, Gold et Diamond. Gérez les avantages exclusifs (analyse vidéo, pack Arena, application mobile, initiation apnée, pass invités) et suivez l&apos;état de délivrance.
          </p>
        </div>

        {/* Global Progress Pill */}
        <div className="shrink-0 p-3 rounded-xl bg-slate-900/90 border border-purple-500/30 text-right space-y-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Taux de Délivrance Global</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-purple-300">
            {stats.completionRate}%
          </div>
          <div className="text-[11px] text-slate-400">
            {stats.deliveredPerks} sur {stats.totalPerks} avantages délivrés
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Abonnés Premium</p>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" title="Silver" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Gold" />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" title="Diamond" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-white">{stats.totalSubscribers}</p>
          <div className="flex gap-1.5 text-[10px] text-slate-400">
            <span>{stats.silverCount} Silver</span>
            <span>·</span>
            <span>{stats.goldCount} Gold</span>
            <span>·</span>
            <span>{stats.diamondCount} Diamond</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-1">
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Avantages en Circulation</p>
          <p className="text-xl font-bold font-mono text-slate-200">{stats.totalPerks}</p>
          <p className="text-[11px] text-slate-400">Total des dotations souscrites</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-emerald-400 uppercase font-semibold tracking-wider">Avantages Délivrés</p>
            <span className="text-[10px] font-mono text-emerald-300 font-bold">{stats.completionRate}%</span>
          </div>
          <p className="text-xl font-bold font-mono text-emerald-300">{stats.deliveredPerks}</p>
          <p className="text-[11px] text-slate-400">{stats.fullyDeliveredCount} abonnés comblés à 100%</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/20 space-y-1">
          <p className="text-[10px] text-amber-400 uppercase font-semibold tracking-wider">En Attente de Délivrance</p>
          <p className={`text-xl font-bold font-mono ${stats.pendingPerks > 0 ? "text-amber-300" : "text-slate-400"}`}>
            {stats.pendingPerks}
          </p>
          <p className="text-[11px] text-slate-400">
            {stats.pendingDeliveriesCount} nageur{stats.pendingDeliveriesCount !== 1 ? "s" : ""} à doter
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Rechercher nom, téléphone, ID nageur..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64"
        />

        {/* Tier filter */}
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: "all", label: "Toutes les Formules (3)" },
            { key: "silver", label: `Silver 3m (${stats.silverCount})` },
            { key: "gold", label: `Gold 6m (${stats.goldCount})` },
            { key: "diamond", label: `Diamond 9m (${stats.diamondCount})` },
          ] as const).map(({ key: t, label }) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                tierFilter === t
                  ? t === "diamond"
                    ? "bg-purple-800 text-white"
                    : t === "gold"
                    ? "bg-amber-700 text-white"
                    : t === "silver"
                    ? "bg-slate-700 text-white"
                    : "bg-[var(--primary)] text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white border border-white/8"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Delivery status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: "all", label: "Tous États" },
            { key: "pending", label: `En Attente (${stats.pendingDeliveriesCount})` },
            { key: "delivered", label: `100% Délivrés (${stats.fullyDeliveredCount})` },
          ] as const).map(({ key: d, label }) => (
            <button
              key={d}
              onClick={() => setDeliveryFilter(d)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                deliveryFilter === d
                  ? d === "pending"
                    ? "bg-amber-900/80 text-amber-200 border border-amber-500/40"
                    : d === "delivered"
                    ? "bg-emerald-900/80 text-emerald-200 border border-emerald-500/40"
                    : "bg-slate-700 text-white"
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

      {/* Table of Premium Subscribers & Features */}
      <div className="rounded-2xl bg-slate-900/80 border border-white/8 overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[1050px]">
          <thead>
            <tr className="border-b border-white/8 text-[10px] text-slate-400 uppercase tracking-wider">
              <th className="px-3 py-2.5 font-semibold">Nageur</th>
              <th className="px-3 py-2.5 font-semibold">Formule Premium</th>
              <th className="px-3 py-2.5 font-semibold">Période d&apos;Abonnement</th>
              <th className="px-3 py-2.5 font-semibold">Progression Délivrance</th>
              <th className="px-3 py-2.5 font-semibold">Avantages Inclus & Statuts Directs</th>
              <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-xs">
                  Aucun abonné formule Premium ne correspond aux filtres sélectionnés.
                </td>
              </tr>
            )}
            {filteredMembers.map((m) => {
              const tierStyle = getTierBadgeClass(m.tier);
              const subStartDisplay = `${String(m.subStart.getUTCDate()).padStart(2, "0")}/${String(m.subStart.getUTCMonth() + 1).padStart(2, "0")}/${m.subStart.getUTCFullYear()}`;
              const subEndDisplay = `${String(m.subEnd.getUTCDate()).padStart(2, "0")}/${String(m.subEnd.getUTCMonth() + 1).padStart(2, "0")}/${m.subEnd.getUTCFullYear()}`;

              return (
                <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Swimmer */}
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-white leading-tight">{m.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{m.swimId}</div>
                    <div className="text-[10px] text-slate-500">{m.phone}</div>
                    {m.group && (
                      <div className="text-[10px] text-cyan-400/80 mt-0.5 truncate max-w-[160px]">
                        {m.group.name}
                      </div>
                    )}
                  </td>

                  {/* Formula Badge */}
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}`}>
                      {tierStyle.badge}
                    </span>
                    <div className="text-[11px] text-slate-300 font-medium mt-1">
                      {m.formula}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {m.effectivePriceDA.toLocaleString("fr-DZ")} DA
                    </div>
                  </td>

                  {/* Period & Days Left */}
                  <td className="px-3 py-2.5 font-mono text-[11px]">
                    <div className="text-slate-300">{subStartDisplay}</div>
                    <div className="text-slate-500 text-[10px]">au {subEndDisplay}</div>
                    <div className="text-[10px] font-semibold text-cyan-300 mt-0.5">
                      {m.daysLeft > 0 ? `${m.daysLeft}j restants` : "Échu"}
                    </div>
                  </td>

                  {/* Deliverance Progress */}
                  <td className="px-3 py-2.5">
                    <div className="w-36 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-300">
                          {m.progress.delivered}/{m.progress.total} délivrés
                        </span>
                        <span className={`font-mono font-bold ${m.progress.isFullyDelivered ? "text-emerald-400" : "text-amber-300"}`}>
                          {m.progress.percent}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            m.progress.isFullyDelivered
                              ? "bg-emerald-400"
                              : m.progress.percent > 0
                              ? "bg-amber-400"
                              : "bg-slate-700"
                          }`}
                          style={{ width: `${Math.max(4, m.progress.percent)}%` }}
                        />
                      </div>
                      {m.progress.isFullyDelivered ? (
                        <span className="inline-block text-[9px] font-bold text-emerald-400">
                          Complet · Tout délivré
                        </span>
                      ) : (
                        <span className="inline-block text-[9px] text-amber-400/90">
                          {m.progress.pending + m.progress.inProgress} en attente
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Extra Features Chips */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {m.perks.map((perk) => {
                        const isToggling = quickTogglingId === `${m.id}_${perk.id}`;
                        const isDelivered = perk.status === "delivered";
                        const isInProgress = perk.status === "in_progress";

                        return (
                          <button
                            key={perk.id}
                            type="button"
                            onClick={(e) => handleQuickTogglePerk(m.id, perk, e)}
                            disabled={isToggling}
                            title={`Cliquer pour basculer : ${perk.title} (${perk.status})${perk.notes ? ` - ${perk.notes}` : ""}`}
                            className={`group inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all border ${
                              isDelivered
                                ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/70"
                                : isInProgress
                                ? "bg-sky-950/70 border-sky-500/40 text-sky-200 hover:bg-sky-900/70"
                                : "bg-slate-800/80 border-white/10 text-slate-300 hover:border-amber-500/40 hover:text-amber-200"
                            } ${isToggling ? "opacity-50" : ""}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isDelivered ? "bg-emerald-400" : isInProgress ? "bg-sky-400" : "bg-amber-400"}`} />
                            <span className="truncate max-w-[130px]">{perk.title}</span>
                            <span className="text-[9px] opacity-70 group-hover:opacity-100 inline-flex items-center">
                              {isDelivered ? (
                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                "○"
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleOpenManageModal(m)}
                      className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-200 hover:bg-purple-900/60 text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                    >
                      <span>Gérer Avantages</span>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Feature Deliverance Management Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Délivrance des Avantages · {selectedMember.fullName}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getTierBadgeClass(selectedMember.tier).bg} ${getTierBadgeClass(selectedMember.tier).text} border ${getTierBadgeClass(selectedMember.tier).border}`}>
                    {selectedMember.tier.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {selectedMember.swimId} · {selectedMember.phone} · Formule: {selectedMember.formula} ({selectedMember.duration})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                aria-label="Close"
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body: Feature items */}
            <div className="py-4 space-y-3 overflow-y-auto flex-1 pr-1">
              {activePerks.map((perk) => {
                const waUrl = getPerkNotifyWhatsAppUrl(selectedMember, perk);
                return (
                  <div
                    key={perk.id}
                    className="p-3.5 rounded-xl bg-slate-800/60 border border-white/8 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{perk.title}</span>
                          {perk.isCustom && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-950/80 text-sky-300 border border-sky-500/30">
                              Sur-mesure
                            </span>
                          )}
                        </div>
                        {perk.description && (
                          <p className="text-[11px] text-slate-400">{perk.description}</p>
                        )}
                      </div>

                      {/* Status Selector */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={perk.status}
                          onChange={(e) =>
                            handleUpdateActivePerk(perk.id, {
                              status: e.target.value as PerkDeliveryStatus,
                              deliveredAt:
                                e.target.value === "delivered"
                                  ? perk.deliveredAt || new Date().toISOString()
                                  : perk.deliveredAt,
                            })
                          }
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border focus:outline-none ${
                            perk.status === "delivered"
                              ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                              : perk.status === "in_progress"
                              ? "bg-sky-950/80 text-sky-300 border-sky-500/40"
                              : perk.status === "cancelled"
                              ? "bg-slate-800 text-slate-400 border-white/10"
                              : "bg-amber-950/80 text-amber-300 border-amber-500/40"
                          }`}
                        >
                          <option value="pending">En attente</option>
                          <option value="in_progress">En cours</option>
                          <option value="delivered">Délivré</option>
                          <option value="cancelled">Annulé</option>
                        </select>

                        {/* WhatsApp Notify Link */}
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60 text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                          title="Notifier le nageur sur WhatsApp pour cet avantage"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.554 4.107 1.527 5.832L0 24l6.335-1.509A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.98 0-3.831-.545-5.415-1.49l-.388-.233-3.763.897.934-3.676-.253-.398A9.786 9.786 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                          </svg>
                          WhatsApp
                        </a>

                        {/* Remove custom perk button */}
                        {perk.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleRemovePerk(perk.id)}
                            className="text-rose-400 hover:text-rose-200 text-xs px-1.5 py-1 inline-flex items-center"
                            title="Supprimer cet avantage sur-mesure"
                            aria-label="Supprimer cet avantage sur-mesure"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delivery Details Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/5">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                          Remis par / Responsable
                        </label>
                        <input
                          type="text"
                          placeholder="Nom du coach ou staff..."
                          value={perk.deliveredBy || ""}
                          onChange={(e) =>
                            handleUpdateActivePerk(perk.id, { deliveredBy: e.target.value })
                          }
                          className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-[11px] focus:outline-none focus:border-purple-400"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                          Notes & Détails de livraison
                        </label>
                        <input
                          type="text"
                          placeholder="Taille L, date séance test, lien vidéo..."
                          value={perk.notes || ""}
                          onChange={(e) =>
                            handleUpdateActivePerk(perk.id, { notes: e.target.value })
                          }
                          className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-[11px] focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Custom Perk Section */}
              {showAddCustomPerk ? (
                <div className="p-3 rounded-xl bg-slate-800/90 border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300">
                      Ajouter un Avantage Spécial Sur-Mesure
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomPerk(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Annuler
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Titre de l'avantage (ex: Séance Privée Récupération)..."
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400"
                  />
                  <input
                    type="text"
                    placeholder="Description ou conditions..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomPerk}
                    disabled={!customTitle.trim()}
                    className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-bold"
                  >
                    Confirmer l&apos;ajout
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddCustomPerk(true)}
                  className="w-full py-2 rounded-xl border border-dashed border-white/15 hover:border-purple-400/50 text-slate-400 hover:text-purple-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>+ Ajouter un Avantage Complémentaire</span>
                </button>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleSaveModalPerks}
                disabled={savingPerks}
                className="px-5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold disabled:opacity-50 transition-colors"
              >
                {savingPerks ? "Enregistrement..." : "Enregistrer les Avantages"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
