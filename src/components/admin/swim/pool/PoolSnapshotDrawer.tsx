"use client";

import React from "react";
import { useTranslations } from "@/lib/i18n";
import { PoolDispatchSnapshot } from "@/lib/swim-pool-dispatch";

interface PoolSnapshotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: PoolDispatchSnapshot[];
  onSelectSnapshot: (snapshot: PoolDispatchSnapshot) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
}

export function PoolSnapshotDrawer({
  isOpen,
  onClose,
  snapshots,
  onSelectSnapshot,
  onDeleteSnapshot,
}: PoolSnapshotDrawerProps) {
  const { t } = useTranslations("swimPool");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#0f172a] border-l border-white/10 shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {t("snapshotTitle")}
              </h3>
              <p className="text-[11px] text-slate-400">
                Archived RealFinalPool monthly statements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="p-6 space-y-3 flex-1 overflow-y-auto">
          {snapshots.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-white/10">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {t("snapshotEmpty")}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Save your final pool dispatch at the end of each month to build historical records.
              </p>
            </div>
          ) : (
            snapshots.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-white/5 hover:border-teal-500/30 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">
                      {item.monthLabel}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Archived: {new Date(item.createdAt).toLocaleDateString("fr-DZ")}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800/40">
                    RealFinalPool
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t("selectedSwimmers")}</span>
                    <span className="font-mono font-bold text-slate-200">{item.swimmerCount}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-teal-400 block">Total Redevance</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {item.totalPoolPriceDA.toLocaleString("fr-DZ")} DA
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSnapshot(item);
                      onClose();
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>{t("loadSnapshot")}</span>
                    <span>→</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t("confirmDeleteSnapshot"))) {
                        onDeleteSnapshot(item.id);
                      }
                    }}
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
                  >
                    {t("deleteSnapshot")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
