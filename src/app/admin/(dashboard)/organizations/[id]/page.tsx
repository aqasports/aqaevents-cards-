"use client";

import { useState, useEffect, useCallback, FormEvent, use } from "react";
import Link from "next/link";
import { Alert, Button, Card, Input, PageHeader, Badge, EmptyState } from "@/components/admin/ui";

type Client = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  orgRole: string | null;
  cards: Array<{ cardCode: string }>;
};

type Invoice = {
  id: string;
  invoiceCode: string;
  amount: number;
  status: string;
  category: string;
  items: string;
  createdAt: string;
};

type OrganizationDetail = {
  id: string;
  name: string;
  slug: string;
  creditRate: number | null;
  sharedCreditPool: number;
  useSharedPool: boolean;
  createdAt: string;
  clients: Client[];
  invoices: Invoice[];
};

type BulkImportResult = {
  fullName: string;
  status: "success" | "error";
  clientId?: string;
  message?: string;
};

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orgId } = use(params);
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "employees" | "statements">("overview");

  // Bulk Provisioning state (Prompt 9)
  const [bulkInput, setBulkInput] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [importResults, setImportResults] = useState<BulkImportResult[] | null>(null);

  // Statements state (Prompt 10)
  const [statementStart, setStatementStart] = useState("");
  const [statementEnd, setStatementEnd] = useState("");
  const [generatingStatement, setGeneratingStatement] = useState(false);

  const loadOrg = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setOrg(data);
      } else {
        setMessage({ text: "Failed to load organization details", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error loading organization", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  // Handle Bulk Employee Import (Prompt 9)
  async function handleBulkImport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProvisioning(true);
    setMessage(null);
    setImportResults(null);

    // Parse CSV or JSON input lines: "Name, email, phone, role"
    const lines = bulkInput.split("\n").filter((l) => l.trim().length > 0);
    const employees = lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return {
        fullName: parts[0] || "Employee",
        email: parts[1] || undefined,
        phone: parts[2] || undefined,
        orgRole: parts[3] || undefined,
      };
    });

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employees }),
      });

      const data = await res.json();
      if (res.ok) {
        setImportResults(data.results || []);
        setMessage({ text: `Provisioned ${data.results?.length ?? 0} employees.`, tone: "success" });
        await loadOrg();
      } else {
        setMessage({ text: data.error || "Failed to provision employees.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error during bulk provisioning.", tone: "danger" });
    } finally {
      setProvisioning(false);
    }
  }

  // Handle Statement Generation (Prompt 10)
  async function handleGenerateStatement(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneratingStatement(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: statementStart || undefined,
          endDate: statementEnd || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `Statement generated successfully (${data.invoiceCode || "Consolidated Invoice"}).`, tone: "success" });
        await loadOrg();
      } else {
        setMessage({ text: data.error || "Failed to generate statement.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error generating statement.", tone: "danger" });
    } finally {
      setGeneratingStatement(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-[var(--muted)]">Loading organization details...</p>
      </Card>
    );
  }

  if (!org) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-[var(--danger)]">Organization not found.</p>
      </Card>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={org.name}
        description={`Organization Slug: ${org.slug} · Created ${new Date(org.createdAt).toLocaleDateString()}`}
        action={
          <Link href="/admin/organizations">
            <Button variant="secondary">← Back to Organizations</Button>
          </Link>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {/* Tabs */}
      <div className="border-b border-[var(--border)]">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "overview"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Overview & Employees ({org.clients.length})
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "employees"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Bulk Employee Import (Prompt 9)
          </button>
          <button
            onClick={() => setActiveTab("statements")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "statements"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Statements & Invoices (Prompt 10)
          </button>
        </nav>
      </div>

      {/* TAB 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Custom Rate</h4>
              <p className="mt-1 text-lg font-black text-[var(--primary)]">
                {org.creditRate ? `${org.creditRate} DA / credit` : "Global Default (1,900 DA)"}
              </p>
            </Card>
            <Card>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Credit Strategy</h4>
              <p className="mt-1 text-lg font-black text-[var(--foreground)]">
                {org.useSharedPool ? "Shared Company Pool" : "Individual Client Balances"}
              </p>
            </Card>
            <Card>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Shared Pool Balance</h4>
              <p className="mt-1 text-lg font-black text-emerald-600">
                {org.sharedCreditPool} credits
              </p>
            </Card>
          </div>

          <Card>
            <h3 className="text-base font-semibold mb-4">Linked Employees</h3>
            {org.clients.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-4">No employees linked to this organization yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--border)] uppercase text-[var(--muted)] font-bold">
                    <tr>
                      <th className="py-2">Employee Name</th>
                      <th className="py-2">Org Role</th>
                      <th className="py-2">Email / Phone</th>
                      <th className="py-2">Card Code</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {org.clients.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 font-bold">{c.fullName}</td>
                        <td className="py-2.5">{c.orgRole || "Member"}</td>
                        <td className="py-2.5 text-[var(--muted)]">{c.email || c.phone || "—"}</td>
                        <td className="py-2.5 font-mono">{c.cards[0]?.cardCode || "No Card"}</td>
                        <td className="py-2.5 text-right">
                          <Link href={`/admin/clients/${c.id}`} className="text-[var(--primary)] font-bold hover:underline">
                            View Client →
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
      )}

      {/* TAB 2: Bulk Employee Import (Prompt 9) */}
      {activeTab === "employees" && (
        <Card className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Bulk Import Employees</h3>
            <p className="text-xs text-[var(--muted)] mt-1">
              Paste comma-separated employee rows below (one per line): <br />
              <code className="bg-[var(--surface-2)] px-1 py-0.5 rounded font-mono">Full Name, Email, Phone, Role</code>
            </p>
          </div>

          <form onSubmit={handleBulkImport} className="space-y-4">
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              rows={6}
              placeholder="Amine Benali, amine@company.dz, 0555123456, Manager&#10;Yassine K, yassine@company.dz, 0555987654, Engineer"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />

            <Button type="submit" loading={provisioning}>
              Import & Provision Cards
            </Button>
          </form>

          {importResults && importResults.length > 0 && (
            <div className="border-t border-[var(--border)] pt-4 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wide">Import Outcome Results</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--border)] font-bold text-[var(--muted)]">
                    <tr>
                      <th className="py-2">Employee</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {importResults.map((r, idx) => (
                      <tr key={idx}>
                        <td className="py-2 font-medium">{r.fullName}</td>
                        <td className="py-2">
                          <Badge tone={r.status === "success" ? "success" : "danger"}>
                            {r.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2 text-[var(--muted)]">{r.message || "Created"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: Statements & Invoices (Prompt 10) */}
      {activeTab === "statements" && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Generate Monthly Statement</h3>
              <p className="text-xs text-[var(--muted)] mt-1">
                Consolidate all client charges for this organization into one rollup invoice.
              </p>
            </div>

            <form onSubmit={handleGenerateStatement} className="grid gap-4 sm:grid-cols-3 items-end">
              <Input
                label="Period Start Date"
                type="date"
                value={statementStart}
                onChange={(e) => setStatementStart(e.target.value)}
              />
              <Input
                label="Period End Date"
                type="date"
                value={statementEnd}
                onChange={(e) => setStatementEnd(e.target.value)}
              />
              <Button type="submit" loading={generatingStatement}>
                Generate Statement
              </Button>
            </form>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-base font-semibold">Organization Statement History</h3>
            {org.invoices.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-4">No statements or invoices created for this organization yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--border)] uppercase text-[var(--muted)] font-bold">
                    <tr>
                      <th className="py-2">Invoice Code</th>
                      <th className="py-2">Category</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {org.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-2.5 font-bold font-mono">{inv.invoiceCode}</td>
                        <td className="py-2.5">{inv.category}</td>
                        <td className="py-2.5 font-bold text-[var(--foreground)]">{inv.amount.toLocaleString()} DA</td>
                        <td className="py-2.5">
                          <Badge tone={inv.status === "paid" ? "success" : "warning"}>
                            {inv.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-[var(--muted)]">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
