"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button, Input, StatCard } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";
import {
  EQUIPMENT_ARTICLES,
  EquipmentArticleId,
  getArticleLabel,
  getArticleShortLabel,
  SwimLeadDetails,
} from "@/lib/swim-lead-details";

function formatDA(amount: number): string {
  return `${amount.toLocaleString("fr-DZ")} DA`;
}

interface SwimLeadItem {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  category: string;
  level: string;
  status: string;
  createdAt: string;
  notes: string | null;
  details?: SwimLeadDetails;
}

interface EquipmentSaleItem {
  id: string;
  article: string;
  clientName: string;
  clientPhone: string;
  leadId: string | null;
  sellPrice: number;
  costPrice: number;
  quantity: number;
  notes: string | null;
  soldAt: string;
  createdAt: string;
}

interface SalesStats {
  totalSalesRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalUnitsSold: number;
  byArticle: Record<
    string,
    { revenue: number; cost: number; profit: number; units: number }
  >;
}

// Suggested default pricing benchmarks in Algerian Dinars (DA)
const ARTICLE_DEFAULTS: Record<
  EquipmentArticleId,
  { defaultSell: number; defaultCost: number }
> = {
  goggles: { defaultSell: 2500, defaultCost: 1200 },
  cap: { defaultSell: 1200, defaultCost: 500 },
  swimsuit: { defaultSell: 4500, defaultCost: 2200 },
};

interface SwimEquipmentDeskProps {
  leads: SwimLeadItem[];
  onRefreshLeads?: () => Promise<void> | void;
}

export function SwimEquipmentDesk({
  leads,
  onRefreshLeads,
}: SwimEquipmentDeskProps) {
  const { t } = useTranslations("swimEquipment");

  // Section view toggle: "demands" | "sales"
  const [viewMode, setViewMode] = useState<"demands" | "sales">("demands");

  // Sales state
  const [sales, setSales] = useState<EquipmentSaleItem[]>([]);
  const [salesStats, setSalesStats] = useState<SalesStats>({
    totalSalesRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalUnitsSold: 0,
    byArticle: {},
  });
  const [loadingSales, setLoadingSales] = useState(true);

  // Filters for Demands
  const [demandSearch, setDemandSearch] = useState("");
  const [demandArticleFilter, setDemandArticleFilter] = useState<string>("all");
  const [demandStatusFilter, setDemandStatusFilter] = useState<string>("all");

  // Filters for Sales
  const [saleSearch, setSaleSearch] = useState("");
  const [saleArticleFilter, setSaleArticleFilter] = useState<string>("all");

  // Add Sale Modal State
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [saleArticle, setSaleArticle] = useState<EquipmentArticleId>("goggles");
  const [saleClientName, setSaleClientName] = useState("");
  const [saleClientPhone, setSaleClientPhone] = useState("");
  const [saleLeadId, setSaleLeadId] = useState<string>("");
  const [saleSellPrice, setSaleSellPrice] = useState<number>(2500);
  const [saleCostPrice, setSaleCostPrice] = useState<number>(1200);
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [saleNotes, setSaleNotes] = useState("");
  const [saleSoldAt, setSaleSoldAt] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [submittingSale, setSubmittingSale] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  // Delete Sale Modal State
  const [deleteTarget, setDeleteTarget] = useState<EquipmentSaleItem | null>(
    null
  );
  const [deletingSale, setDeletingSale] = useState(false);

  // Fetch sales from API
  const loadSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const res = await fetch("/api/admin/swim/equipment");
      if (res.ok) {
        const data = await res.json();
        setSales(Array.isArray(data.sales) ? data.sales : []);
        if (data.stats) {
          setSalesStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load swim equipment sales:", err);
    } finally {
      setLoadingSales(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Update default pricing when article changes in Add Modal
  function handleArticleChange(art: EquipmentArticleId) {
    setSaleArticle(art);
    const defaults = ARTICLE_DEFAULTS[art];
    if (defaults) {
      setSaleSellPrice(defaults.defaultSell);
      setSaleCostPrice(defaults.defaultCost);
    }
  }

  // Pre-fill sale modal from a lead demand
  function handleOpenSaleForLead(
    lead: SwimLeadItem,
    preferredArticle?: EquipmentArticleId
  ) {
    const art =
      preferredArticle ||
      lead.details?.equipment.articles?.[0] ||
      "goggles";
    setSaleArticle(art);
    const defaults = ARTICLE_DEFAULTS[art];
    if (defaults) {
      setSaleSellPrice(defaults.defaultSell);
      setSaleCostPrice(defaults.defaultCost);
    }
    setSaleClientName(lead.fullName);
    setSaleClientPhone(lead.phone);
    setSaleLeadId(lead.id);
    setSaleQuantity(1);
    setSaleNotes(
      lead.details?.equipment.size
        ? `Taille: ${lead.details.equipment.size}`
        : ""
    );
    setSaleSoldAt(new Date().toISOString().split("T")[0]);
    setSaleError(null);
    setShowAddSaleModal(true);
  }

  // Open fresh sale modal
  function handleOpenFreshSaleModal() {
    setSaleArticle("goggles");
    setSaleSellPrice(ARTICLE_DEFAULTS.goggles.defaultSell);
    setSaleCostPrice(ARTICLE_DEFAULTS.goggles.defaultCost);
    setSaleClientName("");
    setSaleClientPhone("");
    setSaleLeadId("");
    setSaleQuantity(1);
    setSaleNotes("");
    setSaleSoldAt(new Date().toISOString().split("T")[0]);
    setSaleError(null);
    setShowAddSaleModal(true);
  }

  // Submit sale record
  async function handleSubmitSale(e: React.FormEvent) {
    e.preventDefault();
    if (!saleClientName.trim() || !saleClientPhone.trim()) {
      setSaleError("Le nom et le telephone du client sont obligatoires.");
      return;
    }
    if (saleSellPrice < 0 || saleCostPrice < 0 || saleQuantity < 1) {
      setSaleError("Les montants et quantites doivent etre valides.");
      return;
    }

    setSubmittingSale(true);
    setSaleError(null);
    try {
      const res = await fetch("/api/admin/swim/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article: saleArticle,
          clientName: saleClientName.trim(),
          clientPhone: saleClientPhone.trim(),
          leadId: saleLeadId || null,
          sellPrice: Number(saleSellPrice),
          costPrice: Number(saleCostPrice),
          quantity: Number(saleQuantity),
          notes: saleNotes.trim() || null,
          soldAt: saleSoldAt,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to record sale");
      }

      setShowAddSaleModal(false);
      await loadSales();
      if (onRefreshLeads) onRefreshLeads();
    } catch (err: unknown) {
      setSaleError(
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement"
      );
    } finally {
      setSubmittingSale(false);
    }
  }

  // Delete sale record
  async function handleDeleteSale() {
    if (!deleteTarget) return;
    setDeletingSale(true);
    try {
      const res = await fetch(
        `/api/admin/swim/equipment/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDeleteTarget(null);
        await loadSales();
      }
    } catch (err) {
      console.error("Failed to delete equipment sale:", err);
    } finally {
      setDeletingSale(false);
    }
  }

  // Filter Demands: Leads where equipment pack was requested
  const equipmentDemands = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    return leads.filter((l) => {
      if (!l) return false;
      const hasPack =
        Boolean(l.details?.equipment.hasPack) ||
        (Array.isArray(l.details?.equipment.articles) &&
          l.details.equipment.articles.length > 0);
      return hasPack;
    });
  }, [leads]);

  const filteredDemands = useMemo(() => {
    return equipmentDemands.filter((l) => {
      const q = demandSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        l.fullName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.email && l.email.toLowerCase().includes(q));

      const matchStatus =
        demandStatusFilter === "all" || l.status === demandStatusFilter;

      const matchArticle =
        demandArticleFilter === "all" ||
        Boolean(
          l.details?.equipment.articles?.includes(
            demandArticleFilter as EquipmentArticleId
          )
        );

      return matchSearch && matchStatus && matchArticle;
    });
  }, [equipmentDemands, demandSearch, demandStatusFilter, demandArticleFilter]);

  // Filter Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = saleSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.clientName.toLowerCase().includes(q) ||
        s.clientPhone.includes(q);
      const matchArticle =
        saleArticleFilter === "all" || s.article === saleArticleFilter;
      return matchSearch && matchArticle;
    });
  }, [sales, saleSearch, saleArticleFilter]);

  // Profit calculations
  const totalRevenue = salesStats.totalSalesRevenue;
  const totalCost = salesStats.totalCost;
  const totalProfit = salesStats.totalProfit;
  const profitMarginPercent =
    totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  // Live modal profit calculation
  const modalUnitProfit = saleSellPrice - saleCostPrice;
  const modalTotalProfit = modalUnitProfit * saleQuantity;
  const modalMarginPercent =
    saleSellPrice > 0 ? Math.round((modalUnitProfit / saleSellPrice) * 100) : 0;

  // Export Demands to CSV
  function handleExportDemandsCSV() {
    const headers = [
      "Client Name",
      "Phone",
      "Category",
      "Status",
      "Articles Requested",
      "Size",
      "Date",
    ];
    const rows = filteredDemands.map((d) => [
      `"${d.fullName.replace(/"/g, '""')}"`,
      `"${d.phone}"`,
      d.category,
      d.status,
      `"${(d.details?.equipment.articleLabels || []).join(", ")}"`,
      `"${d.details?.equipment.size || ""}"`,
      new Date(d.createdAt).toLocaleDateString("fr-DZ"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `aqa_swim_equipment_demands_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export Sales to CSV
  function handleExportSalesCSV() {
    const headers = [
      "Date",
      "Article",
      "Client Name",
      "Phone",
      "Quantity",
      "Unit Sell Price (DA)",
      "Unit Cost Price (DA)",
      "Total Sell Price (DA)",
      "Total Profit (DA)",
      "Notes",
    ];
    const rows = filteredSales.map((s) => [
      new Date(s.soldAt).toLocaleDateString("fr-DZ"),
      s.article,
      `"${s.clientName.replace(/"/g, '""')}"`,
      `"${s.clientPhone}"`,
      s.quantity,
      s.sellPrice,
      s.costPrice,
      s.sellPrice * s.quantity,
      (s.sellPrice - s.costPrice) * s.quantity,
      `"${(s.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `aqa_swim_equipment_sales_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Top Profit & Financial Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalRevenue")}
          value={formatDA(totalRevenue)}
          animated
          hint={`${salesStats.totalUnitsSold} ${t("totalUnits")}`}
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label={t("totalCost")}
          value={formatDA(totalCost)}
          animated
          hint="Cout de revient / stock"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          }
        />
        <StatCard
          label={t("totalProfit")}
          value={formatDA(totalProfit)}
          animated
          hint={`${t("marginRate")}: ${profitMarginPercent}%`}
          trend={
            totalProfit > 0
              ? { value: profitMarginPercent, label: "Marge brute" }
              : undefined
          }
          icon={
            <svg
              className="h-5 w-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
        />
        <StatCard
          label={t("demandsTitle")}
          value={equipmentDemands.length}
          animated
          hint="Prospects ayant demande un pack"
          icon={
            <svg
              className="h-5 w-5 text-cyan-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          }
        />
      </div>

      {/* Article Profit Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {EQUIPMENT_ARTICLES.map((article) => {
          const stats = salesStats.byArticle[article.id] || {
            revenue: 0,
            cost: 0,
            profit: 0,
            units: 0,
          };
          const margin =
            stats.revenue > 0
              ? Math.round((stats.profit / stats.revenue) * 100)
              : 0;

          return (
            <div
              key={article.id}
              className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/40 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {article.label}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                  {stats.units} vendus
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Ventes
                  </span>
                  <span className="font-mono font-semibold text-white">
                    {formatDA(stats.revenue)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Bénéfice Net
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatDA(stats.profit)}
                  </span>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Marge: {margin}%</span>
                <span>Cout: {formatDA(stats.cost)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* View Switcher Bar & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex flex-wrap bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] gap-1">
          <button
            onClick={() => setViewMode("demands")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              viewMode === "demands"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>{t("demandsTitle")}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-950 text-sky-300 border border-sky-800/40 font-mono">
              {equipmentDemands.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode("sales")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              viewMode === "sales"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>{t("salesTitle")}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-mono">
              {sales.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={
              viewMode === "demands"
                ? handleExportDemandsCSV
                : handleExportSalesCSV
            }
          >
            Exporter CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenFreshSaleModal}
          >
            {t("addSaleBtn")}
          </Button>
        </div>
      </div>

      {/* ── VIEW 1: EQUIPMENT DEMANDS FROM LEADS ── */}
      {viewMode === "demands" && (
        <div className="space-y-4">
          {/* Demands Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Rechercher par nom, telephone..."
                value={demandSearch}
                onChange={(e) => setDemandSearch(e.target.value)}
              />
            </div>

            <select
              value={demandArticleFilter}
              onChange={(e) => setDemandArticleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Tous les articles</option>
              <option value="goggles">Lunettes Pro</option>
              <option value="cap">Bonnet Silicone</option>
              <option value="swimsuit">Maillot / Jammer</option>
            </select>

            <select
              value={demandStatusFilter}
              onChange={(e) => setDemandStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente (Pending)</option>
              <option value="called">Appelé (Called)</option>
              <option value="confirmed">Confirmé (Confirmed)</option>
            </select>

            <span className="text-xs text-[var(--muted)] ml-auto">
              Affichage de {filteredDemands.length} sur {equipmentDemands.length}{" "}
              demandes
            </span>
          </div>

          {/* Demands Table */}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Telephone</th>
                  <th className="py-3 px-4">Pack & Articles Demandes</th>
                  <th className="py-3 px-4">Taille / Notes</th>
                  <th className="py-3 px-4">Statut Inscription</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDemands.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-slate-400"
                    >
                      {t("noDemands")}
                    </td>
                  </tr>
                ) : (
                  filteredDemands.map((lead) => {
                    const articles =
                      lead.details?.equipment.articles || [];
                    const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
                    const waPhone = cleanPhone.startsWith("0")
                      ? `213${cleanPhone.slice(1)}`
                      : cleanPhone;

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-white">
                          <div>{lead.fullName}</div>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {lead.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          <a
                            href={`tel:${lead.phone}`}
                            className="hover:text-cyan-400"
                          >
                            {lead.phone}
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {articles.length === 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-950/70 text-cyan-300 border border-cyan-800/30">
                                Pack Complet
                              </span>
                            ) : (
                              articles.map((art) => (
                                <span
                                  key={art}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-cyan-300 border border-cyan-500/20"
                                >
                                  {getArticleShortLabel(art)}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {lead.details?.equipment.size ? (
                            <span className="font-semibold text-white">
                              Taille: {lead.details.equipment.size}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                          {lead.details?.equipment.notes && (
                            <div className="text-[10px] text-slate-400 italic">
                              {lead.details.equipment.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              lead.status === "confirmed"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                                : lead.status === "called"
                                ? "bg-sky-950 text-sky-300 border border-sky-800/40"
                                : "bg-amber-950 text-amber-300 border border-amber-800/40"
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                                `Salam ${lead.fullName}, nous vous contactons concernant votre demande de pack équipement natation AQA Sports.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-800/40 text-[11px] font-semibold"
                            >
                              WhatsApp
                            </a>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleOpenSaleForLead(lead)}
                            >
                              + Enregistrer Vente
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
      )}

      {/* ── VIEW 2: RECORDED SALES & PROFIT CALCULATOR ── */}
      {viewMode === "sales" && (
        <div className="space-y-4">
          {/* Sales Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Rechercher par client, telephone..."
                value={saleSearch}
                onChange={(e) => setSaleSearch(e.target.value)}
              />
            </div>

            <select
              value={saleArticleFilter}
              onChange={(e) => setSaleArticleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Tous les articles</option>
              <option value="goggles">Lunettes Pro</option>
              <option value="cap">Bonnet Silicone</option>
              <option value="swimsuit">Maillot / Jammer</option>
            </select>

            <span className="text-xs text-[var(--muted)] ml-auto">
              Affichage de {filteredSales.length} sur {sales.length} ventes
            </span>
          </div>

          {/* Sales Table */}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4 text-center">Qte</th>
                  <th className="py-3 px-4 text-right">Prix Vente</th>
                  <th className="py-3 px-4 text-right">Cout Achat</th>
                  <th className="py-3 px-4 text-right">Bénéfice Net</th>
                  <th className="py-3 px-4 text-center">Marge</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingSales ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-12 text-center text-slate-400 animate-pulse"
                    >
                      Chargement des ventes...
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-12 text-center text-slate-400"
                    >
                      {t("noSales")}
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const lineRevenue = sale.sellPrice * sale.quantity;
                    const lineCost = sale.costPrice * sale.quantity;
                    const lineProfit = lineRevenue - lineCost;
                    const lineMargin =
                      lineRevenue > 0
                        ? Math.round((lineProfit / lineRevenue) * 100)
                        : 0;

                    return (
                      <tr
                        key={sale.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(sale.soldAt).toLocaleDateString("fr-DZ")}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          <span className="capitalize">
                            {getArticleLabel(
                              sale.article as EquipmentArticleId
                            ) || sale.article}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">
                            {sale.clientName}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {sale.clientPhone}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-white">
                          {sale.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {formatDA(lineRevenue)}
                          {sale.quantity > 1 && (
                            <div className="text-[10px] text-slate-500">
                              {formatDA(sale.sellPrice)} / u
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {formatDA(lineCost)}
                          {sale.quantity > 1 && (
                            <div className="text-[10px] text-slate-500">
                              {formatDA(sale.costPrice)} / u
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          +{formatDA(lineProfit)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              lineMargin >= 50
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                                : lineMargin >= 25
                                ? "bg-cyan-950 text-cyan-300 border border-cyan-800/40"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {lineMargin}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDeleteTarget(sale)}
                            className="px-2 py-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 text-[11px] transition-colors"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: RECORD EQUIPMENT SALE ── */}
      {showAddSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-[var(--border)] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-base text-white">
                {t("modalAddTitle")}
              </h3>
              <button
                onClick={() => setShowAddSaleModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSale} className="p-5 space-y-4">
              {saleError && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs">
                  {saleError}
                </div>
              )}

              {/* Article Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t("inputArticle")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EQUIPMENT_ARTICLES.map((art) => (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => handleArticleChange(art.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${
                        saleArticle === art.id
                          ? "bg-cyan-950/70 text-cyan-300 border-cyan-500 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                          : "bg-slate-800/60 text-slate-400 border-white/5 hover:text-white"
                      }`}
                    >
                      {art.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("inputClientName")}
                  </label>
                  <input
                    type="text"
                    required
                    value={saleClientName}
                    onChange={(e) => setSaleClientName(e.target.value)}
                    placeholder="ex. Mohamed Benali"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("inputClientPhone")}
                  </label>
                  <input
                    type="text"
                    required
                    value={saleClientPhone}
                    onChange={(e) => setSaleClientPhone(e.target.value)}
                    placeholder="ex. 0555123456"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              {/* Quantity, Sell Price, Cost Price */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("inputQuantity")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={saleQuantity}
                    onChange={(e) =>
                      setSaleQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prix Vente (DA/u)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={saleSellPrice}
                    onChange={(e) =>
                      setSaleSellPrice(
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Cout Achat (DA/u)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={saleCostPrice}
                    onChange={(e) =>
                      setSaleCostPrice(
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono text-right"
                  />
                </div>
              </div>

              {/* Live Profit Calculation Preview Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Calcul du Bénéfice Net
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    ({saleSellPrice} - {saleCostPrice}) x {saleQuantity}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-emerald-400">
                    +{formatDA(modalTotalProfit)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Marge: {modalMarginPercent}%
                  </div>
                </div>
              </div>

              {/* Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("inputSoldAt")}
                  </label>
                  <input
                    type="date"
                    value={saleSoldAt}
                    onChange={(e) => setSaleSoldAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("inputNotes")}
                  </label>
                  <input
                    type="text"
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    placeholder="ex. Taille L, regle en especes"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddSaleModal(false)}
                >
                  {t("cancelBtn")}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingSale}
                >
                  {submittingSale ? t("savingBtn") : t("saveBtn")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRM DELETE SALE ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-[var(--border)] shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-base text-white">
              Confirmer la suppression
            </h3>
            <p className="text-xs text-slate-300">
              Voulez-vous vraiment supprimer cet enregistrement de vente pour{" "}
              <span className="font-semibold text-white">
                {deleteTarget.clientName}
              </span>{" "}
              ({deleteTarget.article}) ? Cette action est irreversible.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteTarget(null)}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={deletingSale}
                onClick={handleDeleteSale}
              >
                {deletingSale ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
