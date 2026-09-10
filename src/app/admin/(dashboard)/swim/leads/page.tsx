"use client";

import { useEffect, useState } from "react";
import { PageHeader, Badge, Button, Input, Card, StatCard } from "@/components/admin/ui";
import { formatDate } from "@/lib/i18n";

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
}

export default function SwimLeadsPage() {
  const [leads, setLeads] = useState<SwimLead[]>([]);
  const [groups, setGroups] = useState<SwimGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [searchTerm, setSearchTerm] = useState("");

  // Promote Modal
  const [promotingLead, setPromotingLead] = useState<SwimLead | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [coachMessage, setCoachMessage] = useState("");
  const [issueCard, setIssueCard] = useState(true);
  const [customCardCode, setCustomCardCode] = useState("");
  const [submittingPromote, setSubmittingPromote] = useState(false);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);

  // Add Manual Lead Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCategory, setNewCategory] = useState("homme");
  const [newLevel, setNewLevel] = useState("beginner");
  const [newFrequency, setNewFrequency] = useState("1x");
  const [newFormula, setNewFormula] = useState("G10");
  const [newDuration, setNewDuration] = useState("3m");
  const [newPreferredDays, setNewPreferredDays] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [leadsRes, groupsRes] = await Promise.all([
        fetch(`/api/admin/swim/leads?status=${activeTab}`),
        fetch("/api/admin/swim/groups"),
      ]);
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data);
      }
      if (groupsRes.ok) {
        const grp = await groupsRes.json();
        setGroups(grp);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function handleUpdateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/swim/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  }

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
          groupId: selectedGroupId || null,
          coachMessage: coachMessage || null,
          issueCard,
          cardCode: customCardCode || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPromoteSuccess(`Swimmer registered successfully with ID: ${data.swimId}`);
        setTimeout(() => {
          setPromoteSuccess(null);
          setPromotingLead(null);
          loadData();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPromote(false);
    }
  }

  async function handleAddLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingAdd(true);

    try {
      const res = await fetch("/api/admin/swim/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newFullName,
          phone: newPhone,
          email: newEmail,
          category: newCategory,
          level: newLevel,
          frequency: newFrequency,
          formula: newFormula,
          duration: newDuration,
          preferredDays: newPreferredDays,
          notes: newNotes,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        // Reset
        setNewFullName("");
        setNewPhone("");
        setNewEmail("");
        setNewNotes("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAdd(false);
    }
  }

  const filteredLeads = leads.filter((l) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      l.fullName.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.email && l.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sector 1: New Clients Lead (Wait List)"
        description="Review incoming demands from aqasports.com, call clients to confirm interest, assign solid groups, and issue official swim cards."
        action={
          <Button onClick={() => setShowAddModal(true)} variant="primary">
            + New Lead
          </Button>
        }
      />

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] gap-1">
          {["pending", "called", "confirmed", "rejected", "all"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Leads Table */}
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
                    No leads found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{lead.fullName}</div>
                      <div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-0.5">
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-cyan-400 hover:underline font-mono"
                        >
                          {lead.phone}
                        </a>
                        {lead.email && <span>· {lead.email}</span>}
                      </div>
                      {lead.notes && (
                        <div className="text-[10px] text-amber-300/80 mt-1 italic">
                          &ldquo;{lead.notes}&rdquo;
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="capitalize font-semibold text-slate-200">
                        {lead.category}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] capitalize">
                        {lead.level}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{lead.formula}</div>
                      <div className="text-[11px] text-[var(--muted)]">
                        {lead.frequency} · {lead.duration}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)]">
                      {lead.preferredDays || "—"}
                    </td>
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
                      {lead.status === "pending" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateStatus(lead.id, "called")}
                        >
                          Mark Called
                        </Button>
                      )}

                      {lead.status !== "confirmed" && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setPromotingLead(lead);
                            setSelectedGroupId("");
                            setCoachMessage("");
                          }}
                        >
                          Confirm & Link
                        </Button>
                      )}

                      {lead.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleUpdateStatus(lead.id, "rejected")}
                        >
                          Reject
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Promote to Member Modal */}
      {promotingLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              Confirm & Promote Swimmer: {promotingLead.fullName}
            </h3>
            <p className="text-xs text-slate-400">
              Assign a training group and configure the official swim pass.
            </p>

            {promoteSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold">
                {promoteSuccess}
              </div>
            )}

            <form onSubmit={handlePromoteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Propose Solid Group
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">No group assigned yet</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.level} - Coach: {g.coachName || "Unassigned"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Word From Your Coach (Personal Note to Client)
                </label>
                <textarea
                  value={coachMessage}
                  onChange={(e) => setCoachMessage(e.target.value)}
                  placeholder="e.g. Bienvenue dans l'equipe! On commence lundi a 18h en bassin..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={issueCard}
                    onChange={(e) => setIssueCard(e.target.checked)}
                    className="h-4 w-4 accent-cyan-500 rounded"
                  />
                  <span className="text-xs font-semibold text-white">
                    Issue Swim PVC Card (QR Pass) Immediately
                  </span>
                </label>

                {issueCard && (
                  <div className="pt-2">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Link Existing Printed Card Code (Optional, leave blank to auto-generate)
                    </label>
                    <input
                      type="text"
                      value={customCardCode}
                      onChange={(e) => setCustomCardCode(e.target.value)}
                      placeholder="e.g. SWM-001001"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 uppercase"
                    />
                  </div>
                )}
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

      {/* Manual New Lead Modal */}
      {showAddModal && (
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
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Salim Benali"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone *
                  </label>
                  <Input
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
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
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="client@email.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
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
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="beginner">Debutante / Apprentissage</option>
                    <option value="intermediate">Intermediaire / Perfectionnement</option>
                    <option value="advanced">Avance / Performance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="1x">1x / semaine</option>
                    <option value="2x">2x / semaine</option>
                    <option value="3x">3x / semaine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Formula
                  </label>
                  <select
                    value={newFormula}
                    onChange={(e) => setNewFormula(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="G10">G10 (Groupe 10)</option>
                    <option value="MAX5">MAX5 (Max 5)</option>
                    <option value="INDIVID">INDIVID (Personnel)</option>
                    <option value="Decouverte">Decouverte (Enfants)</option>
                    <option value="Recommande">Recommande (Enfants)</option>
                    <option value="Economique">Economique (Enfants)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Duration
                  </label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="1m">1 Mois</option>
                    <option value="3m">3 Mois</option>
                    <option value="6m">6 Mois</option>
                    <option value="9m">9 Mois</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Availability / Preferred Days
                </label>
                <Input
                  value={newPreferredDays}
                  onChange={(e) => setNewPreferredDays(e.target.value)}
                  placeholder="e.g. Lundi & Mercredi soirs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Any particular health notes or requests..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
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
