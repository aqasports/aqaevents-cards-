"use client";

import { useEffect, useState, useMemo } from "react";
import { PageHeader, Badge, Button, Input, Card, StatCard } from "@/components/admin/ui";
import {
  EQUIPMENT_ARTICLES,
  EquipmentArticleId,
  SwimLeadDetails,
  getArticleLabel,
  getArticleShortLabel,
  cleanLeadNotesDisplay,
} from "@/lib/swim-lead-details";
import { calculateSwimPrice, SwimCategory, SwimDuration, SwimFrequency } from "@/lib/swim-pricing";

function formatDA(amount: number): string {
  return `${amount.toLocaleString("fr-DZ")} DA`;
}

interface SwimLead {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  birthDate?: string | null;
  category: string;
  level: string;
  frequency: string;
  formula: string;
  duration: string;
  preferredDays: string | null;
  notes: string | null;
  status: "pending" | "called" | "confirmed" | "rejected";
  createdAt: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  details?: SwimLeadDetails;
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
  const [equipmentFilter, setEquipmentFilter] = useState<"all" | "equipment_only" | "no_equipment">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Deep View Inspector Drawer
  const [selectedLeadForInspection, setSelectedLeadForInspection] = useState<SwimLead | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [editingEquipmentArticles, setEditingEquipmentArticles] = useState<EquipmentArticleId[]>([]);
  const [editingEquipmentSize, setEditingEquipmentSize] = useState("");
  const [editingEquipmentNotes, setEditingEquipmentNotes] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

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
  const [newCity, setNewCity] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [newGoal, setNewGoal] = useState("Apprentissage");
  const [newChannel, setNewChannel] = useState("Instagram");
  const [newArticles, setNewArticles] = useState<EquipmentArticleId[]>([]);
  const [newEquipmentNotes, setNewEquipmentNotes] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [leadsRes, groupsRes] = await Promise.all([
        fetch(`/api/admin/swim/leads?status=${activeTab}`),
        fetch("/api/admin/swim/groups"),
      ]);
      if (leadsRes.ok) {
        const data: SwimLead[] = await leadsRes.json();
        setLeads(data);

        // Keep inspected lead in sync if drawer is open
        if (selectedLeadForInspection) {
          const fresh = data.find((l) => l.id === selectedLeadForInspection.id);
          if (fresh) {
            setSelectedLeadForInspection(fresh);
            setEditingNotes(fresh.details?.userNotes ?? cleanLeadNotesDisplay(fresh.notes));
            setEditingEquipmentArticles(fresh.details?.equipment.articles || []);
            setEditingEquipmentSize(fresh.details?.equipment.size || "");
            setEditingEquipmentNotes(fresh.details?.equipment.notes || "");
          }
        }
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

  function openInspector(lead: SwimLead) {
    setSelectedLeadForInspection(lead);
    setEditingNotes(lead.details?.userNotes ?? cleanLeadNotesDisplay(lead.notes));
    setEditingEquipmentArticles(lead.details?.equipment.articles || []);
    setEditingEquipmentSize(lead.details?.equipment.size || "");
    setEditingEquipmentNotes(lead.details?.equipment.notes || "");
    setSaveSuccessMsg(null);
  }

  function closeInspector() {
    setSelectedLeadForInspection(null);
    setSaveSuccessMsg(null);
  }

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

  async function handleSaveLeadDetails() {
    if (!selectedLeadForInspection) return;
    setSavingDetails(true);
    setSaveSuccessMsg(null);

    try {
      const currentDetails = selectedLeadForInspection.details;
      const updatedDetails: SwimLeadDetails = {
        equipment: {
          hasPack: editingEquipmentArticles.length > 0 || Boolean(currentDetails?.equipment.hasPack),
          articles: editingEquipmentArticles,
          articleLabels: editingEquipmentArticles.map(getArticleLabel),
          rawText: currentDetails?.equipment.rawText || null,
          size: editingEquipmentSize || null,
          notes: editingEquipmentNotes || null,
        },
        demographics: currentDetails?.demographics || {},
        userNotes: editingNotes.trim(),
      };

      const res = await fetch(`/api/admin/swim/leads/${selectedLeadForInspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          details: updatedDetails,
          notes: editingNotes.trim(),
        }),
      });

      if (res.ok) {
        const updatedLead: SwimLead = await res.json();
        setSelectedLeadForInspection(updatedLead);
        setSaveSuccessMsg("Prospect details and equipment updated successfully.");
        setTimeout(() => setSaveSuccessMsg(null), 2500);
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDetails(false);
    }
  }

  function toggleArticle(articleId: EquipmentArticleId) {
    if (editingEquipmentArticles.includes(articleId)) {
      setEditingEquipmentArticles(editingEquipmentArticles.filter((a) => a !== articleId));
    } else {
      setEditingEquipmentArticles([...editingEquipmentArticles, articleId]);
    }
  }

  function toggleNewArticle(articleId: EquipmentArticleId) {
    if (newArticles.includes(articleId)) {
      setNewArticles(newArticles.filter((a) => a !== articleId));
    } else {
      setNewArticles([...newArticles, articleId]);
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
          if (selectedLeadForInspection?.id === promotingLead.id) {
            setSelectedLeadForInspection(null);
          }
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
          email: newEmail || null,
          category: newCategory,
          level: newLevel,
          frequency: newFrequency,
          formula: newFormula,
          duration: newDuration,
          preferredDays: newPreferredDays || null,
          notes: newNotes,
          city: newCity || null,
          age: newAge ? parseInt(newAge, 10) : null,
          whatsapp: newWhatsapp || null,
          goal: newGoal || null,
          channel: newChannel || "Admin Direct",
          articles: newArticles,
          hasEquipmentPack: newArticles.length > 0,
          equipmentNotes: newEquipmentNotes || null,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        // Reset form
        setNewFullName("");
        setNewPhone("");
        setNewEmail("");
        setNewNotes("");
        setNewCity("");
        setNewAge("");
        setNewWhatsapp("");
        setNewArticles([]);
        setNewEquipmentNotes("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAdd(false);
    }
  }

  // Analytics counts
  const stats = useMemo(() => {
    const total = leads.length;
    const pending = leads.filter((l) => l.status === "pending").length;
    const withEquipment = leads.filter((l) => l.details?.equipment.hasPack).length;
    const confirmed = leads.filter((l) => l.status === "confirmed").length;

    let gogglesCount = 0;
    let capCount = 0;
    let swimsuitCount = 0;

    leads.forEach((l) => {
      const arts = l.details?.equipment.articles || [];
      if (arts.includes("goggles")) gogglesCount++;
      if (arts.includes("cap")) capCount++;
      if (arts.includes("swimsuit")) swimsuitCount++;
    });

    return { total, pending, withEquipment, confirmed, gogglesCount, capCount, swimsuitCount };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Equipment filter
      if (equipmentFilter === "equipment_only" && !l.details?.equipment.hasPack) return false;
      if (equipmentFilter === "no_equipment" && l.details?.equipment.hasPack) return false;

      // Search query
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const city = l.details?.demographics.city?.toLowerCase() || "";
      const wa = l.details?.demographics.whatsapp || "";
      return (
        l.fullName.toLowerCase().includes(q) ||
        (l.phone && l.phone.includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        city.includes(q) ||
        wa.includes(q) ||
        l.formula.toLowerCase().includes(q)
      );
    });
  }, [leads, equipmentFilter, searchTerm]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sector 1: New Clients Lead (Wait List)"
        description="Review incoming demands from aqasports.com with deep equipment tracking, call prospects, assign groups, and issue official swim cards."
        action={
          <Button onClick={() => setShowAddModal(true)} variant="primary">
            + New Lead
          </Button>
        }
      />

      {/* Top Analytics / Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Inscriptions"
          value={stats.total.toString()}
          hint="Demandes au registre"
        />
        <StatCard
          label="A Appeler (Pending)"
          value={stats.pending.toString()}
          hint="Prospects en attente"
        />
        <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,242,255,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300">Demandes Equipement</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 text-[10px] font-mono font-bold border border-cyan-500/30">
              {stats.withEquipment} packs
            </span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {stats.withEquipment}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">prospects equipes</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1 border-t border-white/5">
            <span className="text-cyan-400">{stats.gogglesCount} Lunettes</span>
            <span>·</span>
            <span className="text-sky-400">{stats.capCount} Bonnets</span>
            <span>·</span>
            <span className="text-indigo-400">{stats.swimsuitCount} Maillots</span>
          </div>
        </div>
        <StatCard
          label="Inscriptions Confirmees"
          value={stats.confirmed.toString()}
          hint={stats.total > 0 ? `${Math.round((stats.confirmed / stats.total) * 100)}% taux de conversion` : "0%"}
        />
      </div>

      {/* Tabs, Equipment Filters, and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] gap-1">
            {["pending", "called", "confirmed", "rejected", "all"].map((tab) => {
              const count =
                tab === "all"
                  ? leads.length
                  : leads.filter((l) => l.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors flex items-center gap-1.5 ${
                    activeTab === tab
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeTab === tab
                        ? "bg-white/20 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Equipment Filter Pills */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/10 gap-1">
            <button
              onClick={() => setEquipmentFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                equipmentFilter === "all"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setEquipmentFilter("equipment_only")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                equipmentFilter === "equipment_only"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-cyan-300"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="7" cy="12" r="5" />
                <circle cx="17" cy="12" r="5" />
                <line x1="12" y1="12" x2="12" y2="12" />
              </svg>
              <span>Avec Equipement</span>
            </button>
            <button
              onClick={() => setEquipmentFilter("no_equipment")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                equipmentFilter === "no_equipment"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sans Equipement
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="w-full lg:w-80">
          <Input
            placeholder="Search by name, phone, city, formula..."
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
                <th className="py-3 px-4">Client & Contact</th>
                <th className="py-3 px-4">Categorie & Niveau</th>
                <th className="py-3 px-4">Programme & Creneaux</th>
                <th className="py-3 px-4">Pack Equipement</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--muted)]">
                    Loading wait list data...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--muted)]">
                    No leads found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const hasEquip = Boolean(lead.details?.equipment.hasPack);
                  const articles = lead.details?.equipment.articles || [];
                  const demo = lead.details?.demographics;

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-cyan-500/[0.02] transition-colors group cursor-pointer"
                      onClick={() => openInspector(lead)}
                    >
                      {/* Client */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm hover:text-cyan-300 transition-colors">
                            {lead.fullName}
                          </span>
                          {demo?.memberType === "old" && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/30">
                              Ancien {demo.personalId ? `#${demo.personalId}` : ""}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-[var(--muted)] flex flex-wrap items-center gap-2 mt-1">
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-cyan-400 hover:underline font-mono"
                            title="Call client"
                          >
                            {lead.phone}
                          </a>

                          {demo?.city && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                              {demo.city}
                            </span>
                          )}

                          {demo?.age && (
                            <span className="text-slate-400 text-[10px]">
                              {demo.age} ans
                            </span>
                          )}

                          {demo?.channel && (
                            <span className="text-[10px] text-slate-500">
                              via {demo.channel}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category & Level */}
                      <td className="py-3.5 px-4">
                        <div className="capitalize font-semibold text-slate-200">
                          {lead.category}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] capitalize">
                          {lead.level}
                        </div>
                        {demo?.goal && (
                          <div className="text-[10px] text-cyan-400/90 truncate max-w-[140px] mt-0.5">
                            {demo.goal}
                          </div>
                        )}
                      </td>

                      {/* Program & Schedule */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">
                          {lead.formula} · {lead.frequency}
                        </div>
                        <div className="text-[11px] text-[var(--muted)]">
                          {lead.duration}
                        </div>
                        {lead.preferredDays && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[150px] mt-0.5">
                            {lead.preferredDays}
                          </div>
                        )}
                      </td>

                      {/* Equipment Pack */}
                      <td className="py-3.5 px-4">
                        {hasEquip ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.8 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-semibold text-[11px]">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="7" cy="12" r="5" />
                                <circle cx="17" cy="12" r="5" />
                                <line x1="12" y1="12" x2="12" y2="12" />
                              </svg>
                              <span>Pack Equipement</span>
                            </div>

                            {articles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {articles.map((art) => (
                                  <span
                                    key={art}
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                                      art === "goggles"
                                        ? "bg-cyan-900/40 text-cyan-300 border border-cyan-500/20"
                                        : art === "cap"
                                        ? "bg-sky-900/40 text-sky-300 border border-sky-500/20"
                                        : "bg-indigo-900/40 text-indigo-300 border border-indigo-500/20"
                                    }`}
                                  >
                                    {getArticleShortLabel(art)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">Pack standard</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">Aucun</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {lead.status === "pending" && <Badge tone="warning">Pending</Badge>}
                        {lead.status === "called" && <Badge tone="info">Called</Badge>}
                        {lead.status === "confirmed" && <Badge tone="success">Confirmed</Badge>}
                        {lead.status === "rejected" && <Badge tone="danger">Rejected</Badge>}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[var(--muted)] font-mono whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleDateString("fr-DZ")}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Deep Inspector Button */}
                        <button
                          onClick={() => openInspector(lead)}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-cyan-300 font-semibold text-xs transition-colors gap-1"
                          title="View Deep Prospect Dossier"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          <span>Fiche</span>
                        </button>

                        {lead.phone && (
                          <a
                            href={`https://wa.me/${
                              lead.phone.replace(/[^0-9]/g, "").startsWith("0")
                                ? "213" + lead.phone.replace(/[^0-9]/g, "").slice(1)
                                : lead.phone.replace(/[^0-9]/g, "")
                            }?text=${encodeURIComponent(
                              `Salam ${lead.fullName}, nous vous contactons concernant votre demande d'inscription AQA Swim (${lead.formula}, ${lead.frequency}). ${
                                hasEquip
                                  ? `Nous avons bien note vos articles d'equipement (${articles.map(getArticleShortLabel).join(", ") || "Pack"}). `
                                  : ""
                              }Avez-vous des questions sur les disponibilites de creneaux ?`
                            )}`}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* AQA DEEP LEAD INSPECTOR DRAWER / SHEET ("Fiche Prospect AQA - Deep View") */}
      {/* ========================================================================= */}
      {selectedLeadForInspection && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-slate-950 border-l border-white/10 h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">
                    {selectedLeadForInspection.fullName}
                  </h2>
                  <Badge
                    tone={
                      selectedLeadForInspection.status === "confirmed"
                        ? "success"
                        : selectedLeadForInspection.status === "called"
                        ? "info"
                        : selectedLeadForInspection.status === "rejected"
                        ? "danger"
                        : "warning"
                    }
                  >
                    {selectedLeadForInspection.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fiche Prospect Dossier · Recue le{" "}
                  {new Date(selectedLeadForInspection.createdAt).toLocaleDateString("fr-DZ")}{" "}
                  {new Date(selectedLeadForInspection.createdAt).toLocaleTimeString("fr-DZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={closeInspector}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Close Inspector"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Notification alert */}
            {saveSuccessMsg && (
              <div className="m-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center">
                {saveSuccessMsg}
              </div>
            )}

            {/* Quick Action Contact Bar */}
            <div className="p-4 bg-slate-900/40 border-b border-white/5 flex flex-wrap items-center gap-2">
              <a
                href={`tel:${selectedLeadForInspection.phone}`}
                className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>Appeler Direct</span>
              </a>

              <a
                href={`https://wa.me/${
                  selectedLeadForInspection.phone.replace(/[^0-9]/g, "").startsWith("0")
                    ? "213" + selectedLeadForInspection.phone.replace(/[^0-9]/g, "").slice(1)
                    : selectedLeadForInspection.phone.replace(/[^0-9]/g, "")
                }?text=${encodeURIComponent(
                  `Salam ${selectedLeadForInspection.fullName}, nous vous contactons concernant votre demande d'inscription AQA Swim (${selectedLeadForInspection.formula}, ${selectedLeadForInspection.frequency}). Avez-vous des questions pour finaliser votre groupe ?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>WhatsApp Prospect</span>
              </a>

              {selectedLeadForInspection.status === "pending" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleUpdateStatus(selectedLeadForInspection.id, "called")}
                >
                  Marquer Appele
                </Button>
              )}

              {selectedLeadForInspection.status !== "confirmed" && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setPromotingLead(selectedLeadForInspection);
                    setSelectedGroupId("");
                    setCoachMessage("");
                  }}
                >
                  Confirmer & Inscrire
                </Button>
              )}
            </div>

            {/* Drawer Body Contents */}
            <div className="p-5 space-y-6 flex-1">
              {/* ========================================== */}
              {/* SECTION 1: PACK EQUIPEMENT & ARTICLES (AQA LEVEL HIGHLIGHT) */}
              {/* ========================================== */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,242,255,0.06)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-950 flex items-center justify-center text-cyan-400 border border-cyan-500/40">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="7" cy="12" r="5" />
                        <circle cx="17" cy="12" r="5" />
                        <line x1="12" y1="12" x2="12" y2="12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Pack Equipement & Articles AQA
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {editingEquipmentArticles.length > 0
                          ? `${editingEquipmentArticles.length} article(s) selectionne(s) pour les entrainements`
                          : "Aucun article selectionne"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold font-mono border ${
                      editingEquipmentArticles.length > 0
                        ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/40"
                        : "bg-slate-800 text-slate-400 border-white/5"
                    }`}
                  >
                    {editingEquipmentArticles.length > 0 ? "Pack Demande" : "Sans Pack"}
                  </span>
                </div>

                {/* Visual Article Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {EQUIPMENT_ARTICLES.map((article) => {
                    const isSelected = editingEquipmentArticles.includes(article.id);
                    return (
                      <div
                        key={article.id}
                        onClick={() => toggleArticle(article.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_12px_rgba(0,242,255,0.12)]"
                            : "bg-slate-800/40 border-white/5 hover:border-white/20 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                isSelected
                                  ? "bg-cyan-500 text-slate-950"
                                  : "border border-slate-600 text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <span
                              className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${
                                isSelected
                                  ? "bg-cyan-900/60 text-cyan-300"
                                  : "bg-slate-800 text-slate-500"
                              }`}
                            >
                              {isSelected ? "INCLUS" : "NON REQUIS"}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-white mb-1">
                            {article.label}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed">
                            {article.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Equipment Preparation & Size Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Taille Specifiee (Maillot / Bonnet)
                    </label>
                    <input
                      type="text"
                      value={editingEquipmentSize}
                      onChange={(e) => setEditingEquipmentSize(e.target.value)}
                      placeholder="e.g. Taille L, ou 12-14 ans"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Notes Logistique Equipement
                    </label>
                    <input
                      type="text"
                      value={editingEquipmentNotes}
                      onChange={(e) => setEditingEquipmentNotes(e.target.value)}
                      placeholder="e.g. Verifier stock lunettes noires"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* ========================================== */}
              {/* SECTION 2: DEMOGRAPHICS & CONTACT DOSSIER */}
              {/* ========================================== */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Profil Adherent & Demographie
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Telephone</span>
                    <a
                      href={`tel:${selectedLeadForInspection.phone}`}
                      className="font-mono font-bold text-cyan-400 hover:underline"
                    >
                      {selectedLeadForInspection.phone}
                    </a>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">WhatsApp</span>
                    <span className="font-mono font-semibold text-white">
                      {selectedLeadForInspection.details?.demographics.whatsapp ||
                        selectedLeadForInspection.phone}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Ville / Wilaya</span>
                    <span className="font-semibold text-white">
                      {selectedLeadForInspection.details?.demographics.city || "Non specifiee"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Age</span>
                    <span className="font-semibold text-white">
                      {selectedLeadForInspection.details?.demographics.age
                        ? `${selectedLeadForInspection.details.demographics.age} ans`
                        : "Non specifie"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Canal Acquisition</span>
                    <span className="font-semibold text-white">
                      {selectedLeadForInspection.details?.demographics.channel || "Direct"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Type Adhesion</span>
                    <span className="font-semibold text-white">
                      {selectedLeadForInspection.details?.demographics.memberType === "old"
                        ? `Renouvellement (${selectedLeadForInspection.details.demographics.personalId || "Old"})`
                        : "Nouveau Membre"}
                    </span>
                  </div>
                </div>

                {selectedLeadForInspection.email && (
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 text-xs flex items-center justify-between">
                    <span className="text-slate-400">Email:</span>
                    <a
                      href={`mailto:${selectedLeadForInspection.email}`}
                      className="font-mono text-cyan-400 hover:underline"
                    >
                      {selectedLeadForInspection.email}
                    </a>
                  </div>
                )}
              </div>

              {/* ========================================== */}
              {/* SECTION 3: TRAINING PROGRAM & TARIFF ESTIMATE */}
              {/* ========================================== */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Programme & Objectifs Sportifs
                  </h3>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    Tarif Estime:{" "}
                    {formatDA(
                      calculateSwimPrice(
                        selectedLeadForInspection.category as SwimCategory,
                        selectedLeadForInspection.formula,
                        selectedLeadForInspection.duration as SwimDuration,
                        selectedLeadForInspection.frequency as SwimFrequency
                      )
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Categorie</span>
                    <span className="font-bold text-white capitalize">
                      {selectedLeadForInspection.category}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Niveau</span>
                    <span className="font-bold text-white capitalize">
                      {selectedLeadForInspection.level}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Formule</span>
                    <span className="font-bold text-white">
                      {selectedLeadForInspection.formula} ({selectedLeadForInspection.frequency})
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Duree</span>
                    <span className="font-bold text-white">
                      {selectedLeadForInspection.duration}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1 text-xs">
                  <div className="text-[11px] text-slate-400">Objectif Sportif Declared:</div>
                  <div className="font-semibold text-slate-200">
                    {selectedLeadForInspection.details?.demographics.goal ||
                      selectedLeadForInspection.level ||
                      "Non renseigne"}
                  </div>
                  {selectedLeadForInspection.preferredDays && (
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-white/5">
                      Creneaux souhaites:{" "}
                      <span className="text-white font-medium">
                        {selectedLeadForInspection.preferredDays}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================== */}
              {/* SECTION 4: STAFF FOLLOW-UP & INTERNAL REMARKS */}
              {/* ========================================== */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Suivi Appel & Remarques Internes
                  </h3>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={savingDetails}
                    onClick={handleSaveLeadDetails}
                  >
                    {savingDetails ? "Enregistrement..." : "Sauvegarder les modifications"}
                  </Button>
                </div>

                <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Notes suite a l'appel telephonique, disponibilites particulieres, confirmation du groupe..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                onClick={closeInspector}
              >
                Fermer
              </Button>

              <div className="flex items-center gap-2">
                {selectedLeadForInspection.status !== "rejected" && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      handleUpdateStatus(selectedLeadForInspection.id, "rejected");
                      closeInspector();
                    }}
                  >
                    Rejeter
                  </Button>
                )}

                {selectedLeadForInspection.status !== "confirmed" && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setPromotingLead(selectedLeadForInspection);
                      setSelectedGroupId("");
                      setCoachMessage("");
                    }}
                  >
                    Confirmer & Assigner Groupe
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROMOTE TO SWIM MEMBER MODAL */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* MANUAL NEW LEAD MODAL (WITH EQUIPMENT & DEMOGRAPHICS) */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[94vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">Create New Swim Lead</h3>
            <p className="text-xs text-slate-400">
              Enter swimmer contact, category, formulas, and equipment preferences.
            </p>

            <form onSubmit={handleAddLeadSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom & Prenom *
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
                    Telephone *
                  </label>
                  <Input
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0550123456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp (Optionnel)
                  </label>
                  <Input
                    value={newWhatsapp}
                    onChange={(e) => setNewWhatsapp(e.target.value)}
                    placeholder="0550123456"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ville / Wilaya
                  </label>
                  <Input
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="e.g. Alger, Oran"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Age
                  </label>
                  <Input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="e.g. 25"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email (Optionnel)
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
                    Categorie
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
                    Niveau
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
                    Frequence
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
                    Formule
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
                    Duree
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

              {/* Equipment Articles Choice in Add Form */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-cyan-500/20 space-y-2">
                <div className="text-xs font-semibold text-cyan-300">
                  Pack Equipement AQA (Articles demandes)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {EQUIPMENT_ARTICLES.map((article) => {
                    const isSelected = newArticles.includes(article.id);
                    return (
                      <label
                        key={article.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-cyan-950/60 border-cyan-500/40 text-white"
                            : "bg-slate-800 border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleNewArticle(article.id)}
                          className="h-3.5 w-3.5 accent-cyan-500 rounded"
                        />
                        <span className="font-semibold">{article.shortLabel}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Disponibilites / Creneaux Souhaites
                </label>
                <Input
                  value={newPreferredDays}
                  onChange={(e) => setNewPreferredDays(e.target.value)}
                  placeholder="e.g. Lundi & Mercredi soirs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes & Remarques
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Notes de contact..."
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
