"use client";

import React, { useId, useState } from "react";
import { Button } from "@/components/admin/ui";
import {
  formatDA,
  parseIntegerInput,
  slugifyArticleCode,
  trimSlugEdges,
} from "@/lib/swim-equipment-utils";
import { ARTICLE_CODE_REGEX } from "@/lib/swim-equipment-validation";
import { FIELD_CLASS, LABEL_CLASS, ModalShell } from "./ModalShell";
import type { CatalogArticle, TranslateFn } from "./types";

interface ArticleFormModalProps {
  existing?: CatalogArticle | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  t: TranslateFn;
}

export function ArticleFormModal({ existing, onClose, onSaved, t }: ArticleFormModalProps) {
  const formId = useId();
  const isEdit = Boolean(existing);

  const [name, setName] = useState(existing?.name || "");
  const [code, setCode] = useState(existing?.code || "");
  const [codeTouched, setCodeTouched] = useState(isEdit);
  const [description, setDescription] = useState(existing?.description || "");
  const [sellPrice, setSellPrice] = useState(String(existing?.defaultSellPrice ?? 0));
  const [costPrice, setCostPrice] = useState(String(existing?.defaultCostPrice ?? 0));
  const [active, setActive] = useState(existing?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sellValue = parseIntegerInput(sellPrice);
  const costValue = parseIntegerInput(costPrice);
  const unitProfit = (sellValue ?? 0) - (costValue ?? 0);
  const marginPct =
    sellValue !== null && sellValue > 0 ? Math.round((unitProfit / sellValue) * 100) : 0;
  const sellsBelowCost = sellValue !== null && costValue !== null && sellValue < costValue;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const cleanName = name.trim();
    const cleanCode = trimSlugEdges(code);

    if (!cleanName) {
      setError(t("errArticleNameRequired"));
      return;
    }
    if (!isEdit && (!cleanCode || !ARTICLE_CODE_REGEX.test(cleanCode))) {
      setError(t("errArticleCodeInvalid"));
      return;
    }
    if (sellValue === null || costValue === null) {
      setError(t("errPriceInvalid"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const url = isEdit
        ? `/api/admin/swim/equipment/articles/${existing!.id}`
        : "/api/admin/swim/equipment/articles";

      const payload = {
        name: cleanName,
        description: description.trim() || null,
        defaultSellPrice: sellValue,
        defaultCostPrice: costValue,
        active,
        ...(isEdit ? {} : { code: cleanCode }),
      };

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" && data.error ? data.error : t("errorGeneric"));
      }

      onSaved(t(isEdit ? "articleUpdatedSuccess" : "articleCreatedSuccess"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title={isEdit ? t("modalEditArticleTitle") : t("modalAddArticleTitle")}
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
            <Button type="submit" form={formId} variant="primary" size="sm" disabled={submitting}>
              {submitting ? t("savingArticleBtn") : t("saveArticleBtn")}
            </Button>
          </div>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor={`${formId}-name`} className={LABEL_CLASS}>
            {t("inputName")} <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            id={`${formId}-name`}
            type="text"
            autoFocus
            maxLength={100}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!codeTouched) setCode(slugifyArticleCode(e.target.value));
            }}
            placeholder={t("placeholderArticleName")}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-code`} className={LABEL_CLASS}>
            {t("inputCode")} <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            id={`${formId}-code`}
            type="text"
            maxLength={60}
            readOnly={isEdit}
            value={code}
            onChange={(e) => {
              setCodeTouched(true);
              setCode(slugifyArticleCode(e.target.value));
            }}
            placeholder={t("placeholderArticleCode")}
            dir="ltr"
            className={`${FIELD_CLASS} font-mono ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
          />
          <p className="text-[11px] text-slate-500 mt-1">
            {isEdit ? t("inputCodeLockedHint") : t("inputCodeHint")}
          </p>
        </div>

        <div>
          <label htmlFor={`${formId}-desc`} className={LABEL_CLASS}>
            {t("inputDescription")}
          </label>
          <input
            id={`${formId}-desc`}
            type="text"
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("placeholderArticleDesc")}
            className={FIELD_CLASS}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${formId}-sell`} className={LABEL_CLASS}>
              {t("inputDefaultSellPrice")}
            </label>
            <input
              id={`${formId}-sell`}
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value.replace(/[^\d]/g, ""))}
              className={`${FIELD_CLASS} font-mono text-end`}
            />
          </div>
          <div>
            <label htmlFor={`${formId}-cost`} className={LABEL_CLASS}>
              {t("inputDefaultCostPrice")}
            </label>
            <input
              id={`${formId}-cost`}
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value.replace(/[^\d]/g, ""))}
              className={`${FIELD_CLASS} font-mono text-end`}
            />
          </div>
        </div>

        <div className="p-3 rounded-[10px] bg-[var(--success-bg)] border border-[var(--success)]/30 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">
              {t("colMargin")}
            </div>
            <div className="text-xs text-[var(--foreground)] mt-0.5 font-mono" dir="ltr">
              {formatDA(sellValue ?? 0)} - {formatDA(costValue ?? 0)} = {formatDA(unitProfit)}
            </div>
          </div>
          <div className="text-end">
            <div
              className={`text-base font-bold font-mono ${
                unitProfit < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
              }`}
            >
              {marginPct}%
            </div>
            <div className="text-[10px] text-[var(--muted)]">{t("grossMargin")}</div>
          </div>
        </div>

        {sellsBelowCost ? (
          <p className="text-xs text-[var(--warning-text)]">{t("warnLoss")}</p>
        ) : null}

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 rounded accent-sky-500"
          />
          <span className="text-xs text-[var(--foreground)]">{t("inputActive")}</span>
        </label>
      </form>
    </ModalShell>
  );
}
