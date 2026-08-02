"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { Alert, Button, Card, PageHeader, Badge, Select } from "@/components/admin/ui";

type ContractDetail = {
  id: string;
  startDate: string;
  endDate: string | null;
  creditRate: number | null;
  discountTier: string | null;
  autoRenew: boolean;
  expiryPolicy: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    nif: string | null;
    nis: string | null;
    rc: string | null;
  };
};

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: contractId } = use(params);
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("active");
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const fetchContract = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/contracts/${contractId}`);
      if (res.ok) {
        const data = await res.json();
        setContract(data);
        setStatus(data.status);
      } else {
        setMessage({ text: "Failed to load contract details", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error loading contract", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setMessage({ text: "Contract status updated successfully.", tone: "success" });
        await fetchContract();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to update status", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error updating status", tone: "danger" });
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="py-8 text-center text-xs text-[var(--muted)]">Loading contract details...</p>
      </Card>
    );
  }

  if (!contract) {
    return (
      <Card>
        <p className="py-8 text-center text-xs text-[var(--danger)]">Contract not found.</p>
      </Card>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={`Contract #${contract.id.slice(-8)}`}
        description={`Organization: ${contract.organization.name} (${contract.organization.slug})`}
        action={
          <Link href="/admin/contracts">
            <Button variant="secondary">← Back to Contracts</Button>
          </Link>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
              Agreement Terms & Conditions
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--muted)]">Start Date</span>
                <p className="font-mono font-bold mt-1">{new Date(contract.startDate).toLocaleDateString()}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--muted)]">End Date</span>
                <p className="font-mono font-bold mt-1">
                  {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "Open-ended"}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--muted)]">Credit Pricing Rate</span>
                <p className="font-mono font-bold text-[var(--primary)] mt-1">
                  {contract.creditRate ? `${contract.creditRate} DA / credit` : "Global Default (1,900 DA)"}
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--muted)]">Discount Tier</span>
                <p className="font-bold mt-1">{contract.discountTier || "Standard Tier"}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--muted)]">Expiry Policy</span>
                <p className="font-bold capitalize mt-1">{contract.expiryPolicy.replace(/_/g, " ")}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--muted)]">Auto Renew</span>
                <p className="font-bold mt-1">{contract.autoRenew ? "Enabled" : "Disabled"}</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-3 text-xs">
            <h3 className="text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
              Linked Corporate Buyer Info
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--muted)]">Company Name</span>
                <p className="font-bold text-sm mt-0.5">{contract.organization.name}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--muted)]">Tax Identifiers</span>
                <p className="font-mono text-[11px] text-[var(--muted)] mt-0.5">
                  NIF: {contract.organization.nif || "N/A"} · NIS: {contract.organization.nis || "N/A"} · RC: {contract.organization.rc || "N/A"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Status Update Sidebar */}
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Contract Status</h4>
              <Badge tone={contract.status === "active" ? "success" : contract.status === "draft" ? "warning" : "danger"}>
                {contract.status.toUpperCase()}
              </Badge>
            </div>

            <form onSubmit={handleStatusUpdate} className="space-y-4 text-xs">
              <Select label="Change Contract Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </Select>

              <Button type="submit" loading={updating} className="w-full">
                Update Status
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
