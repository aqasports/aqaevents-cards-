"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";
import { SwimCallRecord } from "@/lib/swim-calls";
import { HommeRosterImportModal } from "@/components/admin/swim/HommeRosterImportModal";

import { CallStatsBar, CallStatsData } from "./CallStatsBar";
import { CallFilters } from "./CallFilters";
import { CallRosterTable } from "./CallRosterTable";
import { LogCallModal } from "./LogCallModal";
import { ReinscribeModal } from "./ReinscribeModal";
import { CallHistoryDrawer } from "./CallHistoryDrawer";

interface SwimGroupOption {
  id: string;
  name: string;
  category: string;
  level: string;
  coachName: string | null;
}

interface SwimCallsDeskProps {
  initialSearch?: string;
  onNavigateToSwimmer?: (swimId: string) => void;
}

export function SwimCallsDesk({
  initialSearch = "",
  onNavigateToSwimmer,
}: SwimCallsDeskProps) {
  const { t } = useTranslations("swimCalls");

  // Core Data States
  const [records, setRecords] = useState<SwimCallRecord[]>([]);
  const [groups, setGroups] = useState<SwimGroupOption[]>([]);
  const [stats, setStats] = useState<CallStatsData>({
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

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // Modal Targets
  const [logTarget, setLogTarget] = useState<SwimCallRecord | null>(null);
  const [reinscribeTarget, setReinscribeTarget] = useState<SwimCallRecord | null>(null);
  const [historyTarget, setHistoryTarget] = useState<SwimCallRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SwimCallRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Read ?q= URL query parameter on client mount safely without using useSearchParams
  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q && !initialSearch) {
        setSearchTerm(q);
      }
    }
  }, [initialSearch]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load Groups
  useEffect(() => {
    let active = true;
    fetch("/api/admin/swim/groups?active=true")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) {
          setGroups(data);
        }
      })
      .catch((err) => console.error("Failed to load swim groups:", err));
    return () => {
      active = false;
    };
  }, []);

  // Fetch Pipeline Data
  const loadPipeline = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (urgencyFilter !== "all") params.set("urgency", urgencyFilter);
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

      const res = await fetch(`/api/admin/swim/calls?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data.records) ? data.records : []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setFetchError(errData.error || "Failed to load calls roster.");
      }
    } catch (err) {
      console.error("Failed to load calls pipeline:", err);
      setFetchError("Network error while loading call records.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, urgencyFilter, debouncedSearch]);

  useEffect(() => {
    loadPipeline();
  }, [loadPipeline]);

  // Handle Delete Member
  async function handleDeleteMember() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/swim/members/${deleteTarget.entityId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete member");
      }
      setDeleteTarget(null);
      loadPipeline();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete swimmer");
    } finally {
      setDeleting(false);
    }
  }

  // Export CSV
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
      `"${(r.fullName || "").replace(/"/g, '""')}"`,
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

  return (
    <div className="space-y-5">
      {/* Header Bar */}
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

      {/* KPI Stats */}
      <CallStatsBar stats={stats} />

      {/* Error Alert */}
      {fetchError && (
        <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={loadPipeline}
            className="underline hover:text-white font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <CallFilters
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        urgencyFilter={urgencyFilter}
        onUrgencyChange={setUrgencyFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={loadPipeline}
        loading={loading}
      />

      {/* Pipeline Table */}
      <CallRosterTable
        records={records}
        loading={loading}
        onOpenLogModal={(rec) => setLogTarget(rec)}
        onOpenReinscribeModal={(rec) => setReinscribeTarget(rec)}
        onOpenHistoryModal={(rec) => setHistoryTarget(rec)}
        onOpenDeleteModal={(rec) => setDeleteTarget(rec)}
        onNavigateToSwimmer={onNavigateToSwimmer}
      />

      {/* Log Call Modal */}
      {logTarget && (
        <LogCallModal
          target={logTarget}
          groups={groups}
          onClose={() => setLogTarget(null)}
          onSuccess={() => {
            setLogTarget(null);
            loadPipeline();
          }}
        />
      )}

      {/* Reinscribe Modal */}
      {reinscribeTarget && (
        <ReinscribeModal
          target={reinscribeTarget}
          groups={groups}
          onClose={() => setReinscribeTarget(null)}
          onSuccess={() => {
            setReinscribeTarget(null);
            loadPipeline();
          }}
        />
      )}

      {/* History Drawer */}
      {historyTarget && (
        <CallHistoryDrawer
          target={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {/* Batch Import Modal */}
      {showImportModal && (
        <HommeRosterImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadPipeline();
          }}
        />
      )}

      {/* Delete Swimmer Modal */}
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
                disabled={deleting}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteMember}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : t("confirmDelete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
