"use client";

import React, { useState } from "react";
import { useTranslations } from "@/lib/i18n";
import { PoolPricingConfig } from "@/lib/swim-pool-dispatch";

interface PoolPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  pricingConfig: PoolPricingConfig;
  onSavePricing: (newConfig: PoolPricingConfig) => void;
  selectedCount: number;
}

export function PoolPricingModal({
  isOpen,
  onClose,
  pricingConfig,
  onSavePricing,
  selectedCount,
}: PoolPricingModalProps) {
  const { t } = useTranslations("swimPool");

  const [defaultPrice, setDefaultPrice] = useState(pricingConfig.defaultPrice || 2000);
  const [hommePrice, setHommePrice] = useState(pricingConfig.categoryPrices?.homme || 2000);
  const [femmePrice, setFemmePrice] = useState(pricingConfig.categoryPrices?.femme || 2000);
  const [enfantsPrice, setEnfantsPrice] = useState(pricingConfig.categoryPrices?.enfants || 1500);
  const [apneaPrice, setApneaPrice] = useState(pricingConfig.categoryPrices?.apnea || 2500);
  const [keepOverrides, setKeepOverrides] = useState(true);

  if (!isOpen) return null;

  const overridesCount = Object.keys(pricingConfig.individualOverrides || {}).length;

  const handleApplyUniversal = (price: number) => {
    setDefaultPrice(price);
    setHommePrice(price);
    setFemmePrice(price);
    setEnfantsPrice(price);
    setApneaPrice(price);
  };

  const handleSave = () => {
    const updated: PoolPricingConfig = {
      defaultPrice: Number(defaultPrice) || 0,
      categoryPrices: {
        homme: Number(hommePrice) || 0,
        femme: Number(femmePrice) || 0,
        enfants: Number(enfantsPrice) || 0,
        apnea: Number(apneaPrice) || 0,
      },
      individualOverrides: keepOverrides ? pricingConfig.individualOverrides : {},
    };
    onSavePricing(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                {t("pricingModalTitle")}
              </h2>
              <p className="text-xs text-slate-400">
                {t("pricingModalDesc")}
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

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {t("quickPresets")}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1500, 2000, 2500, 3000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleApplyUniversal(preset)}
                  className="px-3 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-sky-950/80 hover:text-sky-300 hover:border-sky-700/50 border border-white/5 text-slate-200 transition-colors text-center"
                >
                  {preset} DA
                </button>
              ))}
            </div>
          </div>

          {/* Universal Default Rate */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-sky-400">
                {t("defaultRate")}
              </label>
              <button
                type="button"
                onClick={() => handleApplyUniversal(defaultPrice)}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>{t("applyToAll")}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="100"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(Number(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-sky-400"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 font-mono">
                DA
              </span>
            </div>
          </div>

          {/* Category-Specific Rates */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              {t("categoryRates")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {t("hommeRate")}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={hommePrice}
                    onChange={(e) => setHommePrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-mono">DA</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {t("femmeRate")}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={femmePrice}
                    onChange={(e) => setFemmePrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-mono">DA</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {t("enfantsRate")}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={enfantsPrice}
                    onChange={(e) => setEnfantsPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-mono">DA</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {t("apneaRate")}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={apneaPrice}
                    onChange={(e) => setApneaPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-mono">DA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Overrides Management */}
          {overridesCount > 0 && (
            <div className="bg-amber-950/20 border border-amber-800/40 p-3 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-amber-300">
                  {overridesCount} {t("overrideBadge")}
                </div>
                <div className="text-[11px] text-amber-200/70">
                  Active swimmer price exceptions configured inline
                </div>
              </div>
              <button
                type="button"
                onClick={() => setKeepOverrides(!keepOverrides)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  keepOverrides
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-red-950 text-red-300 border border-red-800/50"
                }`}
              >
                {keepOverrides ? t("clearOverrides") : "Will Be Cleared on Save"}
              </button>
            </div>
          )}

          {/* Simulation Preview */}
          <div className="bg-gradient-to-r from-sky-950/40 to-teal-950/40 p-4 rounded-xl border border-sky-800/30 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">{t("selectedSwimmers")}</div>
              <div className="text-lg font-mono font-bold text-white">{selectedCount}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-sky-400 font-medium">Estimated Default Payout</div>
              <div className="text-lg font-mono font-bold text-cyan-300">
                {(selectedCount * defaultPrice).toLocaleString("fr-DZ")} DA
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white shadow-lg shadow-sky-900/30 transition-all font-mono"
          >
            {t("savePricing")}
          </button>
        </div>
      </div>
    </div>
  );
}
