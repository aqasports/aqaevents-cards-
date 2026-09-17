"use client";

import React, { useState } from "react";
import { Button, Input } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";
import {
  SwimCallRecord,
  SwimCallOutcome,
  ReinscriptionIntent,
} from "@/lib/swim-calls";

interface SwimGroupOption {
  id: string;
  name: string;
  category: string;
  level: string;
  coachName: string | null;
}

interface LogCallModalProps {
  target: SwimCallRecord;
  groups: SwimGroupOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export function LogCallModal({
  target,
  groups,
  onClose,
  onSuccess,
}: LogCallModalProps) {
  const { t } = useTranslations("swimCalls");

  const [outcome, setModalOutcome] = useState<SwimCallOutcome>(
    target.lastOutcome || "answered_interested"
  );
  const [intent, setModalIntent] = useState<ReinscriptionIntent>(
    target.reinscriptionIntent || "medium"
  );
  const [observation, setModalObservation] = useState("");
  const [callbackDate, setModalCallbackDate] = useState(
    target.callbackDate ? target.callbackDate.slice(0, 16) : ""
  );
  const [proposedFormula, setModalProposedFormula] = useState(
    target.proposedFormula || target.formula || "G10"
  );
  const [proposedDuration, setModalProposedDuration] = useState(
    target.proposedDuration || target.duration || "3m"
  );
  const [proposedGroupId, setModalProposedGroupId] = useState(
    target.proposedGroupId || target.groupId || ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableGroups = groups.filter((g) => g.category === target.category);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!observation.trim()) {
      setErrorMsg("Please enter an observation note before saving.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/swim/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: target.entityId,
          outcome,
          observation: observation.trim(),
          reinscriptionIntent: intent,
          callbackDate: callbackDate ? new Date(callbackDate).toISOString() : null,
          proposedFormula: proposedFormula || null,
          proposedDuration: proposedDuration || null,
          proposedGroupId: proposedGroupId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save call log");
      }

      onSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving call record");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white font-display">
              {t("modalLogCallTitle")}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {target.fullName} ({target.swimId || target.phone}) · {target.category} · {target.formula}
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

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Call Outcome */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Call Result / Outcome
            </label>
            <select
              value={outcome}
              onChange={(e) => setModalOutcome(e.target.value as SwimCallOutcome)}
              className="w-full h-10 px-3 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="answered_interested">Answered - Interested in Renewal</option>
              <option value="answered_callback">Answered - Callback Requested / Later</option>
              <option value="answered_reinscribed">Answered - Confirmed Reinscription</option>
              <option value="answered_declined">Answered - Declined Renewal</option>
              <option value="no_answer">No Answer / Did Not Pick Up</option>
              <option value="busy">Line Busy</option>
              <option value="invalid_number">Invalid Phone Number</option>
            </select>
          </div>

          {/* Reinscription Intent */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t("intentLabel")}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["high", "medium", "low", "none"] as ReinscriptionIntent[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setModalIntent(lvl)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-colors capitalize ${
                    intent === lvl
                      ? "bg-[var(--primary)] text-white border-transparent"
                      : "bg-slate-800 text-slate-400 border-white/10 hover:text-white"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Observation Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Observation & Feedback Notes <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={observation}
              onChange={(e) => setModalObservation(e.target.value)}
              placeholder={t("observationPlaceholder")}
              className="w-full p-3 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-[var(--primary)] resize-none"
              required
            />
          </div>

          {/* Conditional Callback Date */}
          {outcome === "answered_callback" && (
            <div>
              <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                {t("callbackDateLabel")}
              </label>
              <Input
                type="datetime-local"
                value={callbackDate}
                onChange={(e) => setModalCallbackDate(e.target.value)}
              />
            </div>
          )}

          {/* Proposed Group / Formula Adjustments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Proposed Formula
              </label>
              <select
                value={proposedFormula}
                onChange={(e) => setModalProposedFormula(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="G10">G10 Standard</option>
                <option value="MAX5">MAX5 Cohort</option>
                <option value="INDIVIDUAL">Individual 1-on-1</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Training Group
              </label>
              <select
                value={proposedGroupId}
                onChange={(e) => setModalProposedGroupId(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">Keep current / Unallocated</option>
                {availableGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.coachName || "Coach Unassigned"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
            >
              {submitting ? "Saving..." : t("saveCallBtn")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
