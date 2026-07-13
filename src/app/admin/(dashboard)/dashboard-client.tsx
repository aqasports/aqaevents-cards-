"use client";

import Link from "next/link";
import { PageHeader, StatCard, Card, Badge, Alert } from "@/components/admin/ui";
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

  // New Executive Props
  revenueToday: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  popularActivityName: string;
  attendanceRate: number;
  utilizationRate: number;
  inactiveCardsCount: number;
  newClientsThisMonth: number;
  returningClientsCount: number;
  lifetimeValue: number;
};

export default function DashboardClient({
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
  lifetimeValue,
}: DashboardClientProps) {
  const { t, dir, locale } = useTranslations("dashboard");

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
      )
    },
    {
      href: "/admin/redeem",
      label: t("actionRedeem"),
      desc: t("redeemDesc"),
      icon: (
        <svg className="h-6 w-6 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H9m2-2a2 2 0 00-2 2v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V5a2 2 0 00-2-2h-2m-4 9l2 2 4-4" />
        </svg>
      )
    },
    {
      href: "/admin/print",
      label: t("actionPrint"),
      desc: t("printDesc"),
      icon: (
        <svg className="h-6 w-6 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9m-2 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      href: "/admin/activities",
      label: t("actionAddActivity"),
      desc: t("addActivityDesc"),
      icon: (
        <svg className="h-6 w-6 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
  ];

  return (
    <div className="animate-fade-in" dir={dir}>
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <Link
            href="/admin/clients/new"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-hover)] transition-colors"
          >
            {t("newClientBtn")}
          </Link>
        }
      />

      {/* Stats grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("totalClients")}
          value={clientCount}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("activeCards")}
          value={activeCards}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
        <StatCard
          label={t("redemptionsToday")}
          value={todayRedemptions}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("creditsRemaining")}
          value={creditsRemaining}
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
        <div className="mt-6">
          <Alert tone="warning">
            {alertText}{" "}
            <Link href="/admin/clients" className="font-semibold underline">
              {t("addCredits")}
            </Link>
          </Alert>
        </div>
      ) : null}

      {/* Executive Metrics Sections */}
      <div className="mt-8 space-y-6">
        <h3 className={`text-base sm:text-lg font-bold border-b border-[var(--border)] pb-2 flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse text-right" : "text-left"}`}>
          <svg className="h-5 w-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
          <span>Executive Metrics Dashboard</span>
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
                label={t("lifetimeValue")}
                value={fmtCurrency(lifetimeValue)}
                icon={
                  <svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:gap-4 lg:grid-cols-2">
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
                      {item.activity.name} · {formatDate(item.redeemedAt, locale, true)}
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
  );
}
