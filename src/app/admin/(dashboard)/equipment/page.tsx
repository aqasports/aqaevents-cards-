"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { Alert, Button, Card, Input, PageHeader, EmptyState, Badge } from "@/components/admin/ui";
import { fetchWithRetry } from "@/lib/fetch-utils";
import { useDataCache, invalidateCache } from "@/lib/use-data-cache";

type EquipmentAsset = {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  purchaseDate: string;
  usefulLifeMonths: number;
  maintenanceCost: number;
  status: string;
  notes: string | null;
  _count?: { usageLogs: number };
};

export default function EquipmentPage() {
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetcher = useCallback(async () => {
    const res = await fetchWithRetry("/api/admin/equipment");
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(data?.error || "Failed to load equipment assets");
    }
    return data as EquipmentAsset[];
  }, []);

  const { data: equipmentData, loading, error, refetch } = useDataCache(
    "/api/admin/equipment",
    fetcher
  );

  const assets = equipmentData ?? [];

  useEffect(() => {
    if (error) setMessage({ text: error, tone: "danger" });
  }, [error]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          category: formData.get("category"),
          purchasePrice: Number(formData.get("purchasePrice")) || 0,
          usefulLifeMonths: Number(formData.get("usefulLifeMonths")) || 36,
          maintenanceCost: Number(formData.get("maintenanceCost")) || 0,
          notes: formData.get("notes") || null,
        }),
      });

      if (res.ok) {
        setMessage({ text: "Equipment asset created successfully.", tone: "success" });
        setShowCreateModal(false);
        invalidateCache("/api/admin/equipment");
        await refetch();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to create equipment asset.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error. Failed to create equipment asset.", tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Equipment & Fleet Assets"
        description="Track rental boats, kayaks, safety gear, and calculate depreciation/usage costs."
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            + Add Equipment
          </Button>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {loading ? (
        <Card>
          <p className="py-8 text-center text-sm text-[var(--muted)]">Loading equipment assets...</p>
        </Card>
      ) : assets.length === 0 ? (
        <Card>
          <EmptyState
            title="No equipment assets registered"
            description="Add your first boat, kayak, or gear asset to track session usage and maintenance costs."
            icon={
              <svg className="h-8 w-8 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
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
                  <th className="py-2.5">Asset Name</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Purchase Price</th>
                  <th className="py-2.5">Useful Life</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Session Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {assets.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 font-bold text-[var(--foreground)]">{item.name}</td>
                    <td className="py-3">{item.category}</td>
                    <td className="py-3 font-semibold">{item.purchasePrice.toLocaleString()} DA</td>
                    <td className="py-3 text-[var(--muted)]">{item.usefulLifeMonths} months</td>
                    <td className="py-3">
                      <Badge tone={item.status === "available" ? "success" : "warning"}>
                        {item.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 text-right font-bold">{item._count?.usageLogs ?? 0} sessions</td>
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
              <h3 className="font-bold text-base">Add Equipment Asset</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <Input label="Asset Name" name="name" placeholder="e.g. Sea Kayak Duo #4" required />
              <Input label="Category" name="category" placeholder="Boat / Gear / Safety" required />
              <Input label="Purchase Price (DA)" name="purchasePrice" type="number" defaultValue={0} min={0} />
              <Input label="Useful Life (Months)" name="usefulLifeMonths" type="number" defaultValue={36} min={1} />
              <Input label="Maintenance Cost (DA)" name="maintenanceCost" type="number" defaultValue={0} min={0} />
              <Input label="Notes" name="notes" placeholder="Condition, serial number..." />

              <div className="flex gap-3 pt-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={submitting}>
                  Save Asset
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
