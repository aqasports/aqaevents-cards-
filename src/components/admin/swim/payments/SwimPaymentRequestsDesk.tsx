"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/admin/ui";
import { isMemberAssignedToGroup } from "@/lib/swim-groups";
import {
  isStarterFormula,
  isMemberNextMonthPaid,
  formatMonthKey,
  formatMonthLabel,
  getFormulaBadgeInfo,
} from "@/lib/swim-subscription";
import {
  resolveSwimWhatsApp,
  hasValidSwimPhone,
  buildSwimPaymentRequestMessage,
  getSwimPaymentRequestWhatsAppUrl,
  parsePaymentRequestFromNotes,
  encodePaymentRequestInNotes,
  type PaymentRequestOptionMode,
} from "@/lib/swim-whatsapp";
import { useLocale, useTranslations } from "@/lib/i18n";

export interface PaymentRequestMemberRow {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  category: string;
  level: string;
  formula: string;
  duration?: string | null;
  effectivePriceDA: number;
  totalPaid: number;
  debt: number;
  paymentStatus: string;
  subStart: Date;
  subEnd: Date;
  daysLeft: number;
  subStatus: string;
  expiringSoon: boolean;
  isStarter?: boolean;
  isAssigned?: boolean;
  isLinkedToPayment?: boolean;
  isDebtOnly?: boolean;
  effectivelyUnassigned?: boolean;
  notes?: string | null;
  payments?: Array<{ id?: string; amount?: number; notes?: string | null; paidAt?: Date | string }>;
  group?: {
    id: string;
    name: string;
    coachName?: string | null;
    schedule?: string | null;
    active?: boolean;
  } | null;
}

interface SwimPaymentRequestsDeskProps {
  members: PaymentRequestMemberRow[];
  onReload?: (options?: { silent?: boolean }) => Promise<void> | void;
  onRecordPayment?: (member: PaymentRequestMemberRow) => void;
  initialPromptMember?: PaymentRequestMemberRow | null;
  onClearInitialPromptMember?: () => void;
}

const RIP_STORAGE_KEY = "aqa_swim_baridimob_rip";

export function SwimPaymentRequestsDesk({
  members,
  onReload,
  onRecordPayment,
  initialPromptMember,
  onClearInitialPromptMember,
}: SwimPaymentRequestsDeskProps) {
  const { locale } = useLocale();
  const { t } = useTranslations("swimPaymentsDesk");

  const [searchTerm, setSearchTerm] = useState("");
  const [formulaFilter, setFormulaFilter] = useState<"all" | "starter" | "other">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "to_request" | "missing_phone" | "sent">("all");

  // Payment options & message configuration
  const [paymentOption, setPaymentOption] = useState<PaymentRequestOptionMode>("both");
  const [baridimobRip, setBaridimobRip] = useState("");
  const [msgLocale, setMsgLocale] = useState<"fr" | "ar" | "en">("fr");
  const [showPreviewBanner, setShowPreviewBanner] = useState(false);

  // Per-row payment option override
  const [rowOptionOverrides, setRowOptionOverrides] = useState<Record<string, PaymentRequestOptionMode>>({});

  // Local sent tracking (in addition to persisted [PAY_REQ_SENT:...] in notes)
  const [localSentMap, setLocalSentMap] = useState<Record<string, { sentAt: string; option: PaymentRequestOptionMode }>>({});

  // Phone / Request Modal State (opened automatically when client has no phone linked, or when admin clicks Edit/Preview)
  const [modalMember, setModalMember] = useState<PaymentRequestMemberRow | null>(null);
  const [modalIsMissingPhone, setModalIsMissingPhone] = useState(false);
  const [modalPhoneInput, setModalPhoneInput] = useState("");
  const [modalOption, setModalOption] = useState<PaymentRequestOptionMode>("both");
  const [modalError, setModalError] = useState<string | null>(null);
  const [savingPhone, setSavingPhone] = useState(false);

  // Load saved BaridiMob RIP from localStorage on mount
  useEffect(() => {
    try {
      const savedRip = window.localStorage.getItem(RIP_STORAGE_KEY);
      if (savedRip) setBaridimobRip(savedRip);
    } catch {
      // Ignore storage errors
    }
  }, []);

  function handleRipChange(val: string) {
    setBaridimobRip(val);
    try {
      window.localStorage.setItem(RIP_STORAGE_KEY, val);
    } catch {
      // Ignore storage errors
    }
  }

  // Next month label for Starter subscribers
  const nextMonthInfo = useMemo(() => {
    const now = new Date();
    const nextMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const monthKey = formatMonthKey(nextMonthDate);
    const monthLabel = formatMonthLabel(nextMonthDate, msgLocale);
    return { monthKey, monthLabel };
  }, [msgLocale]);

  // If parent triggered a prompt for a specific member (e.g. from "all" or "starter" sub-tab)
  useEffect(() => {
    if (initialPromptMember) {
      openPhoneAndRequestModal(initialPromptMember, !hasValidSwimPhone(initialPromptMember));
      if (onClearInitialPromptMember) {
        onClearInitialPromptMember();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPromptMember]);

  // Eligible clients (assigned to a group or having explicit debt)
  const eligibleMembers = useMemo(() => {
    return members
      .filter((m) => {
        if (m.isLinkedToPayment !== undefined) return m.isLinkedToPayment;
        const isAssigned = m.isAssigned !== undefined ? m.isAssigned : isMemberAssignedToGroup(m);
        return isAssigned || Boolean(m.isDebtOnly);
      })
      .map((m) => {
        const isStarter =
          m.isStarter !== undefined ? m.isStarter : isStarterFormula(m.duration, m.formula);
        const resolvedPhone = resolveSwimWhatsApp({
          phone: m.phone,
          notes: m.notes,
        });
        const hasPhone = Boolean(resolvedPhone.formattedNumber);
        const nextMonthPaid = isStarter
          ? isMemberNextMonthPaid(m, nextMonthInfo.monthKey).isPaid
          : false;
        const parsedSent = localSentMap[m.id] || parsePaymentRequestFromNotes(m.notes);
        const needsRequest = isStarter
          ? !nextMonthPaid || m.paymentStatus !== "paid" || m.debt > 0
          : m.expiringSoon || m.daysLeft <= 14 || m.paymentStatus !== "paid" || m.debt > 0;
        const badgeInfo = getFormulaBadgeInfo(m.duration, m.formula);
        const amountDue = m.debt > 0 ? m.debt : m.effectivePriceDA;

        return {
          ...m,
          isStarter,
          hasPhone,
          displayPhone: resolvedPhone.whatsappNumber,
          formattedPhone: resolvedPhone.formattedNumber,
          nextMonthPaid,
          parsedSent,
          needsRequest,
          badgeInfo,
          amountDue,
        };
      });
  }, [members, nextMonthInfo.monthKey, localSentMap]);

  // KPI counts
  const stats = useMemo(() => {
    const total = eligibleMembers.length;
    const starterCount = eligibleMembers.filter((m) => m.isStarter).length;
    const otherCount = eligibleMembers.filter((m) => !m.isStarter).length;
    const missingPhoneCount = eligibleMembers.filter((m) => !m.hasPhone).length;
    const toRequestCount = eligibleMembers.filter((m) => m.needsRequest).length;
    const sentCount = eligibleMembers.filter((m) => Boolean(m.parsedSent)).length;
    return {
      total,
      starterCount,
      otherCount,
      missingPhoneCount,
      toRequestCount,
      sentCount,
    };
  }, [eligibleMembers]);

  // Filtered rows
  const filteredMembers = useMemo(() => {
    return eligibleMembers.filter((m) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        (m.displayPhone && m.displayPhone.toLowerCase().includes(q)) ||
        m.swimId.toLowerCase().includes(q) ||
        (m.formula && m.formula.toLowerCase().includes(q)) ||
        (m.group?.name && m.group.name.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (formulaFilter === "starter" && !m.isStarter) return false;
      if (formulaFilter === "other" && m.isStarter) return false;

      if (statusFilter === "to_request" && !m.needsRequest) return false;
      if (statusFilter === "missing_phone" && m.hasPhone) return false;
      if (statusFilter === "sent" && !m.parsedSent) return false;

      return true;
    });
  }, [eligibleMembers, searchTerm, formulaFilter, statusFilter]);

  function getRowPaymentOption(memberId: string): PaymentRequestOptionMode {
    return rowOptionOverrides[memberId] || paymentOption;
  }

  function setRowPaymentOption(memberId: string, opt: PaymentRequestOptionMode) {
    setRowOptionOverrides((prev) => ({ ...prev, [memberId]: opt }));
  }

  function openPhoneAndRequestModal(m: PaymentRequestMemberRow, isMissingPhone: boolean) {
    const resolved = resolveSwimWhatsApp({ phone: m.phone, notes: m.notes });
    setModalMember(m);
    setModalIsMissingPhone(isMissingPhone);
    setModalPhoneInput(resolved.whatsappNumber || "");
    setModalOption(getRowPaymentOption(m.id));
    setModalError(null);
  }

  async function recordSentTagForMember(
    m: PaymentRequestMemberRow,
    opt: PaymentRequestOptionMode,
    newPhoneToSave?: string
  ): Promise<boolean> {
    const todayStr = new Date().toISOString().slice(0, 10);
    const updatedNotes = encodePaymentRequestInNotes(m.notes, todayStr, opt);
    setLocalSentMap((prev) => ({
      ...prev,
      [m.id]: { sentAt: todayStr, option: opt },
    }));

    try {
      const bodyPayload: Record<string, unknown> = {
        notes: updatedNotes,
      };
      if (newPhoneToSave !== undefined) {
        bodyPayload.phone = newPhoneToSave;
        bodyPayload.whatsapp = newPhoneToSave;
      }

      const res = await fetch(`/api/admin/swim/members/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (res.ok && onReload) {
        await onReload({ silent: true });
      }
      return res.ok;
    } catch (err) {
      console.error("Failed to update member profile on payment request:", err);
      return false;
    }
  }

  // Triggered when admin clicks "Send Request" on a row
  function handleSendRequestClick(m: typeof eligibleMembers[0]) {
    const opt = getRowPaymentOption(m.id);

    // Rule: If there is NO phone linked to the client, open popup asking to fill their number and store it to their profile
    if (!m.hasPhone) {
      openPhoneAndRequestModal(m, true);
      return;
    }

    const waUrl = getSwimPaymentRequestWhatsAppUrl({
      fullName: m.fullName,
      phone: m.phone,
      notes: m.notes,
      swimId: m.swimId,
      formula: m.formula,
      duration: m.duration,
      isStarter: m.isStarter,
      amount: m.amountDue,
      subscriptionEnd: m.subEnd,
      nextMonthLabel: nextMonthInfo.monthLabel,
      groupName: m.group?.name || null,
      paymentOption: opt,
      baridimobRip,
      locale: msgLocale,
    });

    if (!waUrl) {
      openPhoneAndRequestModal(m, true);
      return;
    }

    window.open(waUrl, "_blank", "noopener,noreferrer");
    void recordSentTagForMember(m, opt);
  }

  // Save phone to profile (and optionally send WhatsApp payment request)
  async function handleModalSubmit(sendAfterSave: boolean) {
    if (!modalMember) return;
    const trimmed = modalPhoneInput.trim();
    const digits = trimmed.replace(/[^0-9]/g, "");

    if (digits.length < 8 || digits === "0000000000" || /^0+$/.test(digits)) {
      setModalError(t("reqPhoneInvalidError"));
      return;
    }

    setModalError(null);
    setSavingPhone(true);

    const isStarter =
      modalMember.isStarter !== undefined
        ? modalMember.isStarter
        : isStarterFormula(modalMember.duration, modalMember.formula);
    const amountDue =
      modalMember.debt > 0 ? modalMember.debt : modalMember.effectivePriceDA;

    const waUrl = getSwimPaymentRequestWhatsAppUrl({
      fullName: modalMember.fullName,
      phone: trimmed,
      whatsapp: trimmed,
      swimId: modalMember.swimId,
      formula: modalMember.formula,
      duration: modalMember.duration,
      isStarter,
      amount: amountDue,
      subscriptionEnd: modalMember.subEnd,
      nextMonthLabel: nextMonthInfo.monthLabel,
      groupName: modalMember.group?.name || null,
      paymentOption: modalOption,
      baridimobRip,
      locale: msgLocale,
    });

    try {
      if (sendAfterSave) {
        const ok = await recordSentTagForMember(modalMember, modalOption, trimmed);
        if (!ok) {
          setModalError("Failed to save phone number to profile.");
          setSavingPhone(false);
          return;
        }
        if (waUrl) {
          window.open(waUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        // Save phone only to profile
        const res = await fetch(`/api/admin/swim/members/${modalMember.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: trimmed,
            whatsapp: trimmed,
          }),
        });
        if (!res.ok) {
          setModalError("Failed to save phone number to profile.");
          setSavingPhone(false);
          return;
        }
        if (onReload) {
          await onReload({ silent: true });
        }
      }
      setModalMember(null);
    } catch {
      setModalError("Failed to save phone number to profile.");
    } finally {
      setSavingPhone(false);
    }
  }

  // Sample previews for top banner
  const starterSamplePreview = useMemo(() => {
    return buildSwimPaymentRequestMessage({
      fullName: "Client Starter",
      swimId: "SWM-1001",
      formula: "G10",
      duration: "1m",
      isStarter: true,
      amount: 8000,
      nextMonthLabel: nextMonthInfo.monthLabel,
      paymentOption,
      baridimobRip,
      locale: msgLocale,
    });
  }, [nextMonthInfo.monthLabel, paymentOption, baridimobRip, msgLocale]);

  const otherSamplePreview = useMemo(() => {
    return buildSwimPaymentRequestMessage({
      fullName: "Client Formule",
      swimId: "SWM-2002",
      formula: "G10",
      duration: "3m",
      isStarter: false,
      amount: 21000,
      subscriptionEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentOption,
      baridimobRip,
      locale: msgLocale,
    });
  }, [paymentOption, baridimobRip, msgLocale]);

  // Live preview inside modal
  const modalLivePreview = useMemo(() => {
    if (!modalMember) return "";
    const isStarter =
      modalMember.isStarter !== undefined
        ? modalMember.isStarter
        : isStarterFormula(modalMember.duration, modalMember.formula);
    const amountDue =
      modalMember.debt > 0 ? modalMember.debt : modalMember.effectivePriceDA;

    return buildSwimPaymentRequestMessage({
      fullName: modalMember.fullName,
      swimId: modalMember.swimId,
      formula: modalMember.formula,
      duration: modalMember.duration,
      isStarter,
      amount: amountDue,
      subscriptionEnd: modalMember.subEnd,
      nextMonthLabel: nextMonthInfo.monthLabel,
      groupName: modalMember.group?.name || null,
      paymentOption: modalOption,
      baridimobRip,
      locale: msgLocale,
    });
  }, [modalMember, modalOption, baridimobRip, msgLocale, nextMonthInfo.monthLabel]);

  return (
    <div className="space-y-4">
      {/* Header & Payment Options Configuration Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/85 to-slate-900/95 border border-cyan-500/25 backdrop-blur-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {t("reqHeaderTag")}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-950/80 text-sky-300 border border-sky-500/30">
                Starter : 25 - 31
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-500/30">
                Silver / Gold / Diamond : Expire Soon
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {t("reqTitle")}
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              {t("reqDesc")}
            </p>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t("reqMsgLangLabel")}:
            </span>
            {(["fr", "ar", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setMsgLocale(lang)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                  msgLocale === lang
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/10"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Options Bar: BaridiMob & Pay at Pool */}
        <div className="pt-3 border-t border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-7 space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              {t("reqPaymentOptionsTitle")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentOption("both")}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  paymentOption === "both"
                    ? "bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                    : "bg-slate-900/80 border-white/10 text-slate-300 hover:border-white/25"
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{t("reqOptionBoth")}</div>
                  <div className="text-[10px] text-slate-400">BaridiMob + Pool</div>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${paymentOption === "both" ? "bg-cyan-400" : "bg-slate-700"}`} />
              </button>

              <button
                type="button"
                onClick={() => setPaymentOption("baridimob")}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  paymentOption === "baridimob"
                    ? "bg-emerald-950/70 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : "bg-slate-900/80 border-white/10 text-slate-300 hover:border-white/25"
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{t("reqOptionBaridi")}</div>
                  <div className="text-[10px] text-slate-400">RIP / CCP</div>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${paymentOption === "baridimob" ? "bg-emerald-400" : "bg-slate-700"}`} />
              </button>

              <button
                type="button"
                onClick={() => setPaymentOption("cash_pool")}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  paymentOption === "cash_pool"
                    ? "bg-sky-950/70 border-sky-400 text-white shadow-[0_0_12px_rgba(14,165,233,0.15)]"
                    : "bg-slate-900/80 border-white/10 text-slate-300 hover:border-white/25"
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{t("reqOptionPool")}</div>
                  <div className="text-[10px] text-slate-400">Desk Piscine</div>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${paymentOption === "cash_pool" ? "bg-sky-400" : "bg-slate-700"}`} />
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">
              {t("reqRipLabel")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={baridimobRip}
                onChange={(e) => handleRipChange(e.target.value)}
                placeholder={t("reqRipPlaceholder")}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/15 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => setShowPreviewBanner((v) => !v)}
                className="shrink-0 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-cyan-300 transition-colors"
              >
                {showPreviewBanner ? "Masquer" : "Aperçu"}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Live Template Previews */}
        {showPreviewBanner && (
          <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-sky-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
                  Starter Formula (1m) — {t("reqRuleStarterBadge")}
                </span>
                <span className="text-[10px] font-mono text-slate-400">25 - 31</span>
              </div>
              <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-sans leading-relaxed bg-slate-900/70 p-2.5 rounded-lg border border-white/5">
                {starterSamplePreview}
              </pre>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Other Formulas (3m / 6m / 9m) — {t("reqRuleOtherBadge")}
                </span>
                <span className="text-[10px] font-mono text-slate-400">Silver / Gold / Diamond</span>
              </div>
              <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-sans leading-relaxed bg-slate-900/70 p-2.5 rounded-lg border border-white/5">
                {otherSamplePreview}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/8 space-y-1">
          <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
            {t("reqKpiTotalClients")}
          </p>
          <p className="text-xl font-bold font-mono text-white">{stats.total}</p>
          <p className="text-[11px] text-slate-400">
            {stats.starterCount} Starter · {stats.otherCount} Other
          </p>
        </div>

        <div
          onClick={() => setFormulaFilter(formulaFilter === "starter" ? "all" : "starter")}
          className="p-3.5 rounded-2xl bg-slate-900/80 border border-sky-500/25 space-y-1 cursor-pointer hover:border-sky-400/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-sky-400 uppercase font-semibold tracking-wider">
              {t("reqKpiStarterWindow")}
            </p>
            <span className="text-[10px] font-mono font-bold text-sky-300">25 - 31</span>
          </div>
          <p className="text-xl font-bold font-mono text-sky-300">{stats.starterCount}</p>
          <p className="text-[11px] text-slate-400">{t("reqRuleStarterBadge")}</p>
        </div>

        <div
          onClick={() => setFormulaFilter(formulaFilter === "other" ? "all" : "other")}
          className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/25 space-y-1 cursor-pointer hover:border-amber-400/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-amber-400 uppercase font-semibold tracking-wider">
              {t("reqKpiOtherFormulas")}
            </p>
            <span className="text-[10px] font-mono font-bold text-amber-300">3m / 6m / 9m</span>
          </div>
          <p className="text-xl font-bold font-mono text-amber-300">{stats.otherCount}</p>
          <p className="text-[11px] text-slate-400 truncate">{t("reqRuleOtherBadge")}</p>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "missing_phone" ? "all" : "missing_phone")}
          className="p-3.5 rounded-2xl bg-slate-900/80 border border-rose-500/25 space-y-1 cursor-pointer hover:border-rose-400/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-rose-400 uppercase font-semibold tracking-wider">
              {t("reqKpiMissingPhone")}
            </p>
            <span className="text-[10px] font-mono font-bold text-rose-300">
              {stats.missingPhoneCount}
            </span>
          </div>
          <p className={`text-xl font-bold font-mono ${stats.missingPhoneCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {stats.missingPhoneCount}
          </p>
          <p className="text-[11px] text-slate-400">{t("reqKpiMissingPhoneHint")}</p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder={t("searchStarterPlaceholder")}
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64"
        />

        {/* Formula Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: "all", label: t("reqFilterFormulaAll") },
            { key: "starter", label: t("reqFilterFormulaStarter") },
            { key: "other", label: t("reqFilterFormulaOther") },
          ] as const).map(({ key: f, label }) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormulaFilter(f)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                formulaFilter === f
                  ? f === "starter"
                    ? "bg-sky-600 text-white"
                    : f === "other"
                    ? "bg-purple-700 text-white"
                    : "bg-[var(--primary)] text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white border border-white/8"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: "all", label: t("reqFilterStatusAll") },
            { key: "to_request", label: t("reqFilterStatusToRequest", { count: stats.toRequestCount }) },
            { key: "missing_phone", label: t("reqFilterStatusMissingPhone", { count: stats.missingPhoneCount }) },
            { key: "sent", label: t("reqFilterStatusSent", { count: stats.sentCount }) },
          ] as const).map(({ key: s, label }) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                statusFilter === s
                  ? s === "missing_phone"
                    ? "bg-rose-800 text-white"
                    : s === "sent"
                    ? "bg-emerald-800 text-white"
                    : "bg-cyan-700 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white border border-white/8"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-500 ml-auto font-mono">
          {t("subscribersBadge", { count: filteredMembers.length })}
        </span>
      </div>

      {/* Payment Requests Roster Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-white/8 overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[1000px]">
          <thead>
            <tr className="border-b border-white/8 text-[10px] text-slate-400 uppercase tracking-wider">
              <th className="px-3 py-2.5 font-semibold">{t("tableHeaderSwimmer")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("reqTableHeaderPhone")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("reqTableHeaderRule")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("tableHeaderPeriod")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("reqTableHeaderAmount")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("reqTableHeaderOptions")}</th>
              <th className="px-3 py-2.5 font-semibold text-right">{t("tableHeaderActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-xs">
                  {t("noStarterMatches")}
                </td>
              </tr>
            )}
            {filteredMembers.map((m) => {
              const subEndDisplay = `${String(m.subEnd.getUTCDate()).padStart(2, "0")}/${String(
                m.subEnd.getUTCMonth() + 1
              ).padStart(2, "0")}/${m.subEnd.getUTCFullYear()}`;
              const rowOpt = getRowPaymentOption(m.id);

              return (
                <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Swimmer */}
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/admin/swim/members/${m.swimId}`}
                      className="font-semibold text-white hover:text-cyan-300 leading-tight block"
                    >
                      {m.fullName}
                    </Link>
                    <div className="text-[10px] text-slate-400 font-mono">{m.swimId}</div>
                    {m.group && (
                      <div className="text-[10px] text-cyan-400/80 truncate max-w-[160px]" title={m.group.name}>
                        {m.group.name}
                      </div>
                    )}
                  </td>

                  {/* Linked Phone */}
                  <td className="px-3 py-2.5">
                    {m.hasPhone ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-emerald-300 font-semibold">
                          {m.displayPhone}
                        </span>
                        <button
                          type="button"
                          onClick={() => openPhoneAndRequestModal(m, false)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 border border-white/10"
                        >
                          {t("reqEditPhoneBtn")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
                          {t("reqNoPhoneBadge")}
                        </span>
                        <button
                          type="button"
                          onClick={() => openPhoneAndRequestModal(m, true)}
                          className="px-2 py-0.5 rounded-lg bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition-colors"
                        >
                          {t("reqAddPhoneBtn")}
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Formula & Message Rule */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${m.badgeInfo.pillClass}`}>
                        {m.badgeInfo.label} ({m.badgeInfo.duration})
                      </span>
                      <span className="font-semibold text-slate-200 text-[11px]">{m.formula}</span>
                    </div>
                    <div className="mt-1">
                      {m.isStarter ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950/70 text-sky-300 border border-sky-500/30">
                          {t("reqRuleStarterBadge")}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-500/30">
                          {t("reqRuleOtherBadge")}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Validity Period */}
                  <td className="px-3 py-2.5 font-mono text-[11px]">
                    <div className="text-slate-300">{subEndDisplay}</div>
                    {m.daysLeft <= 0 ? (
                      <span className="text-[10px] font-bold text-rose-400">{t("expiredBadge")}</span>
                    ) : (
                      <span className={`text-[10px] font-bold ${m.daysLeft <= 14 ? "text-amber-300" : "text-cyan-300"}`}>
                        {m.daysLeft}j
                      </span>
                    )}
                  </td>

                  {/* Amount & Status */}
                  <td className="px-3 py-2.5">
                    <div className="font-mono font-bold text-white text-xs">
                      {m.amountDue.toLocaleString("fr-DZ")} DA
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          m.paymentStatus === "paid"
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                            : m.paymentStatus === "partial"
                            ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                            : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {m.paymentStatus}
                      </span>
                      {m.parsedSent && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                          {t("reqSentBadge", { date: m.parsedSent.sentAt })}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Payment Options Selector per client */}
                  <td className="px-3 py-2.5">
                    <div className="inline-flex rounded-lg bg-slate-950/80 p-0.5 border border-white/10">
                      <button
                        type="button"
                        onClick={() => setRowPaymentOption(m.id, "both")}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                          rowOpt === "both"
                            ? "bg-cyan-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title={t("reqOptionBoth")}
                      >
                        BaridiMob + Pool
                      </button>
                      <button
                        type="button"
                        onClick={() => setRowPaymentOption(m.id, "baridimob")}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                          rowOpt === "baridimob"
                            ? "bg-emerald-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title={t("reqOptionBaridi")}
                      >
                        {t("reqBaridiBadge")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRowPaymentOption(m.id, "cash_pool")}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                          rowOpt === "cash_pool"
                            ? "bg-sky-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title={t("reqOptionPool")}
                      >
                        {t("reqPoolBadge")}
                      </button>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendRequestClick(m)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all inline-flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.25)] cursor-pointer active:scale-95"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.554 4.107 1.527 5.832L0 24l6.335-1.509A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.98 0-3.831-.545-5.415-1.49l-.388-.233-3.763.897.934-3.676-.253-.398A9.786 9.786 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z" />
                        </svg>
                        <span>{t("reqSendBtn")}</span>
                      </button>

                      {onRecordPayment && (
                        <button
                          type="button"
                          onClick={() => onRecordPayment(m)}
                          className="px-2 py-1.5 rounded-xl bg-sky-950/60 border border-sky-500/30 text-sky-300 hover:bg-sky-900/60 text-[10px] font-bold transition-colors"
                        >
                          {t("collectAction")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Popup Modal: Fill Missing Phone Number (Saved to Profile) & Payment Options */}
      {modalMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-slate-900 border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {t("reqPhoneModalTitle")}
                </h3>
                <p className="text-xs text-cyan-300 font-mono mt-0.5">
                  {modalMember.fullName} ({modalMember.swimId}) · {modalMember.formula}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMember(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                aria-label={t("reqCancelBtn")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modalIsMissingPhone ? (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs leading-relaxed">
                {t("reqPhoneModalMissingAlert")}
              </div>
            ) : (
              <p className="text-xs text-slate-400">{t("reqPhoneModalEditDesc")}</p>
            )}

            {modalError && (
              <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                {modalError}
              </div>
            )}

            {/* Phone Number Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                {t("reqPhoneInputLabel")}
              </label>
              <Input
                autoFocus
                value={modalPhoneInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModalPhoneInput(e.target.value)}
                placeholder={t("reqPhoneInputPlaceholder")}
              />
            </div>

            {/* Payment Options Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                {t("reqPaymentOptionsTitle")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "both", label: "BaridiMob + Pool" },
                    { id: "baridimob", label: t("reqBaridiBadge") },
                    { id: "cash_pool", label: t("reqPoolBadge") },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setModalOption(opt.id)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                      modalOption === opt.id
                        ? "bg-cyan-600 text-white border-cyan-400"
                        : "bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Preview */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t("reqMessagePreviewLabel")}
                </span>
                <span className="text-[10px] font-semibold text-cyan-300">
                  {(modalMember.isStarter ?? isStarterFormula(modalMember.duration, modalMember.formula))
                    ? t("reqRuleStarterBadge")
                    : t("reqRuleOtherBadge")}
                </span>
              </div>
              <pre className="p-3 rounded-xl bg-slate-950 border border-white/10 text-[11px] text-slate-300 whitespace-pre-wrap font-sans max-h-44 overflow-y-auto leading-relaxed">
                {modalLivePreview}
              </pre>
            </div>

            {/* Modal Footer Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setModalMember(null)}
                disabled={savingPhone}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                {t("reqCancelBtn")}
              </button>
              <button
                type="button"
                onClick={() => handleModalSubmit(false)}
                disabled={savingPhone}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 text-xs font-bold text-cyan-300 disabled:opacity-50"
              >
                {savingPhone ? t("reqSavingPhone") : t("reqSavePhoneOnlyBtn")}
              </button>
              <button
                type="button"
                onClick={() => handleModalSubmit(true)}
                disabled={savingPhone}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                {savingPhone ? t("reqSavingPhone") : t("reqSaveAndSendBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
