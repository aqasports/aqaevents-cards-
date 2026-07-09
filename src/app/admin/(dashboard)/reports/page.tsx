"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader, EmptyState } from "@/components/admin/ui";

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

export default function ReportsPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/redemptions").then((r) => r.json()),
      fetch("/api/admin/reports/summary").then((r) => r.json()),
      fetch("/api/admin/reports/analytics").then((r) => r.json()),
    ]).then(([redemptionsData, summaryData, analyticsData]) => {
      setRedemptions(redemptionsData.map((r: any) => ({
        ...r,
        creditsUsed: Number(r.creditsUsed.toFixed(2))
      })));
      setSummary({
        ...summaryData,
        totalCreditsSold: Number(summaryData.totalCreditsSold.toFixed(2)),
        totalCreditsUsed: Number(summaryData.totalCreditsUsed.toFixed(2)),
      });
      setAnalytics(analyticsData.map((d: any) => ({
        ...d,
        sales: Number(d.sales.toFixed(2)),
        redemptions: Number(d.redemptions.toFixed(2)),
      })));
      setLoading(false);
    });
  }, []);

  const maxVal = analytics.length > 0
    ? Math.max(...analytics.map((d) => Math.max(d.sales, d.redemptions)), 10)
    : 10;
  const yMax = Math.ceil(maxVal * 1.15 / 5) * 5;
  const yTicks = [0, Math.round(yMax * 0.25), Math.round(yMax * 0.5), Math.round(yMax * 0.75), yMax];

  const width = 900;
  const height = 250;
  const paddingTop = 20;
  const paddingBottom = 40;
  const paddingLeft = 50;
  const paddingRight = 20;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  let salesPath = "";
  let salesAreaPath = "";
  let redemptionsPath = "";
  let redemptionsAreaPath = "";

  if (analytics.length > 1) {
    // Sales path
    const salesCoords = analytics.map((d, idx) => {
      const x = paddingLeft + (idx / (analytics.length - 1)) * plotWidth;
      const y = paddingTop + plotHeight - (d.sales / yMax) * plotHeight;
      return { x, y };
    });
    salesPath = `M ${salesCoords[0].x} ${salesCoords[0].y} ` + salesCoords.slice(1).map((c) => `L ${c.x} ${c.y}`).join(" ");
    salesAreaPath = `${salesPath} L ${salesCoords[salesCoords.length - 1].x} ${paddingTop + plotHeight} L ${salesCoords[0].x} ${paddingTop + plotHeight} Z`;

    // Redemptions path
    const redCoords = analytics.map((d, idx) => {
      const x = paddingLeft + (idx / (analytics.length - 1)) * plotWidth;
      const y = paddingTop + plotHeight - (d.redemptions / yMax) * plotHeight;
      return { x, y };
    });
    redemptionsPath = `M ${redCoords[0].x} ${redCoords[0].y} ` + redCoords.slice(1).map((c) => `L ${c.x} ${c.y}`).join(" ");
    redemptionsAreaPath = `${redemptionsPath} L ${redCoords[redCoords.length - 1].x} ${paddingTop + plotHeight} L ${redCoords[0].x} ${paddingTop + plotHeight} Z`;
  }

  const filtered = redemptions.filter(
    (r) =>
      !filter ||
      r.client.fullName.toLowerCase().includes(filter.toLowerCase()) ||
      r.activity.name.toLowerCase().includes(filter.toLowerCase()),
  );

  // Activity breakdown
  const activityBreakdown: Record<string, { name: string; count: number; credits: number }> = {};
  for (const r of redemptions) {
    if (!activityBreakdown[r.activity.id]) {
      activityBreakdown[r.activity.id] = { name: r.activity.name, count: 0, credits: 0 };
    }
    activityBreakdown[r.activity.id].count++;
    activityBreakdown[r.activity.id].credits += r.creditsUsed;
  }
  const activityList = Object.values(activityBreakdown).map((act) => ({
    ...act,
    credits: Number(act.credits.toFixed(2)),
  })).sort((a, b) => b.count - a.count);

  function exportCSV() {
    const rows = [
      ["Date", "Client", "Activity", "Session date", "Location", "Credits used", "Staff"],
      ...filtered.map((r) => [
        new Date(r.redeemedAt).toISOString(),
        r.client.fullName,
        r.activity.name,
        r.session ? new Date(r.session.sessionDate).toLocaleDateString() : "",
        r.session?.location ?? "",
        r.creditsUsed.toString(),
        r.staff?.name ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aqa-redemptions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports"
        description="Redemption history, credit statistics, and activity breakdown."
        action={
          <Button variant="secondary" onClick={exportCSV} disabled={loading}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </Button>
        }
      />

      {/* Summary cards */}
      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total redemptions", value: summary.totalRedemptions, color: "text-[var(--primary)]" },
            { label: "Credits used", value: summary.totalCreditsUsed, color: "text-[var(--warning)]" },
            { label: "Credits sold", value: summary.totalCreditsSold, color: "text-[var(--success)]" },
            {
              label: "Credits remaining",
              value: Number((summary.totalCreditsSold - summary.totalCreditsUsed).toFixed(2)),
              color: "text-[var(--foreground)]",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{stat.label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Visual Analytics Chart */}
      {!loading && analytics.length > 0 && (
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800">30-Day Activity Trends</h3>
              <p className="text-xs text-slate-500 mt-0.5">Visual comparison of credit sales (registrations/recharges) vs client redemptions.</p>
            </div>
            {/* Legend */}
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-3 w-3 rounded-full bg-emerald-500 block" />
                Credits Sold (Sales)
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-3 w-3 rounded-full bg-amber-500 block" />
                Activities Claimed (Redemptions)
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {hoveredIdx !== null ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between transition-all">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Timeline Date</p>
                  <p className="text-sm font-black text-slate-800">
                    {new Date(analytics[hoveredIdx].date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 justify-end">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Sold
                    </p>
                    <p className="text-sm font-black text-slate-800 text-right">{analytics[hoveredIdx].sales} credits</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 justify-end">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Redeemed
                    </p>
                    <p className="text-sm font-black text-slate-800 text-right">{analytics[hoveredIdx].redemptions} activities</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-slate-500 text-xs italic">
                Hover over the chart lines to inspect daily sales vs redemptions trends.
              </div>
            )}

            <div className="w-full overflow-x-auto">
              <div className="min-w-[800px] h-[250px] relative select-none">
                <svg className="w-full h-auto overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="redemptionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines & Y-axis labels */}
                  {yTicks.map((tick) => {
                    const y = paddingTop + plotHeight - (tick / yMax) * plotHeight;
                    return (
                      <g key={tick} className="opacity-70">
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={width - paddingRight}
                          y2={y}
                          stroke="#E2E8F0"
                          strokeWidth={1}
                        />
                        <text
                          x={paddingLeft - 10}
                          y={y + 4}
                          textAnchor="end"
                          className="text-[10px] font-semibold fill-slate-400 font-mono"
                        >
                          {tick}
                        </text>
                      </g>
                    );
                  })}

                  {/* X-axis labels (render every 6 days or so to prevent overlap) */}
                  {analytics.map((d, idx) => {
                    if (idx % 6 !== 0 && idx !== analytics.length - 1) return null;
                    const x = paddingLeft + (idx / (analytics.length - 1)) * plotWidth;
                    return (
                      <text
                        key={idx}
                        x={x}
                        y={height - 15}
                        textAnchor="middle"
                        className="text-[10px] font-semibold fill-slate-400 font-mono"
                      >
                        {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </text>
                    );
                  })}

                  {/* Areas */}
                  {salesAreaPath && (
                    <path d={salesAreaPath} fill="url(#salesGrad)" />
                  )}
                  {redemptionsAreaPath && (
                    <path d={redemptionsAreaPath} fill="url(#redemptionsGrad)" />
                  )}

                  {/* Lines */}
                  {salesPath && (
                    <path d={salesPath} fill="none" stroke="#10B981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {redemptionsPath && (
                    <path d={redemptionsPath} fill="none" stroke="#F59E0B" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  )}

                  {/* Hover indicator line & circles */}
                  {hoveredIdx !== null && (
                    <>
                      <line
                        x1={paddingLeft + (hoveredIdx / (analytics.length - 1)) * plotWidth}
                        y1={paddingTop}
                        x2={paddingLeft + (hoveredIdx / (analytics.length - 1)) * plotWidth}
                        y2={paddingTop + plotHeight}
                        stroke="#94A3B8"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                      />
                      <circle
                        cx={paddingLeft + (hoveredIdx / (analytics.length - 1)) * plotWidth}
                        cy={paddingTop + plotHeight - (analytics[hoveredIdx].sales / yMax) * plotHeight}
                        r={6}
                        fill="#10B981"
                        stroke="white"
                        strokeWidth={2}
                      />
                      <circle
                        cx={paddingLeft + (hoveredIdx / (analytics.length - 1)) * plotWidth}
                        cy={paddingTop + plotHeight - (analytics[hoveredIdx].redemptions / yMax) * plotHeight}
                        r={6}
                        fill="#F59E0B"
                        stroke="white"
                        strokeWidth={2}
                      />
                    </>
                  )}

                  {/* Transparent hover interactive columns */}
                  {analytics.map((d, idx) => {
                    const xCenter = paddingLeft + (idx / (analytics.length - 1)) * plotWidth;
                    const stripWidth = plotWidth / (analytics.length - 1);
                    const xLeft = xCenter - stripWidth / 2;
                    return (
                      <rect
                        key={idx}
                        x={xLeft}
                        y={paddingTop}
                        width={stripWidth}
                        height={plotHeight}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Redemptions table */}
        <Card padding={false}>
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
            <h3 className="text-base font-semibold">
              All redemptions {!loading && `(${filtered.length})`}
            </h3>
            <input
              type="search"
              placeholder="Filter by client or activity…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-48 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-[var(--muted)]">Loading…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No redemptions found"
              description="Redemptions will appear here after clients use their cards at events."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="px-4 py-3 font-medium text-[var(--muted)]">Date</th>
                    <th className="px-4 py-3 font-medium text-[var(--muted)]">Client</th>
                    <th className="px-4 py-3 font-medium text-[var(--muted)]">Activity</th>
                    <th className="px-4 py-3 font-medium text-[var(--muted)]">Staff</th>
                    <th className="px-4 py-3 font-medium text-[var(--muted)]">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
                      <td className="px-4 py-3 text-xs text-[var(--muted)] whitespace-nowrap">
                        {new Date(r.redeemedAt).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/clients/${r.client.id}`}
                          className="font-medium hover:text-[var(--primary)]"
                        >
                          {r.client.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{r.activity.name}</span>
                        {r.session?.location ? (
                          <span className="ml-1 text-xs text-[var(--muted)]">· {r.session.location}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {r.staff?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="warning">−{r.creditsUsed}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Activity breakdown */}
        <div className="space-y-4">
          <Card>
            <h3 className="mb-4 text-base font-semibold">By activity</h3>
            {activityList.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No data yet.</p>
            ) : (
              <ul className="space-y-3">
                {activityList.map((activity) => (
                  <li key={activity.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{activity.name}</span>
                      <span className="font-bold text-[var(--primary)]">{activity.count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-[var(--primary)] transition-all duration-500"
                        style={{
                          width: `${Math.round(
                            (activity.count / (activityList[0]?.count ?? 1)) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {activity.credits} credit{activity.credits !== 1 ? "s" : ""} used
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
