"use client";

import { useState, useEffect, useCallback, FormEvent, use } from "react";
import Link from "next/link";
import { Alert, Button, Card, Input, PageHeader, Badge } from "@/components/admin/ui";

type Client = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  orgRole: string | null;
  departmentId: string | null;
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

type Contract = {
  id: string;
  startDate: string;
  endDate: string | null;
  creditRate: number | null;
  discountTier: string | null;
  autoRenew: boolean;
  expiryPolicy: string;
  status: string;
};

type Department = {
  id: string;
  name: string;
  budgetCap: number | null;
  _count?: { clients: number };
};

type OrganizationDetail = {
  id: string;
  name: string;
  slug: string;
  creditRate: number | null;
  sharedCreditPool: number;
  useSharedPool: boolean;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  billingAddress: string | null;
  nif: string | null;
  nis: string | null;
  rc: string | null;
  createdAt: string;
  clients: Client[];
  invoices: Invoice[];
};

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orgId } = use(params);
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "contracts" | "departments" | "employees" | "statements">("overview");

  // Contract form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creditRateOverride, setCreditRateOverride] = useState<string>("");
  const [discountTier, setDiscountTier] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [expiryPolicy, setExpiryPolicy] = useState("rollover");
  const [contractStatus, setContractStatus] = useState("active");
  const [creatingContract, setCreatingContract] = useState(false);

  // Department form state
  const [deptName, setDeptName] = useState("");
  const [deptCap, setDeptCap] = useState<string>("");
  const [creatingDept, setCreatingDept] = useState(false);

  // CSV Import state
  const [bulkInput, setBulkInput] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  // Statements state
  const [statementStart, setStatementStart] = useState("");
  const [statementEnd, setStatementEnd] = useState("");
  const [generatingStatement, setGeneratingStatement] = useState(false);

  const loadOrgData = useCallback(async () => {
    setLoading(true);
    try {
      const [resOrg, resContracts, resDepts] = await Promise.all([
        fetch(`/api/admin/organizations/${orgId}`),
        fetch(`/api/admin/organizations/${orgId}/contracts`),
        fetch(`/api/admin/organizations/${orgId}/departments`),
      ]);

      if (resOrg.ok) {
        const data = await resOrg.json();
        setOrg(data);
      }
      if (resContracts.ok) {
        setContracts(await resContracts.json());
      }
      if (resDepts.ok) {
        setDepartments(await resDepts.json());
      }
    } catch {
      setMessage({ text: "Network error loading organization details", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadOrgData();
  }, [loadOrgData]);

  async function handleCreateContract(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreatingContract(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate: endDate || undefined,
          creditRate: creditRateOverride ? Number(creditRateOverride) : undefined,
          discountTier: discountTier || undefined,
          autoRenew,
          expiryPolicy,
          status: contractStatus,
        }),
      });

      if (res.ok) {
        setMessage({ text: "Contract created successfully.", tone: "success" });
        setStartDate("");
        setEndDate("");
        setCreditRateOverride("");
        setDiscountTier("");
        await loadOrgData();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to create contract.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error creating contract.", tone: "danger" });
    } finally {
      setCreatingContract(false);
    }
  }

  async function handleCreateDepartment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreatingDept(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deptName,
          budgetCap: deptCap ? Number(deptCap) : undefined,
        }),
      });

      if (res.ok) {
        setMessage({ text: "Department created successfully.", tone: "success" });
        setDeptName("");
        setDeptCap("");
        await loadOrgData();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to create department.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error creating department.", tone: "danger" });
    } finally {
      setCreatingDept(false);
    }
  }

  async function handleReassignDepartment(clientId: string, departmentId: string) {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/departments/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, departmentId: departmentId || null }),
      });
      if (res.ok) {
        setMessage({ text: "Employee reassigned to department.", tone: "success" });
        await loadOrgData();
      }
    } catch {
      setMessage({ text: "Failed to reassign employee department.", tone: "danger" });
    }
  }

  async function handleBulkImport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProvisioning(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/portal/employees/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: bulkInput, commit: true }),
      });

      const data = await res.json();
      if (res.ok) {
        setImportResults(data);
        setMessage({ text: `Imported ${data.importedCount ?? 0} employees via CSV.`, tone: "success" });
        await loadOrgData();
      } else {
        setMessage({ text: data.error || "CSV import failed.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error during CSV import.", tone: "danger" });
    } finally {
      setProvisioning(false);
    }
  }

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
        setMessage({ text: `Statement generated (${data.invoiceCode || "Invoice"}).`, tone: "success" });
        await loadOrgData();
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
        description={`Slug: ${org.slug} · NIF: ${org.nif || "N/A"} · NIS: ${org.nis || "N/A"} · RC: ${org.rc || "N/A"}`}
        action={
          <Link href="/admin/organizations">
            <Button variant="secondary">← Back to Organizations</Button>
          </Link>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {/* Tabs */}
      <div className="border-b border-[var(--border)]">
        <nav className="flex space-x-6 overflow-x-auto">
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
            onClick={() => setActiveTab("contracts")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "contracts"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Contracts ({contracts.length})
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "departments"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Departments ({departments.length})
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "employees"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Bulk CSV Import
          </button>
          <button
            onClick={() => setActiveTab("statements")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "statements"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Statements & Invoices
          </button>
        </nav>
      </div>

      {/* TAB 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Custom Credit Rate</h4>
              <p className="mt-1 text-lg font-black text-[var(--primary)]">
                {org.creditRate ? `${org.creditRate} DA / credit` : "Default (1,900 DA)"}
              </p>
            </Card>
            <Card>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Credit Strategy</h4>
              <p className="mt-1 text-lg font-black text-[var(--foreground)]">
                {org.useSharedPool ? "Shared Pool Mode" : "Fixed Individual Balances"}
              </p>
            </Card>
            <Card>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Shared Pool Balance</h4>
              <p className="mt-1 text-lg font-black text-emerald-600">{org.sharedCreditPool} credits</p>
            </Card>
          </div>

          <Card>
            <h3 className="text-base font-semibold mb-4">Linked Employees</h3>
            {org.clients.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-4">No employees linked to this organization.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--border)] uppercase text-[var(--muted)] font-bold">
                    <tr>
                      <th className="py-2">Employee Name</th>
                      <th className="py-2">Department</th>
                      <th className="py-2">Contact</th>
                      <th className="py-2">Card Code</th>
                      <th className="py-2 text-right">Reassign Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {org.clients.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 font-bold">{c.fullName}</td>
                        <td className="py-2.5">
                          {departments.find((d) => d.id === c.departmentId)?.name || "Unassigned"}
                        </td>
                        <td className="py-2.5 text-[var(--muted)]">{c.email || c.phone || "—"}</td>
                        <td className="py-2.5 font-mono">{c.cards[0]?.cardCode || "No Card"}</td>
                        <td className="py-2.5 text-right">
                          <select
                            value={c.departmentId || ""}
                            onChange={(e) => handleReassignDepartment(c.id, e.target.value)}
                            className="bg-[var(--surface-2)] text-xs border border-[var(--border)] rounded px-2 py-1 outline-none"
                          >
                            <option value="">-- No Department --</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
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

      {/* TAB 2: Contracts */}
      {activeTab === "contracts" && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="text-base font-semibold">Create B2B Corporate Contract</h3>
            <form onSubmit={handleCreateContract} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end text-xs">
              <Input label="Start Date" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input label="End Date (Optional)" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <Input label="Credit Rate Override (DA)" type="number" step="0.1" value={creditRateOverride} onChange={(e) => setCreditRateOverride(e.target.value)} placeholder="1900" />
              <Input label="Discount Tier" type="text" value={discountTier} onChange={(e) => setDiscountTier(e.target.value)} placeholder="Gold Tier" />

              <div className="space-y-1">
                <label className="font-bold text-[var(--muted)]">Expiry Policy</label>
                <select
                  value={expiryPolicy}
                  onChange={(e) => setExpiryPolicy(e.target.value)}
                  className="w-full p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs outline-none"
                >
                  <option value="rollover">Rollover Unused Credits</option>
                  <option value="use_it_or_lose_it">Use It or Lose It</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--muted)]">Status</label>
                <select
                  value={contractStatus}
                  onChange={(e) => setContractStatus(e.target.value)}
                  className="w-full p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />
                  <span>Auto-Renew</span>
                </label>
              </div>

              <Button type="submit" loading={creatingContract}>
                Create Contract
              </Button>
            </form>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-base font-semibold">Contract History</h3>
            {contracts.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-4">No contracts on file for this organization.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--border)] uppercase text-[var(--muted)] font-bold">
                    <tr>
                      <th className="py-2">Start Date</th>
                      <th className="py-2">End Date</th>
                      <th className="py-2">Rate Override</th>
                      <th className="py-2">Policy</th>
                      <th className="py-2">Auto Renew</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {contracts.map((ct) => (
                      <tr key={ct.id}>
                        <td className="py-2 font-bold">{new Date(ct.startDate).toLocaleDateString()}</td>
                        <td className="py-2">{ct.endDate ? new Date(ct.endDate).toLocaleDateString() : "Open-ended"}</td>
                        <td className="py-2 font-mono">{ct.creditRate ? `${ct.creditRate} DA` : "Standard"}</td>
                        <td className="py-2 capitalize">{ct.expiryPolicy.replace(/_/g, " ")}</td>
                        <td className="py-2">{ct.autoRenew ? "Yes" : "No"}</td>
                        <td className="py-2">
                          <Badge tone={ct.status === "active" ? "success" : ct.status === "draft" ? "warning" : "danger"}>
                            {ct.status.toUpperCase()}
                          </Badge>
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

      {/* TAB 3: Departments */}
      {activeTab === "departments" && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="text-base font-semibold">Create Department</h3>
            <form onSubmit={handleCreateDepartment} className="grid gap-4 sm:grid-cols-3 items-end text-xs">
              <Input label="Department Name" required value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="Engineering" />
              <Input label="Budget Cap (Credits)" type="number" value={deptCap} onChange={(e) => setDeptCap(e.target.value)} placeholder="1000" />
              <Button type="submit" loading={creatingDept}>
                Create Department
              </Button>
            </form>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-base font-semibold">Department Roster & Budget Caps</h3>
            {departments.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-4">No departments created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--border)] uppercase text-[var(--muted)] font-bold">
                    <tr>
                      <th className="py-2">Department Name</th>
                      <th className="py-2">Budget Cap</th>
                      <th className="py-2">Assigned Employees</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {departments.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 font-bold">{d.name}</td>
                        <td className="py-2 font-mono font-bold text-sky-500">
                          {d.budgetCap ? `${d.budgetCap} Credits` : "Unlimited"}
                        </td>
                        <td className="py-2">{d._count?.clients ?? 0} employees</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: Bulk CSV Import */}
      {activeTab === "employees" && (
        <Card className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Bulk Employee CSV Import</h3>
            <p className="text-xs text-[var(--muted)] mt-1">
              Paste CSV text formatted with headers: <code className="font-mono text-sky-500">fullName, email, phone, departmentName, cardCode</code>
            </p>
          </div>

          <form onSubmit={handleBulkImport} className="space-y-4">
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              rows={6}
              placeholder="fullName,email,phone,departmentName&#10;Salim Meziane,salim@company.dz,+213555123456,Engineering&#10;Yassine K,yassine@company.dz,+213555987654,Sales"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />

            <Button type="submit" loading={provisioning}>
              Import & Provision Employee Cards
            </Button>
          </form>

          {importResults && (
            <div className="border-t border-[var(--border)] pt-4 space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wide">Import Outcome Summary</h4>
              <p className="text-xs text-[var(--muted)]">
                Processed {importResults.totalRows} rows: {importResults.validRows} valid, {importResults.errorRows} errors.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* TAB 5: Statements */}
      {activeTab === "statements" && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Generate Monthly Rollup Statement</h3>
              <p className="text-xs text-[var(--muted)] mt-1">
                Consolidate all employee activity charges into a single organization statement invoice.
              </p>
            </div>

            <form onSubmit={handleGenerateStatement} className="grid gap-4 sm:grid-cols-3 items-end">
              <Input label="Start Date" type="date" value={statementStart} onChange={(e) => setStatementStart(e.target.value)} />
              <Input label="End Date" type="date" value={statementEnd} onChange={(e) => setStatementEnd(e.target.value)} />
              <Button type="submit" loading={generatingStatement}>
                Generate Statement
              </Button>
            </form>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-base font-semibold">Invoices & Statement History</h3>
            {org.invoices.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-4">No statements or invoices found.</p>
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
