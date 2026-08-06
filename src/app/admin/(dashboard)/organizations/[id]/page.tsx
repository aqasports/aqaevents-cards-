"use client";

import { useState, useEffect, useCallback, FormEvent, use } from "react";
import Link from "next/link";
import { Alert, Button, Card, Input, PageHeader, Badge, ConfirmModal } from "@/components/admin/ui";

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

type Activity = {
  id: string;
  name: string;
  creditCost: number;
  imageUrl: string | null;
  duration: string | null;
  eventType: string;
};

type Session = {
  id: string;
  sessionDate: string;
  location: string | null;
  activity: Activity;
};

type Redemption = {
  id: string;
  redeemedAt: string;
  creditsUsed: number;
  client: { fullName: string; email: string | null; phone: string | null };
  activity: { name: string; creditCost: number };
  session: { sessionDate: string; location: string | null } | null;
};

type OrganizationDetail = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  allowedActivities: string | null;
  whatsappGroupUrl: string | null;
  commChannel: string | null;
  feedApiKey: string | null;
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allowedActivityIds, setAllowedActivityIds] = useState<string[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "contracts" | "activities" | "pool" | "redemptions" | "departments" | "employees" | "statements" | "cards"
  >("overview");

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState("");
  const [commChannel, setCommChannel] = useState("ads_tunnel");
  const [nif, setNif] = useState("");
  const [nis, setNis] = useState("");
  const [rc, setRc] = useState("");

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

  // Pool Top-Up state
  const [poolDelta, setPoolDelta] = useState<string>("");
  const [poolReason, setPoolReason] = useState("");
  const [adjustingPool, setAdjustingPool] = useState(false);

  // Direct Booking state
  const [selectedClientForBook, setSelectedClientForBook] = useState("");
  const [selectedActivityForBook, setSelectedActivityForBook] = useState("");
  const [selectedSessionForBook, setSelectedSessionForBook] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingInProgress, setBookingInProgress] = useState(false);

  // CSV Import state
  const [bulkInput, setBulkInput] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  // Statements state
  const [statementStart, setStatementStart] = useState("");
  const [statementEnd, setStatementEnd] = useState("");
  const [generatingStatement, setGeneratingStatement] = useState(false);

  // Card Inventory state
  type OrgCard = {
    id: string;
    cardCode: string;
    publicToken: string;
    status: string;
    issuedAt: string;
    clientId: string | null;
    organizationId: string | null;
    client: { id: string; fullName: string; email: string | null; department?: { name: string } | null } | null;
  };
  const [orgCards, setOrgCards] = useState<OrgCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardFilter, setCardFilter] = useState<"all" | "blank" | "assigned">("all");
  const [linkCardId, setLinkCardId] = useState("");
  const [linkEmployeeId, setLinkEmployeeId] = useState("");
  const [linkingCard, setLinkingCard] = useState(false);
  const [unlinkConfirm, setUnlinkConfirm] = useState<{ cardId: string; cardCode: string; employeeName: string } | null>(null);

  // Pool Allocation state
  const [allocClientId, setAllocClientId] = useState("");
  const [allocAmount, setAllocAmount] = useState<string>("");
  const [allocReason, setAllocReason] = useState("");
  const [allocating, setAllocating] = useState(false);
  type PoolAllocation = {
    id: string;
    delta: number;
    reason: string;
    createdAt: string;
    client: { id: string; fullName: string; email: string | null; department?: { name: string } | null } | null;
    card: { id: string; cardCode: string } | null;
  };
  const [poolHistory, setPoolHistory] = useState<PoolAllocation[]>([]);

  const loadOrgData = useCallback(async () => {
    setLoading(true);
    try {
      const [resOrg, resContracts, resDepts, resAct, resRed, resCards, resPoolHist] = await Promise.all([
        fetch(`/api/admin/organizations/${orgId}`),
        fetch(`/api/admin/organizations/${orgId}/contracts`),
        fetch(`/api/admin/organizations/${orgId}/departments`),
        fetch(`/api/admin/organizations/${orgId}/activities`),
        fetch(`/api/admin/organizations/${orgId}/redemptions`),
        fetch(`/api/admin/organizations/${orgId}/cards`),
        fetch(`/api/admin/organizations/${orgId}/pool/history`),
      ]);

      if (resOrg.ok) {
        const data: OrganizationDetail = await resOrg.json();
        setOrg(data);
        setContactName(data.contactName || "");
        setContactEmail(data.contactEmail || "");
        setContactPhone(data.contactPhone || "");
        setBillingAddress(data.billingAddress || "");
        setLogoUrl(data.logoUrl || "");
        setWhatsappGroupUrl(data.whatsappGroupUrl || "");
        setCommChannel(data.commChannel || "ads_tunnel");
        setNif(data.nif || "");
        setNis(data.nis || "");
        setRc(data.rc || "");
      }
      if (resContracts.ok) {
        setContracts(await resContracts.json());
      }
      if (resDepts.ok) {
        setDepartments(await resDepts.json());
      }
      if (resAct.ok) {
        const actData = await resAct.json();
        setActivities(actData.activities || []);
        setAllowedActivityIds(actData.allowedActivityIds || []);
      }
      if (resRed.ok) {
        setRedemptions(await resRed.json());
      }
      if (resCards.ok) {
        setOrgCards(await resCards.json());
      }
      if (resPoolHist.ok) {
        setPoolHistory(await resPoolHist.json());
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

  async function handleSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName,
          contactEmail,
          contactPhone,
          billingAddress,
          logoUrl,
          whatsappGroupUrl,
          commChannel,
          nif: nif || null,
          nis: nis || null,
          rc: rc || null,
        }),
      });
      if (res.ok) {
        setMessage({ text: "Organization profile updated successfully.", tone: "success" });
        setEditingProfile(false);
        await loadOrgData();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || "Failed to update profile", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error updating profile", tone: "danger" });
    }
  }

  async function handleGenerateFeedKey() {
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/feed-key`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setMessage({ text: "Generated new Ad Tunnel Feed API Key.", tone: "success" });
        await loadOrgData();
      }
    } catch {
      setMessage({ text: "Failed to generate feed API key", tone: "danger" });
    }
  }

  async function handleSaveAllowedActivities() {
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/activities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityIds: allowedActivityIds }),
      });
      if (res.ok) {
        setMessage({ text: "Saved allowed activities contract settings.", tone: "success" });
        await loadOrgData();
      }
    } catch {
      setMessage({ text: "Failed to update allowed activities", tone: "danger" });
    }
  }

  async function handleAdjustPool(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdjustingPool(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/pool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delta: Number(poolDelta),
          reason: poolReason,
        }),
      });

      if (res.ok) {
        setMessage({ text: "Adjusted credit pool balance.", tone: "success" });
        setPoolDelta("");
        setPoolReason("");
        await loadOrgData();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to adjust pool.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error adjusting pool.", tone: "danger" });
    } finally {
      setAdjustingPool(false);
    }
  }

  async function handleDirectBook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBookingInProgress(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/redemptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientForBook,
          activityId: selectedActivityForBook,
          sessionId: selectedSessionForBook || undefined,
          notes: bookingNotes,
        }),
      });

      if (res.ok) {
        setMessage({ text: "Successfully redeemed & booked employee to event session.", tone: "success" });
        setSelectedClientForBook("");
        setSelectedActivityForBook("");
        setSelectedSessionForBook("");
        setBookingNotes("");
        await loadOrgData();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to book employee.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error during booking.", tone: "danger" });
    } finally {
      setBookingInProgress(false);
    }
  }

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

  const feedUrl = typeof window !== "undefined" && org.feedApiKey ? `${window.location.origin}/api/public/b2b/events?apiKey=${org.feedApiKey}` : "";

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={org.name}
        description={`Slug: ${org.slug} · NIF: ${org.nif || "N/A"} · NIS: ${org.nis || "N/A"} · RC: ${org.rc || "N/A"}`}
        action={
          <Link href="/admin/organizations">
            <Button variant="secondary">Back to Organizations</Button>
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
            Profile & Overview
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
            onClick={() => setActiveTab("activities")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "activities"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Allowed Activities ({allowedActivityIds.length})
          </button>
          <button
            onClick={() => setActiveTab("pool")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "pool"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Shared Pool ({org.sharedCreditPool} cred)
          </button>
          <button
            onClick={() => setActiveTab("redemptions")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "redemptions"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Redemptions & Booking ({redemptions.length})
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
            CSV Bulk Import ({org.clients.length})
          </button>
          <button
            onClick={() => setActiveTab("cards")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "cards"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Card Inventory ({orgCards.length})
          </button>
          <button
            onClick={() => setActiveTab("statements")}
            className={`py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "statements"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Invoices ({org.invoices.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: Profile & Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
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
            <Card>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Communication Channel</h4>
              <p className="mt-1 text-sm font-bold text-sky-400 capitalize">{org.commChannel?.replace(/_/g, " ") || "Ads Tunnel Feed"}</p>
            </Card>
          </div>

          {/* Edit Profile Form */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-semibold">Company Profile & Contact Information</h3>
              <Button variant="secondary" size="sm" onClick={() => setEditingProfile(!editingProfile)}>
                {editingProfile ? "Cancel Edit" : "Edit Profile"}
              </Button>
            </div>

            {editingProfile ? (
              <form onSubmit={handleSaveProfile} className="grid gap-4 sm:grid-cols-2 text-xs">
                <Input label="Contact Person Name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                <Input label="Contact Email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                <Input label="Contact Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                <Input label="Billing Address" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
                <Input label="Company Logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
                <Input label="WhatsApp Group Link" value={whatsappGroupUrl} onChange={(e) => setWhatsappGroupUrl(e.target.value)} placeholder="https://chat.whatsapp.com/..." />
                
                <div className="space-y-1">
                  <label className="font-bold text-[var(--muted)]">Preferred Communication Channel</label>
                  <select
                    value={commChannel}
                    onChange={(e) => setCommChannel(e.target.value)}
                    className="w-full p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs outline-none"
                  >
                    <option value="ads_tunnel">Ad Tunnel Events Feed API</option>
                    <option value="whatsapp">Dedicated WhatsApp Group</option>
                    <option value="app_notification">AQA Event App Notification</option>
                  </select>
                </div>

                <Input label="Tax NIF (15 digits)" value={nif} onChange={(e) => setNif(e.target.value)} maxLength={15} />
                <Input label="Tax NIS (14 digits)" value={nis} onChange={(e) => setNis(e.target.value)} maxLength={14} />
                <Input label="Tax RC (Register)" value={rc} onChange={(e) => setRc(e.target.value)} />

                <div className="sm:col-span-2 pt-2">
                  <Button type="submit" className="w-full">
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-[var(--muted)]">Contact Person:</span>
                  <p className="font-bold">{org.contactName || "—"}</p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Email & Phone:</span>
                  <p className="font-bold">{org.contactEmail || "—"} / {org.contactPhone || "—"}</p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Billing Address:</span>
                  <p className="font-bold">{org.billingAddress || "—"}</p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">WhatsApp Group:</span>
                  <p className="font-bold">{org.whatsappGroupUrl ? <a href={org.whatsappGroupUrl} target="_blank" rel="noreferrer" className="text-sky-400 underline">Open WhatsApp Group</a> : "—"}</p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Legal Tax Numbers:</span>
                  <p className="font-mono">NIF: {org.nif || "N/A"} · NIS: {org.nis || "N/A"} · RC: {org.rc || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Company Logo:</span>
                  <p className="font-bold">{org.logoUrl ? "Configured" : "None"}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Ad Tunnel API Feed Section */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-base font-semibold">Ad Tunnel & Upcoming Events Feed API</h3>
                <p className="text-xs text-[var(--muted)]">External JSON feed for company TV screens, intranet, or ad tunnels.</p>
              </div>
              <Button size="sm" onClick={handleGenerateFeedKey}>
                {org.feedApiKey ? "Rotate API Key" : "Generate Feed API Key"}
              </Button>
            </div>

            {org.feedApiKey ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--muted)]">Public API Feed Endpoint URL:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={feedUrl}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] p-2.5 rounded-xl font-mono text-xs text-sky-400 select-all"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(feedUrl);
                      setMessage({ text: "Copied Ad Tunnel Feed URL to clipboard.", tone: "success" });
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)] py-2">No API key generated yet. Click above to enable the events feed for this organization.</p>
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

      {/* TAB 3: Allowed Activities */}
      {activeTab === "activities" && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <h3 className="text-base font-semibold">Allowed Contract Activities</h3>
              <p className="text-xs text-[var(--muted)]">Select which activities employees of this company are permitted to access and redeem.</p>
            </div>
            <Button size="sm" onClick={handleSaveAllowedActivities}>
              Save Allowed Activities
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {activities.map((act) => {
              const isAllowed = allowedActivityIds.includes(act.id);
              return (
                <div
                  key={act.id}
                  onClick={() => {
                    if (isAllowed) {
                      setAllowedActivityIds(allowedActivityIds.filter((id) => id !== act.id));
                    } else {
                      setAllowedActivityIds([...allowedActivityIds, act.id]);
                    }
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isAllowed ? "bg-[var(--surface-2)] border-[var(--primary)]" : "border-[var(--border)] opacity-60"
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs">{act.name}</h4>
                    <p className="text-[10px] text-[var(--muted)]">{act.creditCost} credits per session</p>
                  </div>
                  <input type="checkbox" checked={isAllowed} readOnly className="rounded" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* TAB 4: Pool */}
      {activeTab === "pool" && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="text-base font-semibold">Shared Pool Balance Management</h3>
            <div className="flex items-center justify-between bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)]">
              <div>
                <span className="text-xs text-[var(--muted)] uppercase font-bold">Current Pool Balance</span>
                <p className="text-2xl font-black text-emerald-500">{org.sharedCreditPool} Credits</p>
              </div>
              <Badge tone={org.useSharedPool ? "success" : "default"}>
                {org.useSharedPool ? "Shared Pool Mode Enabled" : "Individual Mode"}
              </Badge>
            </div>

            <form onSubmit={handleAdjustPool} className="grid gap-4 sm:grid-cols-3 items-end text-xs">
              <Input label="Credits to Add (+) or Deduct (-)" type="number" required value={poolDelta} onChange={(e) => setPoolDelta(e.target.value)} placeholder="e.g. 50 or -10" />
              <Input label="Accounting Reason / Audit Note" required value={poolReason} onChange={(e) => setPoolReason(e.target.value)} placeholder="Quarterly allocation top-up" />
              <Button type="submit" loading={adjustingPool}>
                Top Up / Adjust Pool
              </Button>
            </form>
          </Card>

          {/* Allocate to Employee */}
          {org.useSharedPool && (
            <Card className="space-y-4">
              <h3 className="text-base font-semibold">Allocate Credits to Employee</h3>
              <p className="text-xs text-[var(--muted)]">
                Split credits from the shared pool to an individual employee&apos;s card balance. This creates a ledger entry on their card.
              </p>
              <div className="grid gap-4 sm:grid-cols-4 items-end text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--muted)]">Employee</label>
                  <select
                    value={allocClientId}
                    onChange={(e) => setAllocClientId(e.target.value)}
                    className="w-full p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs outline-none"
                  >
                    <option value="">-- Select Employee --</option>
                    {org.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} {c.cards.length > 0 ? `[${c.cards[0].cardCode}]` : "(No Card)"}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Credits to Allocate"
                  type="number"
                  min={1}
                  value={allocAmount}
                  onChange={(e) => setAllocAmount(e.target.value)}
                  placeholder="e.g. 10"
                />
                <Input
                  label="Reason"
                  value={allocReason}
                  onChange={(e) => setAllocReason(e.target.value)}
                  placeholder="Monthly allocation"
                />
                <Button
                  loading={allocating}
                  disabled={!allocClientId || !allocAmount}
                  onClick={async () => {
                    setAllocating(true);
                    setMessage(null);
                    try {
                      const res = await fetch(`/api/admin/organizations/${orgId}/pool/allocate`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          clientId: allocClientId,
                          amount: Number(allocAmount),
                          reason: allocReason || "Pool allocation",
                        }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setMessage({
                          text: `Allocated ${data.allocatedAmount} credits to ${data.employeeName}. New pool balance: ${data.newPoolBalance}`,
                          tone: "success",
                        });
                        setAllocClientId("");
                        setAllocAmount("");
                        setAllocReason("");
                        await loadOrgData();
                      } else {
                        const err = await res.json();
                        setMessage({ text: err.error || "Failed to allocate credits", tone: "danger" });
                      }
                    } catch {
                      setMessage({ text: "Network error allocating credits", tone: "danger" });
                    } finally {
                      setAllocating(false);
                    }
                  }}
                >
                  Allocate
                </Button>
              </div>
            </Card>
          )}

          {/* Allocation History */}
          {poolHistory.length > 0 && (
            <Card>
              <h3 className="text-base font-semibold mb-3">Pool Allocation History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--border)] uppercase text-[10px] tracking-wider text-[var(--muted)] font-bold">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2">Employee</th>
                      <th className="py-2">Card</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {poolHistory.map((alloc) => (
                      <tr key={alloc.id} className="hover:bg-[var(--surface-2)]/30">
                        <td className="py-2.5 text-[var(--muted)] font-mono">
                          {new Date(alloc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 font-semibold">{alloc.client?.fullName ?? "Unknown"}</td>
                        <td className="py-2.5 font-mono text-[var(--muted)]">{alloc.card?.cardCode ?? "--"}</td>
                        <td className="py-2.5 font-bold text-emerald-500">+{alloc.delta}</td>
                        <td className="py-2.5 text-[var(--muted)]">{alloc.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 5: Redemptions & Direct Booking */}
      {activeTab === "redemptions" && (
        <div className="space-y-6">
          {/* Direct Booking Form */}
          <Card className="space-y-4">
            <h3 className="text-base font-semibold">Direct Employee Event Booking</h3>
            <form onSubmit={handleDirectBook} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--muted)]">Select Employee</label>
                <select
                  required
                  value={selectedClientForBook}
                  onChange={(e) => setSelectedClientForBook(e.target.value)}
                  className="w-full p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs outline-none"
                >
                  <option value="">-- Choose Employee --</option>
                  {org.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.email || c.phone || "No Contact"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--muted)]">Select Activity</label>
                <select
                  required
                  value={selectedActivityForBook}
                  onChange={(e) => setSelectedActivityForBook(e.target.value)}
                  className="w-full p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs outline-none"
                >
                  <option value="">-- Choose Activity --</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.creditCost} cred)
                    </option>
                  ))}
                </select>
              </div>

              <Input label="Notes / Special Instructions" value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} placeholder="VIP Guest booking" />

              <Button type="submit" loading={bookingInProgress}>
                Book Employee
              </Button>
            </form>
          </Card>

          {/* Redemptions Log */}
          <Card className="space-y-4">
            <h3 className="text-base font-semibold">Organization Employee Redemption History</h3>
            {redemptions.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-4">No event redemptions recorded for this organization.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--border)] uppercase text-[var(--muted)] font-bold">
                    <tr>
                      <th className="py-2">Date & Time</th>
                      <th className="py-2">Employee</th>
                      <th className="py-2">Activity</th>
                      <th className="py-2">Credits Used</th>
                      <th className="py-2">Session / Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {redemptions.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 text-[var(--muted)]">{new Date(r.redeemedAt).toLocaleString()}</td>
                        <td className="py-2.5 font-bold">{r.client.fullName}</td>
                        <td className="py-2.5 font-semibold text-sky-400">{r.activity.name}</td>
                        <td className="py-2.5 font-mono">{r.creditsUsed} cred</td>
                        <td className="py-2.5 text-[var(--muted)]">{r.session ? `${new Date(r.session.sessionDate).toLocaleDateString()} (${r.session.location || "TBD"})` : "Walk-in Session"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 6: Departments */}
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

      {/* TAB 7: CSV Bulk Import */}
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

      {/* TAB 8: Statements & Invoices */}
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

      {/* ── CARD INVENTORY TAB ── */}
      {activeTab === "cards" && (
        <div className="space-y-6">

          {/* Unlink confirm modal */}
          <ConfirmModal
            isOpen={!!unlinkConfirm}
            isDanger
            title="Unlink Card"
            message={unlinkConfirm ? `Unlink card ${unlinkConfirm.cardCode} from ${unlinkConfirm.employeeName}? The card will return to blank inventory.` : ""}
            confirmLabel="Unlink"
            onConfirm={async () => {
              if (!unlinkConfirm) return;
              try {
                const res = await fetch(`/api/admin/organizations/${orgId}/cards/unlink`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ cardId: unlinkConfirm.cardId }),
                });
                if (res.ok) {
                  setMessage({ text: `Card ${unlinkConfirm.cardCode} unlinked and returned to inventory.`, tone: "success" });
                  await loadOrgData();
                } else {
                  const err = await res.json();
                  setMessage({ text: err.error || "Failed to unlink", tone: "danger" });
                }
              } catch {
                setMessage({ text: "Network error", tone: "danger" });
              } finally {
                setUnlinkConfirm(null);
              }
            }}
            onCancel={() => setUnlinkConfirm(null)}
          />

          {/* KPI Strip */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Total Cards</p>
              <p className="text-2xl font-black text-[var(--foreground)] font-mono">{orgCards.length}</p>
              <p className="text-[11px] text-[var(--muted)]">In org inventory</p>
            </div>
            <div className="bg-[var(--surface)] border border-amber-500/20 rounded-xl p-4 space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Blank / Available</p>
              <p className="text-2xl font-black text-amber-500 font-mono">{orgCards.filter(c => !c.clientId).length}</p>
              <p className="text-[11px] text-[var(--muted)]">Ready to issue</p>
            </div>
            <div className="bg-[var(--surface)] border border-emerald-500/20 rounded-xl p-4 space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">Assigned</p>
              <p className="text-2xl font-black text-emerald-500 font-mono">{orgCards.filter(c => !!c.clientId).length}</p>
              <p className="text-[11px] text-[var(--muted)]">Active employee cards</p>
            </div>
          </div>

          {/* Generate Cards -- Link to Print QR */}
          <div className="flex items-center gap-4 bg-[var(--surface)] border border-[var(--primary)]/20 rounded-xl p-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--foreground)]">Need to generate new org cards?</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Blank card generation lives in the Print QR page. Click to open it with this organization pre-selected -- cards will use the org-branded prefix automatically.
              </p>
            </div>
            <Link
              href={`/admin/print?org=${orgId}`}
              className="shrink-0 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold text-xs rounded-xl transition flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Open Print QR
            </Link>
          </div>

          {/* Link Card to Employee */}
          <Card>
            <h3 className="font-bold text-sm mb-4">Link Blank Card to Employee</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs font-bold text-[var(--muted)] block mb-1.5">Blank Card</label>
                <select
                  value={linkCardId}
                  onChange={(e) => setLinkCardId(e.target.value)}
                  className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                >
                  <option value="">-- Select blank card --</option>
                  {orgCards.filter(c => !c.clientId && c.status === "active").map(c => (
                    <option key={c.id} value={c.id}>{c.cardCode}</option>
                  ))}
                </select>
                {orgCards.filter(c => !c.clientId && c.status === "active").length === 0 && (
                  <p className="text-[11px] text-amber-500 mt-1">No blank cards available. Generate cards in Print QR first.</p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--muted)] block mb-1.5">Employee</label>
                <select
                  value={linkEmployeeId}
                  onChange={(e) => setLinkEmployeeId(e.target.value)}
                  className="w-full p-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
                >
                  <option value="">-- Select employee --</option>
                  {org.clients.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}{emp.cards.length > 0 ? ` [${emp.cards[0].cardCode}]` : ""}</option>
                  ))}
                </select>
              </div>
              <Button
                loading={linkingCard}
                disabled={!linkCardId || !linkEmployeeId}
                onClick={async () => {
                  setLinkingCard(true);
                  setMessage(null);
                  try {
                    const res = await fetch(`/api/admin/organizations/${orgId}/cards/link`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ cardId: linkCardId, clientId: linkEmployeeId }),
                    });
                    if (res.ok) {
                      setMessage({ text: "Card linked to employee successfully.", tone: "success" });
                      setLinkCardId("");
                      setLinkEmployeeId("");
                      await loadOrgData();
                    } else {
                      const err = await res.json();
                      setMessage({ text: err.error || "Failed to link card", tone: "danger" });
                    }
                  } catch {
                    setMessage({ text: "Network error linking card", tone: "danger" });
                  } finally {
                    setLinkingCard(false);
                  }
                }}
              >
                Link Card
              </Button>
            </div>
          </Card>

          {/* Card List */}
          <Card padding={false}>
            {/* Table header + filter tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-[var(--border)]">
              <h3 className="font-bold text-sm text-[var(--foreground)]">
                Card Inventory
                <span className="ml-2 text-[var(--muted)] font-normal text-xs">({orgCards.length} total)</span>
              </h3>
              <div className="flex gap-1 bg-[var(--surface-2)] rounded-lg p-1">
                {(["all", "blank", "assigned"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setCardFilter(f)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition ${
                      cardFilter === f
                        ? "bg-[var(--primary)] text-white shadow"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {f === "all" ? `All (${orgCards.length})` : f === "blank" ? `Blank (${orgCards.filter(c => !c.clientId).length})` : `Assigned (${orgCards.filter(c => !!c.clientId).length})`}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const filtered = orgCards.filter(c =>
                cardFilter === "all" ? true : cardFilter === "blank" ? !c.clientId : !!c.clientId
              );
              if (filtered.length === 0) {
                return (
                  <div className="py-12 text-center">
                    <svg className="h-10 w-10 mx-auto text-[var(--muted)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    <p className="text-sm font-semibold text-[var(--foreground)]">No {cardFilter === "all" ? "" : cardFilter} cards found</p>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {cardFilter === "blank" ? "All cards are assigned to employees." : cardFilter === "assigned" ? "No cards have been assigned yet." : "Generate cards in Print QR to get started."}
                    </p>
                  </div>
                );
              }
              return (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold">
                        <tr>
                          <th className="px-4 py-3">Card Code</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Assigned To</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Issued</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {filtered.map((card) => (
                          <tr key={card.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-[var(--foreground)] text-xs tracking-wider">{card.cardCode}</td>
                            <td className="px-4 py-3">
                              <Badge tone={card.clientId ? "success" : "warning"}>
                                {card.clientId ? "Assigned" : "Blank"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {card.client?.fullName || <span className="text-[var(--muted)] italic text-xs">Unassigned</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-[var(--muted)]">
                              {card.client?.department?.name || "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-[var(--muted)] font-mono">
                              {new Date(card.issuedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {card.clientId ? (
                                <button
                                  onClick={() => setUnlinkConfirm({ cardId: card.id, cardCode: card.cardCode, employeeName: card.client?.fullName ?? "" })}
                                  className="text-xs text-[var(--danger)] hover:text-red-300 font-bold transition"
                                >
                                  Unlink
                                </button>
                              ) : (
                                <span className="text-xs text-[var(--muted)]">Available</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card stack */}
                  <div className="md:hidden divide-y divide-[var(--border)]">
                    {filtered.map((card) => (
                      <div key={card.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-bold text-xs text-[var(--foreground)] tracking-wider">{card.cardCode}</p>
                          <p className="text-sm text-[var(--foreground)] mt-0.5 truncate">
                            {card.client?.fullName || <span className="text-[var(--muted)] italic text-xs">Unassigned</span>}
                          </p>
                          {card.client?.department && (
                            <p className="text-[11px] text-[var(--muted)]">{card.client.department.name}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge tone={card.clientId ? "success" : "warning"} size="sm">
                            {card.clientId ? "Assigned" : "Blank"}
                          </Badge>
                          {card.clientId && (
                            <button
                              onClick={() => setUnlinkConfirm({ cardId: card.id, cardCode: card.cardCode, employeeName: card.client?.fullName ?? "" })}
                              className="text-xs text-[var(--danger)] font-bold"
                            >
                              Unlink
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </Card>
        </div>
      )}
    </div>
  );
}
