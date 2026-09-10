"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader, StatCard, Card, Badge, Button, Input } from "@/components/admin/ui";
import { calculateSwimPrice, SwimCategory, SwimDuration, SwimFrequency } from "@/lib/swim-pricing";

interface SwimPaymentItem {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  paidAt: string;
}

interface SwimMember {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  dateOfStart: string;
  category: string;
  level: string;
  formula: string;
  duration: string | null;
  priceDA: number;
  coachMessage: string | null;
  paymentStatus: "unpaid" | "paid" | "partial";
  groupStatus: "proposed" | "accepted" | "rejected";
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  group: {
    id: string;
    name: string;
    coachName: string | null;
    schedule: string;
    level?: string;
  } | null;
  card: {
    id: string;
    cardCode: string;
    publicToken: string;
    status: string;
  } | null;
  payments: SwimPaymentItem[];
}

interface SwimLead {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  category: string;
  level: string;
  frequency: string;
  formula: string;
  duration: string;
  preferredDays: string | null;
  notes: string | null;
  status: "pending" | "called" | "confirmed" | "rejected";
  createdAt: string;
}

interface SwimGroup {
  id: string;
  name: string;
  level: string;
  coachName: string | null;
  schedule: string;
  capacity: number;
}

interface SwimCardItem {
  id: string;
  cardCode: string;
  publicToken: string;
  status: string;
  memberId: string | null;
  member?: {
    fullName: string;
    swimId: string;
  } | null;
}

export default function SwimOverviewPage() {
  const [activeTab, setActiveTab] = useState<"confirmed" | "leads" | "groups" | "cards" | "sectors">("confirmed");
  const [loading, setLoading] = useState(true);

  // Data States
  const [members, setMembers] = useState<SwimMember[]>([]);
  const [leads, setLeads] = useState<SwimLead[]>([]);
  const [groups, setGroups] = useState<SwimGroup[]>([]);
  const [cards, setCards] = useState<SwimCardItem[]>([]);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("pending");

  // Profile Dossier Modal
  const [viewingMember, setViewingMember] = useState<SwimMember | null>(null);

  // Add Member Modal (Phone strictly optional)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [dateOfStart, setDateOfStart] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<SwimCategory>("homme");
  const [level, setLevel] = useState("beginner");
  const [frequency, setFrequency] = useState<SwimFrequency>("1x");
  const [formula, setFormula] = useState("G10");
  const [duration, setDuration] = useState<SwimDuration>("3m");
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [groupId, setGroupId] = useState("");
  const [coachMessage, setCoachMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [issueCard, setIssueCard] = useState(true);
  const [cardCode, setCardCode] = useState("");
  const [submittingAddMember, setSubmittingAddMember] = useState(false);
  const [addMemberSuccess, setAddMemberSuccess] = useState<string | null>(null);

  // Quick Payment Modal
  const [payingMember, setPayingMember] = useState<SwimMember | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Promote Lead Modal
  const [promotingLead, setPromotingLead] = useState<SwimLead | null>(null);
  const [promoteGroupId, setPromoteGroupId] = useState("");
  const [promoteCoachMessage, setPromoteCoachMessage] = useState("");
  const [promoteIssueCard, setPromoteIssueCard] = useState(true);
  const [promoteCardCode, setPromoteCardCode] = useState("");
  const [submittingPromote, setSubmittingPromote] = useState(false);

  // Quick Add Lead Modal
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadFullName, setNewLeadFullName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadCategory, setNewLeadCategory] = useState("homme");
  const [newLeadLevel, setNewLeadLevel] = useState("beginner");
  const [newLeadFrequency, setNewLeadFrequency] = useState("1x");
  const [newLeadFormula, setNewLeadFormula] = useState("G10");
  const [newLeadDuration, setNewLeadDuration] = useState("3m");
  const [newLeadPreferredDays, setNewLeadPreferredDays] = useState("");
  const [newLeadNotes, setNewLeadNotes] = useState("");
  const [submittingAddLead, setSubmittingAddLead] = useState(false);

  // Edit Coach Message on the fly
  const [editingCoachMessageId, setEditingCoachMessageId] = useState<string | null>(null);
  const [editCoachMessageText, setEditCoachMessageText] = useState("");
  const [savingCoachMessage, setSavingCoachMessage] = useState(false);

  // Copy Alert state
  const [copiedLink, setCopiedLink] = useState(false);

  async function loadAllData() {
    setLoading(true);
    try {
      const [memsRes, leadsRes, grpsRes, cardsRes] = await Promise.all([
        fetch("/api/admin/swim/members"),
        fetch("/api/admin/swim/leads?status=all"),
        fetch("/api/admin/swim/groups"),
        fetch("/api/admin/swim/cards?filter=all"),
      ]);

      if (memsRes.ok) setMembers(await memsRes.json());
      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (grpsRes.ok) setGroups(await grpsRes.json());
      if (cardsRes.ok) setCards(await cardsRes.json());
    } catch (err) {
      console.error("Failed to load swim manager data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  // Update computed price for add member form
  const computedPrice = priceOverride
    ? parseInt(priceOverride, 10)
    : calculateSwimPrice(category, formula, duration, frequency);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        m.fullName.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        m.swimId.toLowerCase().includes(q) ||
        (m.card?.cardCode && m.card.cardCode.toLowerCase().includes(q)) ||
        (m.group?.name && m.group.name.toLowerCase().includes(q));

      const matchLevel = levelFilter === "all" || m.level === levelFilter;
      const matchCategory = categoryFilter === "all" || m.category === categoryFilter;
      const matchPayment = paymentFilter === "all" || m.paymentStatus === paymentFilter;

      return matchSearch && matchLevel && matchCategory && matchPayment;
    });
  }, [members, searchTerm, levelFilter, categoryFilter, paymentFilter]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchStatus = leadStatusFilter === "all" || l.status === leadStatusFilter;
      if (!matchStatus) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        l.fullName.toLowerCase().includes(q) ||
        (l.phone && l.phone.includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q))
      );
    });
  }, [leads, leadStatusFilter, searchTerm]);

  // Financial calculations
  const totalRevenueExpected = members.reduce((sum, m) => sum + (m.priceDA || 0), 0);
  const totalRevenueCollected = members.reduce(
    (sum, m) => sum + (m.payments ? m.payments.reduce((pSum, p) => pSum + p.amount, 0) : 0),
    0
  );
  const pendingLeadsCount = leads.filter((l) => l.status === "pending").length;

  // Handle Add Member Submit (Phone Optional!)
  async function handleAddMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingAddMember(true);
    try {
      const res = await fetch("/api/admin/swim/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone, // Optional
          email,
          photoUrl,
          dateOfStart,
          category,
          level,
          frequency,
          formula,
          duration,
          priceDA: computedPrice,
          groupId: groupId || null,
          coachMessage,
          notes,
          issueCard,
          cardCode,
        }),
      });

      if (res.ok) {
        const newMember = await res.json();
        setAddMemberSuccess(`Swimmer registered successfully! ID: ${newMember.swimId}`);
        setTimeout(() => {
          setAddMemberSuccess(null);
          setShowAddMemberModal(false);
          // Reset form
          setFullName("");
          setPhone("");
          setEmail("");
          setPhotoUrl("");
          setCoachMessage("");
          setNotes("");
          setCardCode("");
          loadAllData();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAddMember(false);
    }
  }

  // Handle Add Payment
  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payingMember) return;
    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/admin/swim/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: payingMember.id,
          amount: paymentAmount,
          method: paymentMethod,
          notes: paymentNotes,
        }),
      });

      if (res.ok) {
        setPayingMember(null);
        setPaymentAmount("");
        setPaymentNotes("");
        await loadAllData();
        if (viewingMember && viewingMember.id === payingMember.id) {
          const updated = members.find((m) => m.id === payingMember.id);
          if (updated) setViewingMember(updated);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPayment(false);
    }
  }

  // Handle Lead Status Change
  async function handleUpdateLeadStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/swim/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Handle Promote Lead to Confirmed Member
  async function handlePromoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!promotingLead) return;
    setSubmittingPromote(true);

    try {
      const res = await fetch("/api/admin/swim/leads/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: promotingLead.id,
          groupId: promoteGroupId || null,
          coachMessage: promoteCoachMessage || null,
          issueCard: promoteIssueCard,
          cardCode: promoteCardCode || null,
        }),
      });

      if (res.ok) {
        setPromotingLead(null);
        setPromoteGroupId("");
        setPromoteCoachMessage("");
        setPromoteCardCode("");
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPromote(false);
    }
  }

  // Handle Quick Add Lead
  async function handleAddLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingAddLead(true);
    try {
      const res = await fetch("/api/admin/swim/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newLeadFullName,
          phone: newLeadPhone,
          email: newLeadEmail,
          category: newLeadCategory,
          level: newLeadLevel,
          frequency: newLeadFrequency,
          formula: newLeadFormula,
          duration: newLeadDuration,
          preferredDays: newLeadPreferredDays,
          notes: newLeadNotes,
        }),
      });

      if (res.ok) {
        setShowAddLeadModal(false);
        setNewLeadFullName("");
        setNewLeadPhone("");
        setNewLeadEmail("");
        setNewLeadNotes("");
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAddLead(false);
    }
  }

  // Quick Save Coach Message
  async function handleSaveCoachMessage(memberId: string) {
    setSavingCoachMessage(true);
    try {
      const res = await fetch(`/api/admin/swim/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachMessage: editCoachMessageText }),
      });
      if (res.ok) {
        setEditingCoachMessageId(null);
        await loadAllData();
        if (viewingMember && viewingMember.id === memberId) {
          setViewingMember((prev) => (prev ? { ...prev, coachMessage: editCoachMessageText } : null));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCoachMessage(false);
    }
  }

  // Generate WhatsApp Message for Confirmed Member
  function getWhatsAppUrl(member: SwimMember) {
    if (!member.phone) return null;
    const cleanPhone = member.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `213${cleanPhone.slice(1)}` : cleanPhone;
    const groupText = member.group ? `${member.group.name} (${member.group.schedule})` : "En attente d'affectation";
    const coachText = member.group?.coachName ? `Coach: ${member.group.coachName}` : "";
    const portalUrl = `https://aqasports.pro/swim/profile/${member.swimId}`;

    const text = encodeURIComponent(
      `Salam ${member.fullName},\n\n` +
      `Votre inscription AQA Swim est confirmee.\n` +
      `Identifiant Nageur: ${member.swimId}\n` +
      `Groupe: ${groupText}\n` +
      `${coachText ? coachText + "\n" : ""}` +
      `Consultez votre profil et badge en ligne ici:\n${portalUrl}\n\n` +
      `A tres bientot au bassin!\nEquipe AQA Sports`
    );

    return `https://wa.me/${formattedPhone}?text=${text}`;
  }

  // Export Confirmed Swimmers to CSV
  function handleExportCSV() {
    const headers = [
      "Swimmer ID",
      "Full Name",
      "Phone",
      "Email",
      "Category",
      "Level",
      "Formula",
      "Duration",
      "Price DA",
      "Group",
      "Coach",
      "Payment Status",
      "Group Status",
      "Date of Start",
    ];

    const rows = filteredMembers.map((m) => [
      m.swimId,
      `"${m.fullName.replace(/"/g, '""')}"`,
      `"${m.phone || ""}"`,
      `"${m.email || ""}"`,
      m.category,
      m.level,
      m.formula,
      m.duration || "3m",
      m.priceDA,
      `"${m.group?.name || "Unassigned"}"`,
      `"${m.group?.coachName || ""}"`,
      m.paymentStatus,
      m.groupStatus,
      new Date(m.dateOfStart).toLocaleDateString("fr-DZ"),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aqa_swim_members_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Operational Sectors Hub definitions
  const sectors = [
    {
      title: "1. New Clients Lead (Wait List)",
      desc: "Process wait list demands from aqasports.com. Call, assign groups, and confirm new swimmers.",
      href: "/admin/swim/leads",
      badge: pendingLeadsCount > 0 ? `${pendingLeadsCount} Pending` : "Up to date",
      badgeTone: pendingLeadsCount > 0 ? ("warning" as const) : ("success" as const),
      actionText: "Manage Leads",
    },
    {
      title: "2. Swimmer Profiles & Ledger",
      desc: "Manage confirmed profiles, solid group proposals, personal coach notes, and payment records.",
      href: "/admin/swim/members",
      badge: `${members.length} Swimmers`,
      badgeTone: "info" as const,
      actionText: "Manage Profiles",
    },
    {
      title: "3. Training Groups Manager",
      desc: "Configure weekly training time slots, coach rosters, capacity caps, and view enrolled swimmers.",
      href: "/admin/swim/groups",
      badge: `${groups.length} Groups`,
      badgeTone: "info" as const,
      actionText: "Manage Groups",
    },
    {
      title: "4. PVC Pass QR Generator",
      desc: "Generate blank PVC card batches (SWM-000001), export print sheets, and link cards to swimmers.",
      href: "/admin/swim/cards",
      badge: `${cards.length} PVC Cards`,
      badgeTone: "info" as const,
      actionText: "Generate & Print",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AQA Swim Inscription Manager"
        description="Comprehensive operational hub for managing swim inscriptions, confirmed client profiles, solid groups, and PVC pass cards."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setShowAddMemberModal(true)}
              variant="primary"
            >
              + Add Swimmer
            </Button>
            <Button
              onClick={() => setShowAddLeadModal(true)}
              variant="secondary"
            >
              + New Lead
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="secondary"
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Confirmed Swimmers"
          value={members.length}
          animated
          hint="Registered clients & active profiles"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <StatCard
          label="Pending Waitlist Leads"
          value={pendingLeadsCount}
          animated
          hint="Clients to call & confirm"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Active Groups"
          value={groups.length}
          animated
          hint="Configured training slots"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatCard
          label="Revenue Collected"
          value={`${totalRevenueCollected.toLocaleString("fr-DZ")} DA`}
          hint={`Of ${totalRevenueExpected.toLocaleString("fr-DZ")} DA total expected`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] gap-1">
          <button
            onClick={() => setActiveTab("confirmed")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "confirmed"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>Confirmed Swimmers & Profiles</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-950 text-sky-300 border border-sky-800/40">
              {members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("leads")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "leads"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>Waitlist Demands</span>
            {pendingLeadsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-800/40">
                {pendingLeadsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("groups")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "groups"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            Training Groups ({groups.length})
          </button>

          <button
            onClick={() => setActiveTab("cards")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "cards"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            PVC Cards ({cards.length})
          </button>

          <button
            onClick={() => setActiveTab("sectors")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "sectors"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            Sectors Hub
          </button>
        </div>

        {/* Global Search */}
        {(activeTab === "confirmed" || activeTab === "leads") && (
          <div className="w-full sm:w-72">
            <Input
              placeholder={activeTab === "confirmed" ? "Search name, phone, Swimmer ID..." : "Search leads..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* TAB 1: CONFIRMED SWIMMERS & PROFILES */}
      {activeTab === "confirmed" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Categories</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
              <option value="enfants">Enfants</option>
              <option value="apnea">Apnee</option>
            </select>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Debutante</option>
              <option value="intermediate">Intermediaire</option>
              <option value="advanced">Avance</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>

            <span className="text-xs text-[var(--muted)] ml-auto">
              Showing {filteredMembers.length} of {members.length} registered swimmers
            </span>
          </div>

          {/* Confirmed Swimmers Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                    <th className="py-3 px-4">Swimmer ID</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Level & Formula</th>
                    <th className="py-3 px-4">Solid Group</th>
                    <th className="py-3 px-4">Client Status</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">PVC Pass</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                        Loading confirmed swimmers...
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                        No swimmers found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => {
                      const waUrl = getWhatsAppUrl(m);
                      return (
                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-mono">
                            <button
                              onClick={() => setViewingMember(m)}
                              className="text-cyan-400 font-bold hover:underline inline-flex items-center gap-1"
                              title="Inspect Full Profile Dossier"
                            >
                              <span>{m.swimId}</span>
                            </button>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {m.photoUrl ? (
                                <img
                                  src={m.photoUrl}
                                  alt=""
                                  className="h-8 w-8 rounded-lg object-cover border border-white/10"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-sky-950 text-sky-400 font-bold flex items-center justify-center text-[10px] border border-sky-800/40 shrink-0">
                                  {m.fullName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-white">{m.fullName}</div>
                                <div className="text-[11px] text-[var(--muted)] flex items-center gap-2">
                                  {m.phone ? (
                                    <span className="font-mono text-cyan-400/90">{m.phone}</span>
                                  ) : (
                                    <span className="italic text-slate-500">No phone</span>
                                  )}
                                  <span className="capitalize text-slate-400">· {m.category}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200 capitalize">
                              {m.level}
                            </div>
                            <div className="text-[11px] text-[var(--muted)]">
                              {m.formula} ({m.duration || "3m"})
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {m.group ? (
                              <div>
                                <div className="font-semibold text-white">{m.group.name}</div>
                                <div className="text-[10px] text-cyan-400">
                                  {m.group.coachName ? `Coach: ${m.group.coachName}` : m.group.schedule}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[var(--muted)] italic">Unassigned</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {m.groupStatus === "accepted" && <Badge tone="success">Confirmed</Badge>}
                            {m.groupStatus === "proposed" && <Badge tone="warning">Proposed</Badge>}
                            {m.groupStatus === "rejected" && <Badge tone="danger">Rejected</Badge>}
                          </td>

                          <td className="py-3 px-4">
                            <div>
                              {m.paymentStatus === "paid" && <Badge tone="success">Paid</Badge>}
                              {m.paymentStatus === "partial" && <Badge tone="warning">Partial</Badge>}
                              {m.paymentStatus === "unpaid" && <Badge tone="danger">Unpaid</Badge>}
                              <div className="text-[10px] text-[var(--muted)] font-mono mt-0.5">
                                {m.priceDA.toLocaleString("fr-DZ")} DA
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px]">
                            {m.card ? (
                              <Link
                                href={`/swim/card/${m.card.publicToken}`}
                                target="_blank"
                                className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                              >
                                <span>{m.card.cardCode}</span>
                                <span className="text-[9px]">↗</span>
                              </Link>
                            ) : (
                              <span className="text-[var(--muted)]">No card</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors"
                                title="Send WhatsApp Confirmation & Profile Link"
                              >
                                WhatsApp
                              </a>
                            )}

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setPayingMember(m);
                                setPaymentAmount(String(m.priceDA));
                              }}
                            >
                              + Pay
                            </Button>

                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => setViewingMember(m)}
                            >
                              Profile
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: WAITLIST & INCOMING DEMANDS */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] gap-1">
              {["pending", "called", "confirmed", "rejected", "all"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLeadStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    leadStatusFilter === tab
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <Button onClick={() => setShowAddLeadModal(true)} variant="primary" size="sm">
              + New Lead
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Category & Level</th>
                    <th className="py-3 px-4">Formula</th>
                    <th className="py-3 px-4">Preferred Days</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Received</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                        Loading wait list...
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                        No waitlist leads found.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, "") : "";
                      const formattedPhone = cleanPhone.startsWith("0") ? `213${cleanPhone.slice(1)}` : cleanPhone;
                      const waLeadUrl = cleanPhone
                        ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
                            `Salam ${lead.fullName}, nous vous contactons concernant votre demande d'inscription AQA Swim (${lead.formula}). Êtes-vous disponible pour finaliser votre groupe ?`
                          )}`
                        : null;

                      return (
                        <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{lead.fullName}</div>
                            <div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-0.5">
                              {lead.phone ? (
                                <a href={`tel:${lead.phone}`} className="text-cyan-400 hover:underline font-mono">
                                  {lead.phone}
                                </a>
                              ) : (
                                <span className="italic text-slate-500">No phone</span>
                              )}
                              {lead.email && <span>· {lead.email}</span>}
                            </div>
                            {lead.notes && (
                              <div className="text-[10px] text-amber-300/80 mt-1 italic">
                                &ldquo;{lead.notes}&rdquo;
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="capitalize font-semibold text-slate-200">{lead.category}</div>
                            <div className="text-[11px] text-[var(--muted)] capitalize">{lead.level}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200">{lead.formula}</div>
                            <div className="text-[11px] text-[var(--muted)]">
                              {lead.frequency} · {lead.duration}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-[var(--muted)]">{lead.preferredDays || "—"}</td>

                          <td className="py-3 px-4">
                            {lead.status === "pending" && <Badge tone="warning">Pending</Badge>}
                            {lead.status === "called" && <Badge tone="info">Called</Badge>}
                            {lead.status === "confirmed" && <Badge tone="success">Confirmed</Badge>}
                            {lead.status === "rejected" && <Badge tone="danger">Rejected</Badge>}
                          </td>

                          <td className="py-3 px-4 text-[var(--muted)] font-mono">
                            {new Date(lead.createdAt).toLocaleDateString("fr-DZ")}
                          </td>

                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {waLeadUrl && (
                              <a
                                href={waLeadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors"
                              >
                                WhatsApp
                              </a>
                            )}

                            {lead.status === "pending" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleUpdateLeadStatus(lead.id, "called")}
                              >
                                Called
                              </Button>
                            )}

                            {lead.status !== "confirmed" && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setPromotingLead(lead);
                                  setPromoteGroupId("");
                                  setPromoteCoachMessage("");
                                }}
                              >
                                Confirm & Link
                              </Button>
                            )}

                            {lead.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleUpdateLeadStatus(lead.id, "rejected")}
                              >
                                Reject
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: TRAINING GROUPS */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Active Swim Groups ({groups.length})
            </h3>
            <Link
              href="/admin/swim/groups"
              className="text-xs text-cyan-400 hover:underline font-semibold"
            >
              Open Full Groups Manager →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => {
              const enrolledCount = members.filter((m) => m.group?.id === g.id).length;
              const capPercent = Math.min(100, Math.round((enrolledCount / (g.capacity || 20)) * 100));

              return (
                <div
                  key={g.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-white text-sm">{g.name}</h4>
                      <Badge tone={enrolledCount >= g.capacity ? "danger" : "info"}>
                        {enrolledCount} / {g.capacity || 20}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-300 mt-1">
                      {g.coachName ? `Coach: ${g.coachName}` : "Coach unassigned"}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      Schedule: {g.schedule}
                    </div>

                    {/* Capacity Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            capPercent > 90 ? "bg-rose-500" : capPercent > 60 ? "bg-amber-500" : "bg-cyan-400"
                          }`}
                          style={{ width: `${capPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--muted)] font-mono">
                        <span>Occupancy</span>
                        <span>{capPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/admin/swim/groups`}
                    className="block text-center py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 transition-colors"
                  >
                    View Group Roster
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: PVC CARDS */}
      {activeTab === "cards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                PVC QR Card Inventory ({cards.length} Generated)
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Assigned: {cards.filter((c) => c.memberId).length} · Blank Available:{" "}
                {cards.filter((c) => !c.memberId).length}
              </p>
            </div>
            <Link
              href="/admin/swim/cards"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold"
            >
              Batch Generate & Print →
            </Link>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                    <th className="py-3 px-4">Card Code</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Linked Swimmer</th>
                    <th className="py-3 px-4 text-right">Pass Portal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {cards.slice(0, 30).map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">{c.cardCode}</td>
                      <td className="py-3 px-4">
                        <Badge tone={c.status === "active" ? "success" : "danger"}>{c.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        {c.member ? (
                          <div className="font-semibold text-white">
                            {c.member.fullName} ({c.member.swimId})
                          </div>
                        ) : (
                          <span className="italic text-slate-500">Unassigned (Blank inventory)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <Link
                          href={`/swim/card/${c.publicToken}`}
                          target="_blank"
                          className="text-cyan-400 hover:underline"
                        >
                          Open Pass ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: SECTORS OVERVIEW */}
      {activeTab === "sectors" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sectors.map((sec) => (
            <div
              key={sec.title}
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md p-6 shadow-sm hover:shadow-[var(--shadow-glow)] hover:border-[var(--primary)]/40 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-base font-bold text-white">{sec.title}</h2>
                  <Badge tone={sec.badgeTone}>{sec.badge}</Badge>
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed mb-6">{sec.desc}</p>
              </div>

              <Link
                href={sec.href}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-[var(--primary)] hover:text-white text-cyan-400 font-semibold text-xs border border-white/5 transition-all duration-200"
              >
                <span>{sec.actionText}</span>
                <span>→</span>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ─── FULL SWIMMER PROFILE DOSSIER MODAL ───────────────────────── */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-2xl w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {viewingMember.photoUrl ? (
                  <img
                    src={viewingMember.photoUrl}
                    alt=""
                    className="h-14 w-14 rounded-2xl object-cover border border-cyan-400/40"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-slate-950 font-black text-xl flex items-center justify-center">
                    {viewingMember.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{viewingMember.fullName}</h3>
                    <Badge tone="info">{viewingMember.swimId}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    {viewingMember.phone ? (
                      <span className="font-mono text-cyan-400">{viewingMember.phone}</span>
                    ) : (
                      <span className="italic text-slate-500">No phone provided</span>
                    )}
                    {viewingMember.email && <span>· {viewingMember.email}</span>}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setViewingMember(null)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Profile Overview Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Category</span>
                <p className="text-xs font-bold text-white capitalize mt-0.5">{viewingMember.category}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Level</span>
                <p className="text-xs font-bold text-white capitalize mt-0.5">{viewingMember.level}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Formula</span>
                <p className="text-xs font-bold text-cyan-300 mt-0.5">
                  {viewingMember.formula} ({viewingMember.duration || "3m"})
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Start Date</span>
                <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                  {new Date(viewingMember.dateOfStart).toLocaleDateString("fr-DZ")}
                </p>
              </div>
            </div>

            {/* Solid Group Card */}
            <div className="p-4 rounded-xl bg-slate-800/70 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Assigned Solid Group
                </span>
                {viewingMember.groupStatus === "accepted" && <Badge tone="success">Confirmed & Accepted</Badge>}
                {viewingMember.groupStatus === "proposed" && <Badge tone="warning">Awaiting Confirmation</Badge>}
                {viewingMember.groupStatus === "rejected" && <Badge tone="danger">Change Requested</Badge>}
              </div>

              {viewingMember.group ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Group:</span>
                    <span className="font-bold text-white">{viewingMember.group.name}</span>
                  </div>
                  {viewingMember.group.coachName && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coach:</span>
                      <span className="font-semibold text-cyan-300">{viewingMember.group.coachName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Weekly Schedule:</span>
                    <span className="text-slate-200">{viewingMember.group.schedule}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs italic text-slate-400">No solid group assigned yet.</p>
              )}
            </div>

            {/* Word From Coach */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  Word From Your Coach
                </span>
                {editingCoachMessageId !== viewingMember.id && (
                  <button
                    onClick={() => {
                      setEditingCoachMessageId(viewingMember.id);
                      setEditCoachMessageText(viewingMember.coachMessage || "");
                    }}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingCoachMessageId === viewingMember.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editCoachMessageText}
                    onChange={(e) => setEditCoachMessageText(e.target.value)}
                    rows={3}
                    placeholder="e.g. Bienvenue dans l'equipe! On commence lundi..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCoachMessageId(null)}
                      className="px-3 py-1 rounded-lg bg-slate-800 text-xs text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingCoachMessage}
                      onClick={() => handleSaveCoachMessage(viewingMember.id)}
                      className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs italic text-slate-200 leading-relaxed">
                  {viewingMember.coachMessage
                    ? `“${viewingMember.coachMessage}”`
                    : "No personal coach note added yet."}
                </p>
              )}
            </div>

            {/* Financial Ledger & Payments */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Financial Ledger
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Total: {viewingMember.priceDA.toLocaleString("fr-DZ")} DA · Paid:{" "}
                    {(viewingMember.payments
                      ? viewingMember.payments.reduce((s, p) => s + p.amount, 0)
                      : 0
                    ).toLocaleString("fr-DZ")}{" "}
                    DA
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPayingMember(viewingMember);
                    setPaymentAmount(String(viewingMember.priceDA));
                  }}
                >
                  + Add Payment
                </Button>
              </div>

              {viewingMember.payments && viewingMember.payments.length > 0 ? (
                <div className="divide-y divide-white/5 max-h-32 overflow-y-auto">
                  {viewingMember.payments.map((p) => (
                    <div key={p.id} className="py-2 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-emerald-400 font-bold">+{p.amount.toLocaleString("fr-DZ")} DA</span>
                        <span className="text-slate-400 ml-2 capitalize">({p.method})</span>
                        {p.notes && <span className="text-slate-500 ml-2">- {p.notes}</span>}
                      </div>
                      <span className="text-slate-500 text-[11px]">
                        {new Date(p.paidAt).toLocaleDateString("fr-DZ")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic text-slate-400">No payment receipts logged yet.</p>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              <div className="flex flex-wrap gap-2">
                {getWhatsAppUrl(viewingMember) && (
                  <a
                    href={getWhatsAppUrl(viewingMember)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>Send WhatsApp Invite</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://aqasports.pro/swim/profile/${viewingMember.swimId}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs border border-white/10 transition-colors"
                >
                  {copiedLink ? "Copied Link!" : "Copy Portal URL"}
                </button>

                <Link
                  href={`/swim/profile/${viewingMember.swimId}`}
                  target="_blank"
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-white/10 transition-colors"
                >
                  Open Client Portal ↗
                </Link>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewingMember(null)}
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD SWIMMER MODAL (PHONE NOT REQUIRED) ───────────────────── */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Add Swimmer Profile</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register a confirmed swimmer. Phone is optional. System automatically creates Swimmer ID (SWM-XXXXXX).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {addMemberSuccess && (
              <div className="mt-3 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center shrink-0">
                {addMemberSuccess}
              </div>
            )}

            <form onSubmit={handleAddMemberSubmit} className="flex flex-col flex-1 min-h-0 mt-3">
              <div className="overflow-y-auto flex-1 pr-1.5 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <Input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Amina Khelifi"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Phone (Optional)
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0661234567 (Optional)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Date of Start *
                    </label>
                    <Input
                      type="date"
                      required
                      value={dateOfStart}
                      onChange={(e) => setDateOfStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email (Optional)
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="swimmer@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as SwimCategory)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="homme">Homme (Adults)</option>
                      <option value="femme">Femme (Adults)</option>
                      <option value="enfants">Enfants (Kids)</option>
                      <option value="apnea">Apnee</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Level *
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="beginner">Debutante / Apprentissage</option>
                      <option value="intermediate">Intermediaire / Perfectionnement</option>
                      <option value="advanced">Avance / Performance</option>
                    </select>
                  </div>
                </div>

                {category !== "enfants" && category !== "apnea" && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Frequency
                      </label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as SwimFrequency)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        <option value="1x">1x / semaine</option>
                        <option value="2x">2x / semaine</option>
                        <option value="3x">3x / semaine</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Formula *
                      </label>
                      <select
                        value={formula}
                        onChange={(e) => setFormula(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        <option value="G10">G10 (Groupe 10)</option>
                        <option value="MAX5">MAX5 (Max 5)</option>
                        <option value="INDIVID">INDIVID (Personnel)</option>
                        {frequency === "2x" && (
                          <>
                            <option value="2G10">2G10</option>
                            <option value="2MAX5">2MAX5</option>
                            <option value="G10MAX5">G10MAX5</option>
                            <option value="2INDIVID">2INDIVID</option>
                          </>
                        )}
                        {frequency === "3x" && (
                          <>
                            <option value="3G10">3G10</option>
                            <option value="3MAX5">3MAX5</option>
                            <option value="3INDIVID">3INDIVID</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Duration *
                      </label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value as SwimDuration)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                      >
                        <option value="1m">1 Mois</option>
                        <option value="3m">3 Mois (Trimestre)</option>
                        <option value="6m">6 Mois (Semestre)</option>
                        <option value="9m">9 Mois (Annuel)</option>
                      </select>
                    </div>
                  </div>
                )}

                {category === "enfants" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Kids Formula *
                    </label>
                    <select
                      value={formula}
                      onChange={(e) => setFormula(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="Decouverte">Decouverte (Trimestre 3m - 28,700 DA)</option>
                      <option value="Recommande">Recommande (Semestre 6m - 46,500 DA)</option>
                      <option value="Economique">Economique (Annuel 9m - 65,800 DA)</option>
                    </select>
                  </div>
                )}

                {/* Price Display */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-cyan-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">
                      Calculated Price
                    </span>
                    <p className="text-base font-bold text-cyan-400 font-mono">
                      {computedPrice.toLocaleString("fr-DZ")} DA
                    </p>
                  </div>
                  <div className="w-36">
                    <label className="block text-[10px] text-slate-400 mb-0.5">
                      Price Override (DA)
                    </label>
                    <input
                      type="number"
                      value={priceOverride}
                      onChange={(e) => setPriceOverride(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Solid Group assignment */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Assign Solid Group
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">No group assigned yet (Awaiting allocation)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.level} - Coach: {g.coachName || "Unassigned"} - {g.schedule})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Coach message */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Word From Your Coach (Personal note for portal)
                  </label>
                  <textarea
                    value={coachMessage}
                    onChange={(e) => setCoachMessage(e.target.value)}
                    placeholder="e.g. Bienvenue! Vos seances sont prevues chaque mardi et jeudi a 18h..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Issue card */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={issueCard}
                      onChange={(e) => setIssueCard(e.target.checked)}
                      className="h-4 w-4 accent-cyan-500 rounded"
                    />
                    <span className="text-xs font-semibold text-white">
                      Issue Swim PVC Pass Card Immediately
                    </span>
                  </label>

                  {issueCard && (
                    <input
                      type="text"
                      value={cardCode}
                      onChange={(e) => setCardCode(e.target.value)}
                      placeholder="Card Code (Leave blank to auto-generate SWM-XXXXXX)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 uppercase"
                    />
                  )}
                </div>
              </div>

              {/* Form Footer */}
              <div className="flex gap-2 pt-3 border-t border-white/10 shrink-0 mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingAddMember}
                  className="flex-1"
                >
                  Save Swimmer Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── QUICK PAYMENT MODAL ─────────────────────────────────────── */}
      {payingMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Record Swim Payment: {payingMember.fullName}
            </h3>
            <p className="text-xs text-slate-400">
              Swimmer ID: <span className="font-mono text-cyan-300">{payingMember.swimId}</span> · Formula:{" "}
              {payingMember.formula} ({payingMember.priceDA.toLocaleString("fr-DZ")} DA)
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Amount (DA) *
                </label>
                <Input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 21900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="cash">Especes (Cash at Reception)</option>
                  <option value="baridi_mob">Baridi Mob / CCP</option>
                  <option value="virement">Virement Bancaire</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Receipt Note (Optional)
                </label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Recu No. 042 / Tranche 1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPayingMember(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingPayment}
                  className="flex-1"
                >
                  Confirm Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PROMOTE LEAD MODAL ──────────────────────────────────────── */}
      {promotingLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              Confirm & Promote Swimmer: {promotingLead.fullName}
            </h3>
            <p className="text-xs text-slate-400">
              Assign a training group and configure official pass access.
            </p>

            <form onSubmit={handlePromoteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Propose Solid Group
                </label>
                <select
                  value={promoteGroupId}
                  onChange={(e) => setPromoteGroupId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">No group assigned yet</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.level} - Coach: {g.coachName || "Unassigned"} - {g.schedule})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Word From Your Coach
                </label>
                <textarea
                  value={promoteCoachMessage}
                  onChange={(e) => setPromoteCoachMessage(e.target.value)}
                  placeholder="e.g. Bienvenue dans l'equipe..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoteIssueCard}
                    onChange={(e) => setPromoteIssueCard(e.target.checked)}
                    className="h-4 w-4 accent-cyan-500 rounded"
                  />
                  <span className="text-xs font-semibold text-white">
                    Issue Swim PVC Pass Card
                  </span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPromotingLead(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingPromote}
                  className="flex-1"
                >
                  Confirm & Create Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MANUAL NEW LEAD MODAL ────────────────────────────────────── */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">Create New Swim Lead</h3>

            <form onSubmit={handleAddLeadSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <Input
                    required
                    value={newLeadFullName}
                    onChange={(e) => setNewLeadFullName(e.target.value)}
                    placeholder="e.g. Salim Benali"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone (Optional)
                  </label>
                  <Input
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    placeholder="0550123456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email (Optional)
                </label>
                <Input
                  type="email"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  placeholder="client@email.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newLeadCategory}
                    onChange={(e) => setNewLeadCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                    <option value="enfants">Enfants</option>
                    <option value="apnea">Apnee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Level
                  </label>
                  <select
                    value={newLeadLevel}
                    onChange={(e) => setNewLeadLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="beginner">Debutante</option>
                    <option value="intermediate">Intermediaire</option>
                    <option value="advanced">Avance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Availability / Preferred Days
                </label>
                <Input
                  value={newLeadPreferredDays}
                  onChange={(e) => setNewLeadPreferredDays(e.target.value)}
                  placeholder="e.g. Lundi & Mercredi soirs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={newLeadNotes}
                  onChange={(e) => setNewLeadNotes(e.target.value)}
                  placeholder="Any particular health notes or requests..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddLeadModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingAddLead}
                  className="flex-1"
                >
                  Save Lead
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

