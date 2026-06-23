"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, ConfirmModal } from "@/components/admin/ui";

type ClientRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  balance: number;
  card: { cardCode: string; publicToken: string } | null;
  createdAt: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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

  async function loadClients() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setClients(data);
      } else {
        setClients([]);
        setMessage({ text: data?.error || "Failed to load clients.", tone: "danger" });
      }
    } catch {
      setClients([]);
      setMessage({ text: "Failed to load clients.", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function handleDelete(client: ClientRow) {
    triggerConfirm(
      "Delete Client",
      `Are you sure you want to delete ${client.fullName}? This will permanently remove their active card, credit ledger, and redemption history.`,
      async () => {
        setDeletingId(client.id);
        setMessage(null);

        try {
          const res = await fetch(`/api/admin/clients/${client.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setMessage({
              text: `Client ${client.fullName} has been successfully deleted.`,
              tone: "success",
            });
            await loadClients();
          } else {
            const errData = await res.json();
            setMessage({
              text: errData.error || "Failed to delete client.",
              tone: "danger",
            });
          }
        } catch {
          setMessage({ text: "Failed to delete client.", tone: "danger" });
        } finally {
          setDeletingId(null);
        }
      },
      true // isDanger
    );
  }

  const filtered = clients.filter(
    (c) =>
      !search ||
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (c.card?.cardCode ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clients"
        description="Manage event card holders and their activity balances."
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
        {/* Search bar */}
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-base font-semibold">
            All clients {!loading && `(${filtered.length})`}
          </h3>
          <input
            type="search"
            placeholder="Search by name, card, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
            <p className="text-sm text-[var(--muted)]">Loading clients…</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No clients match your search" : "No clients yet"}
            description={
              search
                ? "Try a different name, card code, or phone number."
                : "Create your first client to issue an event card."
            }
            action={
              !search ? (
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Name</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Card code</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Balance</th>
                  <th className="px-4 py-3 font-medium text-[var(--muted)]">Contact</th>
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
                    <td className="px-4 py-3 font-semibold">{client.fullName}</td>
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
                        {client.balance} credit{client.balance !== 1 ? "s" : ""}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {client.phone ?? client.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end items-center gap-2">
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
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
