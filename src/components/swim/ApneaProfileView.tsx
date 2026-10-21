"use client";

import React from "react";
import { useTranslations, useLocale } from "@/lib/i18n";
import { SwimFlipCard } from "@/components/swim/SwimFlipCard";
import { ApneaEvolutionChart, type ApneaChartPoint } from "@/components/swim/ApneaEvolutionChart";
import { formatApneaDuration } from "@/lib/swim-apnea";

export interface ApneaProfileViewData {
  sessionsTotal: number;
  sessionsAttended: number;
  sessionsRemaining: number;
  hasFins: boolean;
  totalPriceDA: number;
  totalPaidDA: number;
  remainingDebtDA: number;
  bestStaticSeconds: number | null;
  bestDynamicMeters: number | null;
  staticGoalSeconds: number;
  staticGoalPercent: number;
  staticEvolution: ApneaChartPoint[];
  dynamicEvolution: ApneaChartPoint[];
}

export interface ApneaProfileViewMember {
  fullName: string;
  swimId: string;
  category: string;
  level?: string;
  formula: string;
  duration: string | null;
  card: { cardCode: string; publicToken: string; status?: string } | null;
  group: { name: string; coachName: string | null; schedule: string } | null;
  apnea: ApneaProfileViewData;
}

function panelClass() {
  return "rounded-[14px] border border-white/[0.08] bg-slate-900/80 p-4 shadow-[0_0_15px_rgba(0,242,255,0.08)] backdrop-blur-xl";
}

/**
 * Dedicated public profile for AQA Apnea clients: pass card, payment,
 * remaining sessions, records, evolution graphs and the 4 minute static goal.
 */
export function ApneaProfileView({ member }: { member: ApneaProfileViewMember }) {
  const { t } = useTranslations("swimApnea");
  const { locale, setLocale, dir } = useLocale();
  const a = member.apnea;

  const paymentStatus =
    a.totalPriceDA > 0 && a.totalPaidDA >= a.totalPriceDA
      ? "paid"
      : a.totalPaidDA > 0
        ? "partial"
        : "unpaid";
  const paymentPct =
    a.totalPriceDA > 0 ? Math.min(100, Math.round((a.totalPaidDA / a.totalPriceDA) * 100)) : 0;
  const sessionsPct =
    a.sessionsTotal > 0 ? Math.min(100, Math.round((a.sessionsAttended / a.sessionsTotal) * 100)) : 0;
  const goalReached = a.staticGoalPercent >= 100;

  return (
    <div
      className="relative flex min-h-screen flex-col items-center overflow-x-hidden bg-[#030712] px-4 py-6 font-sans text-slate-100 selection:bg-cyan-500 selection:text-black"
      dir={dir}
    >
      <div className="pointer-events-none fixed left-[-10%] top-[-10%] h-[60vh] w-[60vw] rounded-full bg-sky-500/10 blur-[130px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] h-[60vh] w-[60vw] rounded-full bg-cyan-400/10 blur-[130px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between pb-2 pt-2">
        <div className="flex items-center gap-3">
          <a href="https://aqasports.com" target="_blank" rel="noopener noreferrer">
            <img src="/image/logo.webp" alt="AQA Sports" className="h-8 w-auto object-contain drop-shadow sm:h-9" />
          </a>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 backdrop-blur-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/90">
              {t("profileTitle")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/90 p-1">
          {(["fr", "ar", "en"] as const).map((lng) => (
            <button
              key={lng}
              onClick={() => setLocale(lng)}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase transition-all ${
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

      <main className="relative z-10 mx-auto w-full max-w-md space-y-4 py-3">
        {/* Card (same as AQA Swim) */}
        <section className="flex w-full flex-col items-center">
          <SwimFlipCard
            member={{
              swimId: member.swimId,
              fullName: member.fullName,
              category: member.category,
              level: member.level,
              formula: member.formula,
              duration: member.duration,
              paymentStatus,
              isAssigned: true,
              isDebtOnly: false,
              isLinkedToPayment: true,
              group: member.group,
              card: member.card,
            }}
          />
        </section>

        {/* Remaining sessions */}
        <section className={panelClass()}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">{t("profileSessions")}</h2>
            {a.hasFins && (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-300">
                {t("profileFinsIncluded")}
              </span>
            )}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-4xl font-semibold text-cyan-300">{a.sessionsRemaining}</p>
              <p className="text-xs text-slate-400">{t("sessionsRemaining")}</p>
            </div>
            <div className="text-end">
              <p className="font-mono text-sm text-slate-200">
                {a.sessionsAttended} / {a.sessionsTotal}
              </p>
              <p className="text-[11px] text-slate-500">{t("sessionsAttended")}</p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300"
              style={{ width: `${sessionsPct}%` }}
            />
          </div>
        </section>

        {/* Payment */}
        <section className={panelClass()}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">{t("profilePayment")}</h2>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                paymentStatus === "paid"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : paymentStatus === "partial"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {paymentPct}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[10px] bg-slate-800/60 p-2">
              <p className="font-mono text-sm font-semibold text-white">{a.totalPriceDA}</p>
              <p className="text-[10px] text-slate-400">{t("price")} ({t("currency")})</p>
            </div>
            <div className="rounded-[10px] bg-slate-800/60 p-2">
              <p className="font-mono text-sm font-semibold text-emerald-300">{a.totalPaidDA}</p>
              <p className="text-[10px] text-slate-400">{t("paid")}</p>
            </div>
            <div className="rounded-[10px] bg-slate-800/60 p-2">
              <p className={`font-mono text-sm font-semibold ${a.remainingDebtDA > 0 ? "text-amber-300" : "text-slate-300"}`}>
                {a.remainingDebtDA}
              </p>
              <p className="text-[10px] text-slate-400">{t("remainingDebt")}</p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${paymentPct}%` }} />
          </div>
        </section>

        {/* Records */}
        <section className={panelClass()}>
          <h2 className="mb-3 text-sm font-bold text-white">{t("profileRecords")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[10px] bg-slate-800/60 p-3">
              <p className="text-[11px] text-slate-400">{t("staticRecord")}</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-cyan-300" dir="ltr">
                {a.bestStaticSeconds !== null ? formatApneaDuration(a.bestStaticSeconds) : "-"}
              </p>
              {a.bestStaticSeconds !== null && (
                <p className="font-mono text-[11px] text-slate-500" dir="ltr">
                  {a.bestStaticSeconds} {t("secondsShort")}
                </p>
              )}
            </div>
            <div className="rounded-[10px] bg-slate-800/60 p-3">
              <p className="text-[11px] text-slate-400">{t("dynamicRecord")}</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-cyan-300" dir="ltr">
                {a.bestDynamicMeters !== null ? `${a.bestDynamicMeters} ${t("metersShort")}` : "-"}
              </p>
            </div>
          </div>
        </section>

        {/* Goal: 4 min static */}
        <section className={panelClass()}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">{t("profileGoal")}</h2>
            <span className={`font-mono text-lg font-semibold ${goalReached ? "text-emerald-300" : "text-cyan-300"}`}>
              {a.staticGoalPercent}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full ${
                goalReached
                  ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  : "bg-gradient-to-r from-sky-500 to-cyan-300 shadow-[0_0_12px_rgba(0,242,255,0.35)]"
              }`}
              style={{ width: `${a.staticGoalPercent}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400" dir="ltr">
            {a.bestStaticSeconds !== null ? formatApneaDuration(a.bestStaticSeconds) : "0:00"} /{" "}
            {formatApneaDuration(a.staticGoalSeconds)}
            {goalReached ? `  -  ${t("profileGoalReached")}` : ""}
          </p>
        </section>

        {/* Evolution graphs */}
        <section className={`${panelClass()} space-y-4`}>
          <h2 className="text-sm font-bold text-white">{t("profileEvolution")}</h2>
          <div>
            <p className="mb-1.5 text-[11px] text-slate-400">{t("profileStaticEvolution")}</p>
            <ApneaEvolutionChart
              points={a.staticEvolution}
              unit={t("secondsShort")}
              goal={a.staticGoalSeconds}
              goalLabel="4:00"
              locale={locale}
              ariaLabel={t("profileStaticEvolution")}
              emptyLabel={t("profileNotEnough")}
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] text-slate-400">{t("profileDynamicEvolution")}</p>
            <ApneaEvolutionChart
              points={a.dynamicEvolution}
              unit={t("metersShort")}
              locale={locale}
              ariaLabel={t("profileDynamicEvolution")}
              emptyLabel={t("profileNotEnough")}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
