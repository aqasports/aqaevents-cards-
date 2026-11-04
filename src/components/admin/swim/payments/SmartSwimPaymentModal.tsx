"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button, Input } from "@/components/admin/ui";
import { useLocale, useTranslations } from "@/lib/i18n";
import {
  isStarterFormula,
  getStarterBillingCycles,
  getFormulaUpgradeOptions,
  parseSidePocketBalance,
  parseLinkedEventCard,
  formatMonthKey,
  formatMonthLabel,
  getNextMonthDate,
  type FormulaUpgradeTier,
} from "@/lib/swim-subscription";

export interface SmartSwimPaymentMember {
  id: string;
  swimId: string;
  fullName: string;
  phone?: string | null;
  category: string;
  level?: string | null;
  formula: string;
  duration?: string | null;
  priceDA: number;
  notes?: string | null;
  paymentStatus?: string;
  subscriptionStart?: Date | string | null;
  subscriptionEnd?: Date | string | null;
  dateOfStart?: Date | string | null;
  effectivePriceDA?: number;
  totalPaid?: number;
  debt?: number;
  payments?: Array<{
    id?: string;
    amount?: number;
    notes?: string | null;
    paidAt?: Date | string | null;
    method?: string;
  }>;
}

interface SmartSwimPaymentModalProps {
  isOpen: boolean;
  member: SmartSwimPaymentMember | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

type SmartAction =
  | "settle"
  | "cover_month"
  | "upgrade_formula"
  | "side_pocket"
  | "use_side_pocket"
  | "link_event_card";

export function SmartSwimPaymentModal({
  isOpen,
  member,
  onClose,
  onSuccess,
}: SmartSwimPaymentModalProps) {
  const { locale } = useLocale();
  const { t } = useTranslations("swimPaymentsDesk");

  const [selectedAction, setSelectedAction] = useState<SmartAction>("settle");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [targetMonth, setTargetMonth] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<"silver" | "gold" | "diamond">("silver");
  const [eventCardCode, setEventCardCode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute billing cycle situation
  const billingSituation = useMemo(() => {
    if (!member) return null;
    const isStarter = isStarterFormula(member.duration, member.formula);
    if (isStarter) {
      return getStarterBillingCycles(member, new Date(), locale);
    }
    return null;
  }, [member, locale]);

  // Formula upgrade tiers
  const upgradeTiers = useMemo<FormulaUpgradeTier[]>(() => {
    if (!member) return [];
    return getFormulaUpgradeOptions(member);
  }, [member]);

  // Side Pocket balance
  const sidePocketBalance = useMemo(() => {
    if (!member) return 0;
    return parseSidePocketBalance(member.notes);
  }, [member]);

  // Linked card
  const linkedCard = useMemo(() => {
    if (!member) return null;
    return parseLinkedEventCard(member.notes);
  }, [member]);

  // Upcoming months list (for advance coverage)
  const upcomingMonths = useMemo(() => {
    const list: Array<{ key: string; label: string }> = [];
    const now = new Date();
    // 3 upcoming months
    for (let i = 1; i <= 3; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
      list.push({
        key: formatMonthKey(d),
        label: formatMonthLabel(d, locale),
      });
    }
    return list;
  }, [locale]);

  // Active due cycle info
  const activeCycle = useMemo(() => {
    if (!billingSituation) return null;
    return (
      billingSituation.cycles.find((c) => c.isCurrentDue) ||
      billingSituation.cycles[billingSituation.cycles.length - 1] ||
      null
    );
  }, [billingSituation]);

  const isCurrentCyclePaid = useMemo(() => {
    if (activeCycle) {
      return activeCycle.status === "paid";
    }
    return member?.paymentStatus === "paid";
  }, [activeCycle, member]);

  // Initialize modal state on member change or open
  useEffect(() => {
    if (!isOpen || !member) return;

    setErrorMsg(null);
    setPaymentNotes("");
    setPaymentMethod("cash");
    setEventCardCode(linkedCard?.cardCode || "");

    const monthlyTariff =
      member.priceDA && member.priceDA > 0
        ? member.priceDA
        : member.effectivePriceDA && member.effectivePriceDA > 0
        ? member.effectivePriceDA
        : 7800;

    // Intelligent Action Selection:
    // If the member is already settled for the active cycle, prompt proactive actions (Cover month, upgrade, side pocket)
    if (isCurrentCyclePaid) {
      setSelectedAction("cover_month");
      const firstUpcoming = upcomingMonths[0];
      if (firstUpcoming) {
        setTargetMonth(firstUpcoming.key);
      }
      setPaymentAmount(String(monthlyTariff));
    } else {
      // Member owes money for active cycle
      setSelectedAction("settle");
      const dueAmount = activeCycle ? activeCycle.debtDA : member.debt ?? monthlyTariff;
      setPaymentAmount(String(dueAmount > 0 ? dueAmount : monthlyTariff));
      if (activeCycle) {
        setTargetMonth(activeCycle.monthKey);
      }
    }
  }, [isOpen, member, isCurrentCyclePaid, activeCycle, upcomingMonths, linkedCard]);

  // When action changes, adjust default amount and payload values
  function handleActionChange(action: SmartAction) {
    setSelectedAction(action);
    setErrorMsg(null);

    const monthlyTariff =
      member?.priceDA && member.priceDA > 0
        ? member.priceDA
        : member?.effectivePriceDA && member.effectivePriceDA > 0
        ? member.effectivePriceDA
        : 7800;

    if (action === "settle") {
      const dueAmount = activeCycle ? activeCycle.debtDA : member?.debt ?? monthlyTariff;
      setPaymentAmount(String(dueAmount > 0 ? dueAmount : monthlyTariff));
      if (activeCycle) setTargetMonth(activeCycle.monthKey);
    } else if (action === "cover_month") {
      const nextM = upcomingMonths[0];
      if (nextM) setTargetMonth(nextM.key);
      setPaymentAmount(String(monthlyTariff));
    } else if (action === "upgrade_formula") {
      const tier = upgradeTiers.find((t) => t.targetTier === selectedTier) || upgradeTiers[0];
      if (tier) {
        setSelectedTier(tier.targetTier);
        setPaymentAmount(String(tier.complementDA));
      }
    } else if (action === "side_pocket") {
      setPaymentAmount("5000");
    } else if (action === "use_side_pocket") {
      const dueAmount = activeCycle ? activeCycle.debtDA : member?.debt ?? monthlyTariff;
      const usable = Math.min(sidePocketBalance, dueAmount > 0 ? dueAmount : monthlyTariff);
      setPaymentAmount(String(usable));
    } else if (action === "link_event_card") {
      setPaymentAmount("0");
    }
  }

  function handleSelectUpgradeTier(tier: FormulaUpgradeTier) {
    setSelectedTier(tier.targetTier);
    setPaymentAmount(String(tier.complementDA));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const numAmount = parseInt(paymentAmount, 10);
      if (selectedAction !== "link_event_card" && (isNaN(numAmount) || numAmount < 0)) {
        throw new Error("Montant invalide");
      }

      const tierObj = upgradeTiers.find((t) => t.targetTier === selectedTier);

      const payload: Record<string, any> = {
        memberId: member.id,
        amount: isNaN(numAmount) ? 0 : numAmount,
        method: paymentMethod,
        notes: paymentNotes || null,
        action: selectedAction,
      };

      if (selectedAction === "settle") {
        payload.targetMonth = targetMonth || activeCycle?.monthKey;
        payload.isNextMonth = false;
        payload.extendSubscription = false;
      } else if (selectedAction === "cover_month") {
        payload.targetMonth = targetMonth;
        payload.isNextMonth = true;
        payload.extendSubscription = true;
      } else if (selectedAction === "upgrade_formula") {
        if (!tierObj) throw new Error("Veuillez choisir une formule de surclassement");
        payload.targetDuration = tierObj.targetDuration;
        payload.targetFormula = tierObj.targetFormula;
        payload.targetPriceDA = tierObj.totalPriceDA;
        payload.extendSubscription = true;
      } else if (selectedAction === "side_pocket") {
        payload.sidePocketAmount = numAmount;
      } else if (selectedAction === "use_side_pocket") {
        payload.sidePocketAmount = numAmount;
      } else if (selectedAction === "link_event_card") {
        if (!eventCardCode.trim()) {
          throw new Error("Veuillez saisir un code de carte AQA Event valide");
        }
        payload.eventCardCode = eventCardCode.trim().toUpperCase();
      }

      const res = await fetch("/api/admin/swim/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Echec de l'enregistrement du paiement");
      }

      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-950 text-cyan-300 border border-sky-500/30">
                AQA Swim · Intelligence Desk
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                ID: {member.swimId}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              {t("smartModalTitle")}
            </h3>
            <p className="text-xs text-slate-400">
              {member.fullName} · {member.formula} ({member.duration || "1m"})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Situation Banner */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/8 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              {t("smartCurrentSituation")}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isCurrentCyclePaid
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                  : activeCycle?.status === "partial"
                  ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                  : "bg-rose-950/80 text-rose-300 border border-rose-500/40"
              }`}
            >
              {isCurrentCyclePaid
                ? t("smartStatusPaid")
                : activeCycle?.status === "partial"
                ? t("smartStatusPartial")
                : t("smartStatusUnpaid")}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              {activeCycle ? (
                <div className="text-white font-medium">
                  {isCurrentCyclePaid ? (
                    <span className="text-emerald-400 font-semibold">
                      {t("smartCycleCovered", { month: activeCycle.monthLabel })}
                    </span>
                  ) : (
                    <span>
                      {t("smartDueMonthLabel", {
                        month: activeCycle.monthLabel,
                        amount: activeCycle.debtDA.toLocaleString("fr-DZ"),
                      })}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-white font-medium">
                  Tarif : {(member.priceDA || 7800).toLocaleString("fr-DZ")} DA
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {sidePocketBalance > 0 && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  {t("smartSidePocketBalance", {
                    amount: sidePocketBalance.toLocaleString("fr-DZ"),
                  })}
                </span>
              )}
              {linkedCard && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-500/40">
                  {t("smartLinkedEventCard", { code: linkedCard.cardCode })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Smart Action Pills / Tabs */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Action Intelligente Requise
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleActionChange("settle")}
              className={`p-2 rounded-xl text-left border transition-all text-xs font-semibold ${
                selectedAction === "settle"
                  ? "border-cyan-400 bg-cyan-950/70 text-cyan-200 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                  : "border-white/8 bg-slate-800/50 text-slate-300 hover:border-white/20"
              }`}
            >
              <div className="font-bold text-[11px]">{t("smartActionTabSettle")}</div>
              <div className="text-[10px] text-slate-400 truncate">
                {activeCycle ? activeCycle.monthLabel : "Cycle en cours"}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleActionChange("cover_month")}
              className={`p-2 rounded-xl text-left border transition-all text-xs font-semibold ${
                selectedAction === "cover_month"
                  ? "border-cyan-400 bg-cyan-950/70 text-cyan-200 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                  : "border-white/8 bg-slate-800/50 text-slate-300 hover:border-white/20"
              }`}
            >
              <div className="font-bold text-[11px]">{t("smartActionTabCoverMonth")}</div>
              <div className="text-[10px] text-slate-400 truncate">
                Avance mois à venir
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleActionChange("upgrade_formula")}
              className={`p-2 rounded-xl text-left border transition-all text-xs font-semibold ${
                selectedAction === "upgrade_formula"
                  ? "border-cyan-400 bg-cyan-950/70 text-cyan-200 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                  : "border-white/8 bg-slate-800/50 text-slate-300 hover:border-white/20"
              }`}
            >
              <div className="font-bold text-[11px]">{t("smartActionTabUpgrade")}</div>
              <div className="text-[10px] text-slate-400 truncate">
                Silver / Gold / Diamond
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleActionChange("side_pocket")}
              className={`p-2 rounded-xl text-left border transition-all text-xs font-semibold ${
                selectedAction === "side_pocket" || selectedAction === "use_side_pocket"
                  ? "border-cyan-400 bg-cyan-950/70 text-cyan-200 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                  : "border-white/8 bg-slate-800/50 text-slate-300 hover:border-white/20"
              }`}
            >
              <div className="font-bold text-[11px]">{t("smartActionTabSidePocket")}</div>
              <div className="text-[10px] text-slate-400 truncate">
                {sidePocketBalance > 0 ? `${sidePocketBalance.toLocaleString("fr-DZ")} DA dispo` : "Avoir Club"}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleActionChange("link_event_card")}
              className={`p-2 rounded-xl text-left border transition-all text-xs font-semibold col-span-2 sm:col-span-2 ${
                selectedAction === "link_event_card"
                  ? "border-cyan-400 bg-cyan-950/70 text-cyan-200 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                  : "border-white/8 bg-slate-800/50 text-slate-300 hover:border-white/20"
              }`}
            >
              <div className="font-bold text-[11px]">{t("smartActionTabLinkCard")}</div>
              <div className="text-[10px] text-slate-400 truncate">
                {linkedCard ? `Lié à ${linkedCard.cardCode}` : "Synchronisation carte multi-activités"}
              </div>
            </button>
          </div>
        </div>

        {/* Action Specific Sub-Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action: SETTLE */}
          {selectedAction === "settle" && (
            <div className="p-3 rounded-xl bg-slate-800/50 border border-white/8 space-y-2 text-xs">
              <p className="text-slate-300">
                {t("smartSettleHelp", {
                  month: activeCycle ? activeCycle.monthLabel : "le mois en cours",
                })}
              </p>
              {activeCycle && (
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-white/5">
                  <span>Cycle : {activeCycle.monthLabel}</span>
                  <span className="text-cyan-300 font-bold">
                    Tarif attendu : {activeCycle.tariffDA.toLocaleString("fr-DZ")} DA
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action: COVER UPCOMING MONTH */}
          {selectedAction === "cover_month" && (
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-white/8 space-y-3 text-xs">
              <p className="text-slate-300">
                {t("smartCoverMonthHelp")}
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  {t("smartCoverMonthSelect")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {upcomingMonths.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setTargetMonth(m.key)}
                      className={`p-2 rounded-xl text-center border transition-all text-xs font-bold ${
                        targetMonth === m.key
                          ? "border-cyan-400 bg-cyan-950/80 text-cyan-300 shadow-[0_0_10px_rgba(0,242,255,0.15)]"
                          : "border-white/10 bg-slate-900 text-slate-300 hover:border-white/20"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action: UPGRADE FORMULA */}
          {selectedAction === "upgrade_formula" && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-300">
                {t("smartUpgradeHelp", {
                  paid: (upgradeTiers[0]?.currentPaidDA || 0).toLocaleString("fr-DZ"),
                })}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {upgradeTiers.map((tier) => (
                  <div
                    key={tier.targetTier}
                    onClick={() => handleSelectUpgradeTier(tier)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                      selectedTier === tier.targetTier
                        ? "border-cyan-400 bg-cyan-950/60 shadow-[0_0_15px_rgba(0,242,255,0.15)]"
                        : "border-white/10 bg-slate-800/50 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white uppercase">
                        {tier.targetTier}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300 font-bold">
                        {tier.targetDuration}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400">
                      {t("smartUpgradeNominal", {
                        amount: tier.totalPriceDA.toLocaleString("fr-DZ"),
                      })}
                    </div>

                    {tier.currentPaidDA > 0 && (
                      <div className="text-[10px] text-emerald-400 font-mono">
                        {t("smartUpgradeCurrentPaid", {
                          amount: tier.currentPaidDA.toLocaleString("fr-DZ"),
                        })}
                      </div>
                    )}

                    <div className="pt-1 border-t border-white/5">
                      <div className="text-[11px] font-bold text-white font-mono">
                        {t("smartUpgradeToPay", {
                          amount: tier.complementDA.toLocaleString("fr-DZ"),
                        })}
                      </div>
                      {tier.savingsDA > 0 && (
                        <div className="text-[9px] text-cyan-300/80 font-mono">
                          {t("smartUpgradeSavings", {
                            amount: tier.savingsDA.toLocaleString("fr-DZ"),
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action: SIDE POCKET */}
          {(selectedAction === "side_pocket" || selectedAction === "use_side_pocket") && (
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-white/8 space-y-3 text-xs">
              <p className="text-slate-300">
                {t("smartSidePocketHelp")}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAction("side_pocket")}
                  className={`flex-1 p-2 rounded-xl text-center border font-semibold text-xs transition-colors ${
                    selectedAction === "side_pocket"
                      ? "border-cyan-400 bg-cyan-950 text-cyan-300"
                      : "border-white/10 bg-slate-900 text-slate-400"
                  }`}
                >
                  {t("smartSidePocketDepositAction")}
                </button>
                <button
                  type="button"
                  disabled={sidePocketBalance <= 0}
                  onClick={() => setSelectedAction("use_side_pocket")}
                  className={`flex-1 p-2 rounded-xl text-center border font-semibold text-xs transition-colors ${
                    selectedAction === "use_side_pocket"
                      ? "border-cyan-400 bg-cyan-950 text-cyan-300"
                      : sidePocketBalance <= 0
                      ? "opacity-50 cursor-not-allowed border-white/5 bg-slate-900 text-slate-500"
                      : "border-white/10 bg-slate-900 text-slate-400"
                  }`}
                >
                  {t("smartSidePocketUseAction")}
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Solde de l&apos;Avoir Club :</span>
                <span className="font-bold text-cyan-300">
                  {sidePocketBalance.toLocaleString("fr-DZ")} DA
                </span>
              </div>
            </div>
          )}

          {/* Action: LINK EVENT CARD */}
          {selectedAction === "link_event_card" && (
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-white/8 space-y-3 text-xs">
              <p className="text-slate-300">
                {t("smartLinkCardHelp")}
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {t("smartLinkCardCodeLabel")} *
                </label>
                <Input
                  required
                  value={eventCardCode}
                  onChange={(e) => setEventCardCode(e.target.value.toUpperCase())}
                  placeholder="ex: CRD-48921 ou AQA-VIP-002"
                />
              </div>
            </div>
          )}

          {/* Common Payment Fields (Amount, Method, Notes) */}
          {selectedAction !== "link_event_card" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Montant à Encaisser (DA) *
                </label>
                <Input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="ex: 7800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t("smartPaymentMethod")}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="cash">Espèces (Accueil / Caisse)</option>
                  <option value="baridi_mob">BaridiMob / CCP</option>
                  <option value="virement">Virement Bancaire</option>
                  <option value="cheque">Chèque</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t("smartPaymentNotes")}
                </label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="ex: Reçu No. 104 / Avance Décembre"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex gap-2.5 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              {t("smartCancelBtn")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="flex-1 font-bold"
            >
              {submitting ? "Traitement..." : t("smartSubmitBtn")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
