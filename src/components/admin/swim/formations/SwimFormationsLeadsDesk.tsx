"use client";

import React, { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Input,
  PageHeader,
  Select,
  StatCard,
  Textarea,
} from "@/components/admin/ui";
import { useLocale, useTranslations, formatDate } from "@/lib/i18n";
import { cleanLeadNotesDisplay, SwimLeadDetails } from "@/lib/swim-lead-details";

export interface FormationLeadRow {
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
  details?: SwimLeadDetails;
}

interface SwimFormationsLeadsDeskProps {
  leads: FormationLeadRow[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

const KNOWN_FORMATIONS = [
  { slug: "chasse-sous-marine", title: "Formation Chasse Sous-marine" },
];

export function SwimFormationsLeadsDesk({
  leads,
  loading,
  onRefresh,
}: SwimFormationsLeadsDeskProps) {
  const { t } = useTranslations("swimFormationsLeads");
  const { locale, dir } = useLocale();

  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [formationFilter, setFormationFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Inspector drawer/modal state
  const [inspectedLead, setInspectedLead] = useState<FormationLeadRow | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveNotesSuccess, setSaveNotesSuccess] = useState<string | null>(null);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<FormationLeadRow | null>(null);

  // Add manual formation lead modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newFormationSlug, setNewFormationSlug] = useState("chasse-sous-marine");
  const [newSwimLevel, setNewSwimLevel] = useState("intermediate");
  const [newApneaExp, setNewApneaExp] = useState("none");
  const [newSpearExp, setNewSpearExp] = useState("none");
  const [newGear, setNewGear] = useState("none");
  const [newSchedule, setNewSchedule] = useState("weekend");
  const [newChannel, setNewChannel] = useState("Direct / Admin");
  const [newNotes, setNewNotes] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const stats = useMemo(() => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    return {
      total: safeLeads.length,
      pending: safeLeads.filter((l) => l.status === "pending").length,
      called: safeLeads.filter((l) => l.status === "called").length,
      confirmed: safeLeads.filter((l) => l.status === "confirmed").length,
    };
  }, [leads]);

  const formationOptions = useMemo(() => {
    const map = new Map<string, string>();
    KNOWN_FORMATIONS.forEach((f) => map.set(f.slug, f.title));
    (leads || []).forEach((l) => {
      const slug = l.details?.formation?.slug || l.duration || "formation";
      const title = l.details?.formation?.title || l.formula || slug;
      if (!map.has(slug)) {
        map.set(slug, title);
      }
    });
    return Array.from(map.entries()).map(([slug, title]) => ({ slug, title }));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    const q = searchTerm.toLowerCase().trim();
    return leads.filter((l) => {
      if (!l) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      const slug = l.details?.formation?.slug || l.duration || "";
      if (formationFilter !== "all" && slug !== formationFilter) return false;
      if (!q) return true;
      const city = l.details?.demographics?.city?.toLowerCase() || "";
      const wa = l.details?.demographics?.whatsapp?.toLowerCase() || "";
      const userNotes = (l.details?.userNotes || cleanLeadNotesDisplay(l.notes)).toLowerCase();
      const formationTitle = (l.details?.formation?.title || l.formula || "").toLowerCase();
      return (
        l.fullName.toLowerCase().includes(q) ||
        (l.phone && l.phone.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        city.includes(q) ||
        wa.includes(q) ||
        userNotes.includes(q) ||
        formationTitle.includes(q)
      );
    });
  }, [leads, statusFilter, formationFilter, searchTerm]);

  function translateSwimLevel(val?: string | null): string {
    if (!val) return "—";
    const lower = val.toLowerCase();
    if (lower === "beginner" || lower === "debutant") return t("lvlBeginner");
    if (lower === "intermediate" || lower === "intermediaire") return t("lvlIntermediate");
    if (lower === "advanced" || lower === "avance") return t("lvlAdvanced");
    return val;
  }

  function translateExperience(val?: string | null): string {
    if (!val) return "—";
    const lower = val.toLowerCase();
    if (lower === "none" || lower === "aucune") return t("expNone");
    if (lower === "initiation" || lower === "debutant") return t("expInitiation");
    if (lower === "intermediate" || lower === "intermediaire") return t("expIntermediate");
    if (lower === "advanced" || lower === "confirme") return t("expAdvanced");
    return val;
  }

  function translateGear(val?: string | null): string {
    if (!val) return "—";
    const lower = val.toLowerCase();
    if (lower === "none" || lower === "aucun") return t("gearNone");
    if (lower === "partial" || lower === "partiel") return t("gearPartial");
    if (lower === "complete" || lower === "complet") return t("gearComplete");
    return val;
  }

  function translateSchedule(val?: string | null): string {
    if (!val) return "—";
    const lower = val.toLowerCase();
    if (lower === "weekend") return t("schedWeekend");
    if (lower === "weekdays" || lower === "semaine") return t("schedWeekdays");
    if (lower === "flexible") return t("schedFlexible");
    return val;
  }

  function statusTone(status: FormationLeadRow["status"]) {
    switch (status) {
      case "confirmed":
        return "success" as const;
      case "called":
        return "info" as const;
      case "rejected":
        return "danger" as const;
      default:
        return "warning" as const;
    }
  }

  function statusLabel(status: FormationLeadRow["status"]) {
    switch (status) {
      case "confirmed":
        return t("statusConfirmed");
      case "called":
        return t("statusCalled");
      case "rejected":
        return t("statusRejected");
      default:
        return t("statusPending");
    }
  }

  function buildWhatsAppUrl(lead: FormationLeadRow): string | null {
    const rawNum = lead.details?.demographics?.whatsapp || lead.phone || "";
    const cleanPhone = rawNum.replace(/[^0-9]/g, "");
    if (!cleanPhone) return null;
    const formatted = cleanPhone.startsWith("0") ? `213${cleanPhone.slice(1)}` : cleanPhone;
    const formationTitle = lead.details?.formation?.title || lead.formula || t("formationChasse");
    const msg = t("whatsappTemplate")
      .replace("{name}", lead.fullName)
      .replace("{formation}", formationTitle);
    return `https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`;
  }

  function openInspector(lead: FormationLeadRow) {
    setInspectedLead(lead);
    setEditingNotes(lead.details?.userNotes ?? cleanLeadNotesDisplay(lead.notes));
    setSaveNotesSuccess(null);
    setActionError(null);
  }

  async function handleStatusChange(id: string, nextStatus: FormationLeadRow["status"]) {
    setActionError(null);
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/swim/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        setActionError(t("statusActionFailed"));
        return;
      }
      const updated: FormationLeadRow = await res.json();
      if (inspectedLead?.id === id) {
        setInspectedLead(updated);
      }
      await onRefresh();
    } catch (err) {
      console.error(err);
      setActionError(t("statusActionFailed"));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSaveNotes() {
    if (!inspectedLead) return;
    setSavingNotes(true);
    setSaveNotesSuccess(null);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/swim/leads/${inspectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          details: {
            equipment: inspectedLead.details?.equipment,
            demographics: inspectedLead.details?.demographics,
            formation: inspectedLead.details?.formation || {
              slug: inspectedLead.duration || "chasse-sous-marine",
              title: inspectedLead.formula || "Formation Chasse Sous-marine",
            },
            userNotes: editingNotes.trim(),
          },
          notes: editingNotes.trim(),
        }),
      });
      if (!res.ok) {
        setActionError(t("statusActionFailed"));
        return;
      }
      const updated: FormationLeadRow = await res.json();
      setInspectedLead(updated);
      setSaveNotesSuccess(t("saveNotesSuccess"));
      await onRefresh();
    } catch (err) {
      console.error(err);
      setActionError(t("statusActionFailed"));
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setUpdatingId(targetId);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/swim/leads/${targetId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setActionError(t("statusActionFailed"));
        return;
      }
      if (inspectedLead?.id === targetId) {
        setInspectedLead(null);
      }
      setDeleteTarget(null);
      await onRefresh();
    } catch (err) {
      console.error(err);
      setActionError(t("statusActionFailed"));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newFullName.trim() || !newPhone.trim()) return;
    setSubmittingAdd(true);
    setActionError(null);
    try {
      const chosenFormation =
        formationOptions.find((f) => f.slug === newFormationSlug) || KNOWN_FORMATIONS[0];
      const res = await fetch("/api/admin/swim/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newFullName.trim(),
          phone: newPhone.trim(),
          whatsapp: newWhatsapp.trim() || newPhone.trim(),
          email: newEmail.trim() || null,
          age: newAge.trim() || null,
          city: newCity.trim() || null,
          category: "formation",
          level: newSpearExp,
          frequency: "formation",
          formula: chosenFormation.title,
          duration: chosenFormation.slug,
          preferredDays: newSchedule,
          channel: newChannel.trim() || "Admin Direct",
          notes: newNotes.trim() || null,
          formation: {
            slug: chosenFormation.slug,
            title: chosenFormation.title,
            swimLevel: newSwimLevel,
            apneaExperience: newApneaExp,
            spearfishingExperience: newSpearExp,
            hasGear: newGear,
            preferredSchedule: newSchedule,
            lang: locale,
          },
        }),
      });

      if (!res.ok) {
        setActionError(t("statusActionFailed"));
        return;
      }

      setShowAddModal(false);
      setNewFullName("");
      setNewPhone("");
      setNewWhatsapp("");
      setNewEmail("");
      setNewAge("");
      setNewCity("");
      setNewNotes("");
      await onRefresh();
    } catch (err) {
      console.error(err);
      setActionError(t("statusActionFailed"));
    } finally {
      setSubmittingAdd(false);
    }
  }

  function handleExportCsv() {
    const escapeCell = (val: string | number | null | undefined) => {
      const str = val === null || val === undefined ? "" : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };
    const headers = [
      "Full Name",
      "Phone",
      "WhatsApp",
      "Email",
      "City",
      "Age",
      "Formation",
      "Swim Level",
      "Apnea Experience",
      "Spearfishing Experience",
      "Personal Gear",
      "Preferred Schedule",
      "Channel",
      "Status",
      "Notes",
      "Created At",
    ];
    const rows = filteredLeads.map((l) => {
      const demo = l.details?.demographics;
      const form = l.details?.formation;
      return [
        escapeCell(l.fullName),
        escapeCell(l.phone),
        escapeCell(demo?.whatsapp || ""),
        escapeCell(l.email || ""),
        escapeCell(demo?.city || ""),
        escapeCell(demo?.age ?? ""),
        escapeCell(form?.title || l.formula),
        escapeCell(form?.swimLevel || ""),
        escapeCell(form?.apneaExperience || ""),
        escapeCell(form?.spearfishingExperience || l.level),
        escapeCell(form?.hasGear || ""),
        escapeCell(form?.preferredSchedule || l.preferredDays || ""),
        escapeCell(demo?.channel || ""),
        escapeCell(l.status),
        escapeCell(l.details?.userNotes || cleanLeadNotesDisplay(l.notes)),
        escapeCell(formatDate(l.createdAt, locale, true)),
      ].join(",");
    });
    const csv = `\uFEFF${headers.map(escapeCell).join(",")}\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aqa_formations_leads_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div dir={dir} className="space-y-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportCsv}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{t("exportCsv")}</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
              {t("addLeadBtn")}
            </Button>
          </div>
        }
      />

      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={t("kpiTotal")}
          value={stats.total}
          animated
          hint={t("kpiTotalHint")}
        />
        <StatCard
          label={t("kpiPending")}
          value={stats.pending}
          animated
          hint={t("kpiPendingHint")}
        />
        <StatCard
          label={t("kpiCalled")}
          value={stats.called}
          animated
          hint={t("kpiCalledHint")}
        />
        <StatCard
          label={t("kpiConfirmed")}
          value={stats.confirmed}
          animated
          hint={t("kpiConfirmedHint")}
        />
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] gap-1">
            {(["pending", "called", "confirmed", "rejected", "all"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[36px] ${
                  statusFilter === st
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
                }`}
              >
                {st === "pending"
                  ? t("statusPending")
                  : st === "called"
                  ? t("statusCalled")
                  : st === "confirmed"
                  ? t("statusConfirmed")
                  : st === "rejected"
                  ? t("statusRejected")
                  : t("statusAll")}
              </button>
            ))}
          </div>

          <select
            value={formationFilter}
            onChange={(e) => setFormationFilter(e.target.value)}
            className="min-h-[38px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-[var(--accent)] cursor-pointer"
          >
            <option value="all">{t("allFormations")}</option>
            {formationOptions.map((opt) => (
              <option key={opt.slug} value={opt.slug}>
                {opt.title}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full lg:w-72">
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                <th className="py-3 px-4 text-start">{t("colApplicant")}</th>
                <th className="py-3 px-4 text-start">{t("colFormation")}</th>
                <th className="py-3 px-4 text-start">{t("colProfile")}</th>
                <th className="py-3 px-4 text-start">{t("colAvailability")}</th>
                <th className="py-3 px-4 text-start">{t("colStatus")}</th>
                <th className="py-3 px-4 text-start">{t("colReceived")}</th>
                <th className="py-3 px-4 text-end">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[var(--muted)]">
                    {t("loadingLeads")}
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6">
                    <EmptyState title={t("emptyTitle")} description={t("emptyDesc")} />
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const demo = lead.details?.demographics;
                  const form = lead.details?.formation;
                  const cleanNotes = lead.details?.userNotes || cleanLeadNotesDisplay(lead.notes);
                  const waUrl = buildWhatsAppUrl(lead);
                  const formationTitle = form?.title || lead.formula || t("formationChasse");
                  const isBusy = updatingId === lead.id;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => openInspector(lead)}
                      className="hover:bg-cyan-500/[0.04] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {lead.fullName}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                          {lead.phone ? (
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-cyan-400 hover:underline font-mono"
                              dir="ltr"
                            >
                              {lead.phone}
                            </a>
                          ) : (
                            <span className="italic text-slate-500">{t("noPhone")}</span>
                          )}
                          {lead.email ? <span>· {lead.email}</span> : null}
                          {demo?.city ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                              {demo.city}
                            </span>
                          ) : null}
                          {demo?.age ? (
                            <span className="text-slate-400 text-[10px] font-mono">
                              {demo.age} {t("yearsSuffix")}
                            </span>
                          ) : null}
                          {demo?.channel ? (
                            <span className="text-[10px] text-slate-500">
                              {t("viaPrefix")} {demo.channel}
                            </span>
                          ) : null}
                        </div>
                        {cleanNotes ? (
                          <p className="mt-1 text-[10px] text-slate-300 italic line-clamp-1">
                            &ldquo;{cleanNotes}&rdquo;
                          </p>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <Badge tone="info" size="sm">
                          {formationTitle}
                        </Badge>
                        {form?.lang ? (
                          <div className="mt-1 text-[10px] text-[var(--muted)] uppercase font-mono">
                            {t("langLabel")}: {form.lang}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 align-top space-y-1">
                        <div className="text-slate-200">
                          <span className="text-[var(--muted)]">{t("swimLevelLabel")}:</span>{" "}
                          <span className="font-semibold">{translateSwimLevel(form?.swimLevel)}</span>
                        </div>
                        <div className="text-slate-200">
                          <span className="text-[var(--muted)]">{t("spearfishingExpLabel")}:</span>{" "}
                          <span className="font-semibold">
                            {translateExperience(form?.spearfishingExperience || lead.level)}
                          </span>
                        </div>
                        {form?.hasGear ? (
                          <div className="text-[11px] text-cyan-300/90">
                            {t("gearLabel")}: {translateGear(form.hasGear)}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 align-top text-slate-200">
                        {translateSchedule(form?.preferredSchedule || lead.preferredDays)}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <Badge tone={statusTone(lead.status)} size="sm">
                          {statusLabel(lead.status)}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 align-top font-mono text-[11px] text-[var(--muted)]" dir="ltr">
                        {formatDate(lead.createdAt, locale, true)}
                      </td>

                      <td
                        className="py-3.5 px-4 align-top text-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          {waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors"
                            >
                              {t("whatsappBtn")}
                            </a>
                          ) : null}

                          {lead.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={isBusy}
                              onClick={() => handleStatusChange(lead.id, "called")}
                            >
                              {t("markCalledBtn")}
                            </Button>
                          ) : null}

                          {lead.status !== "confirmed" ? (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={isBusy}
                              onClick={() => handleStatusChange(lead.id, "confirmed")}
                            >
                              {t("confirmBtn")}
                            </Button>
                          ) : null}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openInspector(lead)}
                          >
                            {t("inspectBtn")}
                          </Button>

                          <Button
                            size="sm"
                            variant="danger"
                            disabled={isBusy}
                            onClick={() => setDeleteTarget(lead)}
                          >
                            {t("deleteBtn")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inspector Modal / Drawer */}
      {inspectedLead ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setInspectedLead(null)}
        >
          <div
            className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]/50 sticky top-0 backdrop-blur-md">
              <div>
                <h3 className="text-lg font-bold text-white">{t("drawerTitle")}</h3>
                <p className="text-xs text-[var(--muted)]">{t("drawerSubtitle")}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setInspectedLead(null)}>
                {t("closeBtn")}
              </Button>
            </div>

            <div className="p-5 space-y-5 text-xs">
              {/* Top summary & status controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
                <div>
                  <div className="text-base font-bold text-white">{inspectedLead.fullName}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone="info">
                      {inspectedLead.details?.formation?.title || inspectedLead.formula}
                    </Badge>
                    <Badge tone={statusTone(inspectedLead.status)}>
                      {statusLabel(inspectedLead.status)}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["pending", "called", "confirmed", "rejected"] as const).map((st) => (
                    <Button
                      key={st}
                      size="sm"
                      variant={inspectedLead.status === st ? "primary" : "secondary"}
                      disabled={updatingId === inspectedLead.id || inspectedLead.status === st}
                      onClick={() => handleStatusChange(inspectedLead.id, st)}
                    >
                      {st === "pending"
                        ? t("resetPendingBtn")
                        : st === "called"
                        ? t("markCalledBtn")
                        : st === "confirmed"
                        ? t("confirmBtn")
                        : t("rejectBtn")}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Contact & Identity */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/20 p-4 space-y-3">
                <h4 className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">
                  {t("sectionContact")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[var(--muted)] block">{t("fieldPhoneLabel")}</span>
                    <a
                      href={`tel:${inspectedLead.phone}`}
                      className="font-mono text-sm text-cyan-400 hover:underline"
                      dir="ltr"
                    >
                      {inspectedLead.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">{t("fieldWhatsapp")}</span>
                    <span className="font-mono text-slate-200" dir="ltr">
                      {inspectedLead.details?.demographics?.whatsapp || inspectedLead.phone || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">{t("fieldEmailLabel")}</span>
                    <span className="text-slate-200">{inspectedLead.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">{t("fieldCityLabel")}</span>
                    <span className="text-slate-200">
                      {inspectedLead.details?.demographics?.city || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">{t("fieldAgeLabel")}</span>
                    <span className="text-slate-200 font-mono">
                      {inspectedLead.details?.demographics?.age
                        ? `${inspectedLead.details.demographics.age} ${t("yearsSuffix")}`
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">{t("fieldChannelLabel")}</span>
                    <span className="text-slate-200">
                      {inspectedLead.details?.demographics?.channel
                        ? inspectedLead.details.demographics.channelOther
                          ? `${inspectedLead.details.demographics.channel} (${inspectedLead.details.demographics.channelOther})`
                          : inspectedLead.details.demographics.channel
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Profile */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/20 p-4 space-y-3">
                <h4 className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">
                  {t("sectionProfile")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[var(--muted)] block">{t("swimLevelLabel")}</span>
                    <span className="text-slate-100 font-semibold">
                      {translateSwimLevel(inspectedLead.details?.formation?.swimLevel)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">{t("apneaExpLabel")}</span>
                    <span className="text-slate-100 font-semibold">
                      {translateExperience(inspectedLead.details?.formation?.apneaExperience)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">{t("spearfishingExpLabel")}</span>
                    <span className="text-slate-100 font-semibold">
                      {translateExperience(
                        inspectedLead.details?.formation?.spearfishingExperience || inspectedLead.level
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">{t("gearLabel")}</span>
                    <span className="text-slate-100 font-semibold">
                      {translateGear(inspectedLead.details?.formation?.hasGear)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">{t("colAvailability")}</span>
                    <span className="text-slate-100 font-semibold">
                      {translateSchedule(
                        inspectedLead.details?.formation?.preferredSchedule || inspectedLead.preferredDays
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] block">{t("colReceived")}</span>
                    <span className="text-slate-100 font-mono" dir="ltr">
                      {formatDate(inspectedLead.createdAt, locale, true)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes Editor */}
              <div className="space-y-2">
                <Textarea
                  label={t("sectionNotes")}
                  placeholder={t("notesPlaceholder")}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  rows={4}
                />
                {saveNotesSuccess ? <Alert tone="success">{saveNotesSuccess}</Alert> : null}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteTarget(inspectedLead)}
                  >
                    {t("deleteBtn")}
                  </Button>
                  <div className="flex items-center gap-2">
                    {buildWhatsAppUrl(inspectedLead) ? (
                      <a
                        href={buildWhatsAppUrl(inspectedLead) || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors min-h-[36px]"
                      >
                        {t("whatsappBtn")}
                      </a>
                    ) : null}
                    <Button
                      variant="primary"
                      size="sm"
                      loading={savingNotes}
                      onClick={handleSaveNotes}
                    >
                      {savingNotes ? t("savingBtn") : t("saveNotesBtn")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Manual Add Modal */}
      {showAddModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]/50">
              <h3 className="text-base font-bold text-white">{t("modalAddTitle")}</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowAddModal(false)}>
                {t("closeBtn")}
              </Button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t("fieldFullName")}
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  required
                />
                <Input
                  label={t("fieldPhone")}
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                />
                <Input
                  label={t("fieldWhatsapp")}
                  value={newWhatsapp}
                  onChange={(e) => setNewWhatsapp(e.target.value)}
                />
                <Input
                  label={t("fieldEmail")}
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <Input
                  label={t("fieldAge")}
                  type="number"
                  min={12}
                  max={85}
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value)}
                />
                <Input
                  label={t("fieldCity")}
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                />
                <Select
                  label={t("fieldFormation")}
                  value={newFormationSlug}
                  onChange={(e) => setNewFormationSlug(e.target.value)}
                >
                  {formationOptions.map((opt) => (
                    <option key={opt.slug} value={opt.slug}>
                      {opt.title}
                    </option>
                  ))}
                </Select>
                <Select
                  label={t("fieldSwimLevel")}
                  value={newSwimLevel}
                  onChange={(e) => setNewSwimLevel(e.target.value)}
                >
                  <option value="beginner">{t("lvlBeginner")}</option>
                  <option value="intermediate">{t("lvlIntermediate")}</option>
                  <option value="advanced">{t("lvlAdvanced")}</option>
                </Select>
                <Select
                  label={t("fieldApneaExp")}
                  value={newApneaExp}
                  onChange={(e) => setNewApneaExp(e.target.value)}
                >
                  <option value="none">{t("expNone")}</option>
                  <option value="initiation">{t("expInitiation")}</option>
                  <option value="intermediate">{t("expIntermediate")}</option>
                  <option value="advanced">{t("expAdvanced")}</option>
                </Select>
                <Select
                  label={t("fieldSpearExp")}
                  value={newSpearExp}
                  onChange={(e) => setNewSpearExp(e.target.value)}
                >
                  <option value="none">{t("expNone")}</option>
                  <option value="initiation">{t("expInitiation")}</option>
                  <option value="intermediate">{t("expIntermediate")}</option>
                  <option value="advanced">{t("expAdvanced")}</option>
                </Select>
                <Select
                  label={t("fieldGear")}
                  value={newGear}
                  onChange={(e) => setNewGear(e.target.value)}
                >
                  <option value="none">{t("gearNone")}</option>
                  <option value="partial">{t("gearPartial")}</option>
                  <option value="complete">{t("gearComplete")}</option>
                </Select>
                <Select
                  label={t("fieldSchedule")}
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value)}
                >
                  <option value="weekend">{t("schedWeekend")}</option>
                  <option value="weekdays">{t("schedWeekdays")}</option>
                  <option value="flexible">{t("schedFlexible")}</option>
                </Select>
              </div>
              <Input
                label={t("fieldChannel")}
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
              />
              <Textarea
                label={t("fieldNotes")}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                  {t("cancelBtn")}
                </Button>
                <Button type="submit" variant="primary" loading={submittingAdd}>
                  {submittingAdd ? t("creatingLeadBtn") : t("createLeadBtn")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={t("deleteConfirmTitle")}
        message={t("deleteConfirmMsg").replace("{name}", deleteTarget?.fullName || "")}
        confirmLabel={t("deleteConfirmBtn")}
        cancelLabel={t("cancelBtn")}
        isDanger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
