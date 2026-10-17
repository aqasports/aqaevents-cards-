"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader, StatCard, Card, Badge } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";
import { parseSwimLeadNotes } from "@/lib/swim-lead-details";
import { SwimEquipmentDesk } from "@/components/admin/swim/equipment/SwimEquipmentDesk";
import type { SwimLeadItem } from "@/components/admin/swim/equipment/types";

type StoreClientProps = {
  storeProductsCount: number;
  swimArticlesCount: number;
  gearUnitsSold: number;
  gearNetProfit: number;
  rawLeads: Array<{
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    category: string;
    level: string;
    status: string;
    createdAt: string;
    notes: string | null;
  }>;
};

function StoreClientInner({
  storeProductsCount,
  swimArticlesCount,
  gearUnitsSold,
  gearNetProfit,
  rawLeads,
}: StoreClientProps) {
  const { t, dir } = useTranslations("storeHub");
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"overview" | "swim-gear">("overview");

  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam === "swim-gear") {
      setActiveTab("swim-gear");
    } else {
      setActiveTab("overview");
    }
  }, [searchParams]);

  const augmentedLeads = useMemo<SwimLeadItem[]>(() => {
    return rawLeads.map((lead) => ({
      ...lead,
      details: parseSwimLeadNotes(lead.notes),
    }));
  }, [rawLeads]);

  const fmtDA = (amount: number) => `${amount.toLocaleString("fr-DZ")} DA`;

  function switchTab(next: "overview" | "swim-gear") {
    setActiveTab(next);
    if (next === "swim-gear") {
      router.replace("/admin/store?tab=swim-gear", { scroll: false });
    } else {
      router.replace("/admin/store", { scroll: false });
    }
  }

  return (
    <div className="space-y-6 animate-fade-in" dir={dir}>
      {/* Breadcrumb bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-500/20 bg-purple-500/5 px-3.5 py-2">
        <div className="flex items-center gap-2 text-xs">
          <Link href="/admin" className="font-bold text-slate-400 hover:text-white transition-colors">
            AQA ERP
          </Link>
          <span className="text-slate-600">/</span>
          <span className="font-extrabold text-purple-400">{t("title")}</span>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
          {t("hierarchyTag")}
        </span>
      </div>

      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[var(--primary-hover)] transition-colors"
            >
              <span>{t("openPosCatalogBtn")}</span>
              <span>→</span>
            </Link>
          </div>
        }
      />

      {/* Store Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
        <button
          type="button"
          onClick={() => switchTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
            activeTab === "overview"
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
              : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--foreground)]"
          }`}
        >
          {t("tabOverview")}
        </button>
        <button
          type="button"
          onClick={() => switchTab("swim-gear")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
            activeTab === "swim-gear"
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(0,242,255,0.2)]"
              : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--foreground)]"
          }`}
        >
          {t("tabSwimBoutique")}
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          {/* Store KPIs */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("kpiStoreProducts")}
              value={storeProductsCount}
              animated={true}
              icon={
                <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              }
            />
            <StatCard
              label={t("kpiSwimArticles")}
              value={swimArticlesCount}
              animated={true}
              icon={
                <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
            />
            <StatCard
              label={t("kpiGearUnitsSold")}
              value={gearUnitsSold}
              animated={true}
              icon={
                <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label={t("kpiGearNetProfit")}
              value={fmtDA(gearNetProfit)}
              icon={
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* 2 Store Departments */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Department 1: General Store & POS */}
            <Card className="flex flex-col justify-between border-purple-500/30 hover:border-purple-400/50 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <Badge tone="primary">{t("merchCardBadge")}</Badge>
                </div>
                <h2 className="text-lg font-extrabold text-[var(--foreground)]">
                  {t("merchCardTitle")}
                </h2>
                <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                  {t("merchCardDesc")}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  {storeProductsCount} {t("kpiStoreProducts")}
                </span>
                <Link
                  href="/admin/products"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-500/20 border border-purple-400/40 px-4 py-2 text-xs font-extrabold text-purple-200 hover:bg-purple-500/30 transition-all"
                >
                  <span>{t("merchActionCatalog")}</span>
                  <span>→</span>
                </Link>
              </div>
            </Card>

            {/* Department 2: Swim Gear Boutique */}
            <Card className="flex flex-col justify-between border-cyan-500/30 hover:border-cyan-400/50 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <Badge tone="info">{t("swimGearCardBadge")}</Badge>
                </div>
                <h2 className="text-lg font-extrabold text-[var(--foreground)]">
                  {t("swimGearCardTitle")}
                </h2>
                <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
                  {t("swimGearCardDesc")}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  {gearUnitsSold} {t("kpiGearUnitsSold")}
                </span>
                <button
                  type="button"
                  onClick={() => switchTab("swim-gear")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 px-4 py-2 text-xs font-extrabold text-cyan-200 hover:bg-cyan-500/30 transition-all cursor-pointer"
                >
                  <span>{t("swimGearActionOpen")}</span>
                  <span>→</span>
                </button>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <SwimEquipmentDesk leads={augmentedLeads} />
      )}
    </div>
  );
}

export default function StoreClient(props: StoreClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-[var(--muted)] animate-pulse">
            Loading 3. AQA Store...
          </div>
        </div>
      }
    >
      <StoreClientInner {...props} />
    </Suspense>
  );
}
