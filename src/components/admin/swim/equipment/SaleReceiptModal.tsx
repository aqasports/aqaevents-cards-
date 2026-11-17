"use client";

import React, { useMemo } from "react";
import { Badge, Button } from "@/components/admin/ui";
import {
  buildSaleReceiptWhatsAppMessage,
  buildWhatsAppLink,
  formatDA,
  formatSaleDate,
  parseSaleNotes,
  type EquipmentLocale,
  type SaleFulfillmentStatus,
  type SalePaymentMethod,
} from "@/lib/swim-equipment-utils";
import { ModalShell } from "./ModalShell";
import type { EquipmentSaleItem, TranslateFn } from "./types";

interface SaleReceiptModalProps {
  sale: EquipmentSaleItem;
  allSales: EquipmentSaleItem[];
  articleNames: Record<string, string>;
  locale: EquipmentLocale;
  onClose: () => void;
  t: TranslateFn;
}

export function SaleReceiptModal({
  sale,
  allSales,
  articleNames,
  locale,
  onClose,
  t,
}: SaleReceiptModalProps) {
  const primaryParsed = useMemo(() => parseSaleNotes(sale.notes), [sale.notes]);

  const receiptItems = useMemo(() => {
    const bundleId = primaryParsed.meta.bundleId;
    const grouped = bundleId
      ? allSales.filter((s) => parseSaleNotes(s.notes).meta.bundleId === bundleId)
      : [sale];
    return grouped.map((item) => {
      const parsed = parseSaleNotes(item.notes);
      return {
        item,
        parsed,
        articleName: articleNames[item.article] || item.article,
        lineTotal: item.sellPrice * item.quantity,
      };
    });
  }, [allSales, articleNames, primaryParsed.meta.bundleId, sale]);

  const grandTotal = useMemo(
    () => receiptItems.reduce((sum, r) => sum + r.lineTotal, 0),
    [receiptItems]
  );

  const totalDiscount = useMemo(
    () => receiptItems.reduce((sum, r) => sum + (r.parsed.meta.discountDA ?? 0), 0),
    [receiptItems]
  );

  function paymentLabel(method?: SalePaymentMethod): string {
    if (method === "ccp") return t("payCcp");
    if (method === "card") return t("payCard");
    if (method === "transfer") return t("payTransfer");
    if (method === "included_pack") return t("payIncludedPack");
    return t("payCash");
  }

  function statusLabel(status?: SaleFulfillmentStatus): string {
    if (status === "paid_pending") return t("statusPaidPending");
    if (status === "reserved") return t("statusReserved");
    return t("statusPaidDelivered");
  }

  const soldDate = formatSaleDate(sale.soldAt, locale);
  const receiptRef = (primaryParsed.meta.bundleId || sale.id).slice(-8).toUpperCase();
  const payLabel = paymentLabel(primaryParsed.meta.paymentMethod);

  const whatsappUrl = useMemo(() => {
    if (!sale.clientPhone) return null;
    const msg = buildSaleReceiptWhatsAppMessage({
      clientName: sale.clientName,
      soldDate,
      items: receiptItems.map((r) => ({
        articleName: r.articleName,
        size: r.parsed.meta.size,
        quantity: r.item.quantity,
        unitPrice: r.item.sellPrice,
      })),
      totalDA: grandTotal,
      paymentLabel: payLabel,
    });
    return buildWhatsAppLink({ phone: sale.clientPhone }, msg);
  }, [grandTotal, payLabel, receiptItems, sale.clientName, sale.clientPhone, soldDate]);

  return (
    <ModalShell
      title={t("receiptTitle")}
      closeLabel={t("closeLabel")}
      onClose={onClose}
      maxWidth="max-w-xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
              {t("printReceiptBtn")}
            </Button>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[var(--success-bg)] text-[var(--success-text)] hover:brightness-125 border border-[var(--success)]/30 text-xs font-semibold transition-all"
              >
                {t("sendReceiptWhatsappBtn")}
              </a>
            ) : null}
          </div>
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            {t("closeLabel")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)]/50 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <div className="text-xs font-extrabold tracking-wider uppercase text-[var(--accent,#00f2ff)]">
                AQA SPORTS - SWIM BOUTIQUE
              </div>
              <div className="text-[11px] text-[var(--muted)] font-mono mt-0.5" dir="ltr">
                REF #{receiptRef} | {soldDate}
              </div>
            </div>
            <Badge
              tone={
                primaryParsed.meta.saleStatus === "reserved"
                  ? "warning"
                  : primaryParsed.meta.saleStatus === "paid_pending"
                  ? "info"
                  : "success"
              }
              size="sm"
            >
              {statusLabel(primaryParsed.meta.saleStatus)}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] uppercase text-[var(--muted)] block">{t("colClient")}</span>
              <span className="font-bold text-[var(--foreground)]">{sale.clientName}</span>
              {primaryParsed.meta.swimId ? (
                <span className="ms-2 font-mono text-[10px] text-cyan-400" dir="ltr">
                  ({primaryParsed.meta.swimId})
                </span>
              ) : null}
            </div>
            <div>
              <span className="text-[10px] uppercase text-[var(--muted)] block">{t("colPhone")}</span>
              <span className="font-mono text-[var(--foreground)]" dir="ltr">
                {sale.clientPhone || "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[12px] border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-xs">
            <thead className="bg-[var(--surface-2)]/60 text-[var(--muted)] uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
              <tr>
                <th scope="col" className="py-2.5 px-3 text-start">{t("colArticle")}</th>
                <th scope="col" className="py-2.5 px-3 text-center">{t("colSize")}</th>
                <th scope="col" className="py-2.5 px-3 text-center">{t("colQty")}</th>
                <th scope="col" className="py-2.5 px-3 text-end">{t("colSellPrice")}</th>
                <th scope="col" className="py-2.5 px-3 text-end">{t("labelRevenue")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {receiptItems.map(({ item, parsed, articleName, lineTotal }) => (
                <tr key={item.id}>
                  <td className="py-2.5 px-3 font-semibold text-[var(--foreground)]">
                    {articleName}
                  </td>
                  <td className="py-2.5 px-3 text-center text-[var(--muted)]">
                    {parsed.meta.size || "-"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                  <td className="py-2.5 px-3 text-end font-mono" dir="ltr">
                    {formatDA(item.sellPrice)}
                  </td>
                  <td className="py-2.5 px-3 text-end font-mono font-bold" dir="ltr">
                    {formatDA(lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 rounded-[12px] border border-[var(--primary)]/30 bg-[var(--primary-light)]/40 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>{t("inputPaymentMethod")}</span>
            <span className="font-semibold text-[var(--foreground)]">{payLabel}</span>
          </div>
          {totalDiscount > 0 ? (
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>{t("inputDiscount")}</span>
              <span className="font-mono text-amber-300" dir="ltr">
                -{formatDA(totalDiscount)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              {t("totalDue")}
            </span>
            <span className="text-xl font-extrabold font-mono text-[var(--accent,#00f2ff)]" dir="ltr">
              {formatDA(grandTotal)}
            </span>
          </div>
        </div>

        {primaryParsed.userNotes ? (
          <div className="text-xs text-[var(--muted)] px-1">
            <span className="font-semibold text-[var(--foreground)]">{t("inputNotes")}: </span>
            {primaryParsed.userNotes}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}
