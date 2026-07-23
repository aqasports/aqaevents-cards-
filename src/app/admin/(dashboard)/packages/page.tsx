"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  EmptyState,
} from "@/components/admin/ui";

type Package = {
  id: string;
  name: string;
  creditAmount: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
  active: boolean;
  sortOrder: number;
  _count: { ledgerEntries: number };
};

import { useCallback } from "react";
import { fetchWithRetry } from "@/lib/fetch-utils";
import { useDataCache, invalidateCache } from "@/lib/use-data-cache";

export default function PackagesPage() {
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for live calculation preview
  const [newCreditAmount, setNewCreditAmount] = useState(1);
  const [newBonusCredits, setNewBonusCredits] = useState(0);

  // Inline editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCreditAmount, setEditCreditAmount] = useState(1);
  const [editBonusCredits, setEditBonusCredits] = useState(0);
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [orderingId, setOrderingId] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    const res = await fetchWithRetry("/api/admin/packages");
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(data?.error || "Failed to load packages.");
    }
    return data as Package[];
  }, []);

  const { data: packagesData, loading, error, refetch, mutate } = useDataCache(
    "/api/admin/packages",
    fetcher
  );

  const packages = packagesData ?? [];

  useEffect(() => {
    if (error) {
      setMessage({ text: error, tone: "danger" });
    }
  }, [error]);

  const loadPackages = useCallback(async () => {
    invalidateCache("/api/admin/packages");
    await refetch();
  }, [refetch]);

  async function createPackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const res = await fetch("/api/admin/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        creditAmount: Number(formData.get("creditAmount")),
        bonusCredits: Number(formData.get("bonusCredits")),
        sortOrder: Number(formData.get("sortOrder") || 0),
      }),
    });

    setSubmitting(false);

    if (res.ok) {
      setMessage({ text: "Package created successfully.", tone: "success" });
      (event.target as HTMLFormElement).reset();
      setNewCreditAmount(1);
      setNewBonusCredits(0);
      await loadPackages();
    } else {
      const data = await res.json();
      setMessage({ text: data.error ?? "Failed to create package.", tone: "danger" });
    }
  }

  async function handleEditSave(id: string) {
    setEditSubmitting(true);
    setMessage(null);

    const res = await fetch(`/api/admin/packages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        creditAmount: editCreditAmount,
        bonusCredits: editBonusCredits,
        sortOrder: editSortOrder,
      }),
    });

    setEditSubmitting(false);

    if (res.ok) {
      setMessage({ text: "Package updated successfully.", tone: "success" });
      setEditingId(null);
      await loadPackages();
    } else {
      const data = await res.json();
      setMessage({ text: data.error ?? "Failed to update package.", tone: "danger" });
    }
  }

  async function toggleActive(pkg: Package) {
    setTogglingId(pkg.id);
    try {
      await fetch(`/api/admin/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !pkg.active }),
      });
      await loadPackages();
    } finally {
      setTogglingId(null);
    }
  }

  function startEdit(pkg: Package) {
    setEditingId(pkg.id);
    setEditName(pkg.name);
    setEditCreditAmount(pkg.creditAmount);
    setEditBonusCredits(pkg.bonusCredits);
    setEditSortOrder(pkg.sortOrder);
  }

  async function movePackage(pkg: Package, direction: "up" | "down") {
    const currentIndex = activePackages.findIndex((p) => p.id === pkg.id);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= activePackages.length) return;

    const reordered = [...activePackages];
    [reordered[currentIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[currentIndex]];

    const updatedActive = reordered.map((item, index) => ({
      ...item,
      sortOrder: index + 1,
    }));
    const updatedById = new Map(updatedActive.map((item) => [item.id, item]));

    setOrderingId(pkg.id);
    setMessage(null);
    mutate((current) => (current || []).map((item: Package) => updatedById.get(item.id) ?? item), false);

    try {
      const responses = await Promise.all(
        updatedActive.map((item) =>
          fetch(`/api/admin/packages/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: item.sortOrder }),
          })
        )
      );

      if (responses.some((res) => !res.ok)) {
        throw new Error("Failed to save package order.");
      }

      setMessage({ text: "Package order updated.", tone: "success" });
      await loadPackages();
    } catch {
      setMessage({ text: "Failed to update package order.", tone: "danger" });
      await loadPackages();
    } finally {
      setOrderingId(null);
    }
  }

  const activePackages = packages
    .map((pkg, index) => ({ pkg, index }))
    .filter(({ pkg }) => pkg.active)
    .sort((a, b) => a.pkg.sortOrder - b.pkg.sortOrder || a.index - b.index)
    .map(({ pkg }) => pkg);
  const archivedPackages = packages.filter((p) => !p.active);

  // Live previews for create form
  const computedTotalCredits = newCreditAmount + newBonusCredits;
  const computedPrice = newCreditAmount * 1900;
  const computedRate = computedTotalCredits > 0 ? computedPrice / computedTotalCredits : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Packages"
        description="Configure credit packages and bonus activity tiers."
      />

      {message && (
        <div className="mb-6">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Create form */}
        <div className="space-y-4">
          <Card>
            <h3 className="mb-4 text-base font-semibold">Add package</h3>
            <form onSubmit={createPackage} className="space-y-4">
              <Input
                label="Package name"
                name="name"
                placeholder="e.g. Starter Pack"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Paid credits"
                  name="creditAmount"
                  type="number"
                  min={1}
                  value={newCreditAmount}
                  onChange={(e) => setNewCreditAmount(Number(e.target.value) || 0)}
                  required
                />
                <Input
                  label="Bonus credits"
                  name="bonusCredits"
                  type="number"
                  min={0}
                  value={newBonusCredits}
                  onChange={(e) => setNewBonusCredits(Number(e.target.value) || 0)}
                  required
                />
              </div>
              <Input
                label="Sort order"
                name="sortOrder"
                type="number"
                defaultValue={packages.length + 1}
                hint="Lower numbers appear first."
              />

              {/* Dynamic Live Preview */}
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-2 text-xs">
                <p className="font-semibold text-[var(--muted)] uppercase tracking-wider text-[10px]">
                  Automatic Calculations Preview
                </p>
                <div className="flex justify-between">
                  <span>Total activities:</span>
                  <span className="font-bold text-[var(--foreground)]">{computedTotalCredits}</span>
                </div>
                <div className="flex justify-between">
                  <span>Client price (Locked):</span>
                  <span className="font-bold text-[var(--foreground)]">{computedPrice.toLocaleString()} DA</span>
                </div>
                <div className="flex justify-between">
                  <span>Effective rate:</span>
                  <span className="font-semibold text-[var(--primary)]">
                    {Math.round(computedRate).toLocaleString()} DA / activity
                  </span>
                </div>
              </div>

              <Button type="submit" className="w-full" loading={submitting}>
                Create package
              </Button>
            </form>
          </Card>

          {/* Live scale reference */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">
              Live scale reference
            </h3>
            {packages.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No active packages configured.</p>
            ) : (
              <ul className="space-y-2 text-xs text-[var(--muted)]">
                {packages
                  .filter((p) => p.active)
                  .map((tier) => (
                    <li key={tier.id} className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 last:border-0 last:pb-0">
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-[var(--foreground)]">{tier.name}</span>
                        {tier.name.toLowerCase() === "value" && (
                          <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold text-amber-800 animate-pulse">
                            VAL
                          </span>
                        )}
                      </span>
                      <span>
                        {tier.creditAmount} + {tier.bonusCredits} = <span className="font-bold text-[var(--foreground)]">{tier.totalCredits}</span> · {tier.price.toLocaleString()} DA
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Packages list */}
        <div className="space-y-6">
          {loading ? (
            <Card>
              <p className="py-4 text-center text-sm text-[var(--muted)]">Loading packages…</p>
            </Card>
          ) : activePackages.length === 0 ? (
            <Card>
              <EmptyState
                title="No active packages"
                description="Create your first package to start selling credits."
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }
              />
            </Card>
          ) : (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Active packages ({activePackages.length})
              </h3>
              <div className="space-y-3">
                {activePackages.map((pkg, index) => (
                  <div key={pkg.id}>
                    {editingId === pkg.id ? (
                      <Card className="border-[var(--primary)] ring-1 ring-[var(--primary)] animate-slide-in">
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm">Edit Package</h4>
                          <div className="grid gap-4 sm:grid-cols-4">
                            <Input
                              label="Name"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                            <Input
                              label="Paid credits"
                              type="number"
                              min={1}
                              value={editCreditAmount}
                              onChange={(e) => setEditCreditAmount(Number(e.target.value) || 0)}
                            />
                            <Input
                              label="Bonus credits"
                              type="number"
                              min={0}
                              value={editBonusCredits}
                              onChange={(e) => setEditBonusCredits(Number(e.target.value) || 0)}
                            />
                            <Input
                              label="Sort order"
                              type="number"
                              value={editSortOrder}
                              onChange={(e) => setEditSortOrder(Number(e.target.value) || 0)}
                            />
                          </div>

                          {/* Calculations Preview */}
                          <div className="flex flex-wrap items-center gap-6 rounded-lg bg-[var(--surface-2)] p-3 text-xs border border-[var(--border)]">
                            <div>
                              <span className="text-[var(--muted)]">Total activities: </span>
                              <span className="font-bold">{editCreditAmount + editBonusCredits}</span>
                            </div>
                            <div>
                              <span className="text-[var(--muted)]">Price (Auto-locked): </span>
                              <span className="font-bold">{(editCreditAmount * 1900).toLocaleString()} DA</span>
                            </div>
                            <div>
                              <span className="text-[var(--muted)]">Effective rate: </span>
                              <span className="font-semibold text-[var(--primary)]">
                                {Math.round((editCreditAmount * 1900) / ((editCreditAmount + editBonusCredits) || 1)).toLocaleString()} DA / activity
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleEditSave(pkg.id)} loading={editSubmitting}>
                              Save
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <PackageRow
                        pkg={pkg}
                        onToggle={toggleActive}
                        onEdit={startEdit}
                        onMoveUp={() => movePackage(pkg, "up")}
                        onMoveDown={() => movePackage(pkg, "down")}
                        disableMoveUp={index === 0}
                        disableMoveDown={index === activePackages.length - 1}
                        orderPosition={index + 1}
                        loading={togglingId === pkg.id || orderingId === pkg.id}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {archivedPackages.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Archived ({archivedPackages.length})
              </h3>
              <div className="space-y-3">
                {archivedPackages.map((pkg) => (
                  <PackageRow key={pkg.id} pkg={pkg} onToggle={toggleActive} loading={togglingId === pkg.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PackageRow({
  pkg,
  onToggle,
  onEdit,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
  orderPosition,
  loading,
}: {
  pkg: Package;
  onToggle: (pkg: Package) => void;
  onEdit?: (pkg: Package) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
  orderPosition?: number;
  loading?: boolean;
}) {
  const effectiveRate = pkg.totalCredits > 0 ? pkg.price / pkg.totalCredits : 0;
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-4">
        {/* Total credits display badge */}
        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--primary-light)] font-bold text-[var(--primary)] leading-none">
          <span className="text-base">{pkg.totalCredits}</span>
          <span className="text-[7px] uppercase font-bold tracking-wide mt-0.5">cred</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{pkg.name}</p>
            {pkg.active && orderPosition !== undefined && (
              <Badge tone="default" size="sm">#{orderPosition}</Badge>
            )}
            {pkg.name.toLowerCase() === "value" && (
              <Badge tone="warning" size="sm">Value Choice</Badge>
            )}
            {!pkg.active && <Badge tone="default" size="sm">Archived</Badge>}
          </div>
          <p className="text-xs text-[var(--muted)]">
            {pkg.creditAmount} paid + {pkg.bonusCredits} bonus = {pkg.totalCredits} activities
            {" · "}
            <span className="font-bold text-[var(--foreground)]">{pkg.price.toLocaleString()} DA</span>
            {" · "}
            <span className="text-[var(--primary)] font-semibold">
              {Math.round(effectiveRate).toLocaleString()} DA / activity
            </span>
            {" · "}
            {pkg._count.ledgerEntries} sale{pkg._count.ledgerEntries !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {pkg.active && onMoveUp && onMoveDown && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              loading={loading}
              disabled={disableMoveUp}
            >
              Up
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              loading={loading}
              disabled={disableMoveDown}
            >
              Down
            </Button>
          </div>
        )}
        {onEdit && pkg.active && (
          <Button variant="ghost" size="sm" onClick={() => onEdit(pkg)}>
            Edit
          </Button>
        )}
        <Button
          variant={pkg.active ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onToggle(pkg)}
          loading={loading}
        >
          {pkg.active ? "Archive" : "Restore"}
        </Button>
      </div>
    </div>
  );
}
