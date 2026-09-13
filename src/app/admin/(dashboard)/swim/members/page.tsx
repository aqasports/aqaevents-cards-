"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader, Badge, Button, Input, Card } from "@/components/admin/ui";
import { getSwimLevelLabel } from "@/lib/swim-groups";

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
    category?: string;
    active?: boolean;
  } | null;
  effectiveGroup?: {
    id: string;
    name: string;
    coachName: string | null;
    schedule: string;
    category?: string;
    active?: boolean;
  } | null;
  effectivelyUnassigned?: boolean;
  card: {
    id: string;
    cardCode: string;
    publicToken: string;
    status: string;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    paidAt: string;
  }>;
}

interface SwimGroup {
  id: string;
  name: string;
  category: string;
  level: string;
  coachName: string | null;
  schedule?: string;
  active: boolean;
  isSolid?: boolean;
}

export default function SwimMembersPage() {
  const [members, setMembers] = useState<SwimMember[]>([]);
  const [groups, setGroups] = useState<SwimGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Add Member Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [dateOfStart, setDateOfStart] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<string>("homme");
  const [level, setLevel] = useState("new_aqa");
  const [groupId, setGroupId] = useState("");
  const [showSolidOnlyAdd, setShowSolidOnlyAdd] = useState(false);
  const [coachMessage, setCoachMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [issueCard, setIssueCard] = useState(true);
  const [cardCode, setCardCode] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addSuccessId, setAddSuccessId] = useState<string | null>(null);

  // Payment Modal
  const [payingMember, setPayingMember] = useState<SwimMember | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [membersRes, groupsRes] = await Promise.all([
        fetch("/api/admin/swim/members"),
        fetch("/api/admin/swim/groups"),
      ]);
      if (membersRes.ok) {
        const mems = await membersRes.json();
        setMembers(mems);
      }
      if (groupsRes.ok) {
        const grps = await groupsRes.json();
        setGroups(grps);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingAdd(true);

    try {
      const res = await fetch("/api/admin/swim/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          photoUrl,
          dateOfStart,
          category,
          level,
          formula: "G10",
          duration: "3m",
          priceDA: 0,
          groupId: groupId || null,
          coachMessage,
          notes,
          issueCard,
          cardCode,
        }),
      });

      if (res.ok) {
        const newMember = await res.json();
        setAddSuccessId(newMember.swimId);
        setTimeout(() => {
          setAddSuccessId(null);
          setShowAddModal(false);
          setFullName("");
          setPhone("");
          setEmail("");
          setPhotoUrl("");
          setCoachMessage("");
          setNotes("");
          setGroupId("");
          loadData();
        }, 1800);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAdd(false);
    }
  }

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
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPayment(false);
    }
  }

  function getWhatsAppUrl(member: SwimMember) {
    if (!member.phone) return null;
    const cleanPhone = member.phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `213${cleanPhone.slice(1)}` : cleanPhone;
    const effectiveGrp = member.effectiveGroup || (!member.effectivelyUnassigned && member.group?.active ? member.group : null);
    const groupText = effectiveGrp ? `${effectiveGrp.name} (${effectiveGrp.schedule})` : "En attente d'affectation";
    const coachText = effectiveGrp?.coachName ? `Coach: ${effectiveGrp.coachName}` : "";
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

    const rows = filteredMembers.map((m) => {
      const effectiveGrp = m.effectiveGroup || (!m.effectivelyUnassigned && m.group?.active ? m.group : null);
      return [
        m.swimId,
        `"${m.fullName.replace(/"/g, '""')}"`,
        `"${m.phone || ""}"`,
        `"${m.email || ""}"`,
        m.category,
        getSwimLevelLabel(m.level),
        m.formula,
        m.duration || "3m",
        m.priceDA,
        `"${effectiveGrp?.name || "Unassigned"}"`,
        `"${effectiveGrp?.coachName || ""}"`,
        m.paymentStatus,
        m.groupStatus,
        new Date(m.dateOfStart).toLocaleDateString("fr-DZ"),
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aqa_swim_members_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        m.fullName.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        m.swimId.toLowerCase().includes(q) ||
        (m.card?.cardCode && m.card.cardCode.toLowerCase().includes(q));

      const matchLevel =
        levelFilter === "all" ||
        m.level === levelFilter ||
        (levelFilter === "new_aqa" && m.level === "beginner") ||
        (levelFilter === "old_aqa" && (m.level === "intermediate" || m.level === "advanced"));

      const matchCategory = categoryFilter === "all" || m.category === categoryFilter;
      const matchPayment = paymentFilter === "all" || m.paymentStatus === paymentFilter;

      return matchSearch && matchLevel && matchCategory && matchPayment;
    });
  }, [members, searchTerm, levelFilter, categoryFilter, paymentFilter]);

  const addModalEligibleGroups = useMemo(() => {
    return groups.filter((g) => {
      if (!g.active) return false;
      if (g.category !== category) return false;
      if (showSolidOnlyAdd && !g.isSolid) return false;
      return true;
    });
  }, [groups, category, showSolidOnlyAdd]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Swimmer Profiles & Ledger"
        description="Register and manage swimmer profiles with solid group allocation, personal coach advice, payment ledger, and unique Swimmer IDs."
        action={
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAddModal(true)} variant="primary">
              + Add Swimmer
            </Button>
            <Button onClick={handleExportCSV} variant="secondary">
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
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
            <option value="new_aqa">New AQA Member</option>
            <option value="old_aqa">Old AQA Member</option>
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
        </div>

        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by name, phone, or Swimmer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Members table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                <th className="py-3 px-4">Swimmer ID</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Group Assignment</th>
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
                    Loading swimmers...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                    No swimmers found. Click &quot;+ Add Swimmer&quot; to register one.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const effectiveGrp = m.effectiveGroup || (!m.effectivelyUnassigned && m.group?.active ? m.group : null);
                  const isArchived = m.effectivelyUnassigned || (m.group && !m.group.active);

                  return (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <Link
                          href={`/admin/swim/members/${m.swimId}`}
                          className="text-cyan-400 font-bold hover:underline"
                          title="Open Swimmer Profile Page"
                        >
                          {m.swimId}
                        </Link>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {m.photoUrl ? (
                            <img
                              src={m.photoUrl}
                              alt=""
                              className="h-7 w-7 rounded-lg object-cover border border-white/10"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-lg bg-sky-950 text-sky-400 font-bold flex items-center justify-center text-[10px] border border-sky-800/40">
                              {m.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/admin/swim/members/${m.swimId}`}
                              className="font-bold text-white hover:text-cyan-400 transition-colors"
                            >
                              {m.fullName}
                            </Link>
                            <div className="text-[11px] text-[var(--muted)] font-mono">
                              {m.phone || "No phone"} · {m.category}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">
                          {getSwimLevelLabel(m.level)}
                        </div>
                        <div className="text-[11px] text-[var(--muted)]">
                          Type: {m.formula}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {effectiveGrp ? (
                          <div>
                            <div className="font-semibold text-white">{effectiveGrp.name}</div>
                            {effectiveGrp.coachName && (
                              <div className="text-[10px] text-cyan-400">
                                Coach: {effectiveGrp.coachName}
                              </div>
                            )}
                          </div>
                        ) : isArchived ? (
                          <div>
                            <span className="text-amber-400 font-semibold">Unassigned</span>
                            <div className="text-[10px] text-slate-500 italic">Group archived</div>
                          </div>
                        ) : (
                          <span className="text-[var(--muted)] italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {m.groupStatus === "accepted" && (
                          <Badge tone="success">Confirmed</Badge>
                        )}
                        {m.groupStatus === "proposed" && (
                          <Badge tone="warning">Proposed</Badge>
                        )}
                        {m.groupStatus === "rejected" && (
                          <div title={m.rejectionReason || "No reason given"}>
                            <Badge tone="danger">Rejected</Badge>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div>
                          {m.paymentStatus === "paid" && (
                            <Badge tone="success">Paid</Badge>
                          )}
                          {m.paymentStatus === "partial" && (
                            <Badge tone="warning">Partial</Badge>
                          )}
                          {m.paymentStatus === "unpaid" && (
                            <Badge tone="danger">Unpaid</Badge>
                          )}
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
                            className="text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            <span>{m.card.cardCode}</span>
                            <span className="text-[9px]">↗</span>
                          </Link>
                        ) : (
                          <span className="text-[var(--muted)]">No card</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {getWhatsAppUrl(m) && (
                          <a
                            href={getWhatsAppUrl(m)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors"
                            title="Send WhatsApp Confirmation"
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
                        <Link
                          href={`/admin/swim/members/${m.swimId}`}
                          className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 font-semibold text-xs transition-colors border border-white/10"
                        >
                          Profile
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] my-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">
                  Add Swimmer Profile
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Input swimmer details. The system automatically creates a personal Swimmer ID (SWM-XXXXXX) for their online portal access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {addSuccessId && (
              <div className="mt-3 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center shrink-0">
                Swimmer Profile Created! ID: {addSuccessId}
              </div>
            )}

            <form onSubmit={handleAddMemberSubmit} className="flex flex-col flex-1 min-h-0 mt-3">
              <div className="overflow-y-auto flex-1 pr-1.5 -mr-1.5 space-y-3.5">
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
                      placeholder="swimmer@aqa.pro"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Photo URL (Optional)
                  </label>
                  <Input
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://... image link"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setGroupId("");
                      }}
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
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="new_aqa">New AQA Member</option>
                      <option value="old_aqa">Old AQA Member</option>
                    </select>
                  </div>
                </div>

                {/* Group selection */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300">
                      Propose Group ({category})
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={showSolidOnlyAdd}
                        onChange={(e) => setShowSolidOnlyAdd(e.target.checked)}
                        className="h-3.5 w-3.5 accent-cyan-500 rounded"
                      />
                      <span>Show Solid Only</span>
                    </label>
                  </div>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">No group assigned yet</option>
                    {addModalEligibleGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.level} - Coach: {g.coachName || "Unassigned"}) {g.isSolid ? "[SOLID]" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Coach message */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Word From Your Coach
                  </label>
                  <textarea
                    value={coachMessage}
                    onChange={(e) => setCoachMessage(e.target.value)}
                    placeholder="e.g. Heureux de te revoir pour cette nouvelle saison!"
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* PVC Card issue */}
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={issueCard}
                      onChange={(e) => setIssueCard(e.target.checked)}
                      className="h-4 w-4 accent-cyan-500 rounded"
                    />
                    <span className="text-xs font-semibold text-white">
                      Issue Swim PVC Card (QR Pass) Now
                    </span>
                  </label>
                  {issueCard && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={cardCode}
                        onChange={(e) => setCardCode(e.target.value)}
                        placeholder="Optional pre-printed card code (e.g. SWM-000001)"
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 uppercase"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Pinned Footer Actions */}
              <div className="flex gap-2 pt-3 mt-3 border-t border-white/10 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingAdd}
                  className="flex-1"
                >
                  Create Swimmer Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payingMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              Record Swim Payment: {payingMember.fullName}
            </h3>
            <p className="text-xs text-slate-400">
              Total subscription fee:{" "}
              <span className="font-mono font-bold text-cyan-400">
                {payingMember.priceDA.toLocaleString("fr-DZ")} DA
              </span>
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amount Received (DA) *
                </label>
                <Input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
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
                  <option value="cash">Especes (Cash)</option>
                  <option value="ccp">Virement CCP / BaridiMob</option>
                  <option value="bank">Virement Bancaire</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes / Receipt Reference
                </label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Recu No. 042 / BaridiMob transaction"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
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
                  Save Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
