"use client";
import React, { useState } from "react";
import {
  DEFAULT_POOLS,
  PoolDocumentMeta,
  getDynamicDocumentMeta,
  getProposedBordereauTitle,
  FRENCH_MONTHS,
  getCurrentFrenchMonth,
} from "@/lib/swim-pool-dispatch";

interface PoolAddBordereauModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (bordereauData: {
    title: string;
    referenceNumber: string;
    poolId: string;
    date: string;
    month: string;
    year: string;
  }) => void;
  existingCount?: number;
}

export function PoolAddBordereauModal({
  isOpen,
  onClose,
  onAdd,
  existingCount = 0,
}: PoolAddBordereauModalProps) {
  const dynamicMeta: PoolDocumentMeta = getDynamicDocumentMeta();

  const bordereauNum = existingCount + 1;
  const getAutoTitle = React.useCallback(
    (pid: string) => getProposedBordereauTitle(pid, bordereauNum),
    [bordereauNum]
  );

  const [poolId, setPoolId] = useState("azal");
  const [title, setTitle] = useState(() => getProposedBordereauTitle("azal", bordereauNum));
  const [hasUserEditedTitle, setHasUserEditedTitle] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState(
    `n:00${String(bordereauNum).padStart(2, "0")}/${dynamicMeta.year.slice(-2)}`
  );
  const [date, setDate] = useState(dynamicMeta.date);
  const [month, setMonth] = useState(() => getCurrentFrenchMonth());
  const [year, setYear] = useState(dynamicMeta.year);

  // Sync title with count / pool when modal opens
  React.useEffect(() => {
    if (isOpen && !hasUserEditedTitle) {
      setTitle(getAutoTitle(poolId));
      setReferenceNumber(
        `n:00${String(bordereauNum).padStart(2, "0")}/${dynamicMeta.year.slice(-2)}`
      );
    }
  }, [isOpen, existingCount, poolId, bordereauNum, hasUserEditedTitle, dynamicMeta.year, getAutoTitle]);

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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Nouveau Bordereau Piscine
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Creer un bordereau vierge pour y ajouter les adherents selectionnes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Piscine Destinataire *
            </label>
            <select
              value={poolId}
              onChange={(e) => handlePoolChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              {DEFAULT_POOLS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.id === "azal" ? "(Tarifs officiels Azal)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Titre du Document *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Azal Bordereau 1"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasUserEditedTitle(true);
              }}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                N° Reference *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: n:0010/26"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mois de Reference *
              </label>
              <select
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                {FRENCH_MONTHS.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Date d&apos;emission *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 08/10/2026"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Annee *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 2026"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold transition-colors shadow-sm"
            >
              Creer le Bordereau
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
