"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { formatDate, useLocale } from "@/lib/i18n";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, ConfirmModal } from "@/components/admin/ui";

import { fetchWithRetry } from "@/lib/fetch-utils";
import { useDataCache, invalidateCache } from "@/lib/use-data-cache";

type ClientRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  balance: number;
  card: { cardCode: string; publicToken: string } | null;
  createdAt: string;
  archived: boolean;
  archivedAt: string | null;
  
  // CRM Fields
  leadSource: string | null;
  customerSegment: string | null;
  totalSpent: number;
  lastActivityDate: string | null;
  favoriteActivity: string | null;
};

export default function ClientsPage() {
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  const [activeCrmTab, setActiveCrmTab] = useState("all");
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Confirm Modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, isDanger = false) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, isDanger });
  };

  const fetcher = useCallback(async () => {
    const isArchived = activeCrmTab === "archived";
    const url = isArchived ? "/api/admin/clients?archived=true" : "/api/admin/clients";
    const res = await fetchWithRetry(url);
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(data?.error || "Failed to load clients.");
    }
    return data as ClientRow[];
  }, [activeCrmTab]);

  const { data: clientsData, loading, error, refetch } = useDataCache(
    `/api/admin/clients?tab=${activeCrmTab}`,
    fetcher
  );

  const clients = clientsData ?? [];

  useEffect(() => {
    if (error) {
      setMessage({ text: error, tone: "danger" });
    }
  }, [error]);

  async function handleDelete(client: ClientRow) {
    triggerConfirm(
      "Archive Client",
      `Are you sure you want to archive ${client.fullName}? Their active card will be voided. Their invoice and transaction history will be preserved. You can restore this client later from the Archived tab.`,
      async () => {
        setDeletingId(client.id);
        setMessage(null);

        try {
          const res = await fetch(`/api/admin/clients/${client.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setMessage({
              text: `Client ${client.fullName} has been successfully archived.`,
              tone: "success",
            });
            invalidateCache("/api/admin/clients");
            await refetch();
          } else {
            const errData = await res.json();
            setMessage({
              text: errData.error || "Failed to archive client.",
              tone: "danger",
            });
          }
        } catch {
          setMessage({ text: "Failed to archive client.", tone: "danger" });
        } finally {
          setDeletingId(null);
        }
      },
      true // isDanger
    );
  }

  async function handleUnarchive(client: ClientRow) {
    triggerConfirm(
      "Restore Client",
      `Are you sure you want to restore ${client.fullName}? This will mark them as active again.`,
      async () => {
        try {
          const res = await fetch(`/api/admin/clients/${client.id}/unarchive`, {
            method: "POST",
          });
          if (res.ok) {
            setMessage({
              text: `Client ${client.fullName} has been successfully restored.`,
              tone: "success",
            });
            invalidateCache("/api/admin/clients");
            await refetch();
          } else {
            const errData = await res.json();
            setMessage({
              text: errData.error || "Failed to restore client.",
              tone: "danger",
            });
          }
        } catch {
          setMessage({ text: "Failed to restore client.", tone: "danger" });
        }
      }
    );
  }

  async function handleForceDelete(client: ClientRow) {
    triggerConfirm(
      "Delete Client Permanently",
      `Are you sure you want to PERMANENTLY delete ${client.fullName} and ALL of their invoices, cards, redemptions, and credit history? This action is irreversible and will erase financial records.`,
      async () => {
        setDeletingId(client.id);
        setMessage(null);

        try {
          const res = await fetch(`/api/admin/clients/${client.id}?force=true&deleteRelated=true`, {
            method: "DELETE",
          });
          if (res.ok) {
            setMessage({
              text: `Client ${client.fullName} and all related records have been permanently deleted.`,
              tone: "success",
            });
            invalidateCache("/api/admin/clients");
            await refetch();
          } else {
            const errData = await res.json();
            setMessage({
              text: errData.error || "Failed to permanently delete client.",
              tone: "danger",
            });
          }
        } catch {
          setMessage({ text: "Failed to permanently delete client.", tone: "danger" });
        } finally {
          setDeletingId(null);
        }
      },
      true // isDanger
    );
  }

  const filtered = clients.filter(
    (c) =>
      (!search ||
        c.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (c.card?.cardCode ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.phone ?? "").includes(search) ||
        (c.email ?? "").toLowerCase().includes(search.toLowerCase())) &&
      (activeCrmTab === "all" ||
        (activeCrmTab === "vip" && c.customerSegment === "VIP") ||
        (activeCrmTab === "high-value" && c.customerSegment === "High-Value") ||
        (activeCrmTab === "inactive" && c.customerSegment === "Inactive"))
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clients CRM"
        description="Manage event card holders, segments, lead sources, and LTV."
        action={
          <Link
            href="/admin/clients/new"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-hover)] transition-colors"
          >
            + Add client
          </Link>
        }
      />

      {message && (
        <div className="mb-6">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

      <Card padding={false}>
        {/* Search & CRM Tabs */}
        <div className="border-b border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4">
            <h3 className="text-base font-semibold">
              Clients Directory {!loading && `(${filtered.length})`}
            </h3>
            <input
              type="search"
              placeholder="Search by name, card, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>
          <div className="flex px-3 sm:px-5 border-t border-[var(--border)] bg-slate-50/50 gap-2 sm:gap-4 mobile-scroll-tabs sm:flex-wrap">
            {[
              { id: "all", label: "All Clients" },
              { id: "vip", label: "VIP Clients" },
              { id: "high-value", label: "High-Value" },
              { id: "inactive", label: "Inactive" },
              { id: "archived", label: "Archived" },
            ].map((tabInfo) => (
              <button
                key={tabInfo.id}
                onClick={() => setActiveCrmTab(tabInfo.id)}
                className={`py-2.5 sm:py-3 text-[11px] sm:text-xs whitespace-nowrap uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                  activeCrmTab === tabInfo.id
                    ? "border-[var(--primary)] text-[var(--primary)]"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {tabInfo.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
            <p className="text-sm text-[var(--muted)]">Loading clients…</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No clients match your search" : "No clients in this segment"}
            description={
              search
                ? "Try a different name, card code, or phone number."
                : "Create your first client or adjust filters."
            }
            action={
              !search && activeCrmTab === "all" ? (
                <Link
                  href="/admin/clients/new"
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
                >
                  Add first client
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
          {/* Desktop table view - hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Name</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Segment</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Card code</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Balance</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Lead source</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Total spent</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Last activity</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Fav Activity</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{client.fullName}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          client.customerSegment === "VIP"
                            ? "success"
                            : client.customerSegment === "High-Value"
                            ? "primary"
                            : client.customerSegment === "Inactive"
                            ? "danger"
                            : "default"
                        }
                      >
                        {client.customerSegment ?? "Standard"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {client.card ? (
                        <span className="font-mono text-xs text-[var(--foreground)]">
                          {client.card.cardCode}
                        </span>
                      ) : (
                        <Badge tone="warning" size="sm">No card</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          client.balance === 0
                            ? "danger"
                            : client.balance <= 2
                            ? "warning"
                            : "success"
                        }
                      >
                        {Number(client.balance.toFixed(2))} credit{Number(client.balance.toFixed(2)) !== 1 ? "s" : ""}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] whitespace-nowrap">
                      {client.leadSource ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)] whitespace-nowrap">
                      {(client.totalSpent ?? 0).toLocaleString()} DA
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] whitespace-nowrap">
                      {client.lastActivityDate ? formatDate(client.lastActivityDate, locale) : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] whitespace-nowrap">
                      {client.favoriteActivity ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)] whitespace-nowrap">
                      {formatDate(client.createdAt, locale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {client.archived ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnarchive(client)}
                              className="text-emerald-600 hover:bg-emerald-50"
                            >
                              Restore
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={deletingId === client.id}
                              onClick={() => handleForceDelete(client)}
                              className="text-red-600 hover:bg-red-50 font-semibold"
                            >
                              Delete Permanently
                            </Button>
                          </>
                        ) : (
                          <>
                            <Link
                              href={`/admin/clients/${client.id}`}
                              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors"
                            >
                              View
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={deletingId === client.id}
                              onClick={() => handleDelete(client)}
                              className="text-[var(--danger)] hover:bg-red-50"
                            >
                              Archive
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view - shown only on mobile */}
          <div className="md:hidden mobile-card-list p-3 space-y-3">
            {filtered.map((client) => (
              <div
                key={client.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-4 space-y-3"
              >
                {/* Top row: Name + Segment badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--foreground)] truncate">{client.fullName}</p>
                    {client.card ? (
                      <p className="font-mono text-[11px] text-[var(--muted)] mt-0.5">{client.card.cardCode}</p>
                    ) : (
                      <Badge tone="warning" size="sm">No card</Badge>
                    )}
                  </div>
                  <Badge
                    tone={
                      client.customerSegment === "VIP"
                        ? "success"
                        : client.customerSegment === "High-Value"
                        ? "primary"
                        : client.customerSegment === "Inactive"
                        ? "danger"
                        : "default"
                    }
                  >
                    {client.customerSegment ?? "Standard"}
                  </Badge>
                </div>

                {/* Info grid: Balance, Total Spent, Lead Source */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[var(--surface)]/80 rounded-lg py-2 px-1">
                    <p className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">Balance</p>
                    <p className="text-sm font-bold mt-0.5">
                      <Badge
                        tone={
                          client.balance === 0
                            ? "danger"
                            : client.balance <= 2
                            ? "warning"
                            : "success"
                        }
                        size="sm"
                      >
                        {Number(client.balance.toFixed(2))}
                      </Badge>
                    </p>
                  </div>
                  <div className="bg-[var(--surface)]/80 rounded-lg py-2 px-1">
                    <p className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">Spent</p>
                    <p className="text-sm font-bold text-[var(--foreground)] mt-0.5">{(client.totalSpent ?? 0).toLocaleString()} DA</p>
                  </div>
                  <div className="bg-[var(--surface)]/80 rounded-lg py-2 px-1">
                    <p className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide">Source</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{client.leadSource ?? "—"}</p>
                  </div>
                </div>

                {/* Bottom row: Joined date + Actions */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border)]">
                  <p className="text-[11px] text-[var(--muted)]">
                    Joined {formatDate(client.createdAt, locale)}
                  </p>
                  <div className="flex items-center gap-2">
                    {client.archived ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnarchive(client)}
                          className="text-emerald-600 hover:bg-emerald-50"
                        >
                          Restore
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={deletingId === client.id}
                          onClick={() => handleForceDelete(client)}
                          className="text-red-600 hover:bg-red-50 font-semibold"
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors"
                        >
                          View
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={deletingId === client.id}
                          onClick={() => handleDelete(client)}
                          className="text-[var(--danger)] hover:bg-red-50"
                        >
                          Archive
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </Card>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
        onConfirm={() => {
          confirmConfig.onConfirm();
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
