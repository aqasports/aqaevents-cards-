"use client";

import React from "react";
import { useTranslations } from "@/lib/i18n";
import { PoolColumnConfig, PoolColumnKey } from "@/lib/swim-pool-dispatch";

interface PoolColumnConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnConfig: PoolColumnConfig;
  onChangeColumn: (key: PoolColumnKey, enabled: boolean) => void;
  onResetDefault: () => void;
}

export function PoolColumnConfigModal({
  isOpen,
  onClose,
  columnConfig,
  onChangeColumn,
  onResetDefault,
}: PoolColumnConfigModalProps) {
  const { t } = useTranslations("swimPool");

  if (!isOpen) return null;

  const columnsList: Array<{ key: PoolColumnKey; labelKey: string }> = [
    { key: "number", labelKey: "colNumber" },
    { key: "name", labelKey: "colName" },
    { key: "swimId", labelKey: "colSwimId" },
    { key: "groups", labelKey: "colGroups" },
    { key: "schedule", labelKey: "colSchedule" },
    { key: "category", labelKey: "colCategory" },
    { key: "poolPrice", labelKey: "colPoolPrice" },
    { key: "currentMonth", labelKey: "colCurrentMonth" },
    { key: "phone", labelKey: "colPhone" },
    { key: "paymentStatus", labelKey: "colPaymentStatus" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {t("columnsTool")}
              </h3>
              <p className="text-[11px] text-slate-400">
                Choose visible columns for table & print
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Column Toggles */}
        <div className="p-6 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {columnsList.map(({ key, labelKey }) => {
            const isChecked = Boolean(columnConfig[key]);
            return (
              <label
                key={key}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => onChangeColumn(key, e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-800 border-slate-700"
                  />
                  <span className="text-xs font-medium text-slate-200">
                    {t(labelKey)}
                  </span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    isChecked
                      ? "bg-sky-950 text-sky-300 border border-sky-800/40"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {isChecked ? "Visible" : "Hidden"}
                </span>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-slate-900 flex items-center justify-between">
          <button
            type="button"
            onClick={onResetDefault}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline"
          >
            {t("resetPrice")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors"
          >
            {t("apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
