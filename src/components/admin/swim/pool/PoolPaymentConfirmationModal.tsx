"use client";

import React, { useState } from "react";

interface PoolPaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: () => Promise<void>;
  bordereauRef: string;
  bordereauTitle: string;
  poolName: string;
  swimmerCount: number;
  customRowCount: number;
  totalAmountDA: number;
  monthLabel: string;
  isAlreadyPaid: boolean;
  paidAt?: string;
}

export function PoolPaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirmPayment,
  bordereauRef,
  bordereauTitle,
  poolName,
  swimmerCount,
  customRowCount,
  totalAmountDA,
  monthLabel,
  isAlreadyPaid,
  paidAt,
}: PoolPaymentConfirmationModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirmPayment();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-emerald-500/30 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Confirmation de Paiement Piscine
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Validation officielle de la redevance pour le bordereau
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Summary Card */}
        <div className="rounded-xl bg-slate-950 p-4 border border-white/10 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-slate-400">Bordereau / Reference :</span>
            <span className="font-mono font-bold text-white">
              {bordereauRef} ({bordereauTitle})
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-slate-400">Piscine Destinataire :</span>
            <span className="font-bold text-slate-200">{poolName}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-slate-400">Mois Concerne :</span>
            <span className="font-bold text-cyan-300">{monthLabel}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-slate-400">Adherents Inclus :</span>
            <span className="font-mono font-bold text-emerald-400">
              {swimmerCount} adherent{swimmerCount > 1 ? "s" : ""}
              {customRowCount > 0 && ` + ${customRowCount} ligne collective`}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300 font-bold uppercase text-[11px]">
              Montant Total Redevance :
            </span>
            <span className="font-mono font-extrabold text-lg text-emerald-300">
              {totalAmountDA.toLocaleString("fr-DZ")} DA
            </span>
          </div>
        </div>

        {/* Informative Rule Notice */}
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-emerald-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Impact sur les profils adherents (poolpaid)</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Cette confirmation appliquera automatiquement le label{" "}
            <span className="font-bold text-emerald-300 bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-500/30">
              poolpaid
            </span>{" "}
            sur les fiches administratives de ces {swimmerCount} adherents.
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            Conformement a la regle metier, ce label est strictement interne a l&apos;administration et n&apos;apparaitra jamais sur le profil public des clients.
          </p>
        </div>

        {isAlreadyPaid && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center font-medium">
            Ce bordereau a deja ete marque comme paye
            {paidAt ? ` le ${new Date(paidAt).toLocaleDateString("fr-DZ")}` : ""}.
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={submitting || swimmerCount === 0}
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-black transition-colors shadow-sm flex items-center gap-2"
          >
            {submitting ? (
              <span>Application en cours...</span>
            ) : (
              <span>Confirmer le Paiement (poolpaid)</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
