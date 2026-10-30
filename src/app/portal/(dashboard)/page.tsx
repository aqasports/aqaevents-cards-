"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n";

interface DashboardData {
  organization: {
    id: string;
    name: string;
    slug: string;
    sharedCreditPool: number;
    useSharedPool: boolean;
    creditRate: number | null;
  };
  stats: {
    totalEmployees: number;
    sharedCreditPool: number;
    totalAllocatedCredits: number;
    monthlyBurnRate: number;
  };
  activeContract: {
    id: string;
    startDate: string;
    endDate: string | null;
    status: string;
    autoRenew: boolean;
    expiryPolicy: string;
  } | null;
  departmentsCount: number;
}

export const dynamic = "force-dynamic";

export default function PortalDashboardPage() {
  const { t } = useTranslations("portalOverview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/portal/dashboard");
        if (res.ok) {
          const result = await res.json();
          setData(result);
        } else {
          setError(t("loadError"));
        }
      } catch {
        setError(t("networkError"));
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
        {t("loading")}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
        {error || t("loadError")}
      </div>
    );
  }

  const { organization, stats, activeContract } = data;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-400">{t("badge")}</span>
          <h1 className="text-2xl font-bold text-white mt-1">{organization.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/portal/credits"
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-sky-500/10"
          >
            {t("managePoolBtn")}
          </Link>
          <Link
            href="/portal/employees"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition"
          >
            {t("importEmployeesBtn")}
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pool Balance */}
        <div className="bg-[#0f172a] border border-slate-800/80 p-5 rounded-2xl space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("unallocatedPool")}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{stats.sharedCreditPool}</span>
            <span className="text-xs font-bold text-sky-400">{t("creditsUnit")}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {organization.useSharedPool ? t("sharedPoolMode") : t("fixedAllocationMode")}
          </p>
        </div>

        {/* Total Employees */}
        <div className="bg-[#0f172a] border border-slate-800/80 p-5 rounded-2xl space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("registeredEmployees")}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{stats.totalEmployees}</span>
            <span className="text-xs font-medium text-slate-400">{t("employeesUnit")}</span>
          </div>
          <p className="text-[11px] text-slate-500">{t("departmentsConfigured", { count: data.departmentsCount })}</p>
        </div>

        {/* Allocated onto Cards */}
        <div className="bg-[#0f172a] border border-slate-800/80 p-5 rounded-2xl space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("directlyAllocated")}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{stats.totalAllocatedCredits}</span>
            <span className="text-xs font-bold text-emerald-400">{t("creditsUnit")}</span>
          </div>
          <p className="text-[11px] text-slate-500">{t("assignedToCards")}</p>
        </div>

        {/* 30-Day Burn Rate */}
        <div className="bg-[#0f172a] border border-slate-800/80 p-5 rounded-2xl space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("burnRateTitle")}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 font-mono">{stats.monthlyBurnRate}</span>
            <span className="text-xs font-medium text-slate-400">{t("creditsPerMonth")}</span>
          </div>
          <p className="text-[11px] text-slate-500">{t("redeemedIn30d")}</p>
        </div>
      </div>

      {/* Contract & Quick Status Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Contract Info */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">{t("activeContractTitle")}</h3>
            {activeContract ? (
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-full uppercase">
                {activeContract.status}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-full uppercase">
                {t("noActiveContract")}
              </span>
            )}
          </div>

          {activeContract ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">{t("startDate")}</span>
                <p className="font-semibold text-slate-200 mt-0.5 font-mono">
                  {new Date(activeContract.startDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">{t("endRenewalDate")}</span>
                <p className="font-semibold text-slate-200 mt-0.5 font-mono">
                  {activeContract.endDate ? new Date(activeContract.endDate).toLocaleDateString() : t("openEnded")}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">{t("autoRenew")}</span>
                <p className="font-semibold text-slate-200 mt-0.5">
                  {activeContract.autoRenew ? t("enabled") : t("disabled")}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">{t("expiryPolicy")}</span>
                <p className="font-semibold text-slate-200 mt-0.5 capitalize">
                  {activeContract.expiryPolicy.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              {t("noContractDesc")}
            </p>
          )}
        </div>

        {/* Quick Help & Request Box */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{t("needCreditsTitle")}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {t("needCreditsDesc")}
            </p>
          </div>

          <Link
            href="/portal/credits"
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-center text-xs font-bold text-sky-400 rounded-xl border border-sky-500/20 transition"
          >
            {t("requestTopUpBtn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
