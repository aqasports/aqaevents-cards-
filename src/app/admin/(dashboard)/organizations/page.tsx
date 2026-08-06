"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import Link from "next/link";
import { Alert, Button, Card, Input, PageHeader, EmptyState, Badge } from "@/components/admin/ui";
import { fetchWithRetry } from "@/lib/fetch-utils";
import { useDataCache, invalidateCache } from "@/lib/use-data-cache";

type Organization = {
  id: string;
  name: string;
  slug: string;
  creditRate: number | null;
  sharedCreditPool: number;
  useSharedPool: boolean;
  createdAt: string;
  _count?: {
    clients: number;
    invoices: number;
    cards: number;
  };
};

type ViewMode = "grid" | "table";

export default function OrganizationsPage() {
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState("");
  const [poolFilter, setPoolFilter] = useState<"all" | "shared" | "individual">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const fetcher = useCallback(async () => {
    const res = await fetchWithRetry("/api/admin/organizations");
    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server error (${res.status} ${res.statusText})`);
    }
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(data?.error || "Failed to load organizations");
    }
    return data as Organization[];
  }, []);

  const { data: orgsData, loading, error, refetch } = useDataCache(
    "/api/admin/organizations",
    fetcher
  );

  const orgs = orgsData ?? [];

  useEffect(() => {
    if (error) setMessage({ text: error, tone: "danger" });
  }, [error]);

  const filteredOrgs = orgs.filter((org) => {
    const matchesSearch =
      !search ||
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.slug.toLowerCase().includes(search.toLowerCase());
    const matchesPool =
      poolFilter === "all" ||
      (poolFilter === "shared" && org.useSharedPool) ||
      (poolFilter === "individual" && !org.useSharedPool);
    return matchesSearch && matchesPool;
  });

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const creditRateStr = formData.get("creditRate") as string;

    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          creditRate: creditRateStr ? parseFloat(creditRateStr) : null,
          useSharedPool: formData.get("useSharedPool") === "on",
          sharedCreditPool: Number(formData.get("sharedCreditPool")) || 0,
        }),
      });

      if (res.ok) {
        setMessage({ text: "Organization created successfully.", tone: "success" });
        setShowCreateModal(false);
        invalidateCache("/api/admin/organizations");
        await refetch();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to create organization.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error. Failed to create organization.", tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  const totalEmployees = orgs.reduce((sum, o) => sum + (o._count?.clients ?? 0), 0);
  const totalPoolCredits = orgs.reduce((sum, o) => sum + (o.useSharedPool ? o.sharedCreditPool : 0), 0);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="B2B Organizations"
        description="Manage corporate accounts, contracts, pooled balances, card inventory, and employee management."
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            + Add Organization
          </Button>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Organizations</span>
          <p className="text-xl font-black text-[var(--foreground)] font-mono">{orgs.length}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Total Employees</span>
          <p className="text-xl font-black text-[var(--foreground)] font-mono">{totalEmployees}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Pooled Credits</span>
          <p className="text-xl font-black text-emerald-500 font-mono">{totalPoolCredits}</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Shared Pool Orgs</span>
          <p className="text-xl font-black text-[var(--primary)] font-mono">{orgs.filter(o => o.useSharedPool).length}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition placeholder:text-[var(--muted-light)]"
          />
        </div>

        <div className="flex gap-2">
          {(["all", "shared", "individual"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPoolFilter(f)}
              className={`px-3 py-2 text-[10px] font-bold uppercase rounded-lg border transition ${
                poolFilter === f
                  ? "bg-[var(--primary)]/15 border-[var(--primary)]/30 text-[var(--primary)]"
                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition ${viewMode === "grid" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--muted)]"}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-2 rounded-md transition ${viewMode === "table" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--muted)]"}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Card>
          <p className="py-8 text-center text-sm text-[var(--muted)]">Loading organizations...</p>
        </Card>
      ) : filteredOrgs.length === 0 ? (
        <Card>
          <EmptyState
            title={search || poolFilter !== "all" ? "No matches found" : "No organizations found"}
            description={search || poolFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Create your first B2B organization to start managing company contracts and pooled credits."
            }
            icon={
              <svg className="h-8 w-8 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrgs.map((org) => (
            <Card key={org.id} className="hover:border-[var(--primary)]/50 transition-colors group">
              <div className="flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-bold text-base text-[var(--foreground)] truncate">{org.name}</h3>
                    <Badge tone={org.useSharedPool ? "success" : "default"}>
                      {org.useSharedPool ? "Pooled" : "Individual"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--muted)] font-mono">Slug: {org.slug}</p>
                </div>

                <div className="space-y-2 border-t border-[var(--border)] pt-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Employees:</span>
                    <span className="font-bold text-[var(--foreground)]">{org._count?.clients ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Cards:</span>
                    <span className="font-bold text-[var(--foreground)]">{org._count?.cards ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Credit Rate:</span>
                    <span className="font-semibold text-[var(--primary)]">
                      {org.creditRate ? `${org.creditRate} DA` : "Default"}
                    </span>
                  </div>
                  {org.useSharedPool && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Pool Balance:</span>
                      <span className="font-bold text-emerald-500">{org.sharedCreditPool} credits</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Invoices:</span>
                    <span className="font-bold text-[var(--foreground)]">{org._count?.invoices ?? 0}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href={`/admin/organizations/${org.id}`}>
                    <Button variant="secondary" size="sm" className="w-full justify-center">
                      Manage Organization
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] uppercase text-[10px] tracking-wider text-[var(--muted)] font-bold">
                <tr>
                  <th className="py-3 pr-4">Organization</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Employees</th>
                  <th className="py-3 px-4">Cards</th>
                  <th className="py-3 px-4">Pool Balance</th>
                  <th className="py-3 px-4">Credit Rate</th>
                  <th className="py-3 px-4">Invoices</th>
                  <th className="py-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-[var(--surface-2)]/50 transition">
                    <td className="py-3 pr-4 font-bold text-[var(--foreground)]">{org.name}</td>
                    <td className="py-3 px-4 font-mono text-[var(--muted)]">{org.slug}</td>
                    <td className="py-3 px-4">
                      <Badge tone={org.useSharedPool ? "success" : "default"}>
                        {org.useSharedPool ? "Pooled" : "Individual"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">{org._count?.clients ?? 0}</td>
                    <td className="py-3 px-4 font-mono font-bold">{org._count?.cards ?? 0}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-500">
                      {org.useSharedPool ? org.sharedCreditPool : "--"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--primary)]">
                      {org.creditRate ? `${org.creditRate} DA` : "Default"}
                    </td>
                    <td className="py-3 px-4 font-mono">{org._count?.invoices ?? 0}</td>
                    <td className="py-3 pl-4 text-right">
                      <Link href={`/admin/organizations/${org.id}`} className="font-bold text-[var(--primary)] hover:underline">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-base">Add New Organization</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                x
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <Input label="Company Name" name="name" placeholder="e.g. Sonatrach Algeria" required />
              <Input label="Custom Credit Rate (DA per credit)" name="creditRate" type="number" placeholder="Leave empty for global rate" />

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="useSharedPool" name="useSharedPool" className="rounded" />
                <label htmlFor="useSharedPool" className="text-xs font-semibold cursor-pointer">
                  Use Shared Credit Pool for all employees
                </label>
              </div>

              <Input label="Initial Shared Pool Credits" name="sharedCreditPool" type="number" defaultValue={0} min={0} />

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={submitting}>
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
