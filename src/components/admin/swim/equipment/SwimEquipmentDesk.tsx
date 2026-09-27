"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button, Input, StatCard } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";
import { SwimLeadDetails } from "@/lib/swim-lead-details";

function formatDA(amount: number): string {
  return `${amount.toLocaleString("fr-DZ")} DA`;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface CatalogArticle {
  id: string;
  name: string;
  code: string;
  description: string | null;
  defaultSellPrice: number;
  defaultCostPrice: number;
  active: boolean;
  createdAt: string;
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

interface SwimEquipmentDeskProps {
  leads: SwimLeadItem[];
  onRefreshLeads?: () => Promise<void> | void;
}

// ── Article Form Modal ───────────────────────────────────────────────────────

interface ArticleFormModalProps {
  existing?: CatalogArticle | null;
  onClose: () => void;
  onSaved: () => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

function ArticleFormModal({
  existing,
  onClose,
  onSaved,
  t,
}: ArticleFormModalProps) {
  const [name, setName] = useState(existing?.name || "");
  const [code, setCode] = useState(existing?.code || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [defaultSellPrice, setDefaultSellPrice] = useState(
    existing?.defaultSellPrice ?? 0
  );
  const [defaultCostPrice, setDefaultCostPrice] = useState(
    existing?.defaultCostPrice ?? 0
  );
  const [active, setActive] = useState(existing?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(existing);

  function autoSlug(val: string) {
    return val
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError("Nom et code sont obligatoires.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const url = isEdit
        ? `/api/admin/swim/equipment/articles/${existing!.id}`
        : "/api/admin/swim/equipment/articles";

      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? { name: name.trim(), description: description.trim() || null, defaultSellPrice, defaultCostPrice, active }
        : { name: name.trim(), code: code.trim(), description: description.trim() || null, defaultSellPrice, defaultCostPrice, active };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save article");
      }

      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  const modalUnitProfit = defaultSellPrice - defaultCostPrice;
  const modalMarginPct =
    defaultSellPrice > 0
      ? Math.round((modalUnitProfit / defaultSellPrice) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-[var(--border)] shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-base text-white">
            {isEdit ? t("modalEditArticleTitle") : t("modalAddArticleTitle")}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t("inputName")} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!isEdit) setCode(autoSlug(e.target.value));
              }}
              placeholder="ex. Lunettes Pro UV400"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Code — only editable on create */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t("inputCode")} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              readOnly={isEdit}
              value={code}
              onChange={(e) => setCode(autoSlug(e.target.value))}
              placeholder="ex. lunettes-pro-uv400"
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none font-mono ${
                isEdit
                  ? "bg-slate-800/40 border-white/5 text-slate-500 cursor-not-allowed"
                  : "bg-slate-800 border-white/10 text-white placeholder-slate-500 focus:border-cyan-400"
              }`}
            />
            <p className="text-[10px] text-slate-500 mt-0.5">{t("inputCodeHint")}</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t("inputDescription")}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex. Protection UV, anti-buee, taille reglable"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t("inputDefaultSellPrice")}
              </label>
              <input
                type="number"
                min="0"
                value={defaultSellPrice}
                onChange={(e) =>
                  setDefaultSellPrice(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono text-right"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t("inputDefaultCostPrice")}
              </label>
              <input
                type="number"
                min="0"
                value={defaultCostPrice}
                onChange={(e) =>
                  setDefaultCostPrice(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono text-right"
              />
            </div>
          </div>

          {/* Live margin preview */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Marge par Defaut
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {defaultSellPrice} - {defaultCostPrice} = {modalUnitProfit} DA
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-bold font-mono text-emerald-400">
                {modalMarginPct}%
              </div>
              <div className="text-[10px] text-slate-400">Marge brute</div>
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded accent-cyan-500"
            />
            <span className="text-xs text-slate-300">{t("inputActive")}</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("cancelBtn")}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? t("savingArticleBtn") : t("saveArticleBtn")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Sale Modal ───────────────────────────────────────────────────────────

interface AddSaleModalProps {
  articles: CatalogArticle[];
  leads: SwimLeadItem[];
  prefill?: {
    clientName: string;
    clientPhone: string;
    leadId: string;
    articleCode: string;
  } | null;
  onClose: () => void;
  onSaved: () => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

function AddSaleModal({
  articles,
  leads,
  prefill,
  onClose,
  onSaved,
  t,
}: AddSaleModalProps) {
  const activeArticles = articles.filter((a) => a.active);

  const initial = prefill?.articleCode
    ? activeArticles.find((a) => a.code === prefill.articleCode) || activeArticles[0] || null
    : activeArticles[0] || null;

  const [selectedArticleId, setSelectedArticleId] = useState<string>(
    initial?.id || ""
  );
  const [clientName, setClientName] = useState(prefill?.clientName || "");
  const [clientPhone, setClientPhone] = useState(prefill?.clientPhone || "");
  const [leadId, setLeadId] = useState(prefill?.leadId || "");
  const [sellPrice, setSellPrice] = useState(initial?.defaultSellPrice ?? 0);
  const [costPrice, setCostPrice] = useState(initial?.defaultCostPrice ?? 0);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [soldAt, setSoldAt] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedArticle = articles.find((a) => a.id === selectedArticleId);

  function handleArticleChange(id: string) {
    setSelectedArticleId(id);
    const art = articles.find((a) => a.id === id);
    if (art) {
      setSellPrice(art.defaultSellPrice);
      setCostPrice(art.defaultCostPrice);
    }
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedArticleId || !clientName.trim() || !clientPhone.trim()) {
      setError("Article, nom et telephone sont obligatoires.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/swim/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article: selectedArticle?.code || selectedArticleId,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          leadId: leadId || null,
          sellPrice: Number(sellPrice),
          costPrice: Number(costPrice),
          quantity: Number(quantity),
          notes: notes.trim() || null,
          soldAt,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to record sale");
      }

      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-[var(--border)] shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <h3 className="font-bold text-base text-white">{t("modalAddTitle")}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs">
              {error}
            </div>
          )}

          {activeArticles.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs text-center">
              Aucun article actif dans le catalogue. Ajoutez d&apos;abord un article dans l&apos;onglet &quot;Catalogue Articles&quot;.
            </div>
          ) : (
            <>
              {/* Article picker — dynamic grid from catalog */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t("inputArticle")} <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {activeArticles.map((art) => (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => handleArticleChange(art.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                        selectedArticleId === art.id
                          ? "bg-cyan-950/70 text-cyan-300 border-cyan-500 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                          : "bg-slate-800/60 text-slate-400 border-white/5 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-xs truncate">{art.name}</div>
                      <div className="font-mono text-[10px] mt-0.5 text-slate-500">
                        {art.code}
                      </div>
                      <div className="text-[10px] mt-1 text-emerald-400 font-mono">
                        {formatDA(art.defaultSellPrice)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Client info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("inputClientName")} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="ex. Mohamed Benali"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("inputClientPhone")} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="ex. 0555123456"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              {/* Optional lead link */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t("inputLinkLead")}
                </label>
                <select
                  value={leadId}
                  onChange={(e) => {
                    setLeadId(e.target.value);
                    if (e.target.value) {
                      const l = leads.find((ld) => ld.id === e.target.value);
                      if (l) {
                        setClientName(l.fullName);
                        setClientPhone(l.phone);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  <option value="">{t("inputNoLead")}</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName} — {l.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity + Unit Selling Price (Client-Facing: No Cost or Profit Shown) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("inputQuantity")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("inputSellPrice")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={sellPrice}
                    onChange={(e) =>
                      setSellPrice(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-mono text-right"
                  />
                </div>
              </div>

              {/* Total Due Banner (Client-Facing, no internal margins or costs shown) */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950/40 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {t("totalDue")}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {quantity} x {formatDA(sellPrice)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold font-mono text-cyan-400">
                    {formatDA(sellPrice * quantity)}
                  </div>
                </div>
              </div>

              {/* Date + Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("inputSoldAt")}
                  </label>
                  <input
                    type="date"
                    value={soldAt}
                    onChange={(e) => setSoldAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("inputNotes")}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ex. Taille L, regle en especes"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <Button type="button" variant="secondary" onClick={onClose}>
                  {t("cancelBtn")}
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? t("savingBtn") : t("saveBtn")}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Main SwimEquipmentDesk ────────────────────────────────────────────────────

export function SwimEquipmentDesk({
  leads,
  onRefreshLeads,
}: SwimEquipmentDeskProps) {
  const { t } = useTranslations("swimEquipment");

  // View: "demands" | "sales" | "catalog"
  const [viewMode, setViewMode] = useState<"demands" | "sales" | "catalog">("demands");

  // Article catalog state
  const [articles, setArticles] = useState<CatalogArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<CatalogArticle | null>(null);
  const [deleteArticleTarget, setDeleteArticleTarget] = useState<CatalogArticle | null>(null);
  const [deletingArticle, setDeletingArticle] = useState(false);

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

  // Sale modal
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [salePrefill, setSalePrefill] = useState<{
    clientName: string;
    clientPhone: string;
    leadId: string;
    articleCode: string;
  } | null>(null);

  // Delete sale
  const [deleteSaleTarget, setDeleteSaleTarget] = useState<EquipmentSaleItem | null>(null);
  const [deletingSale, setDeletingSale] = useState(false);

  // Filters
  const [demandSearch, setDemandSearch] = useState("");
  const [demandStatusFilter, setDemandStatusFilter] = useState("all");
  const [saleSearch, setSaleSearch] = useState("");
  const [saleArticleFilter, setSaleArticleFilter] = useState("all");

  // Load articles
  const loadArticles = useCallback(async () => {
    setLoadingArticles(true);
    try {
      const res = await fetch("/api/admin/swim/equipment/articles");
      if (res.ok) {
        const data = await res.json();
        setArticles(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load articles:", err);
    } finally {
      setLoadingArticles(false);
    }
  }, []);

  // Load sales
  const loadSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      const res = await fetch("/api/admin/swim/equipment");
      if (res.ok) {
        const data = await res.json();
        setSales(Array.isArray(data.sales) ? data.sales : []);
        if (data.stats) setSalesStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load sales:", err);
    } finally {
      setLoadingSales(false);
    }
  }, []);

  useEffect(() => {
    loadArticles();
    loadSales();
  }, [loadArticles, loadSales]);

  // Delete article
  async function handleDeleteArticle() {
    if (!deleteArticleTarget) return;
    setDeletingArticle(true);
    try {
      const res = await fetch(
        `/api/admin/swim/equipment/articles/${deleteArticleTarget.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDeleteArticleTarget(null);
        await loadArticles();
      }
    } catch (err) {
      console.error("Failed to delete article:", err);
    } finally {
      setDeletingArticle(false);
    }
  }

  // Delete sale
  async function handleDeleteSale() {
    if (!deleteSaleTarget) return;
    setDeletingSale(true);
    try {
      const res = await fetch(
        `/api/admin/swim/equipment/${deleteSaleTarget.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDeleteSaleTarget(null);
        await loadSales();
      }
    } catch (err) {
      console.error("Failed to delete sale:", err);
    } finally {
      setDeletingSale(false);
    }
  }

  // Toggle article active
  async function handleToggleActive(article: CatalogArticle) {
    try {
      await fetch(`/api/admin/swim/equipment/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !article.active }),
      });
      await loadArticles();
    } catch (err) {
      console.error("Failed to toggle article:", err);
    }
  }

  // Prefill sale from demand row
  function handleOpenSaleForLead(lead: SwimLeadItem) {
    const firstArticleCode = lead.details?.equipment.articles?.[0] || "";
    setSalePrefill({
      clientName: lead.fullName,
      clientPhone: lead.phone,
      leadId: lead.id,
      articleCode: firstArticleCode,
    });
    setShowAddSaleModal(true);
  }

  // Open blank sale modal
  function handleOpenFreshSale() {
    setSalePrefill(null);
    setShowAddSaleModal(true);
  }

  // Demand filter: leads with equipment packs
  const equipmentDemands = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    return leads.filter(
      (l) =>
        Boolean(l?.details?.equipment?.hasPack) ||
        (Array.isArray(l?.details?.equipment?.articles) &&
          l.details.equipment.articles.length > 0)
    );
  }, [leads]);

  const filteredDemands = useMemo(() => {
    return equipmentDemands.filter((l) => {
      const q = demandSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        l.fullName.toLowerCase().includes(q) ||
        l.phone.includes(q);
      const matchStatus =
        demandStatusFilter === "all" || l.status === demandStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [equipmentDemands, demandSearch, demandStatusFilter]);

  // Sales filter
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = saleSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.clientName.toLowerCase().includes(q) ||
        s.clientPhone.includes(q) ||
        s.article.toLowerCase().includes(q);
      const matchArticle =
        saleArticleFilter === "all" || s.article === saleArticleFilter;
      return matchSearch && matchArticle;
    });
  }, [sales, saleSearch, saleArticleFilter]);

  const totalProfit = salesStats.totalProfit;
  const totalRevenue = salesStats.totalSalesRevenue;
  const profitMarginPct =
    totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  // Map article code → display name
  const articleNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    articles.forEach((a) => {
      m[a.code] = a.name;
    });
    return m;
  }, [articles]);

  // Get all unique article codes present in sales (for filter)
  const saleArticleCodes = useMemo(() => {
    const codes = new Set(sales.map((s) => s.article));
    return Array.from(codes);
  }, [sales]);

  // Export demands CSV
  function handleExportDemandsCSV() {
    const headers = ["Client", "Phone", "Category", "Status", "Articles", "Date"];
    const rows = filteredDemands.map((d) => [
      `"${d.fullName.replace(/"/g, '""')}"`,
      d.phone,
      d.category,
      d.status,
      `"${(d.details?.equipment.articles || []).join(", ")}"`,
      new Date(d.createdAt).toLocaleDateString("fr-DZ"),
    ]);
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `aqa_swim_equipment_demands_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export sales CSV
  function handleExportSalesCSV() {
    const headers = ["Date", "Article", "Client", "Phone", "Qty", "Sell (DA)", "Cost (DA)", "Total Revenue", "Total Profit", "Notes"];
    const rows = filteredSales.map((s) => [
      new Date(s.soldAt).toLocaleDateString("fr-DZ"),
      `"${(articleNameMap[s.article] || s.article).replace(/"/g, '""')}"`,
      `"${s.clientName.replace(/"/g, '""')}"`,
      s.clientPhone,
      s.quantity,
      s.sellPrice,
      s.costPrice,
      s.sellPrice * s.quantity,
      (s.sellPrice - s.costPrice) * s.quantity,
      `"${(s.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `aqa_swim_equipment_sales_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">

      {/* ── PROFIT SUMMARY STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("totalRevenue")}
          value={formatDA(salesStats.totalSalesRevenue)}
          hint={`${salesStats.totalUnitsSold} unites vendues`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("totalCost")}
          value={formatDA(salesStats.totalCost)}
          hint="Cout d'achat total"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
        <StatCard
          label={t("totalProfit")}
          value={formatDA(salesStats.totalProfit)}
          hint={`${t("marginRate")}: ${profitMarginPct}%`}
          trend={totalProfit > 0 ? { value: profitMarginPct, label: "Marge brute" } : undefined}
          icon={
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatCard
          label={t("catalogTitle")}
          value={articles.length}
          hint={`${articles.filter((a) => a.active).length} actifs`}
          icon={
            <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          }
        />
      </div>

      {/* ── PER-ARTICLE PROFIT CARDS (from sales stats) ── */}
      {Object.keys(salesStats.byArticle).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(salesStats.byArticle).map(([code, stat]) => {
            const margin = stat.revenue > 0 ? Math.round((stat.profit / stat.revenue) * 100) : 0;
            return (
              <div key={code} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md hover:border-cyan-500/40 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200 truncate">
                    {articleNameMap[code] || code}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/40 shrink-0">
                    {stat.units} vendus
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Ventes</span>
                    <span className="font-mono font-semibold text-white">{formatDA(stat.revenue)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Benefice Net</span>
                    <span className="font-mono font-bold text-emerald-400">{formatDA(stat.profit)}</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Marge: {margin}%</span>
                  <span>Cout: {formatDA(stat.cost)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB NAV + ACTIONS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex flex-wrap bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] gap-1">
          <button
            onClick={() => setViewMode("demands")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${viewMode === "demands" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:text-white hover:bg-slate-800"}`}
          >
            <span>{t("demandsTitle")}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-950 text-sky-300 border border-sky-800/40 font-mono">
              {equipmentDemands.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode("sales")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${viewMode === "sales" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:text-white hover:bg-slate-800"}`}
          >
            <span>{t("salesTitle")}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-mono">
              {sales.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode("catalog")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${viewMode === "catalog" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:text-white hover:bg-slate-800"}`}
          >
            <span>{t("tabCatalog")}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-white/10 font-mono">
              {articles.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "catalog" ? (
            <Button variant="primary" size="sm" onClick={() => { setEditingArticle(null); setShowArticleModal(true); }}>
              {t("addArticleBtn")}
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={viewMode === "demands" ? handleExportDemandsCSV : handleExportSalesCSV}>
                Exporter CSV
              </Button>
              <Button variant="primary" size="sm" onClick={handleOpenFreshSale}>
                {t("addSaleBtn")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── VIEW: DEMANDS ── */}
      {viewMode === "demands" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Rechercher par nom, telephone..."
                value={demandSearch}
                onChange={(e) => setDemandSearch(e.target.value)}
              />
            </div>
            <select
              value={demandStatusFilter}
              onChange={(e) => setDemandStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="called">Appele</option>
              <option value="confirmed">Confirme</option>
            </select>
            <span className="text-xs text-[var(--muted)] ml-auto">
              {filteredDemands.length} / {equipmentDemands.length} demandes
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Telephone</th>
                  <th className="py-3 px-4">Articles Demandes</th>
                  <th className="py-3 px-4">Taille</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDemands.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">{t("noDemands")}</td>
                  </tr>
                ) : (
                  filteredDemands.map((lead) => {
                    const articles = lead.details?.equipment.articles || [];
                    const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
                    const waPhone = cleanPhone.startsWith("0") ? `213${cleanPhone.slice(1)}` : cleanPhone;
                    return (
                      <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          <div>{lead.fullName}</div>
                          <span className="text-[10px] text-slate-400 capitalize">{lead.category}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          <a href={`tel:${lead.phone}`} className="hover:text-cyan-400">{lead.phone}</a>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {articles.length === 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-950/70 text-cyan-300 border border-cyan-800/30">Pack Complet</span>
                            ) : (
                              articles.map((code) => (
                                <span key={code} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-cyan-300 border border-cyan-500/20">
                                  {code}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {lead.details?.equipment.size
                            ? <span className="font-semibold text-white">T: {lead.details.equipment.size}</span>
                            : <span className="text-slate-500">—</span>
                          }
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            lead.status === "confirmed" ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                            : lead.status === "called" ? "bg-sky-950 text-sky-300 border border-sky-800/40"
                            : "bg-amber-950 text-amber-300 border border-amber-800/40"
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Salam ${lead.fullName}, concernant votre demande de pack equipement natation AQA Sports.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border border-emerald-800/40 text-[11px] font-semibold"
                            >
                              WhatsApp
                            </a>
                            <Button size="sm" variant="primary" onClick={() => handleOpenSaleForLead(lead)}>
                              + Vente
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

      {/* ── VIEW: SALES ── */}
      {viewMode === "sales" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Rechercher par client, article..."
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
              {saleArticleCodes.map((code) => (
                <option key={code} value={code}>{articleNameMap[code] || code}</option>
              ))}
            </select>
            <span className="text-xs text-[var(--muted)] ml-auto">
              {filteredSales.length} / {sales.length} ventes
            </span>
          </div>

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
                  <th className="py-3 px-4 text-right">Benefice Net</th>
                  <th className="py-3 px-4 text-center">Marge</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingSales ? (
                  <tr><td colSpan={9} className="py-12 text-center text-slate-400 animate-pulse">Chargement...</td></tr>
                ) : filteredSales.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-slate-400">{t("noSales")}</td></tr>
                ) : (
                  filteredSales.map((sale) => {
                    const lineRevenue = sale.sellPrice * sale.quantity;
                    const lineCost = sale.costPrice * sale.quantity;
                    const lineProfit = lineRevenue - lineCost;
                    const lineMargin = lineRevenue > 0 ? Math.round((lineProfit / lineRevenue) * 100) : 0;
                    return (
                      <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(sale.soldAt).toLocaleDateString("fr-DZ")}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          <div>{articleNameMap[sale.article] || sale.article}</div>
                          <div className="text-[10px] font-mono text-slate-500">{sale.article}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{sale.clientName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{sale.clientPhone}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-white">{sale.quantity}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {formatDA(lineRevenue)}
                          {sale.quantity > 1 && <div className="text-[10px] text-slate-500">{formatDA(sale.sellPrice)} /u</div>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {formatDA(lineCost)}
                          {sale.quantity > 1 && <div className="text-[10px] text-slate-500">{formatDA(sale.costPrice)} /u</div>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          +{formatDA(lineProfit)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            lineMargin >= 50 ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                            : lineMargin >= 25 ? "bg-cyan-950 text-cyan-300 border border-cyan-800/40"
                            : "bg-slate-800 text-slate-300"
                          }`}>
                            {lineMargin}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDeleteSaleTarget(sale)}
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

      {/* ── VIEW: ARTICLE CATALOG ── */}
      {viewMode === "catalog" && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-[var(--border)] text-xs text-slate-400">
            {t("catalogDesc")}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4">{t("colCode")}</th>
                  <th className="py-3 px-4">{t("colName")}</th>
                  <th className="py-3 px-4 text-right">{t("colDefaultSell")}</th>
                  <th className="py-3 px-4 text-right">{t("colDefaultCost")}</th>
                  <th className="py-3 px-4 text-center">{t("colMargin")}</th>
                  <th className="py-3 px-4 text-center">{t("colStatus")}</th>
                  <th className="py-3 px-4 text-right">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingArticles ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400 animate-pulse">Chargement du catalogue...</td></tr>
                ) : articles.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400">{t("noArticles")}</td></tr>
                ) : (
                  articles.map((art) => {
                    const margin = art.defaultSellPrice > 0
                      ? Math.round(((art.defaultSellPrice - art.defaultCostPrice) / art.defaultSellPrice) * 100)
                      : 0;
                    return (
                      <tr key={art.id} className={`hover:bg-slate-800/40 transition-colors ${!art.active ? "opacity-60" : ""}`}>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{art.code}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{art.name}</div>
                          {art.description && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">{art.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">{formatDA(art.defaultSellPrice)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">{formatDA(art.defaultCostPrice)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            margin >= 50 ? "bg-emerald-950 text-emerald-300 border border-emerald-800/40"
                            : margin >= 25 ? "bg-cyan-950 text-cyan-300 border border-cyan-800/40"
                            : "bg-slate-800 text-slate-300"
                          }`}>
                            {margin}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleActive(art)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                              art.active
                                ? "bg-emerald-950 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900"
                                : "bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700"
                            }`}
                          >
                            {art.active ? t("statusActive") : t("statusInactive")}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setEditingArticle(art); setShowArticleModal(true); }}
                              className="px-2 py-1 rounded text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 text-[11px] transition-colors"
                            >
                              {t("editArticleBtn")}
                            </button>
                            <button
                              onClick={() => setDeleteArticleTarget(art)}
                              className="px-2 py-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 text-[11px] transition-colors"
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
      )}

      {/* ── MODAL: ARTICLE FORM ── */}
      {showArticleModal && (
        <ArticleFormModal
          existing={editingArticle}
          onClose={() => { setShowArticleModal(false); setEditingArticle(null); }}
          onSaved={async () => {
            setShowArticleModal(false);
            setEditingArticle(null);
            await loadArticles();
          }}
          t={t}
        />
      )}

      {/* ── MODAL: CONFIRM DELETE ARTICLE ── */}
      {deleteArticleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-[var(--border)] shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-base text-white">Confirmer la suppression</h3>
            <p className="text-xs text-slate-300">
              {t("deleteArticleConfirm", { name: deleteArticleTarget.name })}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="secondary" size="sm" onClick={() => setDeleteArticleTarget(null)}>
                {t("cancelBtn")}
              </Button>
              <Button variant="danger" size="sm" disabled={deletingArticle} onClick={handleDeleteArticle}>
                {deletingArticle ? "Suppression..." : t("deleteArticleBtn")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD SALE ── */}
      {showAddSaleModal && (
        <AddSaleModal
          articles={articles}
          leads={leads}
          prefill={salePrefill}
          onClose={() => { setShowAddSaleModal(false); setSalePrefill(null); }}
          onSaved={async () => {
            setShowAddSaleModal(false);
            setSalePrefill(null);
            await loadSales();
            if (onRefreshLeads) onRefreshLeads();
          }}
          t={t}
        />
      )}

      {/* ── MODAL: CONFIRM DELETE SALE ── */}
      {deleteSaleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-[var(--border)] shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-base text-white">Confirmer la suppression</h3>
            <p className="text-xs text-slate-300">
              Supprimer la vente de{" "}
              <span className="font-semibold text-white">
                {articleNameMap[deleteSaleTarget.article] || deleteSaleTarget.article}
              </span>{" "}
              pour <span className="font-semibold text-white">{deleteSaleTarget.clientName}</span> ? Cette action est irreversible.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="secondary" size="sm" onClick={() => setDeleteSaleTarget(null)}>
                {t("cancelBtn")}
              </Button>
              <Button variant="danger" size="sm" disabled={deletingSale} onClick={handleDeleteSale}>
                {deletingSale ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
