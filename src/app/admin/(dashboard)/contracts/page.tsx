"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Alert, Card, PageHeader, Badge, Button } from "@/components/admin/ui";

type Contract = {
  id: string;
  startDate: string;
  endDate: string | null;
  creditRate: number | null;
  discountTier: string | null;
  autoRenew: boolean;
  expiryPolicy: string;
  status: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter === "all" ? "/api/admin/contracts" : `/api/admin/contracts?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setContracts(data);
      } else {
        setError("Failed to load corporate contracts");
      }
    } catch {
      setError("Network error loading contracts");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="B2B Corporate Contracts"
        description="View and manage corporate agreements, credit pricing overrides, and renewal terms."
        action={
          <Link href="/admin/organizations">
            <Button variant="secondary">View Organizations →</Button>
          </Link>
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {/* Filter Tabs */}
      <div className="flex border-b border-[var(--border)] gap-4 overflow-x-auto text-xs font-bold">
        {["all", "active", "draft", "expired", "cancelled"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`py-2 px-3 border-b-2 uppercase transition ${
              statusFilter === st
                ? "border-[var(--primary)] text-[var(--primary)] font-black"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <p className="py-8 text-center text-xs text-[var(--muted)]">Loading corporate contracts...</p>
        ) : contracts.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-[var(--muted)]">No contracts found for status "{statusFilter}".</p>
            <p className="text-[11px] text-[var(--muted-light)]">
              Contracts can be created under an Organization's details page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] uppercase text-[var(--muted)] font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3">Organization</th>
                  <th className="py-3">Start Date</th>
                  <th className="py-3">End Date</th>
                  <th className="py-3">Credit Rate</th>
                  <th className="py-3">Tier</th>
                  <th className="py-3">Policy</th>
                  <th className="py-3">Auto Renew</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {contracts.map((ct) => (
                  <tr key={ct.id} className="hover:bg-[var(--surface-2)]/50 transition">
                    <td className="py-3 font-bold text-[var(--foreground)]">
                      <Link href={`/admin/organizations/${ct.organization.id}`} className="hover:text-[var(--primary)]">
                        {ct.organization.name}
                      </Link>
                    </td>
                    <td className="py-3 font-mono">{new Date(ct.startDate).toLocaleDateString()}</td>
                    <td className="py-3 font-mono">
                      {ct.endDate ? new Date(ct.endDate).toLocaleDateString() : "Open-ended"}
                    </td>
                    <td className="py-3 font-mono font-bold text-[var(--primary)]">
                      {ct.creditRate ? `${ct.creditRate} DA` : "Standard"}
                    </td>
                    <td className="py-3">{ct.discountTier || "—"}</td>
                    <td className="py-3 capitalize">{ct.expiryPolicy.replace(/_/g, " ")}</td>
                    <td className="py-3">{ct.autoRenew ? "Yes" : "No"}</td>
                    <td className="py-3">
                      <Badge tone={ct.status === "active" ? "success" : ct.status === "draft" ? "warning" : "danger"}>
                        {ct.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Link href={`/admin/contracts/${ct.id}`} className="font-bold text-[var(--primary)] hover:underline">
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
