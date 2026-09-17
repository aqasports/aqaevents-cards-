"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "@/lib/i18n";
import { SwimFlipCard } from "@/components/swim/SwimFlipCard";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface SwimPaymentItem {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  paidAt: string;
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
  isSolid?: boolean;
  solidNotes?: string;
  teammates?: string[];
  group: {
    id: string;
    name: string;
    coachName: string | null;
    schedule: string;
    level: string;
  } | null;
  card: {
    id: string;
    cardCode: string;
    publicToken: string;
    status?: string;
  } | null;
  payments: SwimPaymentItem[];
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
    <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-sky-950/80 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,196,212,0.25)] select-none">
      {/* Sleek SVG Isometric Shield/Cube Emblem */}
      <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 text-slate-950 shrink-0 shadow-[0_0_10px_rgba(0,242,255,0.4)]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
          <path d="M12 22V12" />
          <path d="M21 7l-9 5-9-5" />
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black tracking-wider uppercase text-cyan-300 font-display">
            {t("solidBadgeTitle")}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
            {t("solidBadgeSubtitle")}
          </span>
        </div>
        {!compact && (
          <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
            {t("solidBadgeDesc")}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
      <div className="min-h-screen bg-[#050d1a] text-slate-100 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-[#050d1a] text-slate-100 flex items-center justify-center p-4" dir={dir}>
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
  const isProposed = !isConfirmed && !isRejected;

  // Payments calculation
  const paymentsList = member.payments || [];
  const totalPaid = paymentsList.reduce((acc, p) => acc + (p.amount || 0), 0);
  const priceDA = member.priceDA || 0;
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

  return (
    <div
      className="min-h-screen bg-[#050d1a] text-slate-100 flex flex-col items-center py-6 px-4 selection:bg-cyan-500 selection:text-black relative overflow-x-hidden font-sans"
      dir={dir}
    >
      {/* Background glow effects */}
      <div className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-sky-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] bg-cyan-400/10 blur-[130px] pointer-events-none rounded-full" />

      <main className="w-full max-w-2xl relative z-10 space-y-5">
        {/* Top Bar: Brand, Portal Title, Language Switcher */}
        <header className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <a
              href="https://aqasports.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-[0_0_10px_rgba(0,242,255,0.3)] group-hover:scale-105 transition-transform">
                A
              </div>
              <span className="font-bold tracking-tight text-white text-sm font-display group-hover:text-cyan-300 transition-colors">
                AQA SPORTS
              </span>
            </a>
            <span className="text-slate-600 text-xs">/</span>
            <span className="text-xs font-semibold text-slate-400">{t("clientArea")}</span>
          </div>

          {/* Language Switcher */}
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

        {/* Swimmer Header & Basics Summary */}
        <section className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.fullName}
                  className="h-14 w-14 rounded-2xl object-cover border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,255,0.2)]"
                />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-slate-950 font-black text-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.25)] shrink-0">
                  {member.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-extrabold text-white font-display tracking-tight">
                  {member.fullName}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="font-mono text-xs text-cyan-300 font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                    {member.swimId}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 capitalize">
                    {member.category} · {member.formula} ({member.duration || "3m"})
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation status pill */}
            <div>
              {isConfirmed && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{t("statusConfirmed")}</span>
                </span>
              )}
              {isProposed && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-950/60 border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{t("statusProposed")}</span>
                </span>
              )}
              {isRejected && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-950/60 border border-rose-500/40 text-rose-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span>{t("statusRejected")}</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Success Flash message */}
          {actionSuccess && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-medium text-center">
              {actionSuccess}
            </div>
          )}
        </section>

        {/* ── CONDITION A: IF CONFIRMED ───────────────────────────────────────── */}
        {isConfirmed ? (
          <>
            {/* 1. THE GROUP TABLE */}
            <section className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                    {t("groupTableTitle")}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t("olympicPool")}</p>
                </div>
                {member.isSolid && <SolidLogoBadge t={t} />}
              </div>

              {member.group ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {t("groupName")}
                      </span>
                      <span className="text-base font-bold text-white font-display">
                        {member.group.name}
                      </span>
                      <span className="text-[11px] text-cyan-300 block">
                        {member.group.level} · {member.category}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {t("assignedCoach")}
                      </span>
                      <span className="text-base font-bold text-cyan-300 font-display">
                        {member.group.coachName || "Coach AQA Sports"}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Entraîneur Certifié AQA Sports
                      </span>
                    </div>
                  </div>

                  {/* Schedule row */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-950/40 via-slate-800/60 to-slate-900 border border-sky-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider block">
                        {t("trainingSchedule")}
                      </span>
                      <span className="text-sm font-semibold text-white mt-0.5 block">
                        {member.group.schedule}
                      </span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-semibold">
                      {member.formula}
                    </div>
                  </div>

                  {/* Teammates */}
                  {member.teammates && member.teammates.length > 0 && (
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        {t("teammates")} ({member.teammates.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {member.teammates.map((name, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-white/10 text-xs font-medium text-slate-200"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <span>{name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">{t("noTeammates")}</p>
              )}
            </section>

            {/* 2. THE PVC PASS CARD */}
            <section className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                    {t("passCardTitle")}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t("passCardSubtitle")}</p>
                </div>
                {member.card?.publicToken && (
                  <Link
                    href={`/swim/card/${member.card.publicToken}`}
                    className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 underline inline-flex items-center gap-1"
                  >
                    <span>{t("openDigitalPass")}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </Link>
                )}
              </div>

              {/* Interactive Flip Card */}
              <div className="flex justify-center py-2">
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
              </div>
            </section>

            {/* 3. PAYMENTS & FINANCIAL LEDGER */}
            <section className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                  {t("paymentsTitle")}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    isFullyPaid
                      ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"
                      : totalPaid > 0
                      ? "bg-amber-950/60 text-amber-300 border border-amber-500/30"
                      : "bg-rose-950/60 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {isFullyPaid ? t("statusPaid") : totalPaid > 0 ? t("statusPartial") : t("statusUnpaid")}
                </span>
              </div>

              {/* Stats breakdown */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    {t("totalPrice")}
                  </span>
                  <span className="font-mono font-bold text-white text-sm sm:text-base">
                    {priceDA.toLocaleString("fr-DZ")} DA
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    {t("totalPaid")}
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">
                    {totalPaid.toLocaleString("fr-DZ")} DA
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    {t("remainingBalance")}
                  </span>
                  <span
                    className={`font-mono font-bold text-sm sm:text-base ${
                      debt > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {debt > 0 ? `${debt.toLocaleString("fr-DZ")} DA` : t("settled")}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{t("paymentStatus")}</span>
                  <span className="font-mono font-semibold text-white">{paymentPct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
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

              {/* Transaction list */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  {t("paymentHistory")}
                </span>
                {paymentsList.length > 0 ? (
                  <div className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/10 bg-slate-950/40">
                    {paymentsList.map((p) => (
                      <div key={p.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-white capitalize">{p.method}</span>
                          <span className="text-[11px] text-slate-400 block">
                            {new Date(p.paidAt).toLocaleDateString(locale === "ar" ? "ar-DZ" : "fr-DZ", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                            {p.notes ? ` · ${p.notes}` : ""}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          +{p.amount.toLocaleString("fr-DZ")} DA
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-800/40 border border-white/5">
                    {t("noPaymentsYet")}
                  </p>
                )}
              </div>
            </section>

            {/* 4. WORD FROM COACH */}
            <section className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.1)] space-y-2">
              <div className="flex items-center gap-2 text-sky-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider font-display">
                  {member.coachMessage ? t("wordFromCoach") : t("wordFromStaff")}
                </span>
              </div>
              <p className="text-xs italic text-slate-200 leading-relaxed pt-1">
                &ldquo;{member.coachMessage || t("defaultCoachMessage")}&rdquo;
              </p>
              {member.group?.coachName && (
                <span className="text-[11px] font-semibold text-cyan-300 block pt-1">
                  — {member.group.coachName}
                </span>
              )}
            </section>

            {/* 5. BASICS */}
            <section className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-display pb-2 border-b border-white/10">
                {t("basicsTitle")}
              </h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{t("category")}</span>
                  <span className="font-semibold text-white capitalize block">{member.category}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{t("level")}</span>
                  <span className="font-semibold text-white block">{member.level}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{t("startDate")}</span>
                  <span className="font-semibold text-white block">{formattedDateOfStart}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{t("contactPhone")}</span>
                  <span className="font-mono text-cyan-300 block">{member.phone || "—"}</span>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* ── CONDITION B: IF NOT CONFIRMED (PROPOSED OR REJECTED) ────────── */
          <>
            {/* 1. THE GROUP TABLE */}
            <section className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                    {t("groupTableProposedTitle")}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t("statusProposedDesc")}</p>
                </div>
                {member.isSolid && <SolidLogoBadge t={t} />}
              </div>

              {member.group ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {t("groupName")}
                      </span>
                      <span className="text-base font-bold text-white font-display">
                        {member.group.name}
                      </span>
                      <span className="text-[11px] text-cyan-300 block">
                        {member.group.level} · {member.category}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {t("assignedCoach")}
                      </span>
                      <span className="text-base font-bold text-cyan-300 font-display">
                        {member.group.coachName || "Coach AQA Sports"}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Entraîneur Référent du Groupe
                      </span>
                    </div>
                  </div>

                  {/* Schedule row */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-800/60 to-slate-900 border border-amber-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
                        {t("trainingSchedule")}
                      </span>
                      <span className="text-sm font-semibold text-white mt-0.5 block">
                        {member.group.schedule}
                      </span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                      {member.formula}
                    </div>
                  </div>

                  {/* Teammates */}
                  {member.teammates && member.teammates.length > 0 && (
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        {t("teammates")} ({member.teammates.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {member.teammates.map((name, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-white/10 text-xs font-medium text-slate-200"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <span>{name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">{t("noTeammates")}</p>
              )}
            </section>

            {/* 2. ACCEPTANCE BUTTONS */}
            <section className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => handleDecision("accept")}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-300 hover:to-cyan-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{submitting ? t("accepting") : t("acceptBtn")}</span>
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 border border-rose-500/30 font-semibold text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2"
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
            <section className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                    {t("officialTarifsTitle")}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t("officialTarifsDesc")}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block">{t("formulaTarif")}</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">
                    {priceDA.toLocaleString("fr-DZ")} DA
                  </span>
                </div>
              </div>

              <a
                href="https://aqasports.com/tarifs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-2 group"
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
            <section className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.1)] space-y-2">
              <div className="flex items-center gap-2 text-sky-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider font-display">
                  {member.coachMessage ? t("wordFromCoach") : t("wordFromStaff")}
                </span>
              </div>
              <p className="text-xs italic text-slate-200 leading-relaxed pt-1">
                &ldquo;{member.coachMessage || t("defaultCoachMessage")}&rdquo;
              </p>
              {member.group?.coachName && (
                <span className="text-[11px] font-semibold text-cyan-300 block pt-1">
                  — {member.group.coachName}
                </span>
              )}
            </section>

            {/* 5. BASICS */}
            <section className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-display pb-2 border-b border-white/10">
                {t("basicsTitle")}
              </h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{t("category")}</span>
                  <span className="font-semibold text-white capitalize block">{member.category}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{t("level")}</span>
                  <span className="font-semibold text-white block">{member.level}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{t("formula")}</span>
                  <span className="font-semibold text-white block">
                    {member.formula} ({member.duration || "3m"})
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{t("contactPhone")}</span>
                  <span className="font-mono text-cyan-300 block">{member.phone || "—"}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Footer link to enter another ID */}
        <div className="text-center pt-2">
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
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white font-display">
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

            <div className="flex gap-2 pt-2">
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
    </div>
  );
}
