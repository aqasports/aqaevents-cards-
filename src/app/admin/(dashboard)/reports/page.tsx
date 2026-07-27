"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Badge, Button, Card, PageHeader, EmptyState } from "@/components/admin/ui";
import { fetchWithRetry } from "@/lib/fetch-utils";
import { useDataCache } from "@/lib/use-data-cache";

type Redemption = {
  id: string;
  creditsUsed: number;
  redeemedAt: string;
  notes: string | null;
  client: { id: string; fullName: string };
  activity: { id: string; name: string };
  session: { sessionDate: string; location: string | null } | null;
  staff: { name: string } | null;
};

type Summary = {
  totalRedemptions: number;
  totalCreditsUsed: number;
  totalCreditsSold: number;
  totalClientsWithCards: number;
};

type ProfitabilityRow = {
  activityId: string;
  name: string;
  revenue: number;
  directCosts: number;
  coachCosts: number;
  equipmentCosts: number;
  profit: number;
  margin: number;
  redemptionCount: number;
};

type FunnelRow = {
  leadSource: string;
  signups: number;
  payingClients: number;
  totalSpent: number;
  conversionRate: number;
};

type AgingData = {
  buckets: {
    "0-30": number;
    "30-60": number;
    "60+": number;
  };
  clientRows: Array<{
    clientId: string;
    clientName: string;
    b0_30: number;
    b30_60: number;
    b60_plus: number;
    total: number;
  }>;
};

export default function ReportsPage() {
  const [filter, setFilter] = useState("");
  const [reportTab, setReportTab] = useState<"overview" | "profitability" | "aging" | "marketing">("overview");

  // Additional reports state
  const [profitability, setProfitability] = useState<ProfitabilityRow[]>([]);
  const [profitSortBy, setProfitSortBy] = useState<"profit" | "volume" | "margin">("profit");
  const [aging, setAging] = useState<AgingData | null>(null);
  const [funnel, setFunnel] = useState<FunnelRow[]>([]);

  const fetcher = useCallback(async () => {
    const [redemptionsRes, summaryRes, analyticsRes] = await Promise.all([
      fetchWithRetry("/api/admin/redemptions"),
      fetchWithRetry("/api/admin/reports/summary"),
      fetchWithRetry("/api/admin/reports/analytics"),
    ]);

    const redemptionsData = redemptionsRes.ok ? await redemptionsRes.json() : [];
    const summaryData = summaryRes.ok ? await summaryRes.json() : {};
    const analyticsData = analyticsRes.ok ? await analyticsRes.json() : [];

    const formattedRedemptions = Array.isArray(redemptionsData)
      ? redemptionsData.map((r: any) => ({
          ...r,
          creditsUsed: Number(r.creditsUsed.toFixed(2)),
        }))
      : [];

    const formattedSummary: Summary = {
      ...summaryData,
      totalCreditsSold: Number((summaryData.totalCreditsSold || 0).toFixed(2)),
      totalCreditsUsed: Number((summaryData.totalCreditsUsed || 0).toFixed(2)),
    };

    return {
      redemptions: formattedRedemptions,
      summary: formattedSummary,
      analytics: analyticsData,
    };
  }, []);

  const { data: cacheData, loading } = useDataCache(
    "/api/admin/reports-page-data",
    fetcher
  );

  const redemptions = cacheData?.redemptions ?? [];
  const summary = cacheData?.summary ?? null;

  // Load Extra Reports when tab changes
  useEffect(() => {
    if (reportTab === "profitability") {
      fetch(`/api/admin/reports/profitability?sortBy=${profitSortBy}`)
        .then((res) => res.json())
        .then((data) => setProfitability(Array.isArray(data) ? data : []))
        .catch(() => {});
    } else if (reportTab === "aging") {
      fetch("/api/admin/reports/ar-aging")
        .then((res) => res.json())
        .then((data) => setAging(data))
        .catch(() => {});
    } else if (reportTab === "marketing") {
      fetch("/api/admin/reports/funnel")
        .then((res) => res.json())
        .then((data) => setFunnel(data.funnel || []))
        .catch(() => {});
    }
  }, [reportTab, profitSortBy]);

  const filteredRedemptions = redemptions.filter((r) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      r.client.fullName.toLowerCase().includes(q) ||
      r.activity.name.toLowerCase().includes(q) ||
      (r.staff?.name.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Financial & Operations Reports"
        description="Comprehensive analysis of event profitability, accounts receivable aging, and marketing funnels."
      />

      {/* Tabs Header */}
      <div className="border-b border-[var(--border)]">
        <nav className="flex space-x-6">
          <button
            onClick={() => setReportTab("overview")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              reportTab === "overview"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Overview & Redemptions
          </button>
          <button
            onClick={() => setReportTab("profitability")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              reportTab === "profitability"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Event Profitability & Best Events (Prompt 13)
          </button>
          <button
            onClick={() => setReportTab("aging")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              reportTab === "aging"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            A/R Aging Report (Prompt 14)
          </button>
          <button
            onClick={() => setReportTab("marketing")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              reportTab === "marketing"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Ads Manager & Lead Attribution (Prompt 15 & 17)
          </button>
        </nav>
      </div>

      {/* TAB 1: Overview */}
      {reportTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <p className="text-xs uppercase font-bold text-[var(--muted)]">Total Redemptions</p>
              <p className="mt-1 text-2xl font-black">{summary?.totalRedemptions ?? 0}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase font-bold text-[var(--muted)]">Credits Used</p>
              <p className="mt-1 text-2xl font-black text-[var(--primary)]">{summary?.totalCreditsUsed ?? 0}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase font-bold text-[var(--muted)]">Credits Sold</p>
              <p className="mt-1 text-2xl font-black text-emerald-600">{summary?.totalCreditsSold ?? 0}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase font-bold text-[var(--muted)]">Clients With Cards</p>
              <p className="mt-1 text-2xl font-black">{summary?.totalClientsWithCards ?? 0}</p>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Redemption History Log</h3>
              <input
                type="text"
                placeholder="Filter redemptions..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] uppercase text-xs text-[var(--muted)] font-bold">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Client</th>
                    <th className="py-2">Activity</th>
                    <th className="py-2">Staff</th>
                    <th className="py-2 text-right">Credits Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredRedemptions.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 text-xs text-[var(--muted)]">{new Date(r.redeemedAt).toLocaleString()}</td>
                      <td className="py-2 font-medium">{r.client.fullName}</td>
                      <td className="py-2">{r.activity.name}</td>
                      <td className="py-2 text-[var(--muted)]">{r.staff?.name ?? "System"}</td>
                      <td className="py-2 text-right">
                        <Badge tone="warning">-{r.creditsUsed}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Event Profitability (Prompt 13) */}
      {reportTab === "profitability" && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Event & Session Profitability Engine</h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Calculates true net margin per activity deducting direct expenses, coach payouts, and equipment usage.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--muted)]">Sort Mode:</span>
                <select
                  value={profitSortBy}
                  onChange={(e) => setProfitSortBy(e.target.value as any)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold"
                >
                  <option value="profit">Net Profit (DA)</option>
                  <option value="margin">Margin (%)</option>
                  <option value="volume">Redemption Volume</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--border)] uppercase text-[var(--muted)] font-bold">
                  <tr>
                    <th className="py-2">Activity Name</th>
                    <th className="py-2">Approx Revenue</th>
                    <th className="py-2">Direct Expenses</th>
                    <th className="py-2">Coach's Bill</th>
                    <th className="py-2">Boat's / Gear Bill</th>
                    <th className="py-2">Net Profit</th>
                    <th className="py-2 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {profitability.map((row) => (
                    <tr key={row.activityId}>
                      <td className="py-3 font-bold text-[var(--foreground)]">{row.name}</td>
                      <td className="py-3 font-semibold">{row.revenue.toLocaleString()} DA</td>
                      <td className="py-3 text-rose-600">-{row.directCosts.toLocaleString()} DA</td>
                      <td className="py-3 text-rose-600">-{row.coachCosts.toLocaleString()} DA</td>
                      <td className="py-3 text-rose-600">-{row.equipmentCosts.toLocaleString()} DA</td>
                      <td className="py-3 font-black text-emerald-600">{row.profit.toLocaleString()} DA</td>
                      <td className="py-3 text-right">
                        <Badge tone={row.margin > 0.4 ? "success" : "warning"}>
                          {Math.round(row.margin * 100)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: Accounts Receivable Aging (Prompt 14) */}
      {reportTab === "aging" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-xs uppercase font-bold text-[var(--muted)]">0 - 30 Days Unpaid</p>
              <p className="mt-1 text-2xl font-black text-amber-600">
                {(aging?.buckets["0-30"] ?? 0).toLocaleString()} DA
              </p>
            </Card>
            <Card>
              <p className="text-xs uppercase font-bold text-[var(--muted)]">30 - 60 Days Overdue</p>
              <p className="mt-1 text-2xl font-black text-orange-600">
                {(aging?.buckets["30-60"] ?? 0).toLocaleString()} DA
              </p>
            </Card>
            <Card>
              <p className="text-xs uppercase font-bold text-[var(--muted)]">60+ Days Critical Overdue</p>
              <p className="mt-1 text-2xl font-black text-red-600">
                {(aging?.buckets["60+"] ?? 0).toLocaleString()} DA
              </p>
            </Card>
          </div>

          <Card className="space-y-4">
            <h3 className="text-base font-semibold">Unpaid Accounts Receivable Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--border)] uppercase font-bold text-[var(--muted)]">
                  <tr>
                    <th className="py-2">Client / Organization</th>
                    <th className="py-2">0-30 Days</th>
                    <th className="py-2">30-60 Days</th>
                    <th className="py-2">60+ Days</th>
                    <th className="py-2 text-right">Total Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {aging?.clientRows.map((c) => (
                    <tr key={c.clientId}>
                      <td className="py-2.5 font-bold">{c.clientName}</td>
                      <td className="py-2.5 text-amber-600">{c.b0_30.toLocaleString()} DA</td>
                      <td className="py-2.5 text-orange-600">{c.b30_60.toLocaleString()} DA</td>
                      <td className="py-2.5 text-red-600 font-bold">{c.b60_plus.toLocaleString()} DA</td>
                      <td className="py-2.5 text-right font-black text-[var(--foreground)]">
                        {c.total.toLocaleString()} DA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: Marketing & Funnel (Prompt 15 & 17) */}
      {reportTab === "marketing" && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="text-base font-semibold">Ads Manager & Channel Attribution Funnel</h3>
            <p className="text-xs text-[var(--muted)]">
              Tracks user conversion rates from initial lead source attribution down to paying client status.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--border)] uppercase font-bold text-[var(--muted)]">
                  <tr>
                    <th className="py-2">Lead Source / UTM</th>
                    <th className="py-2">Total Signups</th>
                    <th className="py-2">Paying Clients</th>
                    <th className="py-2">Total Revenue</th>
                    <th className="py-2 text-right">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {funnel.map((f, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 font-bold font-mono text-[var(--primary)]">{f.leadSource}</td>
                      <td className="py-2.5 font-semibold">{f.signups}</td>
                      <td className="py-2.5 font-semibold">{f.payingClients}</td>
                      <td className="py-2.5 font-black text-emerald-600">{f.totalSpent.toLocaleString()} DA</td>
                      <td className="py-2.5 text-right font-bold">
                        <Badge tone={f.conversionRate > 20 ? "success" : "default"}>
                          {Math.round(f.conversionRate)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
