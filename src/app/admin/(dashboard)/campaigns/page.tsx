"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { Alert, Button, Card, Input, PageHeader, EmptyState, Badge } from "@/components/admin/ui";
import { fetchWithRetry } from "@/lib/fetch-utils";
import { useDataCache, invalidateCache } from "@/lib/use-data-cache";

type Campaign = {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses: number | null;
  usesCount: number;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
};

export default function CampaignsPage() {
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetcher = useCallback(async () => {
    const res = await fetchWithRetry("/api/admin/promo");
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(data?.error || "Failed to load campaigns");
    }
    return data as Campaign[];
  }, []);

  const { data: campaignData, loading, error, refetch } = useDataCache(
    "/api/admin/promo",
    fetcher
  );

  const campaigns = campaignData ?? [];

  useEffect(() => {
    if (error) setMessage({ text: error, tone: "danger" });
  }, [error]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.get("code"),
          discountType: formData.get("discountType"),
          discountValue: Number(formData.get("discountValue")),
          maxUses: formData.get("maxUses") ? Number(formData.get("maxUses")) : null,
          validUntil: formData.get("validUntil") || null,
        }),
      });

      if (res.ok) {
        setMessage({ text: "Campaign promo code created successfully.", tone: "success" });
        setShowCreateModal(false);
        invalidateCache("/api/admin/promo");
        await refetch();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to create campaign code.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error. Failed to create campaign code.", tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Marketing Campaigns & Promo Codes"
        description="Configure promotional discounts, percentage markdowns, and maximum redemptions per campaign."
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            + Create Campaign Code
          </Button>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {loading ? (
        <Card>
          <p className="py-8 text-center text-sm text-[var(--muted)]">Loading campaign codes...</p>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <EmptyState
            title="No campaign promo codes found"
            description="Create your first campaign code (e.g. SUMMER2026) to offer promotional discounts on packages."
            icon={
              <svg className="h-8 w-8 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            }
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] uppercase font-bold text-[var(--muted)]">
                <tr>
                  <th className="py-2.5">Promo Code</th>
                  <th className="py-2.5">Discount</th>
                  <th className="py-2.5">Usage Count</th>
                  <th className="py-2.5">Expiration</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 font-bold font-mono text-[var(--primary)] text-sm">{c.code}</td>
                    <td className="py-3 font-semibold">
                      {c.discountType === "percentage" ? `${c.discountValue}% OFF` : `${c.discountValue.toLocaleString()} DA OFF`}
                    </td>
                    <td className="py-3">
                      {c.usesCount} / {c.maxUses ?? "∞"} uses
                    </td>
                    <td className="py-3 text-[var(--muted)]">
                      {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : "No Expiry"}
                    </td>
                    <td className="py-3 text-right">
                      <Badge tone={c.active ? "success" : "default"}>
                        {c.active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
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
              <h3 className="font-bold text-base">Create Campaign Code</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <Input label="Promo Code" name="code" placeholder="e.g. PROMO2026" required />
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--muted)] uppercase">Discount Type</label>
                <select name="discountType" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-semibold">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed DA Amount</option>
                </select>
              </div>

              <Input label="Discount Value" name="discountValue" type="number" step="0.1" placeholder="20 for 20% or 500 for 500 DA" required />
              <Input label="Max Uses Cap (Optional)" name="maxUses" type="number" placeholder="Leave blank for unlimited" />
              <Input label="Expiration Date (Optional)" name="validUntil" type="date" />

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={submitting}>
                  Save Campaign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
