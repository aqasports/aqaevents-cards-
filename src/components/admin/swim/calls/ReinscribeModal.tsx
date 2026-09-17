"use client";

import React, { useState } from "react";
import { Button, Input } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";
import { SwimCallRecord } from "@/lib/swim-calls";

interface SwimGroupOption {
  id: string;
  name: string;
  category: string;
  level: string;
  coachName: string | null;
}

interface ReinscribeModalProps {
  target: SwimCallRecord;
  groups: SwimGroupOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ReinscribeModal({
  target,
  groups,
  onClose,
  onSuccess,
}: ReinscribeModalProps) {
  const { t } = useTranslations("swimCalls");

  const [formula, setFormula] = useState(
    target.proposedFormula || target.formula || "G10"
  );
  const [duration, setDuration] = useState(
    target.proposedDuration || target.duration || "3m"
  );
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [groupId, setGroupId] = useState(
    target.proposedGroupId || target.groupId || ""
  );
  const [priceDA, setPriceDA] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableGroups = groups.filter((g) => g.category === target.category);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/swim/calls/reinscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: target.entityId,
          formula,
          duration,
          startDate,
          groupId: groupId || null,
          priceDA: priceDA ? parseInt(priceDA, 10) : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to confirm reinscription");
      }

      onSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error confirming reinscription");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-xl w-full bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white font-display">
              Confirm Reinscription & Renewal
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {target.fullName} ({target.swimId || target.phone}) · {target.category}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Formula */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Formula Plan
              </label>
              <select
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="G10">G10 Standard</option>
                <option value="MAX5">MAX5 Cohort</option>
                <option value="INDIVIDUAL">Individual 1-on-1</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Subscription Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="1m">1 Month</option>
                <option value="3m">3 Months (Standard Cycle)</option>
                <option value="6m">6 Months (Semester)</option>
                <option value="12m">12 Months (Full Year)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cycle Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            {/* Price Override */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tariff Amount (DA) - Optional Override
              </label>
              <Input
                type="number"
                placeholder="Leave blank to keep plan default"
                value={priceDA}
                onChange={(e) => setPriceDA(e.target.value)}
              />
            </div>
          </div>

          {/* Training Group Assignment */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Assigned Training Group
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="">Keep unassigned (allocate later)</option>
              {availableGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.coachName || "Coach Unassigned"}) - {g.level}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Admin & Payment Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid first installment at desk, promised second installment next week..."
              className="w-full p-3 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-[var(--primary)] resize-none"
            />
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
              {submitting ? "Processing..." : "Confirm Reinscription"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
