"use client";

import React from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/admin/ui";
import { useTranslations, formatDate } from "@/lib/i18n";
import {
  SwimCallRecord,
  SwimCallStatus,
  formatWhatsAppReinscriptionUrl,
} from "@/lib/swim-calls";
import { getSwimLevelLabel } from "@/lib/swim-groups";

interface CallRosterTableProps {
  records: SwimCallRecord[];
  loading: boolean;
  onOpenLogModal: (record: SwimCallRecord) => void;
  onOpenReinscribeModal: (record: SwimCallRecord) => void;
  onOpenHistoryModal: (record: SwimCallRecord) => void;
  onOpenDeleteModal: (record: SwimCallRecord) => void;
  onNavigateToSwimmer?: (swimId: string) => void;
}

export function CallRosterTable({
  records,
  loading,
  onOpenLogModal,
  onOpenReinscribeModal,
  onOpenHistoryModal,
  onOpenDeleteModal,
  onNavigateToSwimmer,
}: CallRosterTableProps) {
  const { t, locale } = useTranslations("swimCalls");

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

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-white/10 space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Loading calling pipeline roster...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-white/10">
        <p className="text-sm font-semibold text-slate-300">{t("noRecords")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-sm">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-white/10 bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <th className="py-3.5 px-4">{t("client")}</th>
            <th className="py-3.5 px-3">{t("categoryLevel")}</th>
            <th className="py-3.5 px-3">{t("formulaValidity")}</th>
            <th className="py-3.5 px-3">{t("assignedGroup")}</th>
            <th className="py-3.5 px-3">{t("callStatus")}</th>
            <th className="py-3.5 px-3 min-w-[200px]">{t("lastObservation")}</th>
            <th className="py-3.5 px-4 text-right">{t("actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {records.map((r) => {
            const waUrl = formatWhatsAppReinscriptionUrl(r.phone, r.fullName, r.formula);
            return (
              <tr
                key={r.id}
                className="hover:bg-slate-800/40 transition-colors group"
              >
                {/* Client Info */}
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-sm">
                      {r.fullName}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-slate-400 font-mono text-[11px]">
                        {r.phone}
                      </span>
                      {r.swimId && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 font-mono border border-sky-800/40">
                          {r.swimId}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Category & Level */}
                <td className="py-3 px-3">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200 capitalize">
                      {r.category}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {getSwimLevelLabel(r.level)}
                    </div>
                  </div>
                </td>

                {/* Formula & Expiry */}
                <td className="py-3 px-3">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200">
                      {r.formula} ({r.duration})
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Expires: {formatDate(r.expirationDate, locale)}
                    </div>
                  </div>
                </td>

                {/* Group */}
                <td className="py-3 px-3">
                  {r.groupName ? (
                    <div>
                      <div className="font-semibold text-slate-200">
                        {r.groupName}
                      </div>
                      {r.coachName && (
                        <div className="text-[11px] text-slate-400">
                          Coach {r.coachName}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">Unassigned</span>
                  )}
                </td>

                {/* Status & Urgency */}
                <td className="py-3 px-3">
                  <div className="flex flex-col gap-1 items-start">
                    {getStatusBadge(r.status)}
                    {getUrgencyBadge((r as { urgency?: string }).urgency)}
                  </div>
                </td>

                {/* Last Observation & Intent */}
                <td className="py-3 px-3">
                  {r.lastObservation ? (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                        {r.lastObservation}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        {r.lastCalledAt && (
                          <span>{formatDate(r.lastCalledAt, locale)}</span>
                        )}
                        {r.callbackDate && (
                          <span className="text-amber-400 font-semibold">
                            Callback: {formatDate(r.callbackDate, locale)}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">No notes logged</span>
                  )}
                </td>

                {/* Action Buttons */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Direct Call Button */}
                    <a
                      href={`tel:${r.phone}`}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/40 transition-colors"
                      title="Direct phone call"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </a>

                    {/* WhatsApp Button */}
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-950/60 hover:bg-teal-900 text-teal-400 border border-teal-800/40 transition-colors"
                      title="Send WhatsApp message"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </a>

                    {/* Log Interaction */}
                    <button
                      type="button"
                      onClick={() => onOpenLogModal(r)}
                      className="px-2.5 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900 text-sky-300 font-semibold text-xs border border-sky-800/40 transition-colors"
                      title="Log call observation and intention"
                    >
                      Log
                    </button>

                    {/* Confirm Renewal / Reinscribe */}
                    <button
                      type="button"
                      onClick={() => onOpenReinscribeModal(r)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 font-semibold text-xs border border-emerald-700/40 transition-colors"
                      title="Confirm renewal and assign group"
                    >
                      Renew
                    </button>

                    {/* History */}
                    <button
                      type="button"
                      onClick={() => onOpenHistoryModal(r)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      title="View interaction history"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>

                    {/* Swimmer Profile Link */}
                    {r.swimId && (
                      <Link
                        href={`/admin/swim/members/${r.swimId}`}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="View Swimmer Profile"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </Link>
                    )}

                    {/* Delete Action (for duplicates) */}
                    <button
                      type="button"
                      onClick={() => onOpenDeleteModal(r)}
                      className="p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 transition-colors"
                      title="Delete profile"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
