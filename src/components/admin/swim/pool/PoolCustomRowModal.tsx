"use client";

import React, { useState } from "react";
import { FRENCH_MONTHS, getCurrentFrenchMonth } from "@/lib/swim-pool-dispatch";

interface PoolCustomRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (row: { fullName: string; groupOrNote: string; poolPriceDA: number; month: string }) => void;
  defaultMonth: string;
}

export function PoolCustomRowModal({
  isOpen,
  onClose,
  onAdd,
  defaultMonth,
}: PoolCustomRowModalProps) {
  const [fullName, setFullName] = useState("");
  const [groupOrNote, setGroupOrNote] = useState("");
  const [priceInput, setPriceInput] = useState("4000");
  const [monthInput, setMonthInput] = useState(defaultMonth || getCurrentFrenchMonth());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    onAdd({
      fullName: fullName.trim(),
      groupOrNote: groupOrNote.trim(),
      poolPriceDA: Number(priceInput) || 0,
      month: monthInput.trim() || defaultMonth,
    });

    setFullName("");
    setGroupOrNote("");
    setPriceInput("4000");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Ajouter une Ligne Personnalisee
            </h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Ex: AQA KIDS, section competition, seance collective
            </p>
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
              Nom / Designation de la Ligne *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: AQA KIDS"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Groupe ou Note (Facultatif)
            </label>
            <input
              type="text"
              placeholder="Ex: Section Enfants ou Note particuliere"
              value={groupOrNote}
              onChange={(e) => setGroupOrNote(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tarif Piscine (DA) *
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mois Concerne
              </label>
              <select
                value={monthInput}
                onChange={(e) => setMonthInput(e.target.value)}
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

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-950 transition-all"
            >
              Ajouter au Bordereau
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
