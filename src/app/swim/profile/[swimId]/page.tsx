"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "@/lib/i18n";
import { SwimFlipCard } from "@/components/swim/SwimFlipCard";
import { isOldSwimMember, extractFirstName, parseScheduleSlots } from "@/lib/swim-groups";
import { calculateSwimPrice } from "@/lib/swim-pricing";
import { getSwimPaymentWhatsAppUrl } from "@/lib/swim-whatsapp";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface SwimPaymentItem {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  paidAt: string;
}

interface GroupMemberItem {
  num: number;
  id: string;
  swimId?: string;
  fullName: string;
  groupStatus: string;
  isCurrentMember: boolean;
}

interface SwimGroupData {
  id: string;
  name: string;
  coachName: string | null;
  schedule: string;
  level: string;
  isSolid?: boolean;
  solidNotes?: string;
  groupMembers?: GroupMemberItem[];
  teammates?: string[];
}

interface SwimMemberData {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  dateOfStart: string;
  category: string;
  level: string;
  formula: string;
  duration: string | null;
  priceDA: number;
  coachMessage: string | null;
  paymentStatus: "unpaid" | "paid" | "partial" | string;
  groupStatus: "proposed" | "accepted" | "rejected" | string;
  rejectionReason: string | null;
  isOldMember?: boolean;
  isSolid?: boolean;
  solidNotes?: string;
  teammates?: string[];
  groupMembers?: GroupMemberItem[];
  group: SwimGroupData | null;
  groups?: SwimGroupData[];
  card: {
    id: string;
    cardCode: string;
    publicToken: string;
    status?: string;
  } | null;
  payments: SwimPaymentItem[];
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  subscriptionDaysLeft?: number | null;
  subscriptionStatus?: "active" | "expiring_soon" | "expired" | null;
}

// ─── Solid Logo Badge Component ───────────────────────────────────────────────

function SolidLogoBadge({
  t,
  compact = false,
}: {
  t: (key: string) => string;
  compact?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-sky-950/80 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,196,212,0.25)] select-none">
      {/* Sleek SVG Isometric Shield/Cube Emblem */}
      <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 text-slate-950 shrink-0 shadow-[0_0_8px_rgba(0,242,255,0.4)]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3.5 h-3.5"
        >
          <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
          <path d="M12 22V12" />
          <path d="M21 7l-9 5-9-5" />
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black tracking-wider uppercase text-cyan-300 font-display leading-none">
            {t("solidBadgeTitle")}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 leading-none">
            {t("solidBadgeSubtitle")}
          </span>
        </div>
        {!compact && (
          <p className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">
            {t("solidBadgeDesc")}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Schedule Display Component ───────────────────────────────────────────────

function ScheduleDisplay({ schedule }: { schedule: string }) {
  const slots = parseScheduleSlots(schedule);
  if (slots.length <= 1) {
    return <span className="text-slate-200 font-medium text-right">{schedule}</span>;
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {slots.map((s, sIdx) => (
          <span
            key={sIdx}
            className="px-2 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-700/40 text-[11px] font-semibold text-cyan-300 font-mono"
          >
            {s.day} {s.time}
          </span>
        ))}
      </div>
      {slots[0].location && (
        <span className="text-[10px] text-slate-400 font-normal">{slots[0].location}</span>
      )}
    </div>
  );
}

// ─── Group Names Table Component ──────────────────────────────────────────────

function GroupNamesTable({
  groupMembers = [],
  t,
}: {
  groupMembers: GroupMemberItem[];
  t: (key: string) => string;
}) {
  if (groupMembers.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic py-2">{t("noTeammates")}</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/50">
      <div className="px-3.5 py-2.5 bg-slate-900/80 border-b border-white/10 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 font-display">
          {t("groupMembersTableTitle")}
        </span>
        <span className="text-[10px] font-mono text-slate-400">
          {groupMembers.length} {groupMembers.length === 1 ? t("memberCountSingle") : t("memberCountPlural")}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-slate-900/40 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              <th className="py-2 px-3 w-10 text-center">{t("tableHeaderNum")}</th>
              <th className="py-2 px-3">{t("tableHeaderName")}</th>
              <th className="py-2 px-3 text-right">{t("tableHeaderStatus")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans">
            {groupMembers.map((member) => (
              <tr
                key={member.id || member.swimId}
                className={`transition-colors ${
                  member.isCurrentMember
                    ? "bg-cyan-950/30 font-semibold"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                  {member.num}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white truncate max-w-[180px] sm:max-w-none">
                      {extractFirstName(member.fullName)}
                    </span>
                    {member.isCurrentMember && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-cyan-400 text-slate-950">
                        {t("youBadge")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right">
                  {member.groupStatus === "accepted" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{t("memberStatusAccepted")}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-950/80 text-amber-300 border border-amber-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>{t("memberStatusProposed")}</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Swimmer Profile Page ────────────────────────────────────────────────

export default function SwimmerProfilePage({
  params,
}: {
  params: Promise<{ swimId: string }>;
}) {
  const { swimId } = use(params);
  const { t } = useTranslations("swimPublic");
  const { locale, setLocale, dir } = useLocale();

  const [member, setMember] = useState<SwimMemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision Modal State
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [preferredDays, setPreferredDays] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`/api/public/swim/member/${encodeURIComponent(swimId)}`);
        if (!res.ok) {
          setError(t("notFound"));
          return;
        }
        const data = await res.json();
        setMember(data);
      } catch {
        setError(t("notFound"));
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [swimId, t]);

  async function handleDecision(action: "accept" | "reject") {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/public/swim/member/${encodeURIComponent(swimId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            reason: rejectReason,
            preferredDays,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setMember(data.member);
        setShowRejectModal(false);
        if (action === "accept") {
          setActionSuccess(t("statusConfirmed"));
        } else {
          setActionSuccess(t("statusRejected"));
        }
      }
    } catch {
      // Error handling
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-9 w-9 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(0,242,255,0.3)]" />
          <p className="text-xs text-slate-400 font-medium">{t("loading")}</p>
        </div>
      </div>
    );
  }

  // Not found / error state
  if (error || !member) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-4" dir={dir}>
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900/90 border border-white/10 text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white font-display">{t("notFound")}</h2>
          <p className="text-xs text-slate-400">{error || t("notFound")}</p>
          <Link
            href="/swim"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-cyan-300 text-xs font-semibold hover:bg-slate-700 hover:text-white transition-all border border-white/10"
          >
            <span>{t("tryAnotherId")}</span>
          </Link>
        </div>
      </div>
    );
  }

  const isConfirmed = member.groupStatus === "accepted";
  const isRejected = member.groupStatus === "rejected";

  const displayGroups: SwimGroupData[] = (member.groups && member.groups.length > 0)
    ? member.groups
    : (member.group ? [member.group] : []);

  // Compute official tariff dynamically if not set in database
  const rawPriceDA = member.priceDA || 0;
  const groupLevels = displayGroups.map((g) => g.level);
  const computedPriceDA = calculateSwimPrice({
    category: member.category,
    groupTypes: groupLevels.length > 0 ? groupLevels : [member.group?.level || member.formula || "G10"],
    duration: member.duration || "3m",
  });
  const priceDA = rawPriceDA > 0 ? rawPriceDA : (computedPriceDA > 0 ? computedPriceDA : 0);

  // Payments calculation
  const paymentsList = member.payments || [];
  const totalPaid = paymentsList.reduce((acc, p) => acc + (p.amount || 0), 0);
  const debt = Math.max(0, priceDA - totalPaid);
  const paymentPct = priceDA > 0 ? Math.min(100, Math.round((totalPaid / priceDA) * 100)) : 0;
  const isFullyPaid = member.paymentStatus === "paid" || (priceDA > 0 && totalPaid >= priceDA);

  const formattedDateOfStart = member.dateOfStart
    ? new Date(member.dateOfStart).toLocaleDateString(locale === "ar" ? "ar-DZ" : "fr-DZ", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  // Only old members (old_aqa, intermediate, advanced) may see cohort names
  const isOldMember = Boolean(member.isOldMember ?? isOldSwimMember(member.level));

  return (
    <div
      className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center py-6 px-4 selection:bg-cyan-500 selection:text-black relative overflow-x-hidden font-sans"
      dir={dir}
    >
      {/* Background glow effects matching AQA Events public part */}
      <div className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-sky-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] bg-cyan-400/10 blur-[130px] pointer-events-none rounded-full" />

      {/* Header with Official AQA Logo & Language Selector */}
      <header className="w-full max-w-md mx-auto pt-2 pb-2 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <a
            href="https://aqasports.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 group"
          >
            <img
              src="/image/logo.webp"
              alt="AQA Sports"
              className="h-8 sm:h-9 w-auto object-contain drop-shadow"
            />
          </a>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm border border-white/10">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/90">
              AQA Swim
            </span>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10">
          {(["fr", "ar", "en"] as const).map((lng) => (
            <button
              key={lng}
              onClick={() => setLocale(lng)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase transition-all ${
                locale === lng
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(0,242,255,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {lng}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Column (max-w-md matching eventscard/[token]) */}
      <main className="w-full max-w-md mx-auto py-3 space-y-4 relative z-10">

        {/* Flash message if action taken */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-medium text-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            {actionSuccess}
          </div>
        )}

        {/* ── CONDITION A: IF CONFIRMED ───────────────────────────────────────── */}
        {isConfirmed ? (
          <>
            {/* 1. HERO SECTION: THE PVC PASS CARD (Large, top of page, full width) */}
            <section className="w-full flex flex-col items-center">
              <SwimFlipCard
                member={{
                  swimId: member.swimId,
                  fullName: member.fullName,
                  category: member.category,
                  level: member.level,
                  formula: member.formula,
                  duration: member.duration,
                  paymentStatus: member.paymentStatus,
                  group: member.group,
                  card: member.card,
                }}
              />

              {member.card?.publicToken && (
                <div className="mt-2 text-center">
                  <Link
                    href={`/swim/card/${member.card.publicToken}`}
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 transition-colors"
                  >
                    <span>{t("openDigitalPass")}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </Link>
                </div>
              )}
            </section>

            {/* 2. CONFIRMED STATUS BANNER & SWIMMER SUMMARY */}
            <section className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    {t("statusConfirmed")}
                  </span>
                </div>
                <span className="font-mono text-xs text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                  {member.swimId}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-slate-400">{member.category} · {member.formula}</span>
                <span className="text-slate-300 font-medium">{formattedDateOfStart}</span>
              </div>
            </section>

            {/* 3. FINANCIAL LEDGER & PAYMENTS (matching eventscard balance style) */}
            <section className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                  {t("paymentsTitle")}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isFullyPaid
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                      : totalPaid > 0
                      ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                      : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {isFullyPaid ? t("statusPaid") : totalPaid > 0 ? t("statusPartial") : t("statusUnpaid")}
                </span>
              </div>

              {/* 3-stat breakdown */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block mb-0.5">
                    {t("totalPrice")}
                  </span>
                  <span className="font-mono font-bold text-white text-xs sm:text-sm">
                    {priceDA.toLocaleString("fr-DZ")} DA
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block mb-0.5">
                    {t("totalPaid")}
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                    {totalPaid.toLocaleString("fr-DZ")} DA
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block mb-0.5">
                    {t("remainingBalance")}
                  </span>
                  <span
                    className={`font-mono font-bold text-xs sm:text-sm ${
                      debt > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {debt > 0 ? `${debt.toLocaleString("fr-DZ")} DA` : t("settled")}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{t("paymentStatus")}</span>
                  <span className="font-mono font-semibold text-white">{paymentPct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFullyPaid
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : "bg-gradient-to-r from-cyan-500 to-sky-400"
                    }`}
                    style={{ width: `${paymentPct}%` }}
                  />
                </div>
              </div>

              {/* Payment Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between group active:scale-[0.99] ${
                    debt > 0
                      ? "bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(0,242,255,0.25)]"
                      : "bg-slate-800/80 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    <span>{t("paySubscriptionBtn")}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold opacity-90">
                    <span className="hidden sm:inline font-mono font-medium text-[10px]">
                      {debt > 0 ? `${debt.toLocaleString("fr-DZ")} DA` : t("settled")}
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
              </div>

              {/* Transactions List */}
              {paymentsList.length > 0 && (
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {t("paymentHistory")}
                  </span>
                  <div className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/10 bg-slate-950/40">
                    {paymentsList.map((p) => (
                      <div key={p.id} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-white capitalize text-[11px] block">{p.method}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(p.paidAt).toLocaleDateString(locale === "ar" ? "ar-DZ" : "fr-DZ", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                            {p.notes ? ` · ${p.notes}` : ""}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          +{p.amount.toLocaleString("fr-DZ")} DA
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 4. SUBSCRIPTION PERIOD */}
            {member.subscriptionEnd && (() => {
              const subStatus = member.subscriptionStatus ?? "active";
              const daysLeft = member.subscriptionDaysLeft ?? 0;
              const formattedSubStart = member.subscriptionStart
                ? new Date(member.subscriptionStart).toLocaleDateString(
                    locale === "ar" ? "ar-DZ" : "fr-DZ",
                    { year: "numeric", month: "short", day: "numeric" }
                  )
                : "—";
              const formattedSubEnd = new Date(member.subscriptionEnd).toLocaleDateString(
                locale === "ar" ? "ar-DZ" : "fr-DZ",
                { year: "numeric", month: "short", day: "numeric" }
              );
              return (
                <section className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                      {t("subscriptionPeriodTitle")}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        subStatus === "active"
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                          : subStatus === "expiring_soon"
                          ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                          : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {subStatus === "active"
                        ? t("subscriptionActive")
                        : subStatus === "expiring_soon"
                        ? t("subscriptionExpiringSoon")
                        : t("subscriptionExpired")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold block mb-0.5">
                        {t("subscriptionStartLabel")}
                      </span>
                      <span className="font-mono font-bold text-white text-xs">
                        {formattedSubStart}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold block mb-0.5">
                        {t("subscriptionEndLabel")}
                      </span>
                      <span className={`font-mono font-bold text-xs ${
                        subStatus === "expired" ? "text-rose-400" : subStatus === "expiring_soon" ? "text-amber-300" : "text-cyan-300"
                      }`}>
                        {formattedSubEnd}
                      </span>
                    </div>
                  </div>

                  {subStatus !== "expired" && (
                    <div className="flex items-center justify-between text-[11px] px-1">
                      <span className="text-slate-400">{t("subscriptionDaysLeft").replace("{n}", String(Math.max(0, daysLeft)))}</span>
                      <div className="h-1.5 w-40 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            subStatus === "expiring_soon"
                              ? "bg-gradient-to-r from-amber-500 to-orange-400"
                              : "bg-gradient-to-r from-cyan-500 to-sky-400"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, (daysLeft / 270) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 italic pt-1 border-t border-white/5">
                    {t("subscriptionExclusionNote")}
                  </p>
                </section>
              );
            })()}

            {/* 5. THE GROUP TABLE & GROUP NAMES TABLE */}
            <section className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                    {t("groupTableTitle")}
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t("olympicPool")}</p>
                </div>
                {member.isSolid && <SolidLogoBadge t={t} compact />}
              </div>

              {displayGroups.length > 0 && (
                <div className="space-y-4">
                  {displayGroups.map((grp, idx) => (
                    <div key={grp.id} className="space-y-2">
                      {/* Group slot summary */}
                      <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            {displayGroups.length > 1 ? `Slot ${idx + 1} · ${t("groupName")}` : t("groupName")}
                          </span>
                          <span className="font-bold text-white font-display text-sm">{grp.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">{t("assignedCoach")}</span>
                          <span className="font-semibold text-cyan-300">{grp.coachName || "Coach AQA Sports"}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">{t("trainingSchedule")}</span>
                          <ScheduleDisplay schedule={grp.schedule} />
                        </div>
                      </div>

                      {/* Per-group cohort names table (old members only) */}
                      {isOldMember ? (
                        <GroupNamesTable
                          groupMembers={
                            (grp.groupMembers || (idx === 0 ? member.groupMembers || [] : [])).map((m, mIdx) => ({
                              ...m,
                              num: mIdx + 1,
                              fullName: extractFirstName(m.fullName),
                            }))
                          }
                          t={t}
                        />
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/5 text-[11px] text-slate-400 text-center italic">
                          {t("groupMembersRestrictedNotice")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 5. WORD FROM COACH */}
            <section className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.1)] space-y-1.5">
              <div className="flex items-center gap-2 text-sky-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider font-display">
                  {member.coachMessage ? t("wordFromCoach") : t("wordFromStaff")}
                </span>
              </div>
              <p className="text-xs italic text-slate-200 leading-relaxed pt-0.5">
                &ldquo;{member.coachMessage || t("defaultCoachMessage")}&rdquo;
              </p>
              {member.group?.coachName && (
                <span className="text-[10px] font-semibold text-cyan-300 block text-right">
                  — {member.group.coachName}
                </span>
              )}
            </section>

            {/* 6. BASICS */}
            <section className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-2.5">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-display pb-2 border-b border-white/10">
                {t("basicsTitle")}
              </h2>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t("category")}</span>
                  <span className="font-semibold text-white capitalize">{member.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t("level")}</span>
                  <span className="font-semibold text-white">{member.level}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t("startDate")}</span>
                  <span className="font-semibold text-white">{formattedDateOfStart}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t("contactPhone")}</span>
                  <span className="font-mono text-cyan-300">{member.phone || "—"}</span>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* ── CONDITION B: IF NOT CONFIRMED (PROPOSED OR REJECTED) ────────── */
          <>
            {/* Status Alert Banner */}
            <section className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider font-display">
                    {t("statusProposed")}
                  </span>
                </div>
                <span className="font-mono text-xs text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                  {member.swimId}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("statusProposedDesc")}
              </p>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                <span className="text-slate-300 font-medium">
                  {member.category} · {member.formula || "G10"} ({member.duration || "3m"})
                </span>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  {priceDA.toLocaleString("fr-DZ")} DA
                </span>
              </div>
            </section>

            {/* 1. THE GROUP TABLE & GROUP NAMES TABLE */}
            <section className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                    {t("groupTableProposedTitle")}
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t("olympicPool")}</p>
                </div>
                {member.isSolid && <SolidLogoBadge t={t} compact />}
              </div>

              {displayGroups.length > 0 && (
                <div className="space-y-4">
                  {displayGroups.map((grp, idx) => (
                    <div key={grp.id} className="space-y-2">
                      {/* Group slot summary */}
                      <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            {displayGroups.length > 1 ? `Slot ${idx + 1} · ${t("groupName")}` : t("groupName")}
                          </span>
                          <span className="font-bold text-white font-display text-sm">{grp.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">{t("assignedCoach")}</span>
                          <span className="font-semibold text-cyan-300">{grp.coachName || "Coach AQA Sports"}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className="text-[10px] font-semibold text-amber-400 uppercase">{t("trainingSchedule")}</span>
                          <ScheduleDisplay schedule={grp.schedule} />
                        </div>
                      </div>

                      {/* Per-group cohort names table (old members only) */}
                      {isOldMember ? (
                        <GroupNamesTable
                          groupMembers={
                            (grp.groupMembers || (idx === 0 ? member.groupMembers || [] : [])).map((m, mIdx) => ({
                              ...m,
                              num: mIdx + 1,
                              fullName: extractFirstName(m.fullName),
                            }))
                          }
                          t={t}
                        />
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/5 text-[11px] text-slate-400 text-center italic">
                          {t("groupMembersRestrictedNotice")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 2. SUBSCRIPTION TARIFF & FINANCIAL SUMMARY */}
            <section className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                    {t("paymentsTitle")}
                  </h2>
                  <p className="text-[10px] text-cyan-300 font-semibold mt-0.5">
                    {member.formula || "G10"} · {member.duration || "3m"}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isFullyPaid
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                      : totalPaid > 0
                      ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                      : "bg-cyan-950/80 text-cyan-300 border border-cyan-500/30"
                  }`}
                >
                  {isFullyPaid
                    ? t("statusPaid")
                    : totalPaid > 0
                    ? t("statusPartial")
                    : t("statusUnpaid")}
                </span>
              </div>

              {/* 3-stat breakdown */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block mb-0.5">
                    {t("totalPrice")}
                  </span>
                  <span className="font-mono font-bold text-cyan-300 text-xs sm:text-sm">
                    {priceDA.toLocaleString("fr-DZ")} DA
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block mb-0.5">
                    {t("totalPaid")}
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                    {totalPaid.toLocaleString("fr-DZ")} DA
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-semibold block mb-0.5">
                    {t("remainingBalance")}
                  </span>
                  <span
                    className={`font-mono font-bold text-xs sm:text-sm ${
                      debt > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {debt > 0 ? `${debt.toLocaleString("fr-DZ")} DA` : t("settled")}
                  </span>
                </div>
              </div>

              {/* Progress bar if partial/paid */}
              {totalPaid > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{t("paymentStatus")}</span>
                    <span className="font-mono font-semibold text-white">{paymentPct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFullyPaid
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : "bg-gradient-to-r from-cyan-500 to-sky-400"
                      }`}
                      style={{ width: `${paymentPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Payment Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between group active:scale-[0.99] ${
                    debt > 0
                      ? "bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(0,242,255,0.25)]"
                      : "bg-slate-800/80 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    <span>{t("paySubscriptionBtn")}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold opacity-90">
                    <span className="hidden sm:inline font-mono font-medium text-[10px]">
                      {debt > 0 ? `${debt.toLocaleString("fr-DZ")} DA` : t("settled")}
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
              </div>
            </section>

            {/* 3. ACCEPTANCE BUTTONS */}
            <section className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-2.5">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleDecision("accept")}
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{submitting ? t("accepting") : t("acceptBtn")}</span>
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 border border-rose-500/30 font-semibold text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{t("rejectBtn")}</span>
                </button>
              </div>

              {isRejected && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                  <span>{t("statusRejectedDesc")}</span>
                  <button
                    onClick={() => handleDecision("accept")}
                    disabled={submitting}
                    className="font-bold underline hover:text-white"
                  >
                    {t("reAcceptBtn")}
                  </button>
                </div>
              )}
            </section>

            {/* 3. TARIFS LINK */}
            <section className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                    {t("officialTarifsTitle")}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t("officialTarifsDesc")}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 uppercase block">{t("formulaTarif")}</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs sm:text-sm">
                    {priceDA.toLocaleString("fr-DZ")} DA
                  </span>
                </div>
              </div>

              <a
                href="https://aqasports.com/tarifs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-2 group"
              >
                <span>{t("viewTarifsBtn")}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </section>

            {/* 4. WORD FROM COACH */}
            <section className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.1)] space-y-1.5">
              <div className="flex items-center gap-2 text-sky-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider font-display">
                  {member.coachMessage ? t("wordFromCoach") : t("wordFromStaff")}
                </span>
              </div>
              <p className="text-xs italic text-slate-200 leading-relaxed pt-0.5">
                &ldquo;{member.coachMessage || t("defaultCoachMessage")}&rdquo;
              </p>
              {member.group?.coachName && (
                <span className="text-[10px] font-semibold text-cyan-300 block text-right">
                  — {member.group.coachName}
                </span>
              )}
            </section>

            {/* 5. BASICS */}
            <section className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-2.5">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-display pb-2 border-b border-white/10">
                {t("basicsTitle")}
              </h2>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t("category")}</span>
                  <span className="font-semibold text-white capitalize">{member.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t("level")}</span>
                  <span className="font-semibold text-white">{member.level}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t("formula")}</span>
                  <span className="font-semibold text-white">
                    {member.formula} ({member.duration || "3m"}) · {priceDA.toLocaleString("fr-DZ")} DA
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t("contactPhone")}</span>
                  <span className="font-mono text-cyan-300">{member.phone || "—"}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Footer link to enter another ID */}
        <div className="text-center pt-2 pb-6">
          <Link
            href="/swim"
            className="text-xs text-slate-500 hover:text-cyan-300 transition-colors inline-flex items-center gap-1.5"
          >
            <span>← {t("backToSearch")}</span>
          </Link>
        </div>
      </main>

      {/* Rejection / Availability Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir={dir}>
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3.5">
            <h3 className="text-sm font-bold text-white font-display">
              {t("changeRequestModalTitle")}
            </h3>
            <p className="text-xs text-slate-400">{t("changeRequestModalDesc")}</p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t("rejectionReasonLabel")}
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("rejectionReasonPlaceholder")}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t("preferredDaysLabel")}
              </label>
              <input
                type="text"
                value={preferredDays}
                onChange={(e) => setPreferredDays(e.target.value)}
                placeholder={t("preferredDaysPlaceholder")}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => handleDecision("reject")}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50"
              >
                {t("submitChangeRequest")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Options Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir={dir}>
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                    {t("paymentModalTitle")}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {t("paymentModalDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label={t("cancel")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Member & Amount Summary Strip */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  {t("memberIdLabel")}
                </span>
                <span className="font-mono font-bold text-cyan-300">
                  {member.swimId} · {member.fullName}
                </span>
              </div>
              <div className="text-right space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  {t("amountDueLabel")}
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {debt > 0 ? `${debt.toLocaleString("fr-DZ")} DA` : `${priceDA.toLocaleString("fr-DZ")} DA`}
                </span>
              </div>
            </div>

            {/* Two Payment Options */}
            <div className="space-y-3 pt-1">
              {/* Option 1: BaridiMob */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/10 hover:border-cyan-500/40 transition-all space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(0,242,255,0.15)]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white font-display">
                        {t("payOptionBaridiTitle")}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {t("payOptionBaridiDesc")}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 shrink-0">
                    {t("payOptionBaridiBadge")}
                  </span>
                </div>

                <a
                  href={getSwimPaymentWhatsAppUrl({
                    fullName: member.fullName,
                    swimId: member.swimId,
                    method: "baridimob",
                    amount: debt > 0 ? debt : priceDA,
                    formula: member.formula,
                    locale,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-between group shadow-[0_0_12px_rgba(16,185,129,0.25)] active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    <span>{t("payOptionBaridiAction")}</span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              </div>

              {/* Option 2: Cash at Pool */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/10 hover:border-sky-500/40 transition-all space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-950/80 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.15)]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <circle cx="12" cy="12" r="9" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white font-display">
                        {t("payOptionCashTitle")}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {t("payOptionCashDesc")}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-sky-950/70 text-sky-300 border border-sky-500/30 shrink-0">
                    {t("payOptionCashBadge")}
                  </span>
                </div>

                <a
                  href={getSwimPaymentWhatsAppUrl({
                    fullName: member.fullName,
                    swimId: member.swimId,
                    method: "cash_pool",
                    amount: debt > 0 ? debt : priceDA,
                    formula: member.formula,
                    locale,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-white/15 hover:border-cyan-400/40 transition-all flex items-center justify-between group shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 fill-current text-emerald-400" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    <span>{t("payOptionCashAction")}</span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Modal Close Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs text-slate-300 hover:text-white font-semibold transition-all border border-white/5"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
