"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StatCard, Card, Badge, Button, Input } from "@/components/admin/ui";
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

export function SwimCallsTab({
  initialSearch = "",
  onNavigateToSwimmer,
}: {
  initialSearch?: string;
  onNavigateToSwimmer?: (swimId: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters — safely read query param without throwing
  const qParam = searchParams ? searchParams.get("q") || "" : "";
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState(initialSearch || qParam);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

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

  // History Drawer State
  const [historyTarget, setHistoryTarget] = useState<SwimCallRecord | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Delete Swimmer Modal from Calls Desk
  const [deleteTarget, setDeleteTarget] = useState<SwimCallRecord | null>(null);
  const [deletingMember, setDeletingMember] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Debounce search input typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load groups on mount
  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/swim/groups?active=true")
      .then((res) => (res.ok ? res.json() : []))
      .then((grp) => {
        if (isMounted) setGroups(grp || []);
      })
      .catch((err) => console.error("Failed to load swim groups:", err));
    return () => {
      isMounted = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (categoryFilter !== "all") query.set("category", categoryFilter);
      if (urgencyFilter !== "all") query.set("urgency", urgencyFilter);
      if (debouncedSearchTerm.trim()) query.set("q", debouncedSearchTerm.trim());

      const callsRes = await fetch(`/api/admin/swim/calls?${query.toString()}`);
      if (callsRes.ok) {
        const data = await callsRes.json();
        setRecords(data.records || []);
        if (data.stats) setStats(data.stats);
      } else {
        const errData = await callsRes.json().catch(() => ({}));
        setFetchError(errData.error || "Failed to load call roster.");
      }
    } catch (err) {
      console.error("Failed to load swim calls data:", err);
      setFetchError("Network error while loading call records.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, urgencyFilter, debouncedSearchTerm]);

  useEffect(() => {
    loadData();
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
        }, 800);
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

  async function handleReinscribeSubmit(e: React.FormEvent) {
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
          startDate: reinscribeStartDate,
          groupId: reinscribeGroupId || null,
          priceDA: reinscribePrice ? parseInt(reinscribePrice, 10) : undefined,
          notes: reinscribeNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        setReinscribeSuccessMsg("Swimmer reinscribed successfully.");
        setTimeout(() => {
          setReinscribeTarget(null);
          setReinscribeSuccessMsg(null);
          loadData();
        }, 1000);
      }
    } catch (err) {
      console.error("Error reinscribing swimmer:", err);
    } finally {
      setSubmittingReinscribe(false);
    }
  }

  async function handleDeleteMember() {
    if (!deleteTarget) return;
    setDeletingMember(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/swim/members/${deleteTarget.entityId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete swimmer");
      }
      setDeleteTarget(null);
      loadData();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete swimmer");
    } finally {
      setDeletingMember(false);
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

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `aqa_swim_reinscription_calls_${new Date().toISOString().split("T")[0]}.csv`
    );
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

  function getUrgencyBadge(urgency?: string) {
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
    <div className="space-y-5">
      {/* Action Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-sm">
        <div>
          <h2 className="text-sm font-bold text-white font-display uppercase tracking-wider">
            {t("title")}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowImportModal(true)} variant="secondary" size="sm">
            Import Homme Roster
          </Button>
          <Button onClick={handleExportCSV} variant="secondary" size="sm">
            Export Call Sheet
          </Button>
        </div>
      </div>

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

      {/* Main Filter Tabs and Controls */}
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
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    statusFilter === tab.key
                      ? "bg-black/30 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Category and Urgency Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Expirations</option>
              <option value="due_today">Due Today & Overdue</option>
              <option value="expiring_soon">Expiring Soon (14d)</option>
              <option value="active">Active Subscriptions</option>
            </select>
          </div>
        </div>

        {/* Search Bar and Counter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
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

      {fetchError && (
        <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
          {fetchError}
        </div>
      )}

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
                  const waUrl = formatWhatsAppReinscriptionUrl(r.phone, r.fullName, r.formula);

                  return (
                    <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                      {/* Swimmer Name & Phone */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white text-sm">
                          {r.swimId ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateToSwimmer) {
                                  onNavigateToSwimmer(r.swimId!);
                                } else {
                                  router.push(`/admin/swim/members/${r.swimId}`);
                                }
                              }}
                              className="hover:text-[var(--primary)] text-left transition-colors inline-flex items-center gap-1.5"
                            >
                              <span>{r.fullName}</span>
                              <span className="text-[10px] text-[var(--muted)] font-mono">
                                ({r.swimId})
                              </span>
                            </button>
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
                          {getUrgencyBadge((r as unknown as { urgency?: string }).urgency)}
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
                          <span className="text-[var(--muted)] italic">Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">{getStatusBadge(r.status)}</td>

                      {/* Last Observation */}
                      <td className="py-3 px-3">
                        {r.lastObservation ? (
                          <div className="space-y-1">
                            <p className="text-xs text-slate-300 line-clamp-2 italic">
                              &ldquo;{r.lastObservation}&rdquo;
                            </p>
                            <div className="text-[10px] text-[var(--muted)] flex items-center gap-2">
                              {r.lastCalledAt && (
                                <span>Called {formatDate(r.lastCalledAt, locale)}</span>
                              )}
                              {r.callbackDate && (
                                <span className="text-amber-400 font-semibold">
                                  Callback: {formatDate(r.callbackDate, locale, true)}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--muted)] italic text-[11px]">
                            No calls logged yet
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-semibold text-xs transition-colors"
                          title="Open WhatsApp with renewal message"
                        >
                          WhatsApp
                        </a>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenLogModal(r)}
                        >
                          Log Call
                        </Button>

                        <Button
                          size="sm"
                          variant={isReinscribed ? "secondary" : "primary"}
                          onClick={() => handleOpenReinscribeModal(r)}
                        >
                          {isReinscribed ? "Reinscribed" : "Reinscribe"}
                        </Button>

                        {r.callHistory && r.callHistory.length > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setHistoryTarget(r)}
                          >
                            History ({r.callHistory.length})
                          </Button>
                        )}

                        {/* Quick Delete duplicate profile button */}
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(r);
                            setDeleteError(null);
                          }}
                          className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/70 text-rose-400 border border-rose-800/40 font-semibold text-xs transition-colors"
                          title="Delete duplicated profile"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log Call Modal */}
      {activeCallTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-display">
                  Log Call: {activeCallTarget.fullName}
                </h3>
                <p className="text-xs text-[var(--muted)] font-mono mt-0.5">
                  {activeCallTarget.phone} · {activeCallTarget.category} · {activeCallTarget.formula}
                </p>
              </div>
              <button
                onClick={() => setActiveCallTarget(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {callSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
                {callSuccessMessage}
              </div>
            )}

            <form onSubmit={handleLogCallSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--muted)] mb-1 font-semibold uppercase text-[10px]">
                  Call Outcome
                </label>
                <select
                  value={modalOutcome}
                  onChange={(e) => setModalOutcome(e.target.value as SwimCallOutcome)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-[var(--border)] text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="answered_interested">Answered — Highly Interested</option>
                  <option value="answered_callback">Answered — Scheduled Callback</option>
                  <option value="answered_reinscribed">Answered — Confirmed Reinscription</option>
                  <option value="answered_declined">Answered — Declined / Stopped</option>
                  <option value="no_answer">No Answer</option>
                  <option value="busy">Line Busy</option>
                  <option value="invalid_number">Invalid / Wrong Number</option>
                </select>
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1 font-semibold uppercase text-[10px]">
                  Renewal Intent
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["high", "medium", "low", "none"] as const).map((intent) => (
                    <button
                      key={intent}
                      type="button"
                      onClick={() => setModalIntent(intent)}
                      className={`py-1.5 px-2 rounded-lg capitalize text-xs font-semibold border transition-all ${
                        modalIntent === intent
                          ? intent === "high"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                            : intent === "medium"
                            ? "bg-sky-950 text-sky-300 border-sky-500"
                            : intent === "low"
                            ? "bg-amber-950 text-amber-300 border-amber-500"
                            : "bg-rose-950 text-rose-300 border-rose-500"
                          : "bg-slate-800 text-slate-400 border-transparent hover:text-white"
                      }`}
                    >
                      {intent}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1 font-semibold uppercase text-[10px]">
                  Call Observation & Notes <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={modalObservation}
                  onChange={(e) => setModalObservation(e.target.value)}
                  placeholder="Record client responses, requested slot, preferred days, reasons for delay..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-[var(--border)] text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted)] mb-1 font-semibold uppercase text-[10px]">
                    Schedule Callback (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={modalCallbackDate}
                    onChange={(e) => setModalCallbackDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-[var(--border)] text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--muted)] mb-1 font-semibold uppercase text-[10px]">
                    Target Training Group
                  </label>
                  <select
                    value={modalProposedGroupId}
                    onChange={(e) => setModalProposedGroupId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-[var(--border)] text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">Keep / No preference</option>
                    {groups
                      .filter((g) => g.category === activeCallTarget.category)
                      .map((grp) => (
                        <option key={grp.id} value={grp.id}>
                          {grp.name} ({grp.level})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveCallTarget(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submittingCall}>
                  {submittingCall ? "Saving..." : "Save Call Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reinscription Modal */}
      {reinscribeTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-display">
                  Confirm Reinscription: {reinscribeTarget.fullName}
                </h3>
                <p className="text-xs text-[var(--muted)] font-mono mt-0.5">
                  {reinscribeTarget.swimId} · {reinscribeTarget.category}
                </p>
              </div>
              <button
                onClick={() => setReinscribeTarget(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {reinscribeSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
                {reinscribeSuccessMsg}
              </div>
            )}

            <form onSubmit={handleReinscribeSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted)] mb-1 font-semibold uppercase text-[10px]">
                    Formula
                  </label>
                  <select
                    value={reinscribeFormula}
                    onChange={(e) => setReinscribeFormula(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-[var(--border)] text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="G10">G10 (10 Swimmers)</option>
                    <option value="MAX5">MAX5 (5 Swimmers)</option>
                    <option value="INDIVID">Individuel (1-on-1)</option>
                    <option value="Decouverte">Decouverte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--muted)] mb-1 font-semibold uppercase text-[10px]">
                    Duration
                  </label>
                  <select
                    value={reinscribeDuration}
                    onChange={(e) => setReinscribeDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-[var(--border)] text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="1m">1 Month</option>
                    <option value="3m">3 Months</option>
                    <option value="6m">6 Months</option>
                    <option value="9m">9 Months</option>
                    <option value="12m">12 Months (1 Year)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--muted)] mb-1 font-semibold uppercase text-[10px]">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={reinscribeStartDate}
                    onChange={(e) => setReinscribeStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-[var(--border)] text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[var(--muted)] mb-1 font-semibold uppercase text-[10px]">
                    Price Override (DA)
                  </label>
                  <input
                    type="number"
                    placeholder="Leave empty for auto"
                    value={reinscribePrice}
                    onChange={(e) => setReinscribePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-[var(--border)] text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1 font-semibold uppercase text-[10px]">
                  Assigned Training Group
                </label>
                <select
                  value={reinscribeGroupId}
                  onChange={(e) => setReinscribeGroupId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-[var(--border)] text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">Keep Existing / Assign Later</option>
                  {groups
                    .filter((g) => g.category === reinscribeTarget.category)
                    .map((grp) => (
                      <option key={grp.id} value={grp.id}>
                        {grp.name} ({grp.level})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1 font-semibold uppercase text-[10px]">
                  Reinscription Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Special conditions, discount reasons, preferred timings..."
                  value={reinscribeNotes}
                  onChange={(e) => setReinscribeNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-[var(--border)] text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReinscribeTarget(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submittingReinscribe}>
                  {submittingReinscribe ? "Confirming..." : "Confirm Reinscription"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Call History Drawer / Modal */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-display">
                  Call History: {historyTarget.fullName}
                </h3>
                <p className="text-xs text-[var(--muted)] font-mono">
                  {historyTarget.swimId} · {historyTarget.phone}
                </p>
              </div>
              <button
                onClick={() => setHistoryTarget(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 divide-y divide-[var(--border)] flex-1 text-xs">
              {historyTarget.callHistory.length === 0 ? (
                <p className="text-[var(--muted)] italic text-center py-6">
                  No call logs recorded.
                </p>
              ) : (
                historyTarget.callHistory.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white capitalize">
                        {item.outcome.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">
                        {formatDate(item.calledAt, locale, true)}
                      </span>
                    </div>
                    <p className="text-slate-300 italic">&ldquo;{item.observation}&rdquo;</p>
                    <div className="flex items-center justify-between text-[10px] text-[var(--muted)] pt-1">
                      <span>Staff: {item.callerName}</span>
                      {item.callbackDate && (
                        <span className="text-sky-400 font-medium">
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-white font-display">
                {t("deleteConfirmTitle")}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Are you sure you want to delete profile <strong className="text-white">{deleteTarget.fullName}</strong> ({deleteTarget.swimId || deleteTarget.entityId})?
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {t("deleteConfirmDesc")}
              </p>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingMember}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteMember}
                disabled={deletingMember}
              >
                {deletingMember ? "Deleting..." : t("confirmDelete")}
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
