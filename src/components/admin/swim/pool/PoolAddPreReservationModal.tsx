"use client";
import React, { useState } from "react";
import {
  DEFAULT_POOLS,
  PoolDocumentMeta,
  getDynamicDocumentMeta,
  getProposedPreReservationTitle,
  FRENCH_MONTHS,
  getCurrentFrenchMonth,
} from "@/lib/swim-pool-dispatch";

interface PoolAddPreReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    title: string;
    referenceNumber: string;
    poolId: string;
    date: string;
    month: string;
    year: string;
  }) => void;
  existingCount?: number;
}

export function PoolAddPreReservationModal({
  isOpen,
  onClose,
  onAdd,
  existingCount = 0,
}: PoolAddPreReservationModalProps) {
  const dynamicMeta: PoolDocumentMeta = getDynamicDocumentMeta();

  const presNum = existingCount + 1;
  const getAutoTitle = React.useCallback(
    (pid: string) => getProposedPreReservationTitle(pid, presNum),
    [presNum]
  );

  const [poolId, setPoolId] = useState("azal");
  const [title, setTitle] = useState(() => getProposedPreReservationTitle("azal", presNum));
  const [hasUserEditedTitle, setHasUserEditedTitle] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState(
    `PR:00${String(presNum).padStart(2, "0")}/${dynamicMeta.year.slice(-2)}`
  );
  const [date, setDate] = useState(dynamicMeta.date);
  const [month, setMonth] = useState(() => getCurrentFrenchMonth());
  const [year, setYear] = useState(dynamicMeta.year);

  // Sync title with count / pool when modal opens
  React.useEffect(() => {
    if (isOpen && !hasUserEditedTitle) {
      setTitle(getAutoTitle(poolId));
      setReferenceNumber(
        `PR:00${String(presNum).padStart(2, "0")}/${dynamicMeta.year.slice(-2)}`
      );
    }
  }, [isOpen, existingCount, poolId, presNum, hasUserEditedTitle, dynamicMeta.year, getAutoTitle]);

  if (!isOpen) return null;

  const handlePoolChange = (newPid: string) => {
    setPoolId(newPid);
    if (!hasUserEditedTitle) {
      setTitle(getAutoTitle(newPid));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || getAutoTitle(poolId);
    if (!finalTitle || !referenceNumber.trim()) return;

    onAdd({
      title: finalTitle,
      referenceNumber: referenceNumber.trim(),
      poolId,
      date: date.trim() || dynamicMeta.date,
      month: month.trim() || "Octobre",
      year: year.trim() || dynamicMeta.year,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Nouvelle Pré-réservation (Créneaux & Places)
              </h3>
              <p className="text-xs text-slate-400">
                Créez une fiche de pré-réservation pour bloquer les lignes d&apos;eau
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Pool Selection */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
              Piscine Partenaire
            </label>
            <select
              value={poolId}
              onChange={(e) => handlePoolChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-semibold focus:outline-none focus:border-cyan-400"
            >
              {DEFAULT_POOLS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
              Titre de la Pré-réservation
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasUserEditedTitle(true);
              }}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-medium focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Reference & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                N° Référence
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                Date d&apos;émission
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-medium focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Month & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                Mois de Référence
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {FRENCH_MONTHS.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                Année
              </label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors shadow-sm"
            >
              Créer la Pré-réservation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
