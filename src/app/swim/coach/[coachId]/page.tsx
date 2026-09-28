"use client";

import { use, useEffect, useState, useMemo } from "react";
import { parseScheduleSlots } from "@/lib/swim-groups";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SwimmerView {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  category: string;
  level: string;
  formula: string;
  duration: string | null;
  priceDA: number;
  paymentStatus: "paid" | "partial" | "unpaid";
  groupStatus: string;
  totalPaid: number;
  remaining: number;
  paymentCount: number;
  cardCode: string | null;
  cardStatus: string | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
}

interface GroupSummary {
  total: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  totalExpected: number;
  totalCollected: number;
  collectionRate: number;
}

interface GroupView {
  id: string;
  name: string;
  category: string;
  level: string;
  schedule: string;
  capacity: number;
  isSolid: boolean;
  cleanNotes: string;
  swimmers: SwimmerView[];
  summary: GroupSummary;
}

interface CoachData {
  coach: { id: string; name: string; specialties: string | null };
  groups: GroupView[];
  generatedAt: string;
}

// ─── Payment Badge ─────────────────────────────────────────────────────────────

function PaymentBadge({ status }: { status: SwimmerView["paymentStatus"] }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
        Paye
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/50">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
        Partiel
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-950/60 text-red-400 border border-red-800/50">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />
      Non paye
    </span>
  );
}

// ─── Group Status Badge ────────────────────────────────────────────────────────

function GroupStatusBadge({ status }: { status: string }) {
  if (status === "accepted") {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
        Accepte
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/60 text-red-400 border border-red-800/40">
        Rejete
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/10">
      Propose
    </span>
  );
}

// ─── Category Label ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  homme: "Homme",
  femme: "Femme",
  enfants: "Enfants",
  apnea: "Apnee",
};

const CATEGORY_COLORS: Record<string, string> = {
  homme: "text-sky-400 border-sky-800/40 bg-sky-950/40",
  femme: "text-pink-400 border-pink-800/40 bg-pink-950/40",
  enfants: "text-violet-400 border-violet-800/40 bg-violet-950/40",
  apnea: "text-teal-400 border-teal-800/40 bg-teal-950/40",
};

function formatDA(amount: number): string {
  return amount.toLocaleString("fr-DZ") + " DA";
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-DZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Schedule Display ─────────────────────────────────────────────────────────

function ScheduleChips({ schedule }: { schedule: string }) {
  const slots = parseScheduleSlots(schedule);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {slots.map((s, idx) => (
        <span
          key={idx}
          className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-mono text-cyan-300 font-semibold border border-white/10"
        >
          {s.day} {s.time}
        </span>
      ))}
      {slots[0]?.location && (
        <span className="text-[10px] text-slate-500">· {slots[0].location}</span>
      )}
    </div>
  );
}

// ─── Occupancy Bar ───────────────────────────────────────────────────────────

function OccupancyBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>{label}</span>
          <span className="font-mono font-bold text-white">
            {value} / {max} ({pct}%)
          </span>
        </div>
      )}
      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Swimmer Row ──────────────────────────────────────────────────────────────

function SwimmerRow({
  swimmer,
  index,
}: {
  swimmer: SwimmerView;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={`border-b border-white/5 transition-colors cursor-pointer ${
          expanded ? "bg-slate-900/60" : "hover:bg-slate-900/30"
        }`}
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Index */}
        <td className="px-3 py-3 text-center">
          <span className="text-[11px] font-mono text-slate-500">{index + 1}</span>
        </td>

        {/* Name + ID */}
        <td className="px-3 py-3">
          <div className="font-semibold text-[13px] text-white leading-tight">
            {swimmer.fullName}
          </div>
          <div className="text-[10px] font-mono text-cyan-400/70 mt-0.5">
            {swimmer.swimId}
          </div>
        </td>

        {/* Phone */}
        <td className="px-3 py-3 hidden sm:table-cell">
          <span className="font-mono text-[11px] text-slate-400">
            {swimmer.phone}
          </span>
        </td>

        {/* Formula */}
        <td className="px-3 py-3 hidden md:table-cell">
          <div className="text-[11px] text-slate-300 font-medium">
            {swimmer.formula}
          </div>
          <div className="text-[10px] text-slate-500">{swimmer.duration ?? "-"}</div>
        </td>

        {/* Price */}
        <td className="px-3 py-3 hidden lg:table-cell">
          <span className="font-mono text-[12px] text-white font-semibold">
            {formatDA(swimmer.priceDA)}
          </span>
        </td>

        {/* Paid */}
        <td className="px-3 py-3 hidden lg:table-cell">
          <span
            className={`font-mono text-[12px] font-semibold ${
              swimmer.totalPaid >= swimmer.priceDA
                ? "text-emerald-400"
                : swimmer.totalPaid > 0
                ? "text-amber-400"
                : "text-slate-500"
            }`}
          >
            {formatDA(swimmer.totalPaid)}
          </span>
        </td>

        {/* Remaining */}
        <td className="px-3 py-3 hidden xl:table-cell">
          <span
            className={`font-mono text-[12px] font-semibold ${
              swimmer.remaining === 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {swimmer.remaining > 0 ? formatDA(swimmer.remaining) : "-"}
          </span>
        </td>

        {/* Payment Status */}
        <td className="px-3 py-3">
          <PaymentBadge status={swimmer.paymentStatus} />
        </td>

        {/* Group Status */}
        <td className="px-3 py-3 hidden sm:table-cell">
          <GroupStatusBadge status={swimmer.groupStatus} />
        </td>

        {/* Expand Icon */}
        <td className="px-3 py-3 text-right">
          <svg
            className={`h-4 w-4 text-slate-500 inline-block transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-slate-950/60 border-b border-white/5">
          <td colSpan={10} className="px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-[12px]">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Phone
                </div>
                <div className="font-mono text-slate-300">{swimmer.phone}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Tarif
                </div>
                <div className="font-mono font-bold text-white">
                  {formatDA(swimmer.priceDA)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Paye
                </div>
                <div
                  className={`font-mono font-bold ${
                    swimmer.totalPaid >= swimmer.priceDA
                      ? "text-emerald-400"
                      : swimmer.totalPaid > 0
                      ? "text-amber-400"
                      : "text-slate-500"
                  }`}
                >
                  {formatDA(swimmer.totalPaid)} ({swimmer.paymentCount} paie
                  {swimmer.paymentCount !== 1 ? "ments" : "ment"})
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Reste a payer
                </div>
                <div
                  className={`font-mono font-bold ${
                    swimmer.remaining === 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {swimmer.remaining > 0 ? formatDA(swimmer.remaining) : "Solde"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Carte
                </div>
                <div className="font-mono text-cyan-300">
                  {swimmer.cardCode ?? "Non emise"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Debut abonnement
                </div>
                <div className="text-slate-300">
                  {formatDate(swimmer.subscriptionStart)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Fin abonnement
                </div>
                <div className="text-slate-300">
                  {formatDate(swimmer.subscriptionEnd)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Formule
                </div>
                <div className="text-slate-300">
                  {swimmer.formula} / {swimmer.duration ?? "-"}
                </div>
              </div>
            </div>

            {/* Mini payment bar */}
            <div className="mt-4 max-w-sm">
              <OccupancyBar
                value={swimmer.totalPaid}
                max={swimmer.priceDA}
                label="Paiement"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────

type PaymentFilter = "all" | "paid" | "partial" | "unpaid";
type GroupSort = "name_asc" | "payment_desc" | "remaining_desc";

function GroupCard({
  group,
  index,
  isExpanded,
  onToggle,
}: {
  group: GroupView;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [sortBy, setSortBy] = useState<GroupSort>("name_asc");
  const [searchQ, setSearchQ] = useState("");

  const catColor = CATEGORY_COLORS[group.category] ?? "text-slate-400 border-slate-700 bg-slate-900";

  const filteredSwimmers = useMemo(() => {
    let list = [...group.swimmers];
    if (paymentFilter !== "all") {
      list = list.filter((s) => s.paymentStatus === paymentFilter);
    }
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.swimId.toLowerCase().includes(q) ||
          s.phone.includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "name_asc") return a.fullName.localeCompare(b.fullName);
      if (sortBy === "payment_desc") return b.totalPaid - a.totalPaid;
      if (sortBy === "remaining_desc") return b.remaining - a.remaining;
      return 0;
    });
    return list;
  }, [group.swimmers, paymentFilter, sortBy, searchQ]);

  const { summary } = group;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isExpanded
          ? "border-cyan-500/30 shadow-[0_0_20px_rgba(0,242,255,0.08)]"
          : "border-white/8 hover:border-white/15"
      } bg-slate-900/40 backdrop-blur-sm`}
    >
      {/* Group Header — always visible */}
      <div
        className="p-4 md:p-5 cursor-pointer select-none"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onToggle();
        }}
        aria-expanded={isExpanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Group name + badges */}
            <div className="flex items-center flex-wrap gap-2 mb-1.5">
              <span className="text-[10px] font-mono text-slate-500">{index + 1}</span>
              <h3 className="text-base font-bold text-white truncate">{group.name}</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catColor}`}
              >
                {CATEGORY_LABELS[group.category] ?? group.category}
              </span>
              {group.isSolid && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
                  SOLID
                </span>
              )}
            </div>

            {/* Schedule */}
            <div className="mb-3">
              <ScheduleChips schedule={group.schedule} />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-2.5 rounded-xl bg-slate-800/50 border border-white/5">
                <div className="text-xl font-black text-white font-mono">
                  {summary.total}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                  Nageurs
                </div>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/30">
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {summary.paidCount}
                </div>
                <div className="text-[10px] text-emerald-600 uppercase tracking-wider mt-0.5">
                  Payes
                </div>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/30">
                <div className="text-xl font-black text-amber-400 font-mono">
                  {summary.partialCount}
                </div>
                <div className="text-[10px] text-amber-600 uppercase tracking-wider mt-0.5">
                  Partiels
                </div>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-red-950/30 border border-red-800/30">
                <div className="text-xl font-black text-red-400 font-mono">
                  {summary.unpaidCount}
                </div>
                <div className="text-[10px] text-red-600 uppercase tracking-wider mt-0.5">
                  Non payes
                </div>
              </div>
            </div>

            {/* Collection bar */}
            <div className="mt-3">
              <OccupancyBar
                value={summary.totalCollected}
                max={summary.totalExpected}
                label={`Collection: ${formatDA(summary.totalCollected)} / ${formatDA(summary.totalExpected)} (${summary.collectionRate}%)`}
              />
            </div>
          </div>

          {/* Expand chevron */}
          <div className="shrink-0 mt-1">
            <svg
              className={`h-5 w-5 text-slate-500 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Roster Panel */}
      {isExpanded && (
        <div className="border-t border-white/8">
          {/* Filters Row */}
          <div className="px-4 py-3 flex flex-wrap items-center gap-2 bg-slate-950/30">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Rechercher un nageur..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Payment filter buttons */}
            <div className="flex items-center gap-1">
              {(
                [
                  { key: "all", label: "Tous" },
                  { key: "paid", label: "Payes" },
                  { key: "partial", label: "Partiels" },
                  { key: "unpaid", label: "Non payes" },
                ] as { key: PaymentFilter; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPaymentFilter(key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    paymentFilter === key
                      ? key === "all"
                        ? "bg-cyan-600 text-white"
                        : key === "paid"
                        ? "bg-emerald-700 text-white"
                        : key === "partial"
                        ? "bg-amber-700 text-white"
                        : "bg-red-700 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as GroupSort)}
              className="rounded-lg border border-white/10 bg-slate-900 text-[11px] text-slate-300 px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="name_asc">Trier: Nom</option>
              <option value="payment_desc">Trier: Plus paye</option>
              <option value="remaining_desc">Trier: Reste le plus</option>
            </select>

            <span className="ml-auto text-[11px] text-slate-500">
              {filteredSwimmers.length} nageur{filteredSwimmers.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Roster Table */}
          {filteredSwimmers.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              Aucun nageur correspondant aux criteres.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-950/40">
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-8">
                      #
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Nageur
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                      Tel.
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Formule
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Tarif
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Paye
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden xl:table-cell">
                      Reste
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Statut paiement
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                      Statut groupe
                    </th>
                    <th className="px-3 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filteredSwimmers.map((swimmer, idx) => (
                    <SwimmerRow key={swimmer.id} swimmer={swimmer} index={idx} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoachTerminalPage({
  params,
}: {
  params: Promise<{ coachId: string }>;
}) {
  const { coachId } = use(params);

  const [data, setData] = useState<CoachData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalPaymentFilter, setGlobalPaymentFilter] = useState<PaymentFilter>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/swim/coach/${coachId}`);
        if (!res.ok) {
          const d = await res.json();
          setErrorMsg(d.error ?? "Acces refuse. Terminal introuvable.");
          return;
        }
        const json: CoachData = await res.json();
        setData(json);
        // Auto-expand all groups on initial load
        setExpandedGroups(new Set(json.groups.map((g) => g.id)));
      } catch {
        setErrorMsg("Erreur de connexion. Veuillez verifier votre reseau.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [coachId]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (data) setExpandedGroups(new Set(data.groups.map((g) => g.id)));
  };
  const collapseAll = () => setExpandedGroups(new Set());

  // Global stats across all groups
  const globalStats = useMemo(() => {
    if (!data) return null;
    const allSwimmers = data.groups.flatMap((g) => g.swimmers);
    return {
      totalGroups: data.groups.length,
      totalSwimmers: allSwimmers.length,
      totalPaid: allSwimmers.filter((s) => s.paymentStatus === "paid").length,
      totalPartial: allSwimmers.filter((s) => s.paymentStatus === "partial").length,
      totalUnpaid: allSwimmers.filter((s) => s.paymentStatus === "unpaid").length,
      totalCollected: allSwimmers.reduce((sum, s) => sum + s.totalPaid, 0),
      totalExpected: allSwimmers.reduce((sum, s) => sum + s.priceDA, 0),
    };
  }, [data]);

  // Filter groups by global search / payment filter
  const displayedGroups = useMemo(() => {
    if (!data) return [];
    return data.groups.filter((g) => {
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase();
        const nameMatch = g.name.toLowerCase().includes(q);
        const swimmerMatch = g.swimmers.some(
          (s) =>
            s.fullName.toLowerCase().includes(q) ||
            s.swimId.toLowerCase().includes(q)
        );
        if (!nameMatch && !swimmerMatch) return false;
      }
      if (globalPaymentFilter !== "all") {
        const hasMatch = g.swimmers.some(
          (s) => s.paymentStatus === globalPaymentFilter
        );
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [data, globalSearch, globalPaymentFilter]);

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center text-slate-100 p-4 relative">
        <div className="bg-glow-orb-1" />
        <div className="bg-glow-orb-2" />
        <div className="text-center space-y-4 relative z-10">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-400">
            Chargement du terminal coach...
          </p>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center text-slate-100 p-6 relative">
        <div className="bg-glow-orb-1" />
        <div className="bg-glow-orb-2" />
        <div className="max-w-md w-full bg-slate-900/40 border border-white/10 backdrop-blur-md rounded-3xl p-8 text-center space-y-5 relative z-10 shadow-2xl">
          <div className="h-14 w-14 rounded-full bg-red-950/50 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Acces refus</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {errorMsg ?? "Terminal introuvable."}
            </p>
          </div>
          <div className="text-[11px] text-slate-600 font-mono">
            AQA Swim Coach Terminal
          </div>
        </div>
      </div>
    );
  }

  const generatedAtFormatted = new Date(data.generatedAt).toLocaleString("fr-DZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col relative overflow-hidden">
      <div className="bg-glow-orb-1" />
      <div className="bg-glow-orb-2" />

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-slate-950/70 backdrop-blur-md px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/image/logoevents.png"
            alt="AQA"
            className="h-8 w-auto object-contain"
          />
          <div className="h-5 w-px bg-white/15" />
          <div>
            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest leading-none block">
              Coach Terminal — Vue Lecture
            </span>
            <h1 className="text-sm font-black text-white leading-tight mt-0.5">
              {data.coach.name}
            </h1>
            {data.coach.specialties && (
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">
                {data.coach.specialties}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wide hidden sm:block">
              En ligne
            </span>
          </div>
          <div className="hidden md:block text-[10px] text-slate-600 font-mono">
            {generatedAtFormatted}
          </div>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 space-y-6 relative z-10">

        {/* Global Stats Dashboard */}
        {globalStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-900/50 border border-white/8 text-center">
              <div className="text-2xl font-black font-mono text-white">
                {globalStats.totalGroups}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                Groupes
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/8 text-center">
              <div className="text-2xl font-black font-mono text-white">
                {globalStats.totalSwimmers}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                Nageurs
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/30 text-center">
              <div className="text-2xl font-black font-mono text-emerald-400">
                {globalStats.totalPaid}
              </div>
              <div className="text-[10px] text-emerald-700 uppercase tracking-wider mt-1">
                Payes
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/30 text-center">
              <div className="text-2xl font-black font-mono text-amber-400">
                {globalStats.totalPartial}
              </div>
              <div className="text-[10px] text-amber-700 uppercase tracking-wider mt-1">
                Partiels
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/30 text-center">
              <div className="text-2xl font-black font-mono text-red-400">
                {globalStats.totalUnpaid}
              </div>
              <div className="text-[10px] text-red-700 uppercase tracking-wider mt-1">
                Non payes
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900/60 border border-cyan-500/20 text-center shadow-[0_0_15px_rgba(0,242,255,0.06)]">
              <div className="text-lg font-black font-mono text-cyan-300">
                {globalStats.totalExpected > 0
                  ? Math.round(
                      (globalStats.totalCollected / globalStats.totalExpected) * 100
                    )
                  : 0}
                %
              </div>
              <div className="text-[10px] text-cyan-700 uppercase tracking-wider mt-1">
                Collection
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">
                {formatDA(globalStats.totalCollected)}
              </div>
            </div>
          </div>
        )}

        {/* Global Collection Bar */}
        {globalStats && globalStats.totalExpected > 0 && (
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/8">
            <OccupancyBar
              value={globalStats.totalCollected}
              max={globalStats.totalExpected}
              label={`Collection globale: ${formatDA(globalStats.totalCollected)} / ${formatDA(globalStats.totalExpected)}`}
            />
          </div>
        )}

        {/* Filter & Controls Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Global search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Rechercher groupe ou nageur..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-[13px] text-slate-200 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Payment quick filter */}
          <div className="flex items-center gap-1.5">
            {(
              [
                { key: "all", label: "Tous" },
                { key: "paid", label: "Payes" },
                { key: "partial", label: "Partiels" },
                { key: "unpaid", label: "Non payes" },
              ] as { key: PaymentFilter; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setGlobalPaymentFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  globalPaymentFilter === key
                    ? key === "all"
                      ? "bg-cyan-600 text-white"
                      : key === "paid"
                      ? "bg-emerald-700 text-white"
                      : key === "partial"
                      ? "bg-amber-700 text-white"
                      : "bg-red-700 text-white"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-white/8"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Expand/Collapse All */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[12px] text-slate-300 border border-white/10 transition-colors"
            >
              Tout ouvrir
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[12px] text-slate-300 border border-white/10 transition-colors"
            >
              Tout fermer
            </button>
          </div>
        </div>

        {/* Groups List */}
        {displayedGroups.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <svg
              className="h-12 w-12 mx-auto mb-4 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-sm">
              {data.groups.length === 0
                ? "Aucun groupe actif attribue a ce coach."
                : "Aucun groupe ne correspond aux filtres selectionnes."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedGroups.map((group, index) => (
              <GroupCard
                key={group.id}
                group={group}
                index={index}
                isExpanded={expandedGroups.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
              />
            ))}
          </div>
        )}

        {/* Read-Only Notice */}
        <div className="py-6 flex items-center gap-3 px-4 rounded-2xl bg-slate-900/30 border border-white/5">
          <div className="shrink-0 h-8 w-8 rounded-full bg-cyan-950/50 border border-cyan-800/40 flex items-center justify-center">
            <svg
              className="h-4 w-4 text-cyan-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-slate-300">
              Terminal en lecture seule
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ce terminal est reserve a la consultation. Seul le personnel AQA
              peut modifier les affectations ou enregistrer des paiements.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950/50 px-6 py-3 flex items-center justify-between text-[11px] text-slate-600">
        <span className="font-mono">AQA Swim Coach Terminal v1.0</span>
        <span className="font-mono hidden sm:block">
          Mis a jour: {generatedAtFormatted}
        </span>
      </footer>
    </div>
  );
}
