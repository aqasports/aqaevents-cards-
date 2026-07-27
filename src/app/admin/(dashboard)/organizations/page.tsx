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
  };
};

export default function OrganizationsPage() {
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetcher = useCallback(async () => {
    const res = await fetchWithRetry("/api/admin/organizations");
    const data = await res.json();
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

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Organizations"
        description="Manage B2B corporate partners, negotiated credit rates, and consolidated invoicing."
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            + Add Organization
          </Button>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {loading ? (
        <Card>
          <p className="py-8 text-center text-sm text-[var(--muted)]">Loading organizations...</p>
        </Card>
      ) : orgs.length === 0 ? (
        <Card>
          <EmptyState
            title="No organizations found"
            description="Create your first B2B organization to start managing company contracts and pooled credits."
            icon={
              <svg className="h-8 w-8 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <Card key={org.id} className="hover:border-[var(--primary)]/50 transition-colors">
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
                    <span className="text-[var(--muted)]">Linked Employees:</span>
                    <span className="font-bold text-[var(--foreground)]">{org._count?.clients ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Custom Rate:</span>
                    <span className="font-semibold text-[var(--primary)]">
                      {org.creditRate ? `${org.creditRate} DA/cred` : "Global Default"}
                    </span>
                  </div>
                  {org.useSharedPool && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Shared Pool Balance:</span>
                      <span className="font-bold text-emerald-600">{org.sharedCreditPool} credits</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Link href={`/admin/organizations/${org.id}`}>
                    <Button variant="secondary" size="sm" className="w-full justify-center">
                      Manage Organization →
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
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
                ✕
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
