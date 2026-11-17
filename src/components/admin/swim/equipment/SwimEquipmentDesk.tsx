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
  EQUIPMENT_CATEGORIES,
  type EquipmentCategory,
  type EquipmentLocale,
  filterSales,
  formatArticleDescription,
  formatDA,
  formatSaleDate,
  formatSaleNotes,
  parseArticleDescription,
  parseSaleNotes,
  SALE_FULFILLMENT_STATUSES,
  SALE_PAYMENT_METHODS,
  saleDateKey,
  type SaleFulfillmentStatus,
  type SalePaymentMethod,
  toDateInputValue,
} from "@/lib/swim-equipment-utils";
import { getArticleShortLabel, type EquipmentArticleId } from "@/lib/swim-lead-details";
import { ArticleFormModal } from "./ArticleFormModal";
import { SaleFormModal } from "./SaleFormModal";
import { SaleReceiptModal } from "./SaleReceiptModal";
import type {
  CatalogArticle,
  EquipmentSaleItem,
  NoticeState,
  SaleModalState,
  SwimLeadItem,
  SwimMemberForStore,
} from "./types";

interface SwimEquipmentDeskProps {
  leads: SwimLeadItem[];
  members?: SwimMemberForStore[];
}

type ViewMode = "demands" | "sales" | "catalog";
type SortMode = "date_desc" | "date_asc" | "revenue_desc" | "profit_desc" | "qty_desc";
type CatalogFilterMode = "all" | "active" | "inactive" | "low_stock";
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

function saleStatusTone(status?: SaleFulfillmentStatus): BadgeTone {
  if (status === "reserved") return "warning";
  if (status === "paid_pending") return "info";
  return "success";
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

export function SwimEquipmentDesk({ leads, members = [] }: SwimEquipmentDeskProps) {
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
  const [receiptSale, setReceiptSale] = useState<EquipmentSaleItem | null>(null);
  const [deleteSaleTarget, setDeleteSaleTarget] = useState<EquipmentSaleItem | null>(null);
  const [deleteArticleTarget, setDeleteArticleTarget] = useState<CatalogArticle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingArticleId, setTogglingArticleId] = useState<string | null>(null);
  const [updatingSaleId, setUpdatingSaleId] = useState<string | null>(null);
  const [adjustingStockId, setAdjustingStockId] = useState<string | null>(null);
  const [seedingCatalog, setSeedingCatalog] = useState(false);

  // Period & View Filters
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");

  // Demands Filters
  const [demandSearch, setDemandSearch] = useState("");
  const [demandStatusFilter, setDemandStatusFilter] = useState("all");
  const [demandSaleFilter, setDemandSaleFilter] = useState("all");
  const [demandArticleFilter, setDemandArticleFilter] = useState("all");
  const [demandCategoryFilter, setDemandCategoryFilter] = useState("all");

  // Sales Filters
  const [saleSearch, setSaleSearch] = useState("");
  const [saleArticleFilter, setSaleArticleFilter] = useState("all");
  const [saleStatusFilter, setSaleStatusFilter] = useState("all");
  const [salePaymentFilter, setSalePaymentFilter] = useState("all");
  const [saleSort, setSaleSort] = useState<SortMode>("date_desc");

  // Catalog Filters
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("all");
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<CatalogFilterMode>("all");

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

  // Labels & Translations helpers
  function categoryLabel(cat: EquipmentCategory | string): string {
    if (cat === "goggles") return t("catGoggles");
    if (cat === "cap") return t("catCap");
    if (cat === "swimsuit") return t("catSwimsuit");
    if (cat === "fins") return t("catFins");
    if (cat === "pack") return t("catPack");
    return t("catAccessories");
  }

  function paymentMethodLabel(method?: SalePaymentMethod): string {
    if (method === "ccp") return t("payCcp");
    if (method === "card") return t("payCard");
    if (method === "transfer") return t("payTransfer");
    if (method === "included_pack") return t("payIncludedPack");
    return t("payCash");
  }

  function saleStatusLabel(status?: SaleFulfillmentStatus): string {
    if (status === "paid_pending") return t("statusPaidPending");
    if (status === "reserved") return t("statusReserved");
    return t("statusPaidDelivered");
  }

  // Derived data
  const articleNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const article of articles) map[article.code] = article.name;
    return map;
  }, [articles]);

  const parsedArticlesMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof parseArticleDescription>>();
    for (const art of articles) {
      map.set(art.code, parseArticleDescription(art.description, art.code));
    }
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

  const periodFinancialBreakdown = useMemo(() => {
    let paidRevenue = 0;
    let reservedRevenue = 0;
    const bundleSet = new Set<string>();
    for (const s of periodSales) {
      const parsed = parseSaleNotes(s.notes);
      const rev = s.sellPrice * s.quantity;
      if (parsed.meta.saleStatus === "reserved") {
        reservedRevenue += rev;
      } else {
        paidRevenue += rev;
      }
      bundleSet.add(parsed.meta.bundleId || s.id);
    }
    const ordersCount = bundleSet.size;
    const avgBasket = ordersCount > 0 ? Math.round(stats.totalSalesRevenue / ordersCount) : 0;
    return { paidRevenue, reservedRevenue, ordersCount, avgBasket };
  }, [periodSales, stats.totalSalesRevenue]);

  const inventorySummary = useMemo(() => {
    let trackedCount = 0;
    let lowStockCount = 0;
    let totalStockUnits = 0;
    let stockCostValue = 0;

    for (const art of articles) {
      const parsed = parsedArticlesMap.get(art.code);
      const qty = parsed?.meta.stockQty;
      if (qty !== null && qty !== undefined) {
        trackedCount += 1;
        totalStockUnits += qty;
        stockCostValue += qty * art.defaultCostPrice;
        if (qty <= (parsed?.meta.minStockAlert ?? 5)) {
          lowStockCount += 1;
        }
      }
    }
    return { trackedCount, lowStockCount, totalStockUnits, stockCostValue };
  }, [articles, parsedArticlesMap]);

  const articleStatCards = useMemo(
    () => Object.entries(stats.byArticle).sort((a, b) => b[1].revenue - a[1].revenue),
    [stats]
  );

  const filteredSales = useMemo(() => {
    const base = filterSales(sales, {
      from: periodFrom,
      to: periodTo,
      search: saleSearch,
      article: saleArticleFilter,
      articleNames: articleNameMap,
      saleStatus: saleStatusFilter,
      paymentMethod: salePaymentFilter,
    });

    return [...base].sort((a, b) => {
      if (saleSort === "date_asc") {
        return new Date(a.soldAt).getTime() - new Date(b.soldAt).getTime();
      }
      if (saleSort === "revenue_desc") {
        return b.sellPrice * b.quantity - a.sellPrice * a.quantity;
      }
      if (saleSort === "profit_desc") {
        return (
          (b.sellPrice - b.costPrice) * b.quantity -
          (a.sellPrice - a.costPrice) * a.quantity
        );
      }
      if (saleSort === "qty_desc") {
        return b.quantity - a.quantity;
      }
      return new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime();
    });
  }, [
    sales,
    periodFrom,
    periodTo,
    saleSearch,
    saleArticleFilter,
    articleNameMap,
    saleStatusFilter,
    salePaymentFilter,
    saleSort,
  ]);

  const filteredSalesSummary = useMemo(
    () => aggregateSalesStats(filteredSales),
    [filteredSales]
  );

  const saleArticleCodes = useMemo(
    () => Array.from(new Set(sales.map((sale) => sale.article))),
    [sales]
  );

  const salesByLead = useMemo(() => countSalesByLead(sales), [sales]);

  const soldArticlesByLead = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const s of sales) {
      if (!s.leadId) continue;
      if (!map.has(s.leadId)) map.set(s.leadId, new Set());
      map.get(s.leadId)!.add(s.article);
    }
    return map;
  }, [sales]);

  const equipmentDemands = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    return leads.filter(
      (lead) =>
        Boolean(lead?.details?.equipment?.hasPack) ||
        (Array.isArray(lead?.details?.equipment?.articles) &&
          lead.details!.equipment.articles.length > 0)
    );
  }, [leads]);

  const demandStats = useMemo(() => {
    let openCount = 0;
    let soldDemandsCount = 0;
    let gogglesNeeded = 0;
    let capNeeded = 0;
    let swimsuitNeeded = 0;
    let fullPackCount = 0;
    const sizeCounts: Record<string, number> = {};

    for (const lead of equipmentDemands) {
      const soldSet = soldArticlesByLead.get(lead.id);
      const isSold = (salesByLead.get(lead.id) || 0) > 0;
      if (isSold) {
        soldDemandsCount += 1;
      } else {
        openCount += 1;
        const codes = lead.details?.equipment.articles || [];
        if (codes.length === 0) {
          fullPackCount += 1;
          gogglesNeeded += 1;
          capNeeded += 1;
          swimsuitNeeded += 1;
        } else {
          if (codes.includes("goggles") && !soldSet?.has("goggles")) gogglesNeeded += 1;
          if (codes.includes("cap") && !soldSet?.has("cap")) capNeeded += 1;
          if (codes.includes("swimsuit") && !soldSet?.has("swimsuit")) swimsuitNeeded += 1;
        }
        const sz = lead.details?.equipment.size?.trim();
        if (sz) {
          sizeCounts[sz] = (sizeCounts[sz] || 0) + 1;
        }
      }
    }

    return {
      openCount,
      soldDemandsCount,
      gogglesNeeded,
      capNeeded,
      swimsuitNeeded,
      fullPackCount,
      sizeCounts,
    };
  }, [equipmentDemands, salesByLead, soldArticlesByLead]);

  const filteredDemands = useMemo(() => {
    const query = demandSearch.toLowerCase().trim();
    return equipmentDemands.filter((lead) => {
      if (query && !lead.fullName.toLowerCase().includes(query) && !lead.phone.includes(query)) {
        return false;
      }
      if (demandStatusFilter !== "all" && lead.status !== demandStatusFilter) return false;
      if (demandCategoryFilter !== "all" && lead.category !== demandCategoryFilter) return false;
      if (demandArticleFilter !== "all") {
        const codes = lead.details?.equipment.articles || [];
        const matchesArt =
          codes.length === 0 || codes.includes(demandArticleFilter as EquipmentArticleId);
        if (!matchesArt) return false;
      }
      const sold = (salesByLead.get(lead.id) || 0) > 0;
      if (demandSaleFilter === "sold" && !sold) return false;
      if (demandSaleFilter === "open" && sold) return false;
      return true;
    });
  }, [
    equipmentDemands,
    demandSearch,
    demandStatusFilter,
    demandCategoryFilter,
    demandArticleFilter,
    demandSaleFilter,
    salesByLead,
  ]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    return articles.filter((art) => {
      const parsed = parsedArticlesMap.get(art.code);
      if (catalogCategoryFilter !== "all" && parsed?.meta.category !== catalogCategoryFilter) {
        return false;
      }
      if (catalogStatusFilter === "active" && !art.active) return false;
      if (catalogStatusFilter === "inactive" && art.active) return false;
      if (catalogStatusFilter === "low_stock") {
        const stock = parsed?.meta.stockQty;
        if (stock === null || stock === undefined || stock > (parsed?.meta.minStockAlert ?? 5)) {
          return false;
        }
      }
      if (q) {
        const hay = `${art.name} ${art.code} ${parsed?.cleanDescription || ""} ${parsed?.meta.sku || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [articles, parsedArticlesMap, catalogSearch, catalogCategoryFilter, catalogStatusFilter]);

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

  async function handleAdjustStock(article: CatalogArticle, delta: number) {
    if (adjustingStockId) return;
    const parsed = parsedArticlesMap.get(article.code);
    if (!parsed || parsed.meta.stockQty === null || parsed.meta.stockQty === undefined) return;

    const nextStock = Math.max(0, parsed.meta.stockQty + delta);
    const nextDesc = formatArticleDescription(
      { ...parsed.meta, stockQty: nextStock },
      parsed.cleanDescription
    );

    setAdjustingStockId(article.id);
    try {
      const res = await fetch(`/api/admin/swim/equipment/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: nextDesc }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" && data.error ? data.error : t("errorGeneric"));
      }
      await loadAll();
    } catch (err: unknown) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : t("errorGeneric") });
    } finally {
      setAdjustingStockId(null);
    }
  }

  async function handleSeedDefaultCatalog() {
    if (seedingCatalog) return;
    setSeedingCatalog(true);
    try {
      const res = await fetch("/api/admin/swim/equipment/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedDefaults: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" && data.error ? data.error : t("errorGeneric"));
      }
      const data = await res.json();
      const createdCount = typeof data.createdCount === "number" ? data.createdCount : 0;
      await afterMutation(
        createdCount > 0
          ? t("catalogSeededSuccess", { count: createdCount })
          : t("catalogAlreadySeeded")
      );
    } catch (err: unknown) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : t("errorGeneric") });
    } finally {
      setSeedingCatalog(false);
    }
  }

  async function markSaleDelivered(sale: EquipmentSaleItem) {
    if (updatingSaleId) return;
    const parsed = parseSaleNotes(sale.notes);
    const nextNotes = formatSaleNotes(
      { ...parsed.meta, saleStatus: "paid_delivered" },
      parsed.userNotes
    );

    setUpdatingSaleId(sale.id);
    try {
      const res = await fetch(`/api/admin/swim/equipment/${sale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article: sale.article,
          clientName: sale.clientName,
          clientPhone: sale.clientPhone || "",
          leadId: sale.leadId || null,
          sellPrice: sale.sellPrice,
          costPrice: sale.costPrice,
          quantity: sale.quantity,
          notes: nextNotes,
          soldAt: saleDateKey(sale.soldAt),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" && data.error ? data.error : t("errorGeneric"));
      }
      await afterMutation(t("saleMarkedDeliveredSuccess"));
    } catch (err: unknown) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : t("errorGeneric") });
    } finally {
      setUpdatingSaleId(null);
    }
  }

  function openSaleForLead(lead: SwimLeadItem) {
    const requestedCodes = lead.details?.equipment.articles || [];
    const baseCodes = requestedCodes.length > 0 ? requestedCodes : ["goggles", "cap", "swimsuit"];
    const soldSet = soldArticlesByLead.get(lead.id);
    const remainingCodes = soldSet
      ? baseCodes.filter((code) => !soldSet.has(code))
      : baseCodes;
    const codesToOpen = remainingCodes.length > 0 ? remainingCodes : baseCodes;

    setSaleModal({
      mode: "create",
      prefill: {
        clientName: lead.fullName,
        clientPhone: lead.phone || "",
        leadId: lead.id,
        articleCode: codesToOpen[0] || "",
        articleCodes: codesToOpen,
        size: lead.details?.equipment.size || null,
        category: lead.category || null,
      },
    });
  }

  function openSaleForArticle(articleCode: string) {
    setSaleModal({
      mode: "create",
      prefill: {
        clientName: "",
        clientPhone: "",
        articleCode,
        articleCodes: [articleCode],
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

  function applyPreset(preset: "today" | "7d" | "month" | "30d" | "all") {
    if (preset === "all") {
      setPeriodFrom("");
      setPeriodTo("");
    } else if (preset === "today") {
      const todayStr = toDateInputValue();
      setPeriodFrom(todayStr);
      setPeriodTo(todayStr);
    } else if (preset === "7d") {
      setPeriodFrom(daysAgo(6));
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
        t("colSize"),
        t("colClient"),
        t("colPhone"),
        t("inputPaymentMethod"),
        t("inputSaleStatus"),
        t("colQty"),
        t("colSellPrice"),
        t("colCostPrice"),
        t("totalRevenue"),
        t("colProfit"),
        t("inputNotes"),
      ],
      filteredSales.map((sale) => {
        const parsed = parseSaleNotes(sale.notes);
        return [
          formatSaleDate(sale.soldAt, uiLocale),
          articleLabel(sale.article),
          parsed.meta.size || "",
          sale.clientName,
          sale.clientPhone,
          paymentMethodLabel(parsed.meta.paymentMethod),
          saleStatusLabel(parsed.meta.saleStatus),
          sale.quantity,
          sale.sellPrice,
          sale.costPrice,
          sale.sellPrice * sale.quantity,
          (sale.sellPrice - sale.costPrice) * sale.quantity,
          parsed.userNotes || "",
        ];
      })
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

      {/* Period filter */}
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
          <Button variant="ghost" size="sm" onClick={() => applyPreset("today")}>
            {t("periodToday")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => applyPreset("7d")}>
            {t("period7")}
          </Button>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label={t("totalRevenue")}
          value={formatDA(stats.totalSalesRevenue)}
          hint={
            periodFinancialBreakdown.reservedRevenue > 0
              ? t("revenueReservedHint", {
                  units: stats.totalUnitsSold,
                  reserved: formatDA(periodFinancialBreakdown.reservedRevenue),
                })
              : t("revenueAvgHint", {
                  units: stats.totalUnitsSold,
                  avg: formatDA(periodFinancialBreakdown.avgBasket),
                })
          }
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("totalCost")}
          value={formatDA(stats.totalCost)}
          hint={
            inventorySummary.trackedCount > 0
              ? t("stockValueHint", { amount: formatDA(inventorySummary.stockCostValue) })
              : t("totalCostHint")
          }
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
          label={t("demandsConversionKpi")}
          value={`${demandStats.soldDemandsCount} / ${equipmentDemands.length}`}
          hint={t("openDemandsHint", { count: demandStats.openCount })}
          icon={
            <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("catalogTitle")}
          value={articles.length}
          hint={
            inventorySummary.lowStockCount > 0
              ? t("activeLowStockHint", {
                  active: activeArticleCount,
                  low: inventorySummary.lowStockCount,
                })
              : t("activeCount", { count: activeArticleCount })
          }
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
          {articleStatCards.map(([code, stat]) => {
            const parsedArt = parsedArticlesMap.get(code);
            const sharePct =
              stats.totalSalesRevenue > 0
                ? Math.round((stat.revenue / stats.totalSalesRevenue) * 100)
                : 0;
            const stock = parsedArt?.meta.stockQty;
            const alertAt = parsedArt?.meta.minStockAlert ?? 5;

            return (
              <div
                key={code}
                className="p-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md hover:border-[var(--primary)]/40 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--foreground)] truncate">
                      {articleLabel(code)}
                    </span>
                    {parsedArt?.meta.category ? (
                      <Badge tone="default" size="sm">
                        {categoryLabel(parsedArt.meta.category)}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge tone="primary" size="sm">
                      {t("soldUnits", { count: stat.units })}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => openSaleForArticle(code)}
                      className="px-2 py-0.5 rounded-md bg-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/30 text-[10px] font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
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

                <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent,#00f2ff)]"
                    style={{ width: `${Math.min(100, Math.max(4, sharePct))}%` }}
                  />
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span>{t("marginLabel", { pct: stat.marginPercent })} | {sharePct}%</span>
                  <span>
                    {stock !== null && stock !== undefined ? (
                      <span
                        className={
                          stock === 0
                            ? "text-red-400 font-semibold"
                            : stock <= alertAt
                            ? "text-amber-400 font-semibold"
                            : ""
                        }
                      >
                        {t("stockBadgeShort", { count: stock })}
                      </span>
                    ) : (
                      t("costLabel", { amount: formatDA(stat.cost) })
                    )}
                  </span>
                </div>
              </div>
            );
          })}
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

        <div className="flex flex-wrap items-center gap-2">
          {viewMode === "catalog" ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={seedingCatalog}
                onClick={handleSeedDefaultCatalog}
              >
                {seedingCatalog ? t("seedingCatalogBtn") : t("seedCatalogBtn")}
              </Button>
              <Button variant="primary" size="sm" onClick={() => setArticleModal({ article: null })}>
                {t("addArticleBtn")}
              </Button>
            </>
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

          {/* Demand Forecast Strip */}
          {demandStats.openCount > 0 ? (
            <div className="p-3.5 rounded-[14px] border border-cyan-500/25 bg-cyan-500/5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-bold text-cyan-300">
                {t("demandForecastTitle", { count: demandStats.openCount })}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge tone="info" size="sm">
                  {t("articleGoggles")}: {demandStats.gogglesNeeded}
                </Badge>
                <Badge tone="info" size="sm">
                  {t("articleCap")}: {demandStats.capNeeded}
                </Badge>
                <Badge tone="info" size="sm">
                  {t("articleSwimsuit")}: {demandStats.swimsuitNeeded}
                </Badge>
                {Object.entries(demandStats.sizeCounts).length > 0 ? (
                  <span className="text-[11px] text-[var(--muted)] font-mono">
                    {t("colSize")}:{" "}
                    {Object.entries(demandStats.sizeCounts)
                      .map(([sz, count]) => `${sz} (${count})`)
                      .join(", ")}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-60">
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
              value={demandArticleFilter}
              onChange={(e) => setDemandArticleFilter(e.target.value)}
              aria-label={t("colArticle")}
              className={SELECT_CLASS}
            >
              <option value="all">{t("filterAll")}</option>
              <option value="goggles">{t("filterGoggles")}</option>
              <option value="cap">{t("filterCap")}</option>
              <option value="swimsuit">{t("filterSwimsuits")}</option>
            </select>
            <select
              value={demandCategoryFilter}
              onChange={(e) => setDemandCategoryFilter(e.target.value)}
              aria-label={t("inputClientCategory")}
              className={SELECT_CLASS}
            >
              <option value="all">{t("allClientCategories")}</option>
              <option value="homme">{t("clientCatHomme")}</option>
              <option value="femme">{t("clientCatFemme")}</option>
              <option value="enfants">{t("clientCatEnfants")}</option>
              <option value="apnea">{t("clientCatApnea")}</option>
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
                    const soldArtSet = soldArticlesByLead.get(lead.id);
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
                              <Badge tone={soldCount > 0 ? "success" : "primary"} size="sm">
                                {t("packComplete")}
                              </Badge>
                            ) : (
                              codes.map((code) => {
                                const isFulfilled = soldArtSet?.has(code) ?? false;
                                return (
                                  <Badge
                                    key={code}
                                    tone={isFulfilled ? "success" : "info"}
                                    size="sm"
                                  >
                                    {getArticleShortLabel(code)}
                                  </Badge>
                                );
                              })
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
            <div className="w-full sm:w-60">
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
            <select
              value={saleStatusFilter}
              onChange={(e) => setSaleStatusFilter(e.target.value)}
              aria-label={t("inputSaleStatus")}
              className={SELECT_CLASS}
            >
              <option value="all">{t("allStatuses")}</option>
              {SALE_FULFILLMENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {saleStatusLabel(st)}
                </option>
              ))}
            </select>
            <select
              value={salePaymentFilter}
              onChange={(e) => setSalePaymentFilter(e.target.value)}
              aria-label={t("inputPaymentMethod")}
              className={SELECT_CLASS}
            >
              <option value="all">{t("allPaymentMethods")}</option>
              {SALE_PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {paymentMethodLabel(pm)}
                </option>
              ))}
            </select>
            <select
              value={saleSort}
              onChange={(e) => setSaleSort(e.target.value as SortMode)}
              aria-label={t("sortLabel")}
              className={SELECT_CLASS}
            >
              <option value="date_desc">{t("sortDateDesc")}</option>
              <option value="date_asc">{t("sortDateAsc")}</option>
              <option value="revenue_desc">{t("sortRevenueDesc")}</option>
              <option value="profit_desc">{t("sortProfitDesc")}</option>
              <option value="qty_desc">{t("sortQtyDesc")}</option>
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
                  <th scope="col" className={TH_CLASS}>{t("colPaymentStatus")}</th>
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
                  <EmptyRow colSpan={10}>
                    {sales.length === 0 ? t("noSales") : t("noMatchSales")}
                  </EmptyRow>
                ) : (
                  filteredSales.map((sale) => {
                    const parsed = parseSaleNotes(sale.notes);
                    const lineRevenue = sale.sellPrice * sale.quantity;
                    const lineCost = sale.costPrice * sale.quantity;
                    const lineProfit = lineRevenue - lineCost;
                    const lineMargin =
                      lineRevenue > 0 ? Math.round((lineProfit / lineRevenue) * 100) : 0;
                    const isPendingDelivery = parsed.meta.saleStatus !== "paid_delivered";

                    return (
                      <tr key={sale.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                        <td className="py-3 px-4 text-[var(--muted)] font-mono text-[11px]" dir="ltr">
                          {formatSaleDate(sale.soldAt, uiLocale)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[var(--foreground)]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{articleLabel(sale.article)}</span>
                            {parsed.meta.size ? (
                              <Badge tone="info" size="sm">{parsed.meta.size}</Badge>
                            ) : null}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500" dir="ltr">
                            {sale.article}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[var(--foreground)]">
                              {sale.clientName}
                            </span>
                            {parsed.meta.swimId ? (
                              <Badge tone="primary" size="sm">{parsed.meta.swimId}</Badge>
                            ) : null}
                          </div>
                          {sale.clientPhone ? (
                            <div className="font-mono text-[10px] text-[var(--muted)]" dir="ltr">
                              {sale.clientPhone}
                            </div>
                          ) : null}
                          {parsed.userNotes ? (
                            <div
                              className="text-[10px] text-slate-500 truncate max-w-[220px]"
                              title={parsed.userNotes}
                            >
                              {parsed.userNotes}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col items-start gap-1">
                            <Badge tone={saleStatusTone(parsed.meta.saleStatus)} size="sm">
                              {saleStatusLabel(parsed.meta.saleStatus)}
                            </Badge>
                            <span className="text-[10px] text-[var(--muted)]">
                              {paymentMethodLabel(parsed.meta.paymentMethod)}
                            </span>
                          </div>
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
                          {parsed.meta.discountDA && parsed.meta.discountDA > 0 ? (
                            <div className="text-[10px] text-amber-400">
                              -{formatDA(parsed.meta.discountDA)}
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
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {isPendingDelivery ? (
                              <button
                                type="button"
                                disabled={updatingSaleId === sale.id}
                                onClick={() => markSaleDelivered(sale)}
                                className="px-2 py-1 rounded bg-[var(--success-bg)] text-[var(--success-text)] hover:brightness-125 text-[11px] font-semibold transition-all disabled:opacity-50"
                              >
                                {t("markDeliveredBtn")}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setReceiptSale(sale)}
                              className="px-2 py-1 rounded text-cyan-300 hover:bg-cyan-500/15 text-[11px] transition-colors"
                            >
                              {t("receiptBtn")}
                            </button>
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
              {filteredSales.length > 0 ? (
                <tfoot className="bg-[var(--surface-2)]/80 border-t border-[var(--border)] font-bold text-xs">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-[var(--muted)] uppercase tracking-wider text-[10px]">
                      {t("totalsRowLabel", { count: filteredSales.length })}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[var(--foreground)]">
                      {filteredSalesSummary.totalUnitsSold}
                    </td>
                    <td className="py-3 px-4 text-end font-mono text-[var(--foreground)]" dir="ltr">
                      {formatDA(filteredSalesSummary.totalSalesRevenue)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono text-[var(--muted)]" dir="ltr">
                      {formatDA(filteredSalesSummary.totalCost)}
                    </td>
                    <td
                      className={`py-3 px-4 text-end font-mono ${
                        filteredSalesSummary.totalProfit < 0
                          ? "text-[var(--danger)]"
                          : "text-[var(--success)]"
                      }`}
                      dir="ltr"
                    >
                      {filteredSalesSummary.totalProfit >= 0 ? "+" : ""}
                      {formatDA(filteredSalesSummary.totalProfit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge tone={marginTone(filteredSalesSummary.marginPercent)} size="sm">
                        {filteredSalesSummary.marginPercent}%
                      </Badge>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-60">
              <Input
                placeholder={t("searchCatalogPlaceholder")}
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
            </div>
            <select
              value={catalogCategoryFilter}
              onChange={(e) => setCatalogCategoryFilter(e.target.value)}
              aria-label={t("inputArticleCategory")}
              className={SELECT_CLASS}
            >
              <option value="all">{t("catAll")}</option>
              {EQUIPMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel(cat)}
                </option>
              ))}
            </select>
            <select
              value={catalogStatusFilter}
              onChange={(e) => setCatalogStatusFilter(e.target.value as CatalogFilterMode)}
              aria-label={t("colStatus")}
              className={SELECT_CLASS}
            >
              <option value="all">{t("allStatuses")}</option>
              <option value="active">{t("statusActive")}</option>
              <option value="inactive">{t("statusInactive")}</option>
              <option value="low_stock">{t("filterLowStock")}</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-[var(--surface-2)]/60 text-[var(--muted)] uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                <tr>
                  <th scope="col" className={TH_CLASS}>{t("colCode")}</th>
                  <th scope="col" className={TH_CLASS}>{t("colName")}</th>
                  <th scope="col" className={`${TH_CLASS} text-center`}>{t("colStock")}</th>
                  <th scope="col" className={`${TH_CLASS} text-end`}>{t("colDefaultSell")}</th>
                  <th scope="col" className={`${TH_CLASS} text-end`}>{t("colDefaultCost")}</th>
                  <th scope="col" className={`${TH_CLASS} text-center`}>{t("colMargin")}</th>
                  <th scope="col" className={`${TH_CLASS} text-center`}>{t("colStatus")}</th>
                  <th scope="col" className={`${TH_CLASS} text-end`}>{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredCatalog.length === 0 ? (
                  <EmptyRow colSpan={8}>
                    {articles.length === 0 ? t("noArticles") : t("noMatchCatalog")}
                  </EmptyRow>
                ) : (
                  filteredCatalog.map((article) => {
                    const parsed = parsedArticlesMap.get(article.code);
                    const stock = parsed?.meta.stockQty;
                    const alertAt = parsed?.meta.minStockAlert ?? 5;
                    const sizes = parsed?.meta.sizes || [];
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
                          <div>{article.code}</div>
                          {parsed?.meta.sku ? (
                            <div className="text-[10px] text-slate-500">{parsed.meta.sku}</div>
                          ) : null}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[var(--foreground)]">{article.name}</span>
                            {parsed?.meta.category ? (
                              <Badge tone="default" size="sm">
                                {categoryLabel(parsed.meta.category)}
                              </Badge>
                            ) : null}
                          </div>
                          {parsed?.cleanDescription ? (
                            <div className="text-[10px] text-[var(--muted)] mt-0.5 truncate max-w-xs">
                              {parsed.cleanDescription}
                            </div>
                          ) : null}
                          {sizes.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {sizes.map((sz) => (
                                <span
                                  key={sz}
                                  className="px-1.5 py-0.2 rounded bg-[var(--surface-2)] text-[10px] text-[var(--muted)] border border-[var(--border)]"
                                >
                                  {sz}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {stock !== null && stock !== undefined ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={adjustingStockId === article.id || stock <= 0}
                                onClick={() => handleAdjustStock(article, -1)}
                                className="h-6 w-6 rounded bg-[var(--surface-2)] hover:bg-[var(--primary-light)] text-xs font-bold disabled:opacity-40"
                              >
                                -
                              </button>
                              <Badge
                                tone={stock === 0 ? "danger" : stock <= alertAt ? "warning" : "success"}
                                size="sm"
                              >
                                {stock}
                              </Badge>
                              <button
                                type="button"
                                disabled={adjustingStockId === article.id}
                                onClick={() => handleAdjustStock(article, 1)}
                                className="h-6 w-6 rounded bg-[var(--surface-2)] hover:bg-[var(--primary-light)] text-xs font-bold disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">{t("stockUntracked")}</span>
                          )}
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
                            {article.active ? (
                              <button
                                type="button"
                                onClick={() => openSaleForArticle(article.code)}
                                className="px-2 py-1 rounded text-cyan-300 hover:bg-cyan-500/15 text-[11px] font-semibold transition-colors"
                              >
                                {t("recordSaleForLead")}
                              </button>
                            ) : null}
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
          members={members}
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

      {receiptSale ? (
        <SaleReceiptModal
          sale={receiptSale}
          allSales={sales}
          articleNames={articleNameMap}
          locale={uiLocale}
          onClose={() => setReceiptSale(null)}
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
