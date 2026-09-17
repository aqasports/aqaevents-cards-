"use client";

import React from "react";
import { Badge, Button } from "@/components/admin/ui";
import { useTranslations, formatDate } from "@/lib/i18n";
import { SwimCallRecord, SwimCallOutcome } from "@/lib/swim-calls";

interface CallHistoryDrawerProps {
  target: SwimCallRecord;
  onClose: () => void;
}

export function CallHistoryDrawer({ target, onClose }: CallHistoryDrawerProps) {
  const { t, locale } = useTranslations("swimCalls");

  function getOutcomeBadge(outcome: SwimCallOutcome) {
    switch (outcome) {
      case "answered_interested":
        return <Badge tone="success">Interested</Badge>;
      case "answered_callback":
        return <Badge tone="info">Callback</Badge>;
      case "answered_reinscribed":
        return <Badge tone="success">Reinscribed</Badge>;
      case "answered_declined":
        return <Badge tone="danger">Declined</Badge>;
      case "no_answer":
        return <Badge tone="default">No Answer</Badge>;
      case "busy":
        return <Badge tone="warning">Busy</Badge>;
      case "invalid_number":
        return <Badge tone="danger">Invalid Number</Badge>;
      default:
        return <Badge tone="default">{outcome}</Badge>;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white font-display">
              {t("historyTitle")}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {target.fullName} ({target.swimId || target.phone})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1"
          >
            ×
          </button>
        </div>

        {/* History List */}
        <div className="space-y-3 overflow-y-auto py-2 flex-1 pr-1">
          {target.callHistory && target.callHistory.length > 0 ? (
            target.callHistory.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-800/70 border border-white/5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    {getOutcomeBadge(item.outcome)}
                    <span className="text-slate-400 text-[11px]">
                      Caller: <strong className="text-slate-200">{item.callerName}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatDate(item.calledAt, locale, true)}
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {item.observation}
                </p>

                {item.callbackDate && (
                  <div className="text-[11px] text-amber-300 font-semibold pt-1 border-t border-white/5 flex items-center gap-1.5">
                    <span>Scheduled Return Call:</span>
                    <span>{formatDate(item.callbackDate, locale, true)}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              {t("noHistory")}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-white/10 shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
