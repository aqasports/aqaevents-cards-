"use client";

import { useState, useEffect } from "react";

interface ReportData {
  summary: {
    totalRedemptions: number;
    totalCreditsUsed: number;
  };
  departmentSpend: Array<{
    id: string;
    name: string;
    budgetCap: number | null;
    creditsUsed: number;
    employeesCount: number;
  }>;
  popularActivities: Array<{
    id: string;
    name: string;
    count: number;
    creditsUsed: number;
  }>;
  recentRedemptions: Array<{
    id: string;
    redeemedAt: string;
    creditsUsed: number;
    activity: { name: string };
    client: { fullName: string };
  }>;
}

export default function PortalReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch("/api/portal/reports");
        if (res.ok) {
          const result = await res.json();
          setData(result);
        } else {
          setError("Failed to load report data.");
        }
      } catch {
        setError("Network error loading reports.");
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading usage report dashboard...</div>;
  }

  if (error || !data) {
    return <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>;
  }

  const { summary, departmentSpend, popularActivities, recentRedemptions } = data;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <h1 className="text-xl font-bold text-white">Usage & Department Spend Reports</h1>
        <p className="text-xs text-slate-400 mt-1">
          Track employee activity redemptions, popular activities, and department budget cap utilization
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Bookings & Redemptions</span>
          <p className="text-3xl font-extrabold text-white font-mono mt-1">{summary.totalRedemptions}</p>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Credits Redeemed</span>
          <p className="text-3xl font-extrabold text-sky-400 font-mono mt-1">{summary.totalCreditsUsed} Credits</p>
        </div>
      </div>

      {/* Department Spend Aggregation */}
      <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white">Spend by Department vs Budget Cap</h3>

        {departmentSpend.length === 0 ? (
          <p className="text-xs text-slate-500">No department spend recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {departmentSpend.map((dept) => {
              const cap = dept.budgetCap;
              const used = dept.creditsUsed;
              const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;

              return (
                <div key={dept.id} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white">{dept.name}</span>
                      <span className="text-slate-500 text-[11px] ml-2">({dept.employeesCount} employees)</span>
                    </div>
                    <div className="font-mono text-right">
                      <span className="font-bold text-sky-400">{used} Credits Used</span>
                      {cap && <span className="text-slate-500"> / {cap} Cap</span>}
                    </div>
                  </div>

                  {cap && (
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${pct > 90 ? "bg-red-500" : pct > 75 ? "bg-amber-500" : "bg-sky-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Popular Activities & Recent Redemptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Activities */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Most Popular Activities</h3>
          <div className="space-y-2">
            {popularActivities.map((act) => (
              <div key={act.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-white">{act.name}</span>
                <div className="text-right font-mono">
                  <div className="text-sky-400 font-bold">{act.count} bookings</div>
                  <div className="text-[10px] text-slate-500">{act.creditsUsed} total credits</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Redemptions */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Employee Bookings</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentRedemptions.map((r) => (
              <div key={r.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-white">{r.client.fullName}</div>
                  <div className="text-[11px] text-slate-400">{r.activity.name}</div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <div className="text-slate-400">{new Date(r.redeemedAt).toLocaleDateString()}</div>
                  <div className="text-sky-400 font-bold">{r.creditsUsed} Cr</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
