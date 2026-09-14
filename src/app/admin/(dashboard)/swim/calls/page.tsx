"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, StatCard, Card, Badge, Button, Input } from "@/components/admin/ui";
import { useTranslations, formatDate } from "@/lib/i18n";
import {
  formatWhatsAppReinscriptionUrl,
  SwimCallOutcome,
  SwimCallRecord,
  SwimCallStatus,
  ReinscriptionIntent,
} from "@/lib/swim-calls";
import { getSwimLevelLabel } from "@/lib/swim-groups";
import { HommeRosterImportModal } from "@/components/admin/swim/HommeRosterImportModal";

interface SwimGroupOption {
  id: string;
  name: string;
  category: string;
  level: string;
  coachName: string | null;
  schedule?: string;
  active: boolean;
}

interface StatsData {
  totalPipeline: number;
  toCall: number;
  callbackScheduled: number;
  interested: number;
  reinscribed: number;
  unreachable: number;
  declined: number;
  dueToday: number;
  conversionRate: number;
}

export default function SwimCallsPage() {
  const router = useRouter();
  const { t, locale } = useTranslations("swimCalls");

  const [records, setRecords] = useState<SwimCallRecord[]>([]);
  const [groups, setGroups] = useState<SwimGroupOption[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalPipeline: 0,
    toCall: 0,
    callbackScheduled: 0,
    interested: 0,
    reinscribed: 0,
    unreachable: 0,
    declined: 0,
    dueToday: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Log Call Modal State
  const [activeCallTarget, setActiveCallTarget] = useState<SwimCallRecord | null>(null);
  const [modalOutcome, setModalOutcome] = useState<SwimCallOutcome>("answered_interested");
  const [modalIntent, setModalIntent] = useState<ReinscriptionIntent>("medium");
  const [modalObservation, setModalObservation] = useState("");
  const [modalCallbackDate, setModalCallbackDate] = useState("");
  const [modalProposedFormula, setModalProposedFormula] = useState("");
  const [modalProposedDuration, setModalProposedDuration] = useState("");
  const [modalProposedGroupId, setModalProposedGroupId] = useState("");
  const [submittingCall, setSubmittingCall] = useState(false);
  const [callSuccessMessage, setCallSuccessMessage] = useState<string | null>(null);

  // Reinscription Modal State
  const [reinscribeTarget, setReinscribeTarget] = useState<SwimCallRecord | null>(null);
  const [reinscribeFormula, setReinscribeFormula] = useState("G10");
  const [reinscribeDuration, setReinscribeDuration] = useState("3m");
  const [reinscribeStartDate, setReinscribeStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reinscribeGroupId, setReinscribeGroupId] = useState("");
  const [reinscribePrice, setReinscribePrice] = useState("");
  const [reinscribeNotes, setReinscribeNotes] = useState("");
  const [submittingReinscribe, setSubmittingReinscribe] = useState(false);
  const [reinscribeSuccessMsg, setReinscribeSuccessMsg] = useState<string | null>(null);

  // WhatsApp Preview Modal State
  const [whatsappPreviewTarget, setWhatsappPreviewTarget] = useState<SwimCallRecord | null>(null);
  const [copiedWA, setCopiedWA] = useState(false);

  // History Drawer State
  const [historyTarget, setHistoryTarget] = useState<SwimCallRecord | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (categoryFilter !== "all") query.set("category", categoryFilter);
      if (urgencyFilter !== "all") query.set("urgency", urgencyFilter);
      if (searchTerm.trim()) query.set("q", searchTerm.trim());

      const [callsRes, groupsRes] = await Promise.all([
        fetch(`/api/admin/swim/calls?${query.toString()}`),
        fetch("/api/admin/swim/groups?active=true"),
      ]);

      if (callsRes.ok) {
        const data = await callsRes.json();
        setRecords(data.records || []);
        if (data.stats) setStats(data.stats);
      }
      if (groupsRes.ok) {
        const grp = await groupsRes.json();
        setGroups(grp || []);
      }
    } catch (err) {
      console.error("Failed to load swim calls data:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, urgencyFilter, searchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(handler);
  }, [loadData]);

  function handleOpenLogModal(record: SwimCallRecord) {
    setActiveCallTarget(record);
    setModalOutcome("answered_interested");
    setModalIntent(record.reinscriptionIntent || "medium");
    setModalObservation("");
    setModalCallbackDate(record.callbackDate ? record.callbackDate.slice(0, 16) : "");
    setModalProposedFormula(record.proposedFormula || record.formula || "G10");
    setModalProposedDuration(record.proposedDuration || record.duration || "3m");
    setModalProposedGroupId(record.proposedGroupId || record.groupId || "");
    setCallSuccessMessage(null);
  }

  async function handleLogCallSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCallTarget || !modalObservation.trim()) return;

    setSubmittingCall(true);
    try {
      const res = await fetch("/api/admin/swim/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: activeCallTarget.entityId,
          outcome: modalOutcome,
          observation: modalObservation.trim(),
          reinscriptionIntent: modalIntent,
          callbackDate: modalCallbackDate ? new Date(modalCallbackDate).toISOString() : null,
          proposedFormula: modalProposedFormula || null,
          proposedDuration: modalProposedDuration || null,
          proposedGroupId: modalProposedGroupId || null,
        }),
      });

      if (res.ok) {
        setCallSuccessMessage("Call logged successfully.");
        setTimeout(() => {
          setActiveCallTarget(null);
          setCallSuccessMessage(null);
          loadData();
        }, 1000);
      }
    } catch (err) {
      console.error("Error logging call:", err);
    } finally {
      setSubmittingCall(false);
    }
  }

  function handleOpenReinscribeModal(record: SwimCallRecord) {
    setReinscribeTarget(record);
    setReinscribeFormula(record.proposedFormula || record.formula || "G10");
    setReinscribeDuration(record.proposedDuration || record.duration || "3m");
    setReinscribeStartDate(new Date().toISOString().split("T")[0]);
    setReinscribeGroupId(record.proposedGroupId || record.groupId || "");
    setReinscribePrice("");
    setReinscribeNotes("");
    setReinscribeSuccessMsg(null);
  }

  async function handleConfirmReinscribeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reinscribeTarget) return;

    setSubmittingReinscribe(true);
    try {
      const res = await fetch("/api/admin/swim/calls/reinscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: reinscribeTarget.entityId,
          formula: reinscribeFormula,
          duration: reinscribeDuration,
          dateOfStart: reinscribeStartDate,
          groupId: reinscribeGroupId || null,
          priceDA: reinscribePrice ? parseInt(reinscribePrice, 10) : undefined,
          notes: reinscribeNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        setReinscribeSuccessMsg("Reinscription confirmed successfully.");
        setTimeout(() => {
          setReinscribeTarget(null);
          setReinscribeSuccessMsg(null);
          loadData();
        }, 1200);
      }
    } catch (err) {
      console.error("Failed to confirm reinscription:", err);
    } finally {
      setSubmittingReinscribe(false);
    }
  }

  async function handleQuickStatusChange(recordId: string, newStatus: SwimCallStatus) {
    try {
      const res = await fetch(`/api/admin/swim/calls/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error("Quick status change failed:", err);
    }
  }

  function handleExportCSV() {
    if (records.length === 0) return;
    const headers = [
      "Full Name",
      "Swim ID",
      "Phone",
      "Category",
      "Level",
      "Formula",
      "Duration",
      "Start Date",
      "Expiration Date",
      "Call Status",
      "Intent",
      "Callback Date",
      "Last Observation",
    ];

    const rows = records.map((r) => [
      `"${r.fullName.replace(/"/g, '""')}"`,
      r.swimId || "",
      `"${r.phone}"`,
      r.category,
      r.level,
      r.formula,
      r.duration,
      r.dateOfStart ? r.dateOfStart.split("T")[0] : "",
      r.expirationDate ? r.expirationDate.split("T")[0] : "",
      r.status,
      r.reinscriptionIntent,
      r.callbackDate ? r.callbackDate.split("T")[0] : "",
      `"${(r.lastObservation || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aqa_swim_reinscription_calls_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function getStatusBadge(status: SwimCallStatus) {
    switch (status) {
      case "to_call":
        return <Badge tone="warning">{t("statusToCall")}</Badge>;
      case "callback_scheduled":
        return <Badge tone="info">{t("statusCallback")}</Badge>;
      case "interested":
        return <Badge tone="success">{t("statusInterested")}</Badge>;
      case "reinscribed":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
            {t("statusReinscribed")}
          </span>
        );
      case "unreachable":
        return <Badge tone="default">{t("statusUnreachable")}</Badge>;
      case "declined":
        return <Badge tone="danger">{t("statusDeclined")}</Badge>;
      default:
        return <Badge tone="default">{status}</Badge>;
    }
  }

  function getUrgencyBadge(urgency: string) {
    switch (urgency) {
      case "overdue":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-950/80 text-red-400 border border-red-800/40">
            {t("overdue")}
          </span>
        );
      case "due_today":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/40">
            {t("dueToday")}
          </span>
        );
      case "expiring_soon":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/40">
            {t("expiringSoon")}
          </span>
        );
      case "active":
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {t("active")}
          </span>
        );
    }
  }

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "homme", label: "Homme" },
    { value: "femme", label: "Femme" },
    { value: "enfants", label: "Enfants" },
    { value: "apnea", label: "Apnee" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={
          t("subtitle")
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setShowImportModal(true)} variant="primary">
              Import Homme Roster
            </Button>
            <Button onClick={() => router.push("/admin/swim")} variant="secondary">
              Back to Overview
            </Button>
            <Button onClick={handleExportCSV} variant="secondary">
              Export Call Sheet
            </Button>
          </div>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label={t("statTotal")}
          value={stats.totalPipeline}
          animated
          hint="Swimmers targeted for renewal"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("statDueToday")}
          value={stats.dueToday}
          animated
          hint="Requires immediate call"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("statusCallback")}
          value={stats.callbackScheduled}
          animated
          hint="Promised return calls"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          }
        />
        <StatCard
          label={t("statInterested")}
          value={stats.interested}
          animated
          hint="High potential for conversion"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
          }
        />
        <StatCard
          label={t("statReinscribed")}
          value={`${stats.reinscribed} (${stats.conversionRate}%)`}
          animated
          hint="Successfully renewed"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Main Tabs and Filter Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex flex-wrap bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] gap-1">
            {[
              { key: "all", label: t("statusAll"), count: stats.totalPipeline },
              { key: "to_call", label: t("statusToCall"), count: stats.toCall },
              { key: "callback_scheduled", label: t("statusCallback"), count: stats.callbackScheduled },
              { key: "interested", label: t("statusInterested"), count: stats.interested },
              { key: "reinscribed", label: t("statusReinscribed"), count: stats.reinscribed },
              { key: "unreachable", label: t("statusUnreachable"), count: stats.unreachable },
              { key: "declined", label: t("statusDeclined"), count: stats.declined },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  statusFilter === tab.key
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 text-slate-300">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Urgency Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="bg-[var(--surface)] text-xs text-white border border-[var(--border)] rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--primary)]"
            >
              <option value="all">All Urgencies</option>
              <option value="due_today">Due Today</option>
              <option value="overdue">Overdue</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="active">Active</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[var(--surface)] text-xs text-white border border-[var(--border)] rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--primary)]"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search by swimmer name, phone, swim ID, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-xs text-[var(--muted)]">
            Showing <span className="font-semibold text-white">{records.length}</span> clients
          </div>
        </div>
      </div>

      {/* Main Calling Roster Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-wider">
                <th className="py-3 px-3">{t("client")}</th>
                <th className="py-3 px-3">{t("categoryLevel")}</th>
                <th className="py-3 px-3">{t("formulaValidity")}</th>
                <th className="py-3 px-3">{t("assignedGroup")}</th>
                <th className="py-3 px-3">{t("callStatus")}</th>
                <th className="py-3 px-3 min-w-[220px]">{t("lastObservation")}</th>
                <th className="py-3 px-3 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--muted)] animate-pulse">
                    Loading calling pipeline...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--muted)]">
                    {t("noRecords")}
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isReinscribed = r.status === "reinscribed";
                  return (
                    <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                      {/* Swimmer Name & Phone */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white text-sm">
                          {r.swimId ? (
                            <Link
                              href={`/admin/swim/members/${r.swimId}`}
                              className="hover:text-[var(--primary)] transition-colors inline-flex items-center gap-1.5"
                            >
                              <span>{r.fullName}</span>
                              <span className="text-[10px] text-[var(--muted)] font-mono">
                                ({r.swimId})
                              </span>
                            </Link>
                          ) : (
                            <span>{r.fullName}</span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--muted)] font-mono flex items-center gap-2 mt-0.5">
                          <span>{r.phone}</span>
                        </div>
                      </td>

                      {/* Category & Level */}
                      <td className="py-3 px-3">
                        <div className="capitalize text-slate-200 font-medium">
                          {r.category}
                        </div>
                        <div className="text-[11px] text-[var(--muted)]">
                          {getSwimLevelLabel(r.level)}
                        </div>
                      </td>

                      {/* Formula & Expiration Date */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">
                          {r.formula} ({r.duration})
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[11px] text-[var(--muted)]">
                            Expires: {r.expirationDate ? formatDate(r.expirationDate, locale) : "—"}
                          </span>
                          {getUrgencyBadge((r as unknown as { urgency: string }).urgency)}
                        </div>
                      </td>

                      {/* Group & Coach */}
                      <td className="py-3 px-3">
                        {r.groupName ? (
                          <div>
                            <span className="text-slate-200 font-medium">{r.groupName}</span>
                            {r.coachName && (
                              <div className="text-[11px] text-[var(--muted)]">Coach: {r.coachName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Status & Scheduled Callback */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(r.status)}
                            <select
                              value={r.status}
                              onChange={(e) => handleQuickStatusChange(r.id, e.target.value as SwimCallStatus)}
                              className="bg-slate-900 border border-[var(--border)] rounded px-1.5 py-0.5 text-[10px] text-slate-300 outline-none focus:border-[var(--primary)]"
                            >
                              <option value="to_call">To Call</option>
                              <option value="callback_scheduled">Callback</option>
                              <option value="interested">Interested</option>
                              <option value="reinscribed">Reinscribed</option>
                              <option value="unreachable">Unreachable</option>
                              <option value="declined">Declined</option>
                            </select>
                          </div>
                          {r.callbackDate && (
                            <div className="text-[10px] text-sky-400 font-mono flex items-center gap-1">
                              <span>Callback: {formatDate(r.callbackDate, locale, true)}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Latest Observation */}
                      <td className="py-3 px-3">
                        {r.lastObservation ? (
                          <div className="space-y-1">
                            <p className="text-slate-300 text-xs line-clamp-2 italic">
                              {`"${r.lastObservation}"`}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                              <span>{r.lastCalledAt ? formatDate(r.lastCalledAt, locale, true) : ""}</span>
                              {r.callHistory && r.callHistory.length > 0 && (
                                <button
                                  onClick={() => setHistoryTarget(r)}
                                  className="text-[var(--primary)] hover:underline font-medium"
                                >
                                  {r.callHistory.length} call{r.callHistory.length > 1 ? "s" : ""}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-xs">No observation recorded</span>
                        )}
                      </td>

                      {/* Fast Action Buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Direct Call Button */}
                          <a
                            href={`tel:${r.phone}`}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                            title="Call Phone"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>

                          {/* WhatsApp Template Button */}
                          <button
                            onClick={() => setWhatsappPreviewTarget(r)}
                            className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/50 transition-colors"
                            title="Send WhatsApp Reinscription"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </button>

                          {/* Log Call & Observation */}
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenLogModal(r)}
                          >
                            Log Call
                          </Button>

                          {/* Reinscribe Confirm Action */}
                          {!isReinscribed && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenReinscribeModal(r)}
                            >
                              Reinscribe
                            </Button>
                          )}
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

      {/* ─── MODAL: LOG CALL & OBSERVATION ─────────────────────────────────────────── */}
      {activeCallTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-slate-900/50">
              <div>
                <h3 className="text-base font-bold text-white">
                  {t("modalLogCallTitle")}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {activeCallTarget.fullName} · {activeCallTarget.phone} ({activeCallTarget.formula} - {activeCallTarget.duration})
                </p>
              </div>
              <button
                onClick={() => setActiveCallTarget(null)}
                className="text-[var(--muted)] hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogCallSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {callSuccessMessage && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 rounded-lg text-xs font-semibold">
                  {callSuccessMessage}
                </div>
              )}

              {/* Outcome Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Call Outcome *
                </label>
                <select
                  value={modalOutcome}
                  onChange={(e) => setModalOutcome(e.target.value as SwimCallOutcome)}
                  className="w-full bg-slate-900 border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[var(--primary)]"
                >
                  <option value="answered_interested">Answered - Interested in Reinscription</option>
                  <option value="answered_callback">Answered - Requested Callback Later</option>
                  <option value="answered_reinscribed">Answered - Confirmed Reinscription</option>
                  <option value="answered_declined">Answered - Declined / Not Interested</option>
                  <option value="no_answer">No Answer / Voicemail</option>
                  <option value="busy">Line Busy</option>
                  <option value="invalid_number">Invalid / Unreachable Number</option>
                </select>
              </div>

              {/* Intent Level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reinscription Intent
                  </label>
                  <select
                    value={modalIntent}
                    onChange={(e) => setModalIntent(e.target.value as ReinscriptionIntent)}
                    className="w-full bg-slate-900 border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[var(--primary)]"
                  >
                    <option value="high">High (Ready to re-inscribe)</option>
                    <option value="medium">Medium (Considering / warm)</option>
                    <option value="low">Low (Uncertain / hesitant)</option>
                    <option value="none">None (Declined)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Next Scheduled Callback
                  </label>
                  <input
                    type="datetime-local"
                    value={modalCallbackDate}
                    onChange={(e) => setModalCallbackDate(e.target.value)}
                    className="w-full bg-slate-900 border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Detailed Observation */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observation & Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record client feedback, preferred days/hours, objections, or notes discussed during the call..."
                  value={modalObservation}
                  onChange={(e) => setModalObservation(e.target.value)}
                  className="w-full bg-slate-900 border border-[var(--border)] rounded-lg p-3 text-xs text-white placeholder-[var(--muted)] outline-none focus:border-[var(--primary)]"
                />
              </div>

              {/* Proposed Adjustments (Optional) */}
              <div className="p-3 bg-slate-900/40 rounded-xl border border-[var(--border)] space-y-3">
                <div className="text-xs font-semibold text-slate-300">
                  Proposed Cycle Preferences (Optional)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[var(--muted)] mb-1">
                      Preferred Formula
                    </label>
                    <select
                      value={modalProposedFormula}
                      onChange={(e) => setModalProposedFormula(e.target.value)}
                      className="w-full bg-slate-950 border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="G10">G10</option>
                      <option value="MAX5">MAX5</option>
                      <option value="INDIVID">Individuel</option>
                      <option value="Decouverte">Decouverte</option>
                      <option value="Recommande">Recommande</option>
                      <option value="Economique">Economique</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--muted)] mb-1">
                      Target Group
                    </label>
                    <select
                      value={modalProposedGroupId}
                      onChange={(e) => setModalProposedGroupId(e.target.value)}
                      className="w-full bg-slate-950 border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="">Keep current / Unassigned</option>
                      {groups
                        .filter((g) => g.category === activeCallTarget.category)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Prior Call History Timeline */}
              {activeCallTarget.callHistory && activeCallTarget.callHistory.length > 0 && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <div className="text-xs font-bold text-slate-300 mb-2">
                    Prior Call History ({activeCallTarget.callHistory.length})
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {activeCallTarget.callHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-200 capitalize">
                            {entry.outcome.replace(/_/g, " ")}
                          </span>
                          <span className="text-[var(--muted)] font-mono">
                            {formatDate(entry.calledAt, locale, true)}
                          </span>
                        </div>
                        <p className="text-slate-300 italic">{`"${entry.observation}"`}</p>
                        <div className="text-[10px] text-slate-400">
                          Logged by: {entry.callerName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveCallTarget(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submittingCall}>
                  {submittingCall ? "Saving..." : "Save Call & Observation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONFIRM REINSCRIPTION ─────────────────────────────────────────── */}
      {reinscribeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-slate-900/50">
              <div>
                <h3 className="text-base font-bold text-white">
                  Confirm Swimmer Reinscription
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {reinscribeTarget.fullName} · {reinscribeTarget.swimId}
                </p>
              </div>
              <button
                onClick={() => setReinscribeTarget(null)}
                className="text-[var(--muted)] hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReinscribeSubmit} className="p-5 space-y-4">
              {reinscribeSuccessMsg && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 rounded-lg text-xs font-semibold">
                  {reinscribeSuccessMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Formula *
                  </label>
                  <select
                    value={reinscribeFormula}
                    onChange={(e) => setReinscribeFormula(e.target.value)}
                    className="w-full bg-slate-900 border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="G10">G10</option>
                    <option value="MAX5">MAX5</option>
                    <option value="INDIVID">Individuel</option>
                    <option value="Decouverte">Decouverte</option>
                    <option value="Recommande">Recommande</option>
                    <option value="Economique">Economique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Duration *
                  </label>
                  <select
                    value={reinscribeDuration}
                    onChange={(e) => setReinscribeDuration(e.target.value)}
                    className="w-full bg-slate-900 border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="1m">1 Month</option>
                    <option value="3m">3 Months</option>
                    <option value="6m">6 Months</option>
                    <option value="9m">9 Months</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    New Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={reinscribeStartDate}
                    onChange={(e) => setReinscribeStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Price (DA)
                  </label>
                  <input
                    type="number"
                    placeholder="Keep current or enter DA"
                    value={reinscribePrice}
                    onChange={(e) => setReinscribePrice(e.target.value)}
                    className="w-full bg-slate-900 border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Training Group
                </label>
                <select
                  value={reinscribeGroupId}
                  onChange={(e) => setReinscribeGroupId(e.target.value)}
                  className="w-full bg-slate-900 border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="">Keep current assignment</option>
                  {groups
                    .filter((g) => g.category === reinscribeTarget.category)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} (Coach: {g.coachName || "TBD"})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reinscription Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Swimmer renewed in person, cash payment promised next week..."
                  value={reinscribeNotes}
                  onChange={(e) => setReinscribeNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-[var(--border)] rounded-lg p-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReinscribeTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingReinscribe}
                >
                  {submittingReinscribe ? "Confirming..." : "Confirm & Renew"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: WHATSAPP MESSAGE PREVIEW ────────────────────────────────────────── */}
      {whatsappPreviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-slate-900/50">
              <h3 className="text-sm font-bold text-white">
                WhatsApp Reinscription Message
              </h3>
              <button
                onClick={() => setWhatsappPreviewTarget(null)}
                className="text-[var(--muted)] hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-xs text-[var(--muted)]">
                Recipient: <span className="text-white font-semibold">{whatsappPreviewTarget.fullName}</span> ({whatsappPreviewTarget.phone})
              </div>

              <div className="p-3.5 bg-emerald-950/40 rounded-xl border border-emerald-800/40 text-xs text-emerald-200 leading-relaxed font-sans">
                {`Salam ${whatsappPreviewTarget.fullName}, l'equipe AQA Swim vous contacte pour le renouvellement de votre inscription (formule ${whatsappPreviewTarget.formula}). Souhaitez-vous conserver votre creneau habituel ou ajuster votre formule pour la prochaine session ? N'hesitez pas a nous repondre ou a nous contacter directement.`}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const text = `Salam ${whatsappPreviewTarget.fullName}, l'equipe AQA Swim vous contacte pour le renouvellement de votre inscription (formule ${whatsappPreviewTarget.formula}). Souhaitez-vous conserver votre creneau habituel ou ajuster votre formule pour la prochaine session ? N'hesitez pas a nous repondre ou a nous contacter directement.`;
                    navigator.clipboard.writeText(text);
                    setCopiedWA(true);
                    setTimeout(() => setCopiedWA(false), 2000);
                  }}
                >
                  {copiedWA ? "Copied" : "Copy Message"}
                </Button>
                <a
                  href={formatWhatsAppReinscriptionUrl(
                    whatsappPreviewTarget.phone,
                    whatsappPreviewTarget.fullName,
                    whatsappPreviewTarget.formula
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors inline-flex items-center gap-1.5"
                >
                  Open WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: FULL CALL & OBSERVATION HISTORY ────────────────────────────────── */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-slate-900/50">
              <div>
                <h3 className="text-base font-bold text-white">
                  Call & Observation History
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {historyTarget.fullName} ({historyTarget.phone})
                </p>
              </div>
              <button
                onClick={() => setHistoryTarget(null)}
                className="text-[var(--muted)] hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              {!historyTarget.callHistory || historyTarget.callHistory.length === 0 ? (
                <div className="text-center py-8 text-[var(--muted)] text-xs">
                  No previous calls logged for this swimmer.
                </div>
              ) : (
                historyTarget.callHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-[var(--border)] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white capitalize text-xs">
                        {item.outcome.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-[var(--muted)] font-mono">
                        {formatDate(item.calledAt, locale, true)}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed italic">
                      {`"${item.observation}"`}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                      <span>Staff: {item.callerName}</span>
                      {item.callbackDate && (
                        <span className="text-sky-400">
                          Callback: {formatDate(item.callbackDate, locale, true)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] flex justify-end">
              <Button variant="secondary" onClick={() => setHistoryTarget(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Homme Roster Import Modal */}
      <HommeRosterImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          loadData();
          setShowImportModal(false);
        }}
      />
    </div>
  );
}
