"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  ConfirmModal,
  Input,
  StatCard,
} from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";
import { aggregateSalesStats } from "@/lib/swim-equipment";
import {
  buildCsv,
  buildEquipmentDemandMessage,
  buildWhatsAppLink,
  countSalesByLead,
  type EquipmentLocale,
  filterSales,
  formatDA,
  formatSaleDate,
  toDateInputValue,
} from "@/lib/swim-equipment-utils";
import { getArticleShortLabel, type EquipmentArticleId } from "@/lib/swim-lead-details";
import { ArticleFormModal } from "./ArticleFormModal";
import { SaleFormModal } from "./SaleFormModal";
import type {
  CatalogArticle,
  EquipmentSaleItem,
  NoticeState,
  SaleModalState,
  SwimLeadItem,
} from "./types";

interface SwimEquipmentDeskProps {
  leads: SwimLeadItem[];
}

type ViewMode = "demands" | "sales" | "catalog";
type BadgeTone = "default" | "success" | "warning" | "danger" | "info" | "primary";

const TH_CLASS = "py-3 px-4 text-start font-semibold";
const SELECT_CLASS =
  "px-3 py-2 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors";
const DATE_CLASS =
  "px-3 py-2 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors";

const LEAD_STATUS_KEYS: Record<string, string> = {
  pending: "leadPending",
  called: "leadCalled",
  confirmed: "leadConfirmed",
  rejected: "leadRejected",
};

function leadStatusTone(status: string): BadgeTone {
  if (status === "confirmed") return "success";
  if (status === "called") return "info";
  if (status === "rejected") return "danger";
  return "warning";
}

function marginTone(margin: number): BadgeTone {
  if (margin >= 50) return "success";
  if (margin >= 25) return "info";
  if (margin < 0) return "danger";
  return "default";
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function firstOfMonth(): string {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateInputValue(date);
}

function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 px-4 text-center text-[var(--muted)] text-xs">
        {children}
      </td>
    </tr>
  );
}

export function SwimEquipmentDesk({ leads }: SwimEquipmentDeskProps) {
  const { t, locale } = useTranslations("swimEquipment");
  const uiLocale = (locale as EquipmentLocale) || "fr";

  const [viewMode, setViewMode] = useState<ViewMode>("demands");

  // Data (one batched request returns sales and catalog together)
  const [articles, setArticles] = useState<CatalogArticle[]>([]);
  const [sales, setSales] = useState<EquipmentSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadErrorDetail, setLoadErrorDetail] = useState<string | null>(null);

  // Feedback
  const [notice, setNotice] = useState<NoticeState>(null);

  // Modals
  const [saleModal, setSaleModal] = useState<SaleModalState | null>(null);
  const [articleModal, setArticleModal] = useState<{ article: CatalogArticle | null } | null>(null);
  const [deleteSaleTarget, setDeleteSaleTarget] = useState<EquipmentSaleItem | null>(null);
  const [deleteArticleTarget, setDeleteArticleTarget] = useState<CatalogArticle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingArticleId, setTogglingArticleId] = useState<string | null>(null);

  // Filters
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [demandSearch, setDemandSearch] = useState("");
  const [demandStatusFilter, setDemandStatusFilter] = useState("all");
  const [demandSaleFilter, setDemandSaleFilter] = useState("all");
  const [saleSearch, setSaleSearch] = useState("");
  const [saleArticleFilter, setSaleArticleFilter] = useState("all");

  const loadAll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/swim/equipment?include=articles", {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "");
      }
      const data = await res.json();
      setSales(Array.isArray(data.sales) ? data.sales : []);
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setLoadFailed(false);
      setLoadErrorDetail(null);
    } catch (err: unknown) {
      setLoadFailed(true);
      setLoadErrorDetail(err instanceof Error && err.message ? err.message : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // One-shot UI timer that clears the feedback banner (no network, no polling).
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function retryLoad() {
    setLoading(true);
    loadAll();
  }

  // Derived data

  const articleNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const article of articles) map[article.code] = article.name;
    return map;
  }, [articles]);

  function articleLabel(code: string): string {
    return articleNameMap[code] || getArticleShortLabel(code as EquipmentArticleId);
  }

  const periodSales = useMemo(
    () => filterSales(sales, { from: periodFrom, to: periodTo }),
    [sales, periodFrom, periodTo]
  );

  const stats = useMemo(() => aggregateSalesStats(periodSales), [periodSales]);

  const articleStatCards = useMemo(
    () => Object.entries(stats.byArticle).sort((a, b) => b[1].revenue - a[1].revenue),
    [stats]
  );

  const filteredSales = useMemo(
    () =>
      filterSales(sales, {
        from: periodFrom,
        to: periodTo,
        search: saleSearch,
        article: saleArticleFilter,
        articleNames: articleNameMap,
      }),
    [sales, periodFrom, periodTo, saleSearch, saleArticleFilter, articleNameMap]
  );

  const saleArticleCodes = useMemo(
    () => Array.from(new Set(sales.map((sale) => sale.article))),
    [sales]
  );

  const salesByLead = useMemo(() => countSalesByLead(sales), [sales]);

  const equipmentDemands = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    return leads.filter(
      (lead) =>
        Boolean(lead?.details?.equipment?.hasPack) ||
        (Array.isArray(lead?.details?.equipment?.articles) &&
          lead.details!.equipment.articles.length > 0)
    );
  }, [leads]);

  const filteredDemands = useMemo(() => {
    const query = demandSearch.toLowerCase().trim();
    return equipmentDemands.filter((lead) => {
      if (query && !lead.fullName.toLowerCase().includes(query) && !lead.phone.includes(query)) {
        return false;
      }
      if (demandStatusFilter !== "all" && lead.status !== demandStatusFilter) return false;
      const sold = (salesByLead.get(lead.id) || 0) > 0;
      if (demandSaleFilter === "sold" && !sold) return false;
      if (demandSaleFilter === "open" && sold) return false;
      return true;
    });
  }, [equipmentDemands, demandSearch, demandStatusFilter, demandSaleFilter, salesByLead]);

  const activeArticleCount = articles.filter((a) => a.active).length;
  const periodActive = Boolean(periodFrom || periodTo);

  // Actions

  async function afterMutation(message: string) {
    setNotice({ tone: "success", text: message });
    await loadAll();
  }

  async function confirmDeleteSale() {
    if (!deleteSaleTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/swim/equipment/${deleteSaleTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" && data.error ? data.error : t("errorGeneric"));
      }
      setDeleteSaleTarget(null);
      await afterMutation(t("deletedSuccess"));
    } catch (err: unknown) {
      setDeleteSaleTarget(null);
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : t("errorGeneric") });
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDeleteArticle() {
    if (!deleteArticleTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/swim/equipment/articles/${deleteArticleTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" && data.error ? data.error : t("errorGeneric"));
      }
      setDeleteArticleTarget(null);
      await afterMutation(t("articleDeletedSuccess"));
    } catch (err: unknown) {
      setDeleteArticleTarget(null);
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : t("errorGeneric") });
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleActive(article: CatalogArticle) {
    if (togglingArticleId) return;
    setTogglingArticleId(article.id);
    try {
      const res = await fetch(`/api/admin/swim/equipment/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !article.active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" && data.error ? data.error : t("errorGeneric"));
      }
      await afterMutation(t("articleUpdatedSuccess"));
    } catch (err: unknown) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : t("errorGeneric") });
    } finally {
      setTogglingArticleId(null);
    }
  }

  function openSaleForLead(lead: SwimLeadItem) {
    const firstCode = lead.details?.equipment.articles?.[0] || "";
    setSaleModal({
      mode: "create",
      prefill: {
        clientName: lead.fullName,
        clientPhone: lead.phone || "",
        leadId: lead.id,
        articleCode: firstCode,
      },
    });
  }

  function leadArticleSummary(lead: SwimLeadItem): string {
    const codes = lead.details?.equipment.articles || [];
    if (codes.length === 0) return t("packComplete");
    return codes.map((code) => getArticleShortLabel(code)).join(", ");
  }

  function leadStatusLabel(status: string): string {
    const key = LEAD_STATUS_KEYS[status];
    return key ? t(key) : status;
  }

  function applyPreset(preset: "all" | "month" | "30d") {
    if (preset === "all") {
      setPeriodFrom("");
      setPeriodTo("");
    } else if (preset === "month") {
      setPeriodFrom(firstOfMonth());
      setPeriodTo("");
    } else {
      setPeriodFrom(daysAgo(29));
      setPeriodTo("");
    }
  }

  function exportDemandsCsv() {
    const csv = buildCsv(
      [
        t("colClient"),
        t("colPhone"),
        t("colLeadStatus"),
        t("colDetails"),
        t("colSize"),
        t("colDate"),
      ],
      filteredDemands.map((lead) => [
        lead.fullName,
        lead.phone,
        leadStatusLabel(lead.status),
        leadArticleSummary(lead),
        lead.details?.equipment.size || "",
        formatSaleDate(lead.createdAt, uiLocale),
      ])
    );
    downloadCsv(`aqa_swim_equipment_demands_${toDateInputValue()}.csv`, csv);
  }

  function exportSalesCsv() {
    const csv = buildCsv(
      [
        t("colDate"),
        t("colArticle"),
        t("colClient"),
        t("colPhone"),
        t("colQty"),
        t("colSellPrice"),
        t("colCostPrice"),
        t("totalRevenue"),
        t("colProfit"),
        t("inputNotes"),
      ],
      filteredSales.map((sale) => [
        formatSaleDate(sale.soldAt, uiLocale),
        articleLabel(sale.article),
        sale.clientName,
        sale.clientPhone,
        sale.quantity,
        sale.sellPrice,
        sale.costPrice,
        sale.sellPrice * sale.quantity,
        (sale.sellPrice - sale.costPrice) * sale.quantity,
        sale.notes || "",
      ])
    );
    downloadCsv(`aqa_swim_equipment_sales_${toDateInputValue()}.csv`, csv);
  }

  const tabClass = (mode: ViewMode) =>
    `px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
      viewMode === mode
        ? "bg-[var(--primary)] text-white shadow-sm"
        : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
    }`;

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-[var(--muted)] animate-pulse" role="status">
        {t("loading")}
      </div>
    );
  }

  if (loadFailed && sales.length === 0 && articles.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-4 text-center">
        <Alert tone="danger">{loadErrorDetail || t("loadError")}</Alert>
        <Button variant="secondary" size="sm" onClick={retryLoad}>
          {t("retryBtn")}
        </Button>
      </div>
    );
  }

  const exportDisabled =
    viewMode === "demands" ? filteredDemands.length === 0 : filteredSales.length === 0;

  return (
    <div className="space-y-6">
      {notice ? (
        <div className="flex items-start gap-3" role="status">
          <div className="flex-1">
            <Alert tone={notice.tone}>{notice.text}</Alert>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label={t("closeLabel")}
            className="mt-2 h-7 w-7 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : null}

      {loadFailed ? (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Alert tone="warning">{loadErrorDetail || t("loadError")}</Alert>
          </div>
          <Button variant="secondary" size="sm" onClick={retryLoad}>
            {t("retryBtn")}
          </Button>
        </div>
      ) : null}

      {/* Period filter (applies to the figures below and to the sales table) */}
      <div className="flex flex-wrap items-end gap-3 p-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)]/80">
        <div>
          <label htmlFor="equip-period-from" className="block text-[10px] uppercase tracking-wider font-bold text-[var(--muted)] mb-1">
            {t("periodFrom")}
          </label>
          <input
            id="equip-period-from"
            type="date"
            value={periodFrom}
            max={periodTo || undefined}
            onChange={(e) => setPeriodFrom(e.target.value)}
            className={DATE_CLASS}
          />
        </div>
        <div>
          <label htmlFor="equip-period-to" className="block text-[10px] uppercase tracking-wider font-bold text-[var(--muted)] mb-1">
            {t("periodTo")}
          </label>
          <input
            id="equip-period-to"
            type="date"
            value={periodTo}
            min={periodFrom || undefined}
            onChange={(e) => setPeriodTo(e.target.value)}
            className={DATE_CLASS}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => applyPreset("month")}>
            {t("periodMonth")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => applyPreset("30d")}>
            {t("period30")}
          </Button>
          <Button
            variant={periodActive ? "secondary" : "ghost"}
            size="sm"
            onClick={() => applyPreset("all")}
          >
            {t("periodAll")}
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalRevenue")}
          value={formatDA(stats.totalSalesRevenue)}
          hint={t("unitsSoldHint", { count: stats.totalUnitsSold })}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("totalCost")}
          value={formatDA(stats.totalCost)}
          hint={t("totalCostHint")}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
        <StatCard
          label={t("totalProfit")}
          value={formatDA(stats.totalProfit)}
          hint={`${t("marginRate")}: ${stats.marginPercent}%`}
          icon={
            <svg className="h-5 w-5 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatCard
          label={t("catalogTitle")}
          value={articles.length}
          hint={t("activeCount", { count: activeArticleCount })}
          icon={
            <svg className="h-5 w-5 text-[var(--accent,#00f2ff)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          }
        />
      </div>

      {/* Per-article performance */}
      {articleStatCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {articleStatCards.map(([code, stat]) => (
            <div
              key={code}
              className="p-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md hover:border-[var(--primary)]/40 transition-all"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-[var(--foreground)] truncate">
                  {articleLabel(code)}
                </span>
                <Badge tone="primary" size="sm">
                  {t("soldUnits", { count: stat.units })}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[var(--muted)] block">{t("labelRevenue")}</span>
                  <span className="font-mono font-semibold text-[var(--foreground)]">{formatDA(stat.revenue)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted)] block">{t("colProfit")}</span>
                  <span
                    className={`font-mono font-bold ${
                      stat.profit < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
                    }`}
                  >
                    {formatDA(stat.profit)}
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted)]">
                <span>{t("marginLabel", { pct: stat.marginPercent })}</span>
                <span>{t("costLabel", { amount: formatDA(stat.cost) })}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Tabs and primary actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div
          role="tablist"
          className="flex flex-wrap bg-[var(--surface)] p-1 rounded-[10px] border border-[var(--border)] gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "demands"}
            onClick={() => setViewMode("demands")}
            className={tabClass("demands")}
          >
            <span>{t("demandsTitle")}</span>
            <Badge tone="info" size="sm">{equipmentDemands.length}</Badge>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "sales"}
            onClick={() => setViewMode("sales")}
            className={tabClass("sales")}
          >
            <span>{t("salesTitle")}</span>
            <Badge tone="success" size="sm">{sales.length}</Badge>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "catalog"}
            onClick={() => setViewMode("catalog")}
            className={tabClass("catalog")}
          >
            <span>{t("tabCatalog")}</span>
            <Badge tone="default" size="sm">{articles.length}</Badge>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "catalog" ? (
            <Button variant="primary" size="sm" onClick={() => setArticleModal({ article: null })}>
              {t("addArticleBtn")}
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={exportDisabled}
                onClick={viewMode === "demands" ? exportDemandsCsv : exportSalesCsv}
              >
                {t("exportCsv")}
              </Button>
              <Button variant="primary" size="sm" onClick={() => setSaleModal({ mode: "create", prefill: null })}>
                {t("addSaleBtn")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* VIEW: DEMANDS */}
      {viewMode === "demands" ? (
        <div className="space-y-4">
          <p className="text-xs text-[var(--muted)]">{t("demandsDesc")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder={t("searchDemandsPlaceholder")}
                value={demandSearch}
                onChange={(e) => setDemandSearch(e.target.value)}
              />
            </div>
            <select
              value={demandStatusFilter}
              onChange={(e) => setDemandStatusFilter(e.target.value)}
              aria-label={t("colLeadStatus")}
              className={SELECT_CLASS}
            >
              <option value="all">{t("allStatuses")}</option>
              {Object.keys(LEAD_STATUS_KEYS).map((status) => (
                <option key={status} value={status}>
                  {leadStatusLabel(status)}
                </option>
              ))}
            </select>
            <select
              value={demandSaleFilter}
              onChange={(e) => setDemandSaleFilter(e.target.value)}
              aria-label={t("colSaleState")}
              className={SELECT_CLASS}
            >
              <option value="all">{t("saleFilterAll")}</option>
              <option value="open">{t("saleFilterOpen")}</option>
              <option value="sold">{t("saleFilterSold")}</option>
            </select>
            <span className="text-xs text-[var(--muted)] ms-auto">
              {t("demandsCount", { shown: filteredDemands.length, total: equipmentDemands.length })}
            </span>
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-[var(--surface-2)]/60 text-[var(--muted)] uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                <tr>
                  <th scope="col" className={TH_CLASS}>{t("colClient")}</th>
                  <th scope="col" className={TH_CLASS}>{t("colPhone")}</th>
                  <th scope="col" className={TH_CLASS}>{t("colDetails")}</th>
                  <th scope="col" className={TH_CLASS}>{t("colSize")}</th>
                  <th scope="col" className={TH_CLASS}>{t("colLeadStatus")}</th>
                  <th scope="col" className={TH_CLASS}>{t("colSaleState")}</th>
                  <th scope="col" className={`${TH_CLASS} text-end`}>{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredDemands.length === 0 ? (
                  <EmptyRow colSpan={7}>
                    {equipmentDemands.length === 0 ? t("noDemands") : t("noMatchDemands")}
                  </EmptyRow>
                ) : (
                  filteredDemands.map((lead) => {
                    const soldCount = salesByLead.get(lead.id) || 0;
                    const whatsappLink = buildWhatsAppLink(
                      {
                        phone: lead.phone,
                        notes: lead.notes,
                        whatsapp: lead.details?.demographics.whatsapp,
                      },
                      buildEquipmentDemandMessage(lead.fullName)
                    );
                    const codes = lead.details?.equipment.articles || [];
                    return (
                      <tr key={lead.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[var(--foreground)]">
                          <div>{lead.fullName}</div>
                          <span className="text-[10px] text-[var(--muted)] capitalize">{lead.category}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--muted)]" dir="ltr">
                          {lead.phone ? (
                            <a href={`tel:${lead.phone}`} className="hover:text-[var(--primary)]">
                              {lead.phone}
                            </a>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {codes.length === 0 ? (
                              <Badge tone="primary" size="sm">{t("packComplete")}</Badge>
                            ) : (
                              codes.map((code) => (
                                <Badge key={code} tone="info" size="sm">
                                  {getArticleShortLabel(code)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[var(--foreground)]">
                          {lead.details?.equipment.size ? (
                            <span className="font-semibold">{lead.details.equipment.size}</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge tone={leadStatusTone(lead.status)} size="sm">
                            {leadStatusLabel(lead.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {soldCount > 0 ? (
                            <Badge tone="success" size="sm">{t("saleStateSold", { count: soldCount })}</Badge>
                          ) : (
                            <Badge tone="default" size="sm">{t("saleStateOpen")}</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {whatsappLink ? (
                              <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-[var(--success-bg)] text-[var(--success-text)] hover:brightness-125 border border-[var(--success)]/30 text-[11px] font-semibold transition-all"
                              >
                                {t("whatsappBtn")}
                              </a>
                            ) : null}
                            <Button size="sm" variant="primary" onClick={() => openSaleForLead(lead)}>
                              {t("recordSaleForLead")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* VIEW: SALES */}
      {viewMode === "sales" ? (
        <div className="space-y-4">
          <p className="text-xs text-[var(--muted)]">{t("salesDesc")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder={t("searchSalesPlaceholder")}
                value={saleSearch}
                onChange={(e) => setSaleSearch(e.target.value)}
              />
            </div>
            <select
              value={saleArticleFilter}
              onChange={(e) => setSaleArticleFilter(e.target.value)}
              aria-label={t("colArticle")}
              className={SELECT_CLASS}
            >
              <option value="all">{t("filterAll")}</option>
              {saleArticleCodes.map((code) => (
                <option key={code} value={code}>
                  {articleLabel(code)}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--muted)] ms-auto">
              {t("salesCount", { shown: filteredSales.length, total: sales.length })}
            </span>
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-[var(--surface-2)]/60 text-[var(--muted)] uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                <tr>
                  <th scope="col" className={TH_CLASS}>{t("colDate")}</th>
                  <th scope="col" className={TH_CLASS}>{t("colArticle")}</th>
                  <th scope="col" className={TH_CLASS}>{t("colClient")}</th>
                  <th scope="col" className={`${TH_CLASS} text-center`}>{t("colQty")}</th>
                  <th scope="col" className={`${TH_CLASS} text-end`}>{t("colSellPrice")}</th>
                  <th scope="col" className={`${TH_CLASS} text-end`}>{t("colCostPrice")}</th>
                  <th scope="col" className={`${TH_CLASS} text-end`}>{t("colProfit")}</th>
                  <th scope="col" className={`${TH_CLASS} text-center`}>{t("colMarginShort")}</th>
                  <th scope="col" className={`${TH_CLASS} text-end`}>{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredSales.length === 0 ? (
                  <EmptyRow colSpan={9}>
                    {sales.length === 0 ? t("noSales") : t("noMatchSales")}
                  </EmptyRow>
                ) : (
                  filteredSales.map((sale) => {
                    const lineRevenue = sale.sellPrice * sale.quantity;
                    const lineCost = sale.costPrice * sale.quantity;
                    const lineProfit = lineRevenue - lineCost;
                    const lineMargin =
                      lineRevenue > 0 ? Math.round((lineProfit / lineRevenue) * 100) : 0;
                    return (
                      <tr key={sale.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                        <td className="py-3 px-4 text-[var(--muted)] font-mono text-[11px]" dir="ltr">
                          {formatSaleDate(sale.soldAt, uiLocale)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--foreground)]">
                          <div>{articleLabel(sale.article)}</div>
                          <div className="text-[10px] font-mono text-slate-500" dir="ltr">{sale.article}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[var(--foreground)]">{sale.clientName}</div>
                          {sale.clientPhone ? (
                            <div className="font-mono text-[10px] text-[var(--muted)]" dir="ltr">
                              {sale.clientPhone}
                            </div>
                          ) : null}
                          {sale.notes ? (
                            <div className="text-[10px] text-slate-500 truncate max-w-[220px]" title={sale.notes}>
                              {sale.notes}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-[var(--foreground)]">
                          {sale.quantity}
                        </td>
                        <td className="py-3 px-4 text-end font-mono text-[var(--foreground)]" dir="ltr">
                          {formatDA(lineRevenue)}
                          {sale.quantity > 1 ? (
                            <div className="text-[10px] text-slate-500">
                              {formatDA(sale.sellPrice)} {t("perUnit")}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 text-end font-mono text-[var(--muted)]" dir="ltr">
                          {formatDA(lineCost)}
                          {sale.quantity > 1 ? (
                            <div className="text-[10px] text-slate-500">
                              {formatDA(sale.costPrice)} {t("perUnit")}
                            </div>
                          ) : null}
                        </td>
                        <td
                          className={`py-3 px-4 text-end font-mono font-bold ${
                            lineProfit < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
                          }`}
                          dir="ltr"
                        >
                          {lineProfit >= 0 ? "+" : ""}
                          {formatDA(lineProfit)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge tone={marginTone(lineMargin)} size="sm">{lineMargin}%</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setSaleModal({ mode: "edit", sale })}
                              className="px-2 py-1 rounded text-[var(--primary)] hover:bg-[var(--primary-light)] text-[11px] transition-colors"
                            >
                              {t("editSaleBtn")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteSaleTarget(sale)}
                              className="px-2 py-1 rounded text-[var(--danger)] hover:bg-[var(--danger-bg)] text-[11px] transition-colors"
                            >
                              {t("deleteBtn")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* VIEW: CATALOG */}
      {viewMode === "catalog" ? (
        <div className="space-y-4">
          <div className="p-3 rounded-[10px] bg-[var(--surface-2)]/40 border border-[var(--border)] text-xs text-[var(--muted)]">
            {t("catalogDesc")}
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-[var(--surface-2)]/60 text-[var(--muted)] uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                <tr>
                  <th scope="col" className={TH_CLASS}>{t("colCode")}</th>
                  <th scope="col" className={TH_CLASS}>{t("colName")}</th>
                  <th scope="col" className={`${TH_CLASS} text-end`}>{t("colDefaultSell")}</th>
                  <th scope="col" className={`${TH_CLASS} text-end`}>{t("colDefaultCost")}</th>
                  <th scope="col" className={`${TH_CLASS} text-center`}>{t("colMargin")}</th>
                  <th scope="col" className={`${TH_CLASS} text-center`}>{t("colStatus")}</th>
                  <th scope="col" className={`${TH_CLASS} text-end`}>{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {articles.length === 0 ? (
                  <EmptyRow colSpan={7}>{t("noArticles")}</EmptyRow>
                ) : (
                  articles.map((article) => {
                    const margin =
                      article.defaultSellPrice > 0
                        ? Math.round(
                            ((article.defaultSellPrice - article.defaultCostPrice) /
                              article.defaultSellPrice) *
                              100
                          )
                        : 0;
                    return (
                      <tr
                        key={article.id}
                        className={`hover:bg-[var(--surface-2)]/40 transition-colors ${
                          article.active ? "" : "opacity-60"
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-[var(--muted)] text-[11px]" dir="ltr">
                          {article.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[var(--foreground)]">{article.name}</div>
                          {article.description ? (
                            <div className="text-[10px] text-[var(--muted)] mt-0.5 truncate max-w-xs">
                              {article.description}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 text-end font-mono text-[var(--foreground)]" dir="ltr">
                          {formatDA(article.defaultSellPrice)}
                        </td>
                        <td className="py-3 px-4 text-end font-mono text-[var(--muted)]" dir="ltr">
                          {formatDA(article.defaultCostPrice)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge tone={marginTone(margin)} size="sm">{margin}%</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(article)}
                            disabled={togglingArticleId !== null}
                            aria-pressed={article.active}
                            title={t("toggleActiveBtn")}
                            className="disabled:opacity-50"
                          >
                            <Badge tone={article.active ? "success" : "default"} size="sm">
                              {article.active ? t("statusActive") : t("statusInactive")}
                            </Badge>
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setArticleModal({ article })}
                              className="px-2 py-1 rounded text-[var(--primary)] hover:bg-[var(--primary-light)] text-[11px] transition-colors"
                            >
                              {t("editArticleBtn")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteArticleTarget(article)}
                              className="px-2 py-1 rounded text-[var(--danger)] hover:bg-[var(--danger-bg)] text-[11px] transition-colors"
                            >
                              {t("deleteArticleBtn")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Modals */}
      {articleModal ? (
        <ArticleFormModal
          existing={articleModal.article}
          onClose={() => setArticleModal(null)}
          onSaved={async (message) => {
            setArticleModal(null);
            await afterMutation(message);
          }}
          t={t}
        />
      ) : null}

      {saleModal ? (
        <SaleFormModal
          articles={articles}
          leads={leads}
          existing={saleModal.mode === "edit" ? saleModal.sale : null}
          prefill={saleModal.mode === "create" ? saleModal.prefill : null}
          onClose={() => setSaleModal(null)}
          onSaved={async (message) => {
            setSaleModal(null);
            await afterMutation(message);
          }}
          t={t}
        />
      ) : null}

      <ConfirmModal
        isOpen={deleteSaleTarget !== null}
        isDanger
        title={t("confirmDeleteTitle")}
        message={
          deleteSaleTarget
            ? t("deleteSaleConfirm", {
                article: articleLabel(deleteSaleTarget.article),
                client: deleteSaleTarget.clientName,
              })
            : ""
        }
        confirmLabel={deleting ? t("deletingBtn") : t("deleteBtn")}
        cancelLabel={t("cancelBtn")}
        onConfirm={confirmDeleteSale}
        onCancel={() => {
          if (!deleting) setDeleteSaleTarget(null);
        }}
      />

      <ConfirmModal
        isOpen={deleteArticleTarget !== null}
        isDanger
        title={t("confirmDeleteTitle")}
        message={
          deleteArticleTarget ? t("deleteArticleConfirm", { name: deleteArticleTarget.name }) : ""
        }
        confirmLabel={deleting ? t("deletingBtn") : t("deleteArticleBtn")}
        cancelLabel={t("cancelBtn")}
        onConfirm={confirmDeleteArticle}
        onCancel={() => {
          if (!deleting) setDeleteArticleTarget(null);
        }}
      />
    </div>
  );
}
