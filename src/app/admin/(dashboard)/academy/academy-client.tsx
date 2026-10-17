"use client";

import Link from "next/link";
import { PageHeader, StatCard, Card, Badge } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";

type AcademyClientProps = {
  swimmersCount: number;
  pendingLeadsCount: number;
  activeGroupsCount: number;
  swimRevenueTotal: number;
};

export default function AcademyClient({
  swimmersCount,
  pendingLeadsCount,
  activeGroupsCount,
  swimRevenueTotal,
}: AcademyClientProps) {
  const { t, dir } = useTranslations("academyHub");

  const fmtDA = (amount: number) => `${amount.toLocaleString("fr-DZ")} DA`;

  const coreWorkspaces = [
    {
      title: t("cardMembersTitle"),
      desc: t("cardMembersDesc"),
      href: "/admin/swim/members",
      badge: `${swimmersCount}`,
      tone: "info" as const,
      icon: (
        <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      title: t("cardLeadsTitle"),
      desc: t("cardLeadsDesc"),
      href: "/admin/swim/leads",
      badge: `${pendingLeadsCount}`,
      tone: pendingLeadsCount > 0 ? ("warning" as const) : ("success" as const),
      icon: (
        <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      title: t("cardGroupsTitle"),
      desc: t("cardGroupsDesc"),
      href: "/admin/swim/groups",
      badge: `${activeGroupsCount}`,
      tone: "info" as const,
      icon: (
        <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      title: t("cardCalendarTitle"),
      desc: t("cardCalendarDesc"),
      href: "/admin/swim?tab=calendar",
      badge: "AQA Swim",
      tone: "info" as const,
      icon: (
        <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const fieldWorkspaces = [
    {
      title: t("cardPoolTitle"),
      desc: t("cardPoolDesc"),
      href: "/admin/swim/pool",
      badge: "Bordereaux",
      tone: "info" as const,
      icon: (
        <svg className="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: t("cardCoachingTitle"),
      desc: t("cardCoachingDesc"),
      href: "/admin/swim/coaching",
      badge: "Mobile App",
      tone: "info" as const,
      icon: (
        <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      title: t("cardCallsTitle"),
      desc: t("cardCallsDesc"),
      href: "/admin/swim/calls",
      badge: "Call Desk",
      tone: "info" as const,
      icon: (
        <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    },
  ];

  const financeWorkspaces = [
    {
      title: t("cardPaymentsTitle"),
      desc: t("cardPaymentsDesc"),
      href: "/admin/swim?tab=payments",
      badge: fmtDA(swimRevenueTotal),
      tone: "success" as const,
      icon: (
        <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: t("cardCardsTitle"),
      desc: t("cardCardsDesc"),
      href: "/admin/swim/cards",
      badge: "PVC & QR",
      tone: "info" as const,
      icon: (
        <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      title: t("cardBackupsTitle"),
      desc: t("cardBackupsDesc"),
      href: "/admin/swim?tab=backups",
      badge: "Snapshots",
      tone: "info" as const,
      icon: (
        <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      ),
    },
  ];

  const renderSection = (title: string, items: typeof coreWorkspaces) => (
    <div className="space-y-3">
      <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-2">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-5 hover:border-sky-500/40 hover:shadow-[var(--shadow-glow)] transition-all group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-2)] border border-[var(--border)] group-hover:border-sky-500/30 transition-colors">
                  {item.icon}
                </div>
                <Badge tone={item.tone}>{item.badge}</Badge>
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)] group-hover:text-sky-400 transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                {item.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-bold text-sky-400">
              <span>{t("openDesk")}</span>
              <span>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in" dir={dir}>
      {/* Breadcrumb bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3.5 py-2">
        <div className="flex items-center gap-2 text-xs">
          <Link href="/admin" className="font-bold text-slate-400 hover:text-white transition-colors">
            AQA ERP
          </Link>
          <span className="text-slate-600">/</span>
          <span className="font-extrabold text-sky-400">{t("title")}</span>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
          {t("hierarchyTag")}
        </span>
      </div>

      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Link
            href="/admin/swim"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[var(--primary-hover)] transition-colors"
          >
            <span>{t("openFullSwimWorkspace")}</span>
            <span>→</span>
          </Link>
        }
      />

      {/* AQA Swim Derived Banner */}
      <Card className="border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-slate-900/80 to-cyan-950/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(0,242,255,0.8)]" />
              <h2 className="text-base font-extrabold text-white">
                {t("derivedBannerTitle")}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {t("derivedBannerDesc")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/admin/swim"
              className="rounded-xl bg-cyan-500/15 border border-cyan-400/40 px-4 py-2 text-xs font-extrabold text-cyan-300 hover:bg-cyan-500/25 transition-all"
            >
              {t("openFullSwimWorkspace")}
            </Link>
          </div>
        </div>
      </Card>

      {/* Academy / Swim KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("kpiSwimmers")}
          value={swimmersCount}
          animated={true}
          icon={
            <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("kpiLeads")}
          value={pendingLeadsCount}
          animated={true}
          icon={
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
        />
        <StatCard
          label={t("kpiGroups")}
          value={activeGroupsCount}
          animated={true}
          icon={
            <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatCard
          label={t("kpiRevenue")}
          value={fmtDA(swimRevenueTotal)}
          icon={
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {renderSection(t("sectionCoreTitle"), coreWorkspaces)}
      {renderSection(t("sectionFieldTitle"), fieldWorkspaces)}
      {renderSection(t("sectionFinanceTitle"), financeWorkspaces)}
    </div>
  );
}
