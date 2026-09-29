"use client";

import { use, useEffect, useState, useMemo } from "react";
import { parseScheduleSlots, isOldSwimMember } from "@/lib/swim-groups";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SwimmerView {
  id: string;
  swimId: string;
  fullName: string;
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
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
}

interface GroupSummary {
  total: number;
  capacity: number;
  emptyCount: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
}

interface GroupView {
  id: string;
  name: string;
  category: string;
  level: string;
  schedule: string;
  capacity: number;
  isSolid: boolean;
  cleanNotes?: string;
  swimmers: SwimmerView[];
  summary: GroupSummary;
}

interface CoachData {
  coach: { id: string; name: string; specialties: string | null };
  groups: GroupView[];
  generatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  homme: "Homme",
  femme: "Femme",
  enfants: "Enfants",
  apnea: "Apnee",
};

const LEVEL_LABELS: Record<string, string> = {
  g10: "G10",
  max5: "MAX5",
  indiv: "INDIV",
  "1": "Niv. 1",
  "2": "Niv. 2",
  "3": "Niv. 3",
  "4": "Niv. 4",
  ecole: "Ecole",
};

// Category pill stays semantic; group index drives the card theme to avoid saturation
const CATEGORY_ACCENT: Record<string, string> = {
  homme:   "text-sky-400 border-sky-700/50 bg-sky-950/50",
  femme:   "text-pink-400 border-pink-700/50 bg-pink-950/50",
  enfants: "text-violet-400 border-violet-700/50 bg-violet-950/50",
  apnea:   "text-teal-400 border-teal-700/50 bg-teal-950/50",
};

// 8 distinct card themes — assigned by group index, cycling if needed
const GROUP_THEMES = [
  { border: "border-sky-600/25",     glow: "shadow-[0_0_20px_rgba(14,165,233,0.07)]",  bar: "bg-sky-500",     header: "from-sky-950/30",     dot: "bg-sky-400"     },
  { border: "border-violet-600/25",  glow: "shadow-[0_0_20px_rgba(139,92,246,0.07)]",  bar: "bg-violet-500",  header: "from-violet-950/30",  dot: "bg-violet-400"  },
  { border: "border-amber-600/25",   glow: "shadow-[0_0_20px_rgba(245,158,11,0.07)]",  bar: "bg-amber-500",   header: "from-amber-950/30",   dot: "bg-amber-400"   },
  { border: "border-emerald-600/25", glow: "shadow-[0_0_20px_rgba(16,185,129,0.07)]",  bar: "bg-emerald-500", header: "from-emerald-950/30", dot: "bg-emerald-400" },
  { border: "border-pink-600/25",    glow: "shadow-[0_0_20px_rgba(236,72,153,0.07)]",  bar: "bg-pink-500",    header: "from-pink-950/30",    dot: "bg-pink-400"    },
  { border: "border-cyan-600/25",    glow: "shadow-[0_0_20px_rgba(6,182,212,0.07)]",   bar: "bg-cyan-500",    header: "from-cyan-950/30",    dot: "bg-cyan-400"    },
  { border: "border-orange-600/25",  glow: "shadow-[0_0_20px_rgba(249,115,22,0.07)]",  bar: "bg-orange-500",  header: "from-orange-950/30",  dot: "bg-orange-400"  },
  { border: "border-indigo-600/25",  glow: "shadow-[0_0_20px_rgba(99,102,241,0.07)]",  bar: "bg-indigo-500",  header: "from-indigo-950/30",  dot: "bg-indigo-400"  },
];

function formatDA(n: number) {
  return n.toLocaleString("fr-DZ") + " DA";
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("fr-DZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Schedule chips ───────────────────────────────────────────────────────────

function ScheduleChips({ schedule }: { schedule: string }) {
  const slots = parseScheduleSlots(schedule);
  return (
    <div className="flex flex-wrap gap-1.5">
      {slots.map((s, i) => (
        <span
          key={i}
          className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-mono text-cyan-300 font-semibold border border-white/10"
        >
          {s.day} {s.time}
        </span>
      ))}
      {slots[0]?.location && (
        <span className="text-[10px] text-slate-500 self-center">
          · {slots[0].location}
        </span>
      )}
    </div>
  );
}

// ─── Payment Badge ────────────────────────────────────────────────────────────

function PaymentBadge({ status }: { status: SwimmerView["paymentStatus"] }) {
  if (status === "paid")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Paye
      </span>
    );
  if (status === "partial")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/70 text-amber-400 border border-amber-800/50">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Partiel
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-950/70 text-red-400 border border-red-800/50">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
      Non paye
    </span>
  );
}

// ─── Payment progress bar (individual only) ───────────────────────────────────

function PaymentBar({
  paid,
  total,
  barColor,
}: {
  paid: number;
  total: number;
  barColor: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const color =
    pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-500" : "bg-slate-700";
  void barColor;
  return (
    <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden mt-1.5">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Swimmer Card ─────────────────────────────────────────────────────────────

function SwimmerCard({
  swimmer,
  slotNumber,
  barColor,
}: {
  swimmer: SwimmerView;
  slotNumber: number;
  barColor: string;
}) {
  const [open, setOpen] = useState(false);
  const isNewMember = !isOldSwimMember(swimmer.level);

  const borderColor =
    swimmer.paymentStatus === "paid"
      ? "border-emerald-800/40"
      : swimmer.paymentStatus === "partial"
      ? "border-amber-800/40"
      : "border-red-900/40";

  return (
    <div
      className={`rounded-xl border ${borderColor} bg-slate-900/60 overflow-hidden transition-all`}
    >
      {/* Main row — always visible */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full text-left px-3 py-3 flex items-center gap-3"
      >
        {/* Slot number */}
        <span className="text-[11px] font-mono text-slate-500 w-5 shrink-0 text-right">
          {slotNumber}
        </span>

        {/* Name + swimId */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13px] text-white leading-tight flex items-center gap-1.5 min-w-0">
            <span className="truncate">{swimmer.fullName}</span>
            {isNewMember && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-700/50 leading-none">
                (new)
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1.5">
            <span>{swimmer.swimId}</span>
            {swimmer.formula && (
              <>
                <span>·</span>
                <span className="text-slate-400">{swimmer.formula}</span>
              </>
            )}
          </div>
          {/* Individual payment bar */}
          <PaymentBar paid={swimmer.totalPaid} total={swimmer.priceDA} barColor={barColor} />
        </div>

        {/* Payment badge + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <PaymentBadge status={swimmer.paymentStatus} />
          <svg
            className={`h-4 w-4 text-slate-500 transition-transform shrink-0 ${
              open ? "rotate-180" : ""
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
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-white/5 px-3 py-3 bg-slate-950/40 space-y-3">
          {/* Payment detail */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900/70 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                Tarif
              </div>
              <div className="font-mono font-bold text-[12px] text-white">
                {formatDA(swimmer.priceDA)}
              </div>
            </div>
            <div className="bg-slate-900/70 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                Paye
              </div>
              <div
                className={`font-mono font-bold text-[12px] ${
                  swimmer.totalPaid >= swimmer.priceDA && swimmer.priceDA > 0
                    ? "text-emerald-400"
                    : swimmer.totalPaid > 0
                    ? "text-amber-400"
                    : "text-slate-500"
                }`}
              >
                {formatDA(swimmer.totalPaid)}
              </div>
            </div>
            <div className="bg-slate-900/70 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                Reste
              </div>
              <div
                className={`font-mono font-bold text-[12px] ${
                  swimmer.remaining === 0 && swimmer.priceDA > 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {swimmer.remaining > 0 ? formatDA(swimmer.remaining) : "Solde"}
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
            <div>
              <span className="text-slate-500">Formule : </span>
              <span className="text-slate-300 font-medium">
                {swimmer.formula}{swimmer.duration ? ` / ${swimmer.duration}` : ""}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Carte : </span>
              <span className="font-mono text-cyan-300">
                {swimmer.cardCode ?? "Non emise"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Debut : </span>
              <span className="text-slate-300">{formatDate(swimmer.subscriptionStart)}</span>
            </div>
            <div>
              <span className="text-slate-500">Fin : </span>
              <span className="text-slate-300">{formatDate(swimmer.subscriptionEnd)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Blank Slot Card (unassigned capacity slot) ───────────────────────────────

function BlankSlotCard({ slotNumber }: { slotNumber: number }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/30 px-3 py-2.5 flex items-center gap-3">
      <span className="text-[11px] font-mono text-slate-600 w-5 shrink-0 text-right">
        {slotNumber}
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full border border-slate-600/80 shrink-0" />
        <span className="text-[12px] font-medium text-slate-500 italic">
          Place libre
        </span>
      </div>
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-900/80 text-slate-500 border border-white/5 shrink-0">
        Disponible
      </span>
    </div>
  );
}

// ─── Group Panel ──────────────────────────────────────────────────────────────

type PaymentFilter = "all" | "paid" | "partial" | "unpaid" | "empty";

function GroupPanel({
  group,
  index,
  isOpen,
  onToggle,
  globalSearch,
  globalFilter,
}: {
  group: GroupView;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  globalSearch: string;
  globalFilter: PaymentFilter;
}) {
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");

  const theme = GROUP_THEMES[index % GROUP_THEMES.length];
  const catPill =
    CATEGORY_ACCENT[group.category] ??
    "text-slate-400 border-slate-700 bg-slate-900";
  const levelLabel =
    LEVEL_LABELS[group.level.toLowerCase()] ?? group.level.toUpperCase();

  const effectiveFilter = filter !== "all" ? filter : globalFilter;
  const effectiveSearch = search.trim() || globalSearch.trim();

  const capacity = Math.max(group.capacity || 10, group.swimmers.length);
  const emptyCount = Math.max(0, capacity - group.swimmers.length);

  // Keep each swimmer's original slot number (1-based) within the group
  const indexedSwimmers = useMemo(() => {
    return group.swimmers.map((swimmer, idx) => ({
      swimmer,
      slotNumber: idx + 1,
    }));
  }, [group.swimmers]);

  const filteredSwimmers = useMemo(() => {
    if (effectiveFilter === "empty") return [];
    let list = [...indexedSwimmers];
    if (effectiveFilter !== "all") {
      list = list.filter((item) => item.swimmer.paymentStatus === effectiveFilter);
    }
    if (effectiveSearch) {
      const q = effectiveSearch.toLowerCase();
      // If the search matches the group name itself and local search is empty, show all swimmers in the group
      const groupNameMatchesGlobal =
        !search.trim() &&
        globalSearch.trim() &&
        group.name.toLowerCase().includes(q);
      if (!groupNameMatchesGlobal) {
        list = list.filter(
          (item) =>
            item.swimmer.fullName.toLowerCase().includes(q) ||
            item.swimmer.swimId.toLowerCase().includes(q)
        );
      }
    }
    return list;
  }, [indexedSwimmers, effectiveFilter, effectiveSearch, search, globalSearch, group.name]);

  // Show blank capacity slots when viewing all slots (with no swimmer text filter) or specifically filtering for "empty"
  const showBlankSlots =
    (effectiveFilter === "all" && !search.trim()) ||
    effectiveFilter === "empty";

  const blankSlotNumbers = useMemo(() => {
    if (!showBlankSlots || emptyCount <= 0) return [];
    return Array.from(
      { length: emptyCount },
      (_, idx) => group.swimmers.length + idx + 1
    );
  }, [showBlankSlots, emptyCount, group.swimmers.length]);

  const { summary } = group;

  return (
    <section
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isOpen
          ? `${theme.border} ${theme.glow} bg-slate-900/60`
          : "border-white/8 bg-slate-900/40 hover:border-white/15"
      } backdrop-blur-sm`}
    >
      {/* ── Group header ── */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
          isOpen ? `bg-gradient-to-r ${theme.header} to-transparent` : ""
        }`}
        aria-expanded={isOpen}
      >
        {/* Colored dot / index */}
        <span
          className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 ${theme.dot}`}
        >
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-[15px] font-black text-white leading-tight">
              {group.name}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catPill}`}
            >
              {CATEGORY_LABELS[group.category] ?? group.category}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-white/10">
              {levelLabel}
            </span>
            {group.isSolid && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
                SOLID
              </span>
            )}
          </div>

          {/* Schedule */}
          <ScheduleChips schedule={group.schedule} />

          {/* Stats pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/8 text-[12px] font-semibold text-white">
              <span className="font-mono font-black">
                {summary.total} / {capacity}
              </span>
              <span className="text-slate-400 font-normal">places</span>
            </span>
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] font-semibold ${
                emptyCount > 0
                  ? "bg-slate-900/70 border-dashed border-white/15 text-slate-300"
                  : "bg-cyan-950/40 border-cyan-800/30 text-cyan-300"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  emptyCount > 0 ? "bg-slate-400" : "bg-cyan-400"
                }`}
              />
              {emptyCount > 0 ? `${emptyCount} libres` : "Complet"}
            </span>
            {summary.paidCount > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/30 text-[12px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {summary.paidCount} payes
              </span>
            )}
            {summary.partialCount > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-800/30 text-[12px] font-semibold text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {summary.partialCount} partiels
              </span>
            )}
            {summary.unpaidCount > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-800/30 text-[12px] font-semibold text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                {summary.unpaidCount} non payes
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`h-5 w-5 text-slate-500 shrink-0 mt-1 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
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
      </button>

      {/* ── Swimmer + Blank Slots list ── */}
      {isOpen && (
        <div className="border-t border-white/6">
          {/* Filter bar */}
          <div className="px-3 py-2.5 flex flex-wrap items-center gap-2 bg-slate-950/30">
            {/* Search */}
            <div className="relative flex-1 min-w-[140px]">
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
                placeholder="Rechercher dans ce groupe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Payment + Empty filter */}
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { k: "all",     label: "Tous",   cls: "bg-slate-600 text-white"   },
                  { k: "paid",    label: "Payes",  cls: "bg-emerald-700 text-white" },
                  { k: "partial", label: "Part.",  cls: "bg-amber-700 text-white"   },
                  { k: "unpaid",  label: "Non p.", cls: "bg-red-700 text-white"     },
                  { k: "empty",   label: "Libres", cls: "bg-cyan-700 text-white"    },
                ] as { k: PaymentFilter; label: string; cls: string }[]
              ).map(({ k, label, cls }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    effectiveFilter === k ? cls : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <span className="ml-auto text-[11px] font-mono text-slate-500 shrink-0">
              {summary.total} inscrits · {emptyCount} libres
            </span>
          </div>

          {/* Cards list (assigned swimmers + blank places up to capacity) */}
          {filteredSwimmers.length === 0 && blankSlotNumbers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              Aucune place ou nageur correspondant.
            </div>
          ) : (
            <div className="px-3 pb-3 pt-2 space-y-2">
              {filteredSwimmers.map(({ swimmer, slotNumber }) => (
                <SwimmerCard
                  key={swimmer.id}
                  swimmer={swimmer}
                  slotNumber={slotNumber}
                  barColor={theme.bar}
                />
              ))}
              {blankSlotNumbers.map((slotNum) => (
                <BlankSlotCard
                  key={`blank-${group.id}-${slotNum}`}
                  slotNumber={slotNum}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
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
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalFilter, setGlobalFilter] = useState<PaymentFilter>("all");
  // Accordion: null = all closed, string = that group's id is open
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  const toggleGroup = (id: string) =>
    setOpenGroupId((prev) => (prev === id ? null : id));

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/swim/coach/${coachId}`);
        if (!res.ok) {
          const d = await res.json();
          setErrorMsg(d.error ?? "Terminal introuvable.");
          return;
        }
        setData(await res.json());
      } catch {
        setErrorMsg("Erreur de connexion.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [coachId]);

  // Global quick-stats across all groups
  const stats = useMemo(() => {
    if (!data) return null;
    const totalAssigned = data.groups.reduce(
      (sum, g) => sum + g.swimmers.length,
      0
    );
    const totalCapacity = data.groups.reduce(
      (sum, g) => sum + Math.max(g.capacity || 10, g.swimmers.length),
      0
    );
    const totalEmpty = Math.max(0, totalCapacity - totalAssigned);
    const allSwimmers = data.groups.flatMap((g) => g.swimmers);
    return {
      groups: data.groups.length,
      assigned: totalAssigned,
      capacity: totalCapacity,
      empty: totalEmpty,
      paid: allSwimmers.filter((s) => s.paymentStatus === "paid").length,
      partial: allSwimmers.filter((s) => s.paymentStatus === "partial").length,
      unpaid: allSwimmers.filter((s) => s.paymentStatus === "unpaid").length,
    };
  }, [data]);

  // Filter groups for display
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
      if (globalFilter === "empty") {
        const cap = Math.max(g.capacity || 10, g.swimmers.length);
        if (cap - g.swimmers.length <= 0) return false;
      } else if (globalFilter !== "all") {
        if (!g.swimmers.some((s) => s.paymentStatus === globalFilter))
          return false;
      }
      return true;
    });
  }, [data, globalSearch, globalFilter]);

  const generatedAt = data
    ? new Date(data.generatedAt).toLocaleString("fr-DZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // ── Loading ──

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center relative">
        <div className="bg-glow-orb-1" />
        <div className="bg-glow-orb-2" />
        <div className="text-center space-y-4 relative z-10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-400 mx-auto" />
          <p className="text-sm text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // ── Error ──

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 relative">
        <div className="bg-glow-orb-1" />
        <div className="bg-glow-orb-2" />
        <div className="max-w-sm w-full bg-slate-900/60 border border-white/10 rounded-2xl p-8 text-center space-y-4 relative z-10">
          <div className="h-12 w-12 rounded-full bg-red-950/60 text-red-400 flex items-center justify-center mx-auto border border-red-700/30">
            <svg
              className="h-6 w-6"
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
            <p className="font-bold text-white">Acces refuse</p>
            <p className="text-sm text-slate-400 mt-1">
              {errorMsg ?? "Terminal introuvable."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main ──

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col relative overflow-x-hidden">
      <div className="bg-glow-orb-1" />
      <div className="bg-glow-orb-2" />

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <img
          src="/image/logoevents.png"
          alt="AQA"
          className="h-7 w-auto object-contain shrink-0"
        />
        <div className="h-4 w-px bg-white/15 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="block text-[9px] font-bold text-cyan-400 uppercase tracking-widest leading-none">
            Coach Terminal
          </span>
          <span className="block text-[13px] font-black text-white truncate leading-tight mt-0.5">
            {data.coach.name}
          </span>
          {data.coach.specialties && (
            <span className="block text-[10px] text-slate-500 truncate leading-none mt-0.5">
              {data.coach.specialties}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#22c55e]" />
          <span className="text-[10px] font-bold text-slate-400 hidden sm:block">
            En ligne
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-3 pt-4 pb-8 space-y-4 relative z-10">
        {/* ── Global stats bar ── */}
        {stats && (
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            <div className="rounded-xl bg-slate-900/60 border border-white/8 p-2.5 text-center">
              <div className="text-base sm:text-lg font-black font-mono text-white">
                {stats.groups}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Groupes</div>
            </div>
            <div className="rounded-xl bg-slate-900/60 border border-dashed border-white/15 p-2.5 text-center">
              <div className="text-base sm:text-lg font-black font-mono text-slate-200">
                {stats.empty}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Libres</div>
            </div>
            <div className="rounded-xl bg-emerald-950/40 border border-emerald-800/30 p-2.5 text-center">
              <div className="text-base sm:text-lg font-black font-mono text-emerald-400">
                {stats.paid}
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Payes</div>
            </div>
            <div className="rounded-xl bg-amber-950/40 border border-amber-800/30 p-2.5 text-center">
              <div className="text-base sm:text-lg font-black font-mono text-amber-400">
                {stats.partial}
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5">Partiels</div>
            </div>
            <div className="rounded-xl bg-red-950/40 border border-red-800/30 p-2.5 text-center">
              <div className="text-base sm:text-lg font-black font-mono text-red-400">
                {stats.unpaid}
              </div>
              <div className="text-[10px] text-red-600 mt-0.5">Non payes</div>
            </div>
          </div>
        )}

        {/* ── Global search + filter ── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
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
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-[13px] text-slate-200 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <select
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value as PaymentFilter)}
            className="rounded-xl border border-white/10 bg-slate-900 text-[12px] text-slate-300 px-3 py-2.5 outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer shrink-0"
          >
            <option value="all">Tous</option>
            <option value="paid">Payes</option>
            <option value="partial">Partiels</option>
            <option value="unpaid">Non payes</option>
            <option value="empty">Places libres</option>
          </select>
        </div>

        {/* ── Groups ── */}
        {displayedGroups.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            {data.groups.length === 0
              ? "Aucun groupe actif attribue a ce coach."
              : "Aucun groupe ne correspond aux filtres."}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedGroups.map((g, i) => (
              <GroupPanel
                key={g.id}
                group={g}
                index={i}
                isOpen={openGroupId === g.id}
                onToggle={() => toggleGroup(g.id)}
                globalSearch={globalSearch}
                globalFilter={globalFilter}
              />
            ))}
          </div>
        )}

        {/* ── Read-only notice ── */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/30 border border-white/5">
          <svg
            className="h-4 w-4 text-cyan-500 shrink-0"
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
          <p className="text-[11px] text-slate-500">
            Vue lecture seule — seul le personnel AQA peut modifier les affectations ou enregistrer des paiements.
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-slate-950/50 px-4 py-2.5 text-center text-[10px] text-slate-600 font-mono">
        AQA Swim Coach Terminal · {generatedAt}
      </footer>
    </div>
  );
}
