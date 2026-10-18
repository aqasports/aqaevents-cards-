"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, StatCard, Card, Badge, Alert } from "@/components/admin/ui";
import { QuickBalanceCharger } from "@/components/admin/QuickBalanceCharger";
import { useTranslations, formatDate } from "@/lib/i18n";

type ClientCard = {
  cardCode: string;
};

type LowBalanceClient = {
  id: string;
  fullName: string;
  balance: number;
  cards: ClientCard[];
};

type RecentRedemption = {
  id: string;
  creditsUsed: number;
  redeemedAt: string | Date;
  sessionDate?: string | null;
  checkInAt?: string | null;
  client: {
    fullName: string;
    id: string;
  };
  activity: {
    name: string;
  };
};

type DashboardClientProps = {
  clientCount: number;
  activeCards: number;
  todayRedemptions: number;
  creditsRemaining: number;
  creditsSold: number;
  creditsUsed: number;
  lowBalance: LowBalanceClient[];
  recentRedemptions: RecentRedemption[];

  revenueToday: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  popularActivityName: string;
  attendanceRate: number;
  utilizationRate: number;
  inactiveCardsCount: number;
  newClientsThisMonth: number;
  returningClientsCount: number;
  soldCreditRevenue: number;
  creditRate: number;

  // Filiere 1: AQA Sports Academy (AQA Swim)
  swimMembersCount: number;
  swimPendingLeadsCount: number;
  swimActiveGroupsCount: number;
  swimRevenueTotal: number;

  // Filiere 3: AQA Store
  storeProductsCount: number;
  swimGearArticlesCount: number;
  swimGearUnitsSold: number;
  swimGearRevenue: number;
};

function DashboardClientInner({
  clientCount,
  activeCards,
  todayRedemptions,
  creditsRemaining,
  creditsSold,
  creditsUsed,
  lowBalance,
  recentRedemptions,

  revenueToday,
  revenueThisMonth,
  revenueThisYear,
  popularActivityName,
  attendanceRate,
  utilizationRate,
  inactiveCardsCount,
  newClientsThisMonth,
  returningClientsCount,
  soldCreditRevenue,
  creditRate,

  swimMembersCount,
  swimPendingLeadsCount,
  swimActiveGroupsCount,
  swimRevenueTotal,

  storeProductsCount,
  swimGearArticlesCount,
  swimGearUnitsSold,
  swimGearRevenue,
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, dir, locale } = useTranslations("dashboard");

  const [viewMode, setViewMode] = useState<"erp" | "events">("erp");
  const [mobileFiliereFilter, setMobileFiliereFilter] = useState<"all" | "academy" | "events" | "store">("all");

  useEffect(() => {
    const v = searchParams?.get("view");
    if (v === "events") {
      setViewMode("events");
    } else {
      setViewMode("erp");
    }
  }, [searchParams]);

  function handleSwitchView(next: "erp" | "events") {
    setViewMode(next);
    if (next === "events") {
      router.replace("/admin?view=events", { scroll: false });
    } else {
      router.replace("/admin", { scroll: false });
    }
  }

  const lowBalanceNames = lowBalance.map((c) => c.fullName).join(", ");
  const alertText = t("lowBalanceAlert", { names: lowBalanceNames });

  const fmtCurrency = (n: number) => {
    return n.toLocaleString("fr-DZ") + " DA";
  };

  const quickActionsList = [
    {
      href: "/admin/clients/new",
      label: t("actionNewClient"),
      desc: t("newClientDesc"),
      icon: (
        <svg className="h-6 w-6 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      href: "/admin/redeem",
      label: t("actionRedeem"),
      desc: t("redeemDesc"),
      icon: (
        <svg className="h-6 w-6 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H9m2-2a2 2 0 00-2 2v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V5a2 2 0 00-2-2h-2m-4 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      href: "/admin/store",
      label: t("actionAddProduct"),
      desc: t("addProductDesc"),
      icon: (
        <svg className="h-6 w-6 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      href: "/admin/users?tab=coaches",
      label: t("actionLinkCoach"),
      desc: t("linkCoachDesc"),
      icon: (
        <svg className="h-6 w-6 text-cyan-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 100 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      href: "/admin/activities",
      label: t("actionAddActivity"),
      desc: t("addActivityDesc"),
      icon: (
        <svg className="h-6 w-6 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6" dir={dir}>
      {/* Top ERP Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSwitchView("erp")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
              viewMode === "erp"
                ? "bg-cyan-500/15 text-[var(--accent)] border-cyan-500/30 shadow-[0_0_12px_rgba(0,242,255,0.12)]"
                : "text-[var(--muted)] border-transparent hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {t("erpViewAll")}
          </button>
          <button
            type="button"
            onClick={() => handleSwitchView("events")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
              viewMode === "events"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.12)]"
                : "text-[var(--muted)] border-transparent hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {t("erpViewEvents")}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/academy"
            className="rounded-xl bg-sky-500/15 border border-sky-500/30 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/25 transition-colors"
          >
            1. Sports Academy (Swim)
          </Link>
          <Link
            href="/admin/store"
            className="rounded-xl bg-purple-500/15 border border-purple-500/30 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/25 transition-colors"
          >
            3. AQA Store
          </Link>
          <Link
            href="/admin/clients/new"
            className="rounded-xl bg-[var(--primary)] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[var(--primary-hover)] transition-colors"
          >
            {t("newClientBtn")}
          </Link>
        </div>
      </div>

      <PageHeader
        title={viewMode === "erp" ? t("title") : t("pillar2Title")}
        description={viewMode === "erp" ? t("description") : t("pillar2Desc")}
      />

      {/* ─── AQA ERP 3 FILIERES ARCHITECTURE GRID (Shown in ERP Overview) ─── */}
      {viewMode === "erp" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[var(--border)] pb-2">
            <h2 className="text-sm sm:text-base font-extrabold text-[var(--foreground)]">
              {t("erpPillarsTitle")}
            </h2>
            <p className="text-xs text-[var(--muted)]">{t("erpPillarsSubtitle")}</p>
          </div>

          {/* Mobile Filiere Selector (Quick switch between Academy, Events, Store on phones) */}
          <div className="lg:hidden mobile-scroll-tabs -mx-1 px-1 py-1">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setMobileFiliereFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 min-h-[34px] ${
                  mobileFiliereFilter === "all"
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm border border-[var(--border)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                All Filières
              </button>
              <button
                type="button"
                onClick={() => setMobileFiliereFilter("academy")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 min-h-[34px] ${
                  mobileFiliereFilter === "academy"
                    ? "bg-sky-500/20 text-sky-300 shadow-sm border border-sky-500/30"
                    : "text-[var(--muted)] hover:text-sky-300"
                }`}
              >
                1. Academy
              </button>
              <button
                type="button"
                onClick={() => setMobileFiliereFilter("events")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 min-h-[34px] ${
                  mobileFiliereFilter === "events"
                    ? "bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30"
                    : "text-[var(--muted)] hover:text-emerald-300"
                }`}
              >
                2. Events
              </button>
              <button
                type="button"
                onClick={() => setMobileFiliereFilter("store")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 min-h-[34px] ${
                  mobileFiliereFilter === "store"
                    ? "bg-purple-500/20 text-purple-300 shadow-sm border border-purple-500/30"
                    : "text-[var(--muted)] hover:text-purple-300"
                }`}
              >
                3. Store
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* FILIERE 1: 1. AQA SPORTS ACADEMY (AQA SWIM DERIVED) */}
            <Card className={`flex-col justify-between border-sky-500/30 bg-gradient-to-b from-sky-950/25 to-[var(--surface)] hover:border-sky-400/50 transition-all ${
              mobileFiliereFilter === "all" || mobileFiliereFilter === "academy" ? "flex" : "hidden lg:flex"
            }`}>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white leading-tight">
                        {t("pillar1Title")}
                      </h3>
                      <span className="inline-block mt-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-extrabold text-cyan-300">
                        {t("pillar1Badge")}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  {t("pillar1Desc")}
                </p>

                {/* Mini KPI Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] p-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("activeSwimmers")}</p>
                    <p className="text-lg font-extrabold text-sky-400 mt-0.5 font-mono">{swimMembersCount}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] p-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("pendingSwimLeads")}</p>
                    <p className="text-lg font-extrabold text-amber-400 mt-0.5 font-mono">{swimPendingLeadsCount}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] p-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("activeSwimGroups")}</p>
                    <p className="text-lg font-extrabold text-cyan-300 mt-0.5 font-mono">{swimActiveGroupsCount}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] p-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("swimRevenueCollected")}</p>
                    <p className="text-sm font-extrabold text-emerald-400 mt-1 font-mono truncate">{fmtCurrency(swimRevenueTotal)}</p>
                  </div>
                </div>

                {/* Sub-links */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Link href="/admin/swim/members" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-sky-300 border border-[var(--border)]">
                    Swimmers
                  </Link>
                  <Link href="/admin/swim/leads" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-sky-300 border border-[var(--border)]">
                    Leads ({swimPendingLeadsCount})
                  </Link>
                  <Link href="/admin/swim/groups" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-sky-300 border border-[var(--border)]">
                    Groups
                  </Link>
                  <Link href="/admin/swim/pool" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-sky-300 border border-[var(--border)]">
                    Pool Direction
                  </Link>
                  <Link href="/admin/swim/coaching" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-sky-300 border border-[var(--border)]">
                    Coaching App
                  </Link>
                  <Link href="/admin/swim/calls" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-sky-300 border border-[var(--border)]">
                    Calls Desk
                  </Link>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-[var(--border)] flex items-center justify-between gap-2">
                <Link
                  href="/admin/academy"
                  className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  {t("openAcademyHub")} →
                </Link>
                <Link
                  href="/admin/swim"
                  className="rounded-xl bg-sky-500/20 border border-sky-400/40 px-3.5 py-1.5 text-xs font-extrabold text-sky-200 hover:bg-sky-500/30 transition-all"
                >
                  {t("openSwimManager")} →
                </Link>
              </div>
            </Card>

            {/* FILIERE 2: 2. AQA EVENTS */}
            <Card className={`flex-col justify-between border-emerald-500/30 bg-gradient-to-b from-emerald-950/25 to-[var(--surface)] hover:border-emerald-400/50 transition-all ${
              mobileFiliereFilter === "all" || mobileFiliereFilter === "events" ? "flex" : "hidden lg:flex"
            }`}>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white leading-tight">
                        {t("pillar2Title")}
                      </h3>
                      <span className="inline-block mt-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                        {t("pillar2Badge")}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  {t("pillar2Desc")}
                </p>

                {/* Mini KPI Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] p-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("totalClients")}</p>
                    <p className="text-lg font-extrabold text-emerald-400 mt-0.5 font-mono">{clientCount}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] p-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("activeCards")}</p>
                    <p className="text-lg font-extrabold text-cyan-300 mt-0.5 font-mono">{activeCards}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] p-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("creditsRemaining")}</p>
                    <p className="text-lg font-extrabold text-sky-400 mt-0.5 font-mono">{creditsRemaining}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] p-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("revenueThisMonth")}</p>
                    <p className="text-sm font-extrabold text-emerald-300 mt-1 font-mono truncate">{fmtCurrency(revenueThisMonth)}</p>
                  </div>
                </div>

                {/* Sub-links */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Link href="/admin/redeem" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-emerald-300 border border-[var(--border)]">
                    Redeem POS
                  </Link>
                  <Link href="/admin/clients" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-emerald-300 border border-[var(--border)]">
                    Clients
                  </Link>
                  <Link href="/admin/activities" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-emerald-300 border border-[var(--border)]">
                    Activities
                  </Link>
                  <Link href="/admin/invoices" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-emerald-300 border border-[var(--border)]">
                    Invoices
                  </Link>
                  <Link href="/admin/organizations" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-emerald-300 border border-[var(--border)]">
                    B2B Orgs
                  </Link>
                  <Link href="/admin/equipment" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-emerald-300 border border-[var(--border)]">
                    Equipment Assets
                  </Link>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-[var(--border)] flex items-center justify-between gap-2">
                <Link
                  href="/admin/activities"
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Activities & Sessions →
                </Link>
                <button
                  type="button"
                  onClick={() => handleSwitchView("events")}
                  className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-3.5 py-1.5 text-xs font-extrabold text-emerald-200 hover:bg-emerald-500/30 transition-all cursor-pointer"
                >
                  {t("openEventsConsole")} →
                </button>
              </div>
            </Card>

            {/* FILIERE 3: 3. AQA STORE */}
            <Card className={`flex-col justify-between border-purple-500/30 bg-gradient-to-b from-purple-950/25 to-[var(--surface)] hover:border-purple-400/50 transition-all ${
              mobileFiliereFilter === "all" || mobileFiliereFilter === "store" ? "flex" : "hidden lg:flex"
            }`}>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white leading-tight">
                        {t("pillar3Title")}
                      </h3>
                      <span className="inline-block mt-1 rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-extrabold text-purple-300">
                        {t("pillar3Badge")}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  {t("pillar3Desc")}
                </p>

                {/* Mini KPI Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] p-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("storeActiveProducts")}</p>
                    <p className="text-lg font-extrabold text-purple-400 mt-0.5 font-mono">{storeProductsCount}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] p-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("swimGearArticles")}</p>
                    <p className="text-lg font-extrabold text-cyan-300 mt-0.5 font-mono">{swimGearArticlesCount}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] p-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("swimGearSoldUnits")}</p>
                    <p className="text-lg font-extrabold text-sky-400 mt-0.5 font-mono">{swimGearUnitsSold}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)] p-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("swimGearRevenue")}</p>
                    <p className="text-sm font-extrabold text-emerald-400 mt-1 font-mono truncate">{fmtCurrency(swimGearRevenue)}</p>
                  </div>
                </div>

                {/* Sub-links */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Link href="/admin/products" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-purple-300 border border-[var(--border)]">
                    Store Products & POS
                  </Link>
                  <Link href="/admin/store?tab=swim-gear" className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-purple-300 border border-[var(--border)]">
                    Swim Gear Boutique
                  </Link>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-[var(--border)] flex items-center justify-between gap-2">
                <Link
                  href="/admin/products"
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Store POS →
                </Link>
                <Link
                  href="/admin/store"
                  className="rounded-xl bg-purple-500/20 border border-purple-400/40 px-3.5 py-1.5 text-xs font-extrabold text-purple-200 hover:bg-purple-500/30 transition-all"
                >
                  {t("openStoreHub")} →
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── AQA EVENTS OPERATIONS & QUICK BALANCE CHARGER ─── */}
      <div className="space-y-6 pt-2">
        <div className="mb-2">
          <QuickBalanceCharger onBalanceUpdated={() => router.refresh()} />
        </div>

        {/* Stats grid */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("totalClients")}
            value={clientCount}
            animated={true}
            sparklineData={[clientCount > 4 ? clientCount - 4 : 1, clientCount > 2 ? clientCount - 2 : 2, clientCount - 1, clientCount]}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <StatCard
            label={t("activeCards")}
            value={activeCards}
            animated={true}
            sparklineData={[activeCards > 3 ? activeCards - 3 : 1, activeCards > 1 ? activeCards - 1 : 2, activeCards, activeCards]}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            }
          />
          <StatCard
            label={t("redemptionsToday")}
            value={todayRedemptions}
            animated={true}
            sparklineData={[0, Math.max(0, todayRedemptions - 3), Math.max(0, todayRedemptions - 1), todayRedemptions]}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label={t("creditsRemaining")}
            value={creditsRemaining}
            animated={true}
            hint={`${creditsSold} ${t("sold")} · ${creditsUsed} ${t("used")}`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
        </div>

        {/* Low balance alert */}
        {lowBalance.length > 0 ? (
          <div>
            <Alert tone="warning">
              {alertText}{" "}
              <Link href="/admin/clients" className="font-semibold underline">
                {t("addCredits")}
              </Link>
            </Alert>
          </div>
        ) : null}

        {/* Executive Metrics Sections */}
        <div className="space-y-6">
          <h3 className={`text-base sm:text-lg font-bold border-b border-[var(--border)] pb-2 flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse text-right" : "text-left"}`}>
            <svg className="h-5 w-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            <span>2. AQA Events · Executive Metrics</span>
          </h3>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {/* Revenue Section */}
            <div className="space-y-3">
              <h4 className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--muted)] ${dir === "rtl" ? "text-right" : "text-left"}`}>{t("revenueSection")}</h4>
              <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-3">
                <StatCard
                  label={t("revenueToday")}
                  value={fmtCurrency(revenueToday)}
                  icon={
                    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatCard
                  label={t("revenueThisMonth")}
                  value={fmtCurrency(revenueThisMonth)}
                  icon={
                    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <StatCard
                  label={t("revenueThisYear")}
                  value={fmtCurrency(revenueThisYear)}
                  icon={
                    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
              </div>
            </div>

            {/* Activities Section */}
            <div className="space-y-3">
              <h4 className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--muted)] ${dir === "rtl" ? "text-right" : "text-left"}`}>{t("activitiesSection")}</h4>
              <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-3">
                <StatCard
                  label={t("mostPopularActivity")}
                  value={popularActivityName}
                  icon={
                    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  }
                />
                <StatCard
                  label={t("attendanceRate")}
                  value={`${attendanceRate}%`}
                  icon={
                    <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  }
                />
                <StatCard
                  label={t("utilizationRate")}
                  value={`${utilizationRate}%`}
                  icon={
                    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                />
              </div>
            </div>

            {/* Cards Section */}
            <div className="space-y-3">
              <h4 className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--muted)] ${dir === "rtl" ? "text-right" : "text-left"}`}>{t("cardsSection")}</h4>
              <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-3">
                <StatCard
                  label={t("activeCardsMetric")}
                  value={activeCards}
                  icon={
                    <svg className="h-5 w-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  }
                />
                <StatCard
                  label={t("inactiveCardsMetric")}
                  value={inactiveCardsCount}
                  icon={
                    <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  }
                />
                <StatCard
                  label={t("creditsOutstanding")}
                  value={creditsRemaining}
                  icon={
                    <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
              </div>
            </div>

            {/* Clients Section */}
            <div className="space-y-3">
              <h4 className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--muted)] ${dir === "rtl" ? "text-right" : "text-left"}`}>{t("clientsSection")}</h4>
              <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-3">
                <StatCard
                  label={t("newClientsThisMonth")}
                  value={newClientsThisMonth}
                  icon={
                    <svg className="h-5 w-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  }
                />
                <StatCard
                  label={t("returningClients")}
                  value={returningClientsCount}
                  icon={
                    <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6H16" />
                    </svg>
                  }
                />
                <StatCard
                  label={t("soldCreditRevenue")}
                  value={fmtCurrency(soldCreditRevenue)}
                  hint={`${creditsSold} ${t("sold")} × ${creditRate} DA`}
                  icon={
                    <svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {/* Recent redemptions */}
          <Card>
            <div className={`flex items-center justify-between mb-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
              <h3 className="text-base font-semibold">{t("recentRedemptions")}</h3>
              <Link href="/admin/reports" className="text-xs text-[var(--primary)] hover:underline">
                {t("viewAll")}
              </Link>
            </div>
            {recentRedemptions.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">
                {t("noRedemptions")}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {recentRedemptions.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-center justify-between py-3.5 text-sm ${dir === "rtl" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={dir === "rtl" ? "text-right" : "text-left"}>
                      <Link
                        href={`/admin/clients/${item.client.id}`}
                        className="font-medium hover:text-[var(--primary)]"
                      >
                        {item.client.fullName}
                      </Link>
                      <p className="text-xs text-[var(--muted)]">
                        {item.activity.name}
                        {item.checkInAt ? (
                          <> · Event: {formatDate(item.sessionDate || item.redeemedAt, locale, true)} · Checked in: {formatDate(item.checkInAt, locale, true)}</>
                        ) : (
                          <> · Event: {formatDate(item.sessionDate || item.redeemedAt, locale, true)}</>
                        )}
                      </p>
                    </div>
                    <Badge tone="warning">−{item.creditsUsed}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Quick actions */}
          <Card>
            <h3 className={`text-base font-semibold mb-4 ${dir === "rtl" ? "text-right" : "text-left"}`}>{t("quickActions")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {quickActionsList.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col gap-2 rounded-xl border border-[var(--border)] p-4 hover:border-[var(--primary)]/40 hover:shadow-[var(--shadow-glow)] hover:bg-[var(--primary-light)] active:scale-[0.98] transition-all duration-300 group ${dir === "rtl" ? "text-right items-end" : "text-left items-start"}`}
                >
                  {item.icon}
                  <span className="text-sm font-semibold group-hover:text-[var(--primary)]">{item.label}</span>
                  <span className="text-xs text-[var(--muted)]">{item.desc}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient(props: DashboardClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-[var(--muted)] animate-pulse">
            Loading AQA ERP Executive Hub...
          </div>
        </div>
      }
    >
      <DashboardClientInner {...props} />
    </Suspense>
  );
}
