"use client";

import React, { useState, useEffect, useRef } from "react";

interface LiveCounts {
  members: number;
  groups: number;
  leads: number;
  payments: number;
  cards: number;
  totalRevenueCollected: number;
}

interface LastBackupInfo {
  timestamp: string;
  totalRecords: number;
  filename: string;
  storageStatus: "cloud" | "local";
  triggeredBy?: string;
  counts: {
    members: number;
    groups: number;
    leads: number;
    payments: number;
    cards: number;
    callRecords: number;
  };
}

interface CloudBackupItem {
  name: string;
  created_at: string;
  size?: number;
  downloadUrl?: string;
}

interface ValidationReport {
  isValid: boolean;
  error?: string;
  metadata?: {
    timestamp: string;
    version: string;
    generator: string;
    checksum: string;
    totalRecords: number;
    counts: Record<string, number>;
  };
  backupCounts?: Record<string, number>;
  liveCounts?: Record<string, number>;
  sampleMembers?: Array<{
    swimId: string;
    fullName: string;
    category: string;
    formula: string;
    paymentStatus: string;
  }>;
}

export function SwimBackupDesk() {
  const [loading, setLoading] = useState(true);
  const [liveCounts, setLiveCounts] = useState<LiveCounts | null>(null);
  const [lastBackup, setLastBackup] = useState<LastBackupInfo | null>(null);
  const [hasCloudStorage, setHasCloudStorage] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<CloudBackupItem[]>([]);
  const [creatingCloudBackup, setCreatingCloudBackup] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Inspector & Validation state
  const [inspectingFile, setInspectingFile] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/swim/backup?action=status");
      if (res.ok) {
        const data = await res.json();
        setLiveCounts(data.liveCounts || null);
        setLastBackup(data.lastBackup || null);
        setHasCloudStorage(Boolean(data.hasCloudStorage));
        setCloudBackups(data.cloudBackups || []);
      }
    } catch (err) {
      console.error("Failed to load swim backup status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleDownloadBackupJson = async () => {
    try {
      setDownloadingJson(true);
      const res = await fetch("/api/admin/swim/backup?action=download");
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
      a.download = `aqa-swim-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setFeedbackMessage({
        type: "success",
        text: "Full JSON backup successfully downloaded to your local device.",
      });
      loadStatus();
    } catch {
      setFeedbackMessage({
        type: "error",
        text: "Failed to download backup JSON. Please try again.",
      });
    } finally {
      setDownloadingJson(false);
    }
  };

  const handleTriggerCloudBackup = async () => {
    try {
      setCreatingCloudBackup(true);
      setFeedbackMessage(null);
      const res = await fetch("/api/admin/swim/backup", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMessage({
          type: "success",
          text: `Backup successfully generated! Total records archived: ${data.metadata?.totalRecords}. ${
            data.uploadResult?.uploaded
              ? "Saved to cloud storage."
              : "Saved to local snapshot registry."
          }`,
        });
        await loadStatus();
      } else {
        throw new Error(data.error || "Failed to create cloud backup");
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err.message || "Failed to create cloud backup.",
      });
    } finally {
      setCreatingCloudBackup(false);
    }
  };

  const handleDownloadCsv = async (type: "members" | "payments" | "leads") => {
    try {
      setDownloadingCsv(type);
      const res = await fetch(`/api/admin/swim/backup?action=export-${type}-csv`);
      if (!res.ok) throw new Error(`Export failed`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aqa-swim-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setFeedbackMessage({
        type: "error",
        text: `Failed to export ${type} CSV.`,
      });
    } finally {
      setDownloadingCsv(null);
    }
  };

  const handleFileInspect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInspectingFile(true);
    setValidationReport(null);
    setFeedbackMessage(null);

    try {
      const text = await file.text();
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(text);
      } catch {
        setValidationReport({
          isValid: false,
          error: "Selected file is not valid JSON syntax.",
        });
        return;
      }

      const res = await fetch("/api/admin/swim/backup?action=preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: parsedJson }),
      });

      const report = await res.json();
      setValidationReport(report);
    } catch {
      setValidationReport({
        isValid: false,
        error: "Failed to inspect backup file. Connection error.",
      });
    } finally {
      setInspectingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return "Unknown size";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return "Never";
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  const isBackupRecent = () => {
    if (!lastBackup?.timestamp) return false;
    const diffHours = (Date.now() - new Date(lastBackup.timestamp).getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. STRATEGY & HEALTH STATUS BANNER ────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                isBackupRecent()
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)] animate-pulse"
                  : lastBackup
                  ? "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.7)]"
                  : "bg-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.7)]"
              }`}
            />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                AQA Swim Database Protection Strategy
              </h2>
              <p className="text-xs text-slate-400">
                Triple-redundancy backup architecture: Automated Nightly Cloud Sync + Instant JSON Snapshots + CSV Ledgers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                isBackupRecent()
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                  : lastBackup
                  ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
                  : "bg-rose-950/80 text-rose-300 border-rose-500/40"
              }`}
            >
              {isBackupRecent()
                ? "Protected (< 24h)"
                : lastBackup
                ? "Backup Recommended"
                : "No Backup Recorded"}
            </span>
          </div>
        </div>

        {/* 3 Strategy Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Automated Daily Cron</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Netlify Scheduled Function runs every night at 02:00 UTC, archiving all swim tables to cloud storage with automatic 30-day retention.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Instant Downloadable Snapshot</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              One-click download of the complete dataset in JSON format containing SHA-256 checksums, relationships, and metadata.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5 space-y-1">
            <div className="flex items-center gap-2 text-sky-300 text-xs font-bold">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>Human-Readable CSV Exports</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Export swimmers, payments ledger, and waitlist leads directly into Excel-compatible CSV spreadsheets for administration.
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
              feedbackMessage.type === "success"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : feedbackMessage.type === "error"
                ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
                : "bg-sky-950/60 border-sky-500/40 text-sky-300"
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* ─── 2. LIVE DATABASE COUNTERS ────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-display">
            Live Swim Database Statistics
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">
            {loading ? "Checking database..." : "Live query verified"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Swimmer Profiles</span>
            <span className="text-xl font-bold font-mono text-cyan-300">
              {liveCounts?.members ?? "—"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Training Groups</span>
            <span className="text-xl font-bold font-mono text-white">
              {liveCounts?.groups ?? "—"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Waitlist Leads</span>
            <span className="text-xl font-bold font-mono text-amber-300">
              {liveCounts?.leads ?? "—"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Payment Records</span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              {liveCounts?.payments ?? "—"}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              {(liveCounts?.totalRevenueCollected || 0).toLocaleString("fr-DZ")} DA
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">PVC Digital Cards</span>
            <span className="text-xl font-bold font-mono text-indigo-300">
              {liveCounts?.cards ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. QUICK ACTIONS STATION ─────────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white font-display">
          Backup & Export Operations
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Download JSON */}
          <button
            onClick={handleDownloadBackupJson}
            disabled={downloadingJson}
            className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/60 to-slate-900 border border-cyan-500/30 hover:border-cyan-400 text-left transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download JSON</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Self-contained, checksummed full snapshot of all swim models.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-cyan-300 underline group-hover:text-cyan-200">
              {downloadingJson ? "Generating JSON..." : "Download Snapshot →"}
            </span>
          </button>

          {/* Trigger Cloud Snapshot */}
          <button
            onClick={handleTriggerCloudBackup}
            disabled={creatingCloudBackup}
            className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>Create Cloud Snapshot</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Save an immediate timestamped backup to the secure cloud archive.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-300 underline group-hover:text-emerald-200">
              {creatingCloudBackup ? "Archiving..." : "Sync to Cloud Now →"}
            </span>
          </button>

          {/* Export Members CSV */}
          <button
            onClick={() => handleDownloadCsv("members")}
            disabled={downloadingCsv === "members"}
            className="p-4 rounded-xl bg-slate-800/60 border border-white/10 hover:border-sky-400 text-left transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Export Swimmers CSV</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Roster with categories, subscriptions, groups, and contact details.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-sky-300 underline group-hover:text-sky-200">
              {downloadingCsv === "members" ? "Exporting..." : "Download Spreadsheet →"}
            </span>
          </button>

          {/* Export Payments CSV */}
          <button
            onClick={() => handleDownloadCsv("payments")}
            disabled={downloadingCsv === "payments"}
            className="p-4 rounded-xl bg-slate-800/60 border border-white/10 hover:border-emerald-400 text-left transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span>Export Payments CSV</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Detailed transaction register with dates, amounts, and methods.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-300 underline group-hover:text-emerald-200">
              {downloadingCsv === "payments" ? "Exporting..." : "Download Ledger →"}
            </span>
          </button>
        </div>
      </div>

      {/* ─── 4. BACKUP VALIDATOR & DRY-RUN INSPECTOR ──────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-display">
              Safe Backup Inspector & Integrity Validator
            </h3>
            <p className="text-xs text-slate-400">
              Upload any backup JSON file to inspect its content, verify checksums, and compare with live database counts with zero risk.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-950/80 text-sky-300 border border-sky-500/30">
            Read-Only Dry-Run
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <label className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-cyan-400">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>{inspectingFile ? "Validating Snapshot..." : "Choose Backup File (.json) to Inspect"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileInspect}
              disabled={inspectingFile}
            />
          </label>
          <span className="text-[11px] text-slate-500">
            Accepts any authentic AQA Swim JSON archive
          </span>
        </div>

        {/* Validation Report Result */}
        {validationReport && (
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              validationReport.isValid
                ? "bg-slate-950/60 border-emerald-500/30 text-slate-200"
                : "bg-rose-950/40 border-rose-500/40 text-rose-200"
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    validationReport.isValid ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                {validationReport.isValid ? "Valid Backup Archive Inspected" : "Invalid Backup Archive"}
              </span>
              {validationReport.metadata?.version && (
                <span className="text-[10px] font-mono text-slate-400">
                  Version {validationReport.metadata.version}
                </span>
              )}
            </div>

            {validationReport.error && (
              <p className="text-xs text-rose-300 font-medium">{validationReport.error}</p>
            )}

            {validationReport.isValid && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Archive Timestamp</span>
                    <span className="font-mono text-white text-[11px]">
                      {validationReport.metadata?.timestamp
                        ? new Date(validationReport.metadata.timestamp).toLocaleString("fr-DZ")
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Generator</span>
                    <span className="text-slate-300 text-[11px]">
                      {validationReport.metadata?.generator || "AQA System"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">SHA-256 Checksum</span>
                    <span className="font-mono text-[10px] text-cyan-300 break-all block">
                      {validationReport.metadata?.checksum || "—"}
                    </span>
                  </div>
                </div>

                {/* Counts Comparison */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 block">
                    Record Counts Comparison (Backup Archive vs Current Live Database)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Swimmers</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {validationReport.backupCounts?.members || 0} in backup
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ({validationReport.liveCounts?.members || 0} live now)
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Groups</span>
                      <span className="font-mono font-bold text-white">
                        {validationReport.backupCounts?.groups || 0} in backup
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ({validationReport.liveCounts?.groups || 0} live now)
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Payments</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {validationReport.backupCounts?.payments || 0} in backup
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ({validationReport.liveCounts?.payments || 0} live now)
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Leads</span>
                      <span className="font-mono font-bold text-amber-300">
                        {validationReport.backupCounts?.leads || 0} in backup
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ({validationReport.liveCounts?.leads || 0} live now)
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Pass Cards</span>
                      <span className="font-mono font-bold text-indigo-300">
                        {validationReport.backupCounts?.cards || 0} in backup
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ({validationReport.liveCounts?.cards || 0} live now)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sample Swimmers in Backup */}
                {validationReport.sampleMembers && validationReport.sampleMembers.length > 0 && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-300 block">
                      Sample Swimmer Roster in Archive
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {validationReport.sampleMembers.map((m, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 border border-white/5"
                        >
                          <strong className="text-white">{m.fullName}</strong> ({m.swimId}) · {m.formula} · {m.paymentStatus}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── 5. CLOUD SNAPSHOTS ARCHIVE ───────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-display">
              Cloud Backup Archives
            </h3>
            <p className="text-xs text-slate-400">
              Snapshots stored in secure cloud storage bucket with 30-day automatic retention.
            </p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {cloudBackups.length} snapshot{cloudBackups.length !== 1 ? "s" : ""} available
          </span>
        </div>

        {cloudBackups.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-950/40 border border-white/5 text-center space-y-1">
            <p className="text-xs text-slate-400">No cloud snapshots recorded yet.</p>
            <p className="text-[11px] text-slate-500">
              Click &quot;Create Cloud Snapshot&quot; above to generate your first remote backup.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-slate-950/40 overflow-hidden">
            {cloudBackups.map((item, idx) => (
              <div
                key={idx}
                className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:bg-slate-800/40 transition-colors text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-mono text-cyan-300 text-[11px] font-bold block">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Created: {new Date(item.created_at).toLocaleString("fr-DZ")} · {formatBytes(item.size)}
                  </span>
                </div>

                {item.downloadUrl && (
                  <a
                    href={item.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60 text-[10px] font-bold transition-colors flex items-center gap-1.5"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Download</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 6. PRODUCTION PROTOCOL & RECOVERY GUIDELINES ──────────────────────── */}
      <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 text-xs text-slate-400 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
          AQA Sports Data Safety Protocol
        </span>
        <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-slate-400">
          <li>All automated backups are encrypted at rest and in transit via TLS 1.3.</li>
          <li>Balance and payment records in AQA Swim follow the immutable ledger rule: balances are calculated dynamically from verified transaction events.</li>
          <li>In the event of a catastrophic failure, administrators can use the dry-run inspector to verify any backup snapshot before triggering a controlled restore procedure.</li>
          <li>For manual disaster recovery assistance, refer to the emergency runbook in the project documentation.</li>
        </ul>
      </div>
    </div>
  );
}
