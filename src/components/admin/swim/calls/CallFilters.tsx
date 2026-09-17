"use client";

import React from "react";
import { Input } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";
import { SwimCallStatus } from "@/lib/swim-calls";

interface CallFiltersProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
  categoryFilter: string;
  onCategoryChange: (category: string) => void;
  urgencyFilter: string;
  onUrgencyChange: (urgency: string) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function CallFilters({
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  urgencyFilter,
  onUrgencyChange,
  searchTerm,
  onSearchChange,
  onRefresh,
  loading,
}: CallFiltersProps) {
  const { t } = useTranslations("swimCalls");

  const statusTabs: { key: string; label: string }[] = [
    { key: "all", label: t("statusAll") },
    { key: "to_call", label: t("statusToCall") },
    { key: "callback_scheduled", label: t("statusCallback") },
    { key: "interested", label: t("statusInterested") },
    { key: "reinscribed", label: t("statusReinscribed") },
    { key: "unreachable", label: t("statusUnreachable") },
    { key: "declined", label: t("statusDeclined") },
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "homme", label: "Homme" },
    { value: "femme", label: "Femme" },
    { value: "enfants", label: "Enfants" },
    { value: "apnea", label: "Apnee" },
  ];

  const urgencyOptions = [
    { value: "all", label: "All Urgencies" },
    { value: "overdue", label: t("overdue") },
    { value: "due_today", label: t("dueToday") },
    { value: "expiring_soon", label: t("expiringSoon") },
    { value: "active", label: t("active") },
  ];

  return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
      {/* Top Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Pill Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onStatusChange(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                statusFilter === tab.key
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-white/10 transition-colors disabled:opacity-50 ml-auto"
          title="Refresh calling list"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Second Row: Category, Urgency, Search Input */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
        {/* Category Filter */}
        <div className="w-40 sm:w-44">
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full h-9 px-3 text-xs rounded-xl bg-slate-800/90 border border-white/10 text-white focus:outline-none focus:border-[var(--primary)]"
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Urgency Filter */}
        <div className="w-40 sm:w-44">
          <select
            value={urgencyFilter}
            onChange={(e) => onUrgencyChange(e.target.value)}
            className="w-full h-9 px-3 text-xs rounded-xl bg-slate-800/90 border border-white/10 text-white focus:outline-none focus:border-[var(--primary)]"
          >
            {urgencyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="flex-1 min-w-[200px]">
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search swimmer by name, phone, or ID..."
          />
        </div>
      </div>
    </div>
  );
}
