"use client";

import React, { useId, useMemo, useState } from "react";
import { Button } from "@/components/admin/ui";
import {
  formatDA,
  parseIntegerInput,
  saleDateKey,
  toDateInputValue,
} from "@/lib/swim-equipment-utils";
import {
  MAX_SALE_QUANTITY,
  MAX_UNIT_PRICE_DA,
  PHONE_REGEX,
} from "@/lib/swim-equipment-validation";
import { FIELD_CLASS, LABEL_CLASS, ModalShell } from "./ModalShell";
import type {
  CatalogArticle,
  EquipmentSaleItem,
  SalePrefill,
  SwimLeadItem,
  TranslateFn,
} from "./types";

interface SaleFormModalProps {
  articles: CatalogArticle[];
  leads: SwimLeadItem[];
  existing?: EquipmentSaleItem | null;
  prefill?: SalePrefill | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  t: TranslateFn;
}

function hasEquipmentDemand(lead: SwimLeadItem): boolean {
  const equipment = lead.details?.equipment;
  return Boolean(equipment?.hasPack) || (equipment?.articles?.length ?? 0) > 0;
}

export function SaleFormModal({
  articles,
  leads,
  existing,
  prefill,
  onClose,
  onSaved,
  t,
}: SaleFormModalProps) {
  const formId = useId();
  const isEdit = Boolean(existing);

  const activeArticles = useMemo(() => articles.filter((a) => a.active), [articles]);

  // When editing, the sale's current article stays selectable even if it was deactivated,
  // renamed out of the catalog or is one of the legacy fixed codes.
  const selectableArticles = useMemo<CatalogArticle[]>(() => {
    if (existing && !activeArticles.some((a) => a.code === existing.article)) {
      const fromCatalog = articles.find((a) => a.code === existing.article);
      const fallback: CatalogArticle = fromCatalog ?? {
        id: `legacy-${existing.article}`,
        name: existing.article,
        code: existing.article,
        description: null,
        defaultSellPrice: existing.sellPrice,
        defaultCostPrice: existing.costPrice,
        active: false,
        createdAt: existing.createdAt,
      };
      return [fallback, ...activeArticles];
    }
    return activeArticles;
  }, [activeArticles, articles, existing]);

  const initialArticle = useMemo(() => {
    if (existing) return selectableArticles.find((a) => a.code === existing.article) ?? null;
    if (prefill?.articleCode) {
      const match = activeArticles.find((a) => a.code === prefill.articleCode);
      if (match) return match;
    }
    return activeArticles[0] ?? null;
    // Initial values only: the modal is remounted for every open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [articleCode, setArticleCode] = useState(initialArticle?.code ?? "");
  const [clientName, setClientName] = useState(existing?.clientName ?? prefill?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(existing?.clientPhone ?? prefill?.clientPhone ?? "");
  const [leadId, setLeadId] = useState(existing?.leadId ?? prefill?.leadId ?? "");
  const [sellPrice, setSellPrice] = useState(
    String(existing?.sellPrice ?? initialArticle?.defaultSellPrice ?? 0)
  );
  const [costPrice, setCostPrice] = useState(
    existing?.costPrice ?? initialArticle?.defaultCostPrice ?? 0
  );
  const [quantity, setQuantity] = useState(String(existing?.quantity ?? 1));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [soldAt, setSoldAt] = useState(
    existing ? saleDateKey(existing.soldAt) : toDateInputValue()
  );
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = toDateInputValue();
  const sellValue = parseIntegerInput(sellPrice);
  const quantityValue = parseIntegerInput(quantity);
  const totalDue = (sellValue ?? 0) * (quantityValue ?? 0);
  const sellsBelowCost = sellValue !== null && sellValue < costPrice;

  const linkedLead = leadId ? leads.find((l) => l.id === leadId) : undefined;

  const suggestions = useMemo(() => {
    if (leadId) return [];
    const query = clientName.trim().toLowerCase();
    if (query.length < 2) return [];
    const digits = query.replace(/\D/g, "");
    return leads
      .filter(
        (lead) =>
          lead.fullName.toLowerCase().includes(query) ||
          (digits.length >= 3 && lead.phone.replace(/\D/g, "").includes(digits))
      )
      .sort((a, b) => Number(hasEquipmentDemand(b)) - Number(hasEquipmentDemand(a)))
      .slice(0, 6);
  }, [leads, leadId, clientName]);

  function handleArticleChange(code: string) {
    setArticleCode(code);
    const article = selectableArticles.find((a) => a.code === code);
    if (article) {
      setSellPrice(String(article.defaultSellPrice));
      setCostPrice(article.defaultCostPrice);
    }
  }

  function handleSelectLead(lead: SwimLeadItem) {
    setLeadId(lead.id);
    setClientName(lead.fullName);
    setClientPhone(lead.phone || "");
    setSuggestOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const cleanName = clientName.trim();
    const cleanPhone = clientPhone.replace(/\s+/g, " ").trim();

    if (!articleCode) {
      setError(t("errArticleRequired"));
      return;
    }
    if (!cleanName) {
      setError(t("errClientRequired"));
      return;
    }
    if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
      setError(t("errPhoneInvalid"));
      return;
    }
    if (sellValue === null || sellValue > MAX_UNIT_PRICE_DA) {
      setError(t("errPriceInvalid"));
      return;
    }
    if (quantityValue === null || quantityValue < 1 || quantityValue > MAX_SALE_QUANTITY) {
      setError(t("errQuantityInvalid", { max: MAX_SALE_QUANTITY }));
      return;
    }
    if (!soldAt) {
      setError(t("errDateRequired"));
      return;
    }
    if (soldAt > today) {
      setError(t("errDateFuture"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        isEdit ? `/api/admin/swim/equipment/${existing!.id}` : "/api/admin/swim/equipment",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            article: articleCode,
            clientName: cleanName,
            clientPhone: cleanPhone,
            leadId: leadId || null,
            sellPrice: sellValue,
            costPrice,
            quantity: quantityValue,
            notes: notes.trim() || null,
            soldAt,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" && data.error ? data.error : t("errorGeneric"));
      }

      onSaved(t(isEdit ? "saleUpdatedSuccess" : "createdSuccess"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  const noArticles = selectableArticles.length === 0;

  return (
    <ModalShell
      title={isEdit ? t("modalEditTitle") : t("modalAddTitle")}
      closeLabel={t("closeLabel")}
      onClose={onClose}
      busy={submitting}
      footer={
        <>
          {error ? (
            <div
              role="alert"
              className="p-3 rounded-[10px] bg-[var(--danger-bg)] border border-[var(--danger)]/40 text-[var(--danger-text)] text-xs"
            >
              {error}
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
              {t("cancelBtn")}
            </Button>
            {!noArticles ? (
              <Button type="submit" form={formId} variant="primary" size="sm" disabled={submitting}>
                {submitting ? t("savingBtn") : isEdit ? t("updateSaleBtn") : t("saveBtn")}
              </Button>
            ) : null}
          </div>
        </>
      }
    >
      {noArticles ? (
        <div className="p-4 rounded-[10px] bg-[var(--warning-bg)] border border-[var(--warning)]/30 text-[var(--warning-text)] text-xs text-center">
          {t("noActiveArticles")}
        </div>
      ) : (
        <form id={formId} onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Article picker driven by the catalog */}
          <fieldset>
            <legend className={`${LABEL_CLASS} mb-1.5`}>
              {t("inputArticle")} <span className="text-[var(--danger)]">*</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pe-1">
              {selectableArticles.map((article) => {
                const selected = articleCode === article.code;
                return (
                  <button
                    key={article.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleArticleChange(article.code)}
                    className={`p-2.5 rounded-[10px] border text-start transition-all ${
                      selected
                        ? "bg-[var(--primary-light)] text-[var(--foreground)] border-[var(--primary)] shadow-[var(--shadow-glow)]"
                        : "bg-[var(--surface-2)]/60 text-[var(--muted)] border-[var(--border)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <div className="font-bold text-xs truncate">{article.name}</div>
                    <div className="font-mono text-[10px] mt-0.5 text-slate-500" dir="ltr">
                      {article.code}
                    </div>
                    <div className="text-[11px] mt-1 text-[var(--success)] font-mono" dir="ltr">
                      {formatDA(article.defaultSellPrice)}
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Client: name with request lookup, phone optional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <label htmlFor={`${formId}-client`} className={LABEL_CLASS}>
                {t("inputClientName")} <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                id={`${formId}-client`}
                type="text"
                autoComplete="off"
                maxLength={120}
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setSuggestOpen(true);
                }}
                onFocus={() => setSuggestOpen(true)}
                onBlur={() => setSuggestOpen(false)}
                placeholder={t("placeholderClientName")}
                className={FIELD_CLASS}
              />
              {suggestOpen && suggestions.length > 0 ? (
                <ul
                  role="listbox"
                  className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-[10px] border border-[var(--border-strong,var(--border))] bg-[var(--surface)] shadow-2xl"
                >
                  {suggestions.map((lead) => (
                    <li key={lead.id} role="option" aria-selected={false}>
                      <button
                        type="button"
                        // mousedown fires before the input blur, so the selection is not lost
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectLead(lead);
                        }}
                        className="w-full text-start px-3 py-2 hover:bg-[var(--surface-2)] transition-colors"
                      >
                        <div className="text-xs font-semibold text-[var(--foreground)] truncate">
                          {lead.fullName}
                        </div>
                        <div className="text-[10px] text-[var(--muted)] font-mono" dir="ltr">
                          {lead.phone || "-"}
                          {hasEquipmentDemand(lead) ? ` | ${t("packYes")}` : ""}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {!leadId ? (
                <p className="text-[11px] text-slate-500 mt-1">{t("clientLookupHint")}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor={`${formId}-phone`} className={LABEL_CLASS}>
                {t("inputClientPhone")}{" "}
                <span className="font-normal text-slate-500">({t("optionalTag")})</span>
              </label>
              <input
                id={`${formId}-phone`}
                type="tel"
                inputMode="tel"
                maxLength={30}
                dir="ltr"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder={t("placeholderPhone")}
                className={`${FIELD_CLASS} font-mono`}
              />
            </div>
          </div>

          {leadId ? (
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-[10px] bg-[var(--info-bg)] border border-[var(--primary)]/30">
              <span className="text-xs text-[var(--info-text)] truncate">
                {t("linkedLead", { name: linkedLead?.fullName ?? clientName })}
              </span>
              <button
                type="button"
                onClick={() => setLeadId("")}
                className="text-[11px] font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] shrink-0"
              >
                {t("unlinkLead")}
              </button>
            </div>
          ) : null}

          {/* Quantity + unit price (client-facing: cost and profit are never displayed here) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${formId}-qty`} className={LABEL_CLASS}>
                {t("inputQuantity")}
              </label>
              <input
                id={`${formId}-qty`}
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ""))}
                className={`${FIELD_CLASS} font-mono text-center`}
              />
            </div>
            <div>
              <label htmlFor={`${formId}-price`} className={LABEL_CLASS}>
                {t("inputSellPrice")}
              </label>
              <input
                id={`${formId}-price`}
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value.replace(/[^\d]/g, ""))}
                className={`${FIELD_CLASS} font-mono text-end`}
              />
            </div>
          </div>

          {sellsBelowCost ? (
            <p className="text-xs text-[var(--warning-text)]">{t("warnLoss")}</p>
          ) : null}

          <div className="p-3.5 rounded-[10px] bg-gradient-to-r from-[var(--surface)] via-[var(--surface-2)] to-[var(--primary-light)] border border-[var(--primary)]/30 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">
                {t("totalDue")}
              </div>
              <div className="text-xs text-[var(--foreground)] mt-0.5 font-mono" dir="ltr">
                {quantityValue ?? 0} x {formatDA(sellValue ?? 0)}
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-[var(--accent,#00f2ff)]" dir="ltr">
              {formatDA(totalDue)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${formId}-date`} className={LABEL_CLASS}>
                {t("inputSoldAt")}
              </label>
              <input
                id={`${formId}-date`}
                type="date"
                max={today}
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`${formId}-notes`} className={LABEL_CLASS}>
                {t("inputNotes")}
              </label>
              <input
                id={`${formId}-notes`}
                type="text"
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("placeholderNotes")}
                className={FIELD_CLASS}
              />
            </div>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
