"use client";

import React, { useId, useMemo, useState } from "react";
import { Badge, Button } from "@/components/admin/ui";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_SIZES,
  type EquipmentCategory,
  formatDA,
  formatSaleNotes,
  parseArticleDescription,
  parseIntegerInput,
  parseSaleNotes,
  SALE_FULFILLMENT_STATUSES,
  SALE_PAYMENT_METHODS,
  type SaleFulfillmentStatus,
  type SalePaymentMethod,
  saleDateKey,
  toDateInputValue,
} from "@/lib/swim-equipment-utils";
import {
  MAX_SALE_QUANTITY,
  MAX_UNIT_PRICE_DA,
  PHONE_REGEX,
} from "@/lib/swim-equipment-validation";
import { resolveFormulaTier } from "@/lib/swim-perks";
import { FIELD_CLASS, LABEL_CLASS, ModalShell } from "./ModalShell";
import type {
  CatalogArticle,
  EquipmentSaleItem,
  SalePrefill,
  SwimLeadItem,
  SwimMemberForStore,
  TranslateFn,
} from "./types";

interface SaleFormModalProps {
  articles: CatalogArticle[];
  leads: SwimLeadItem[];
  members?: SwimMemberForStore[];
  existing?: EquipmentSaleItem | null;
  prefill?: SalePrefill | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  t: TranslateFn;
}

interface CartLine {
  key: string;
  articleCode: string;
  size: string;
  quantity: string;
  sellPrice: string;
  costPrice: string;
}

type LookupSource = "all" | "members" | "demands" | "walkin";

function hasEquipmentDemand(lead: SwimLeadItem): boolean {
  const equipment = lead.details?.equipment;
  return Boolean(equipment?.hasPack) || (equipment?.articles?.length ?? 0) > 0;
}

function makeLineKey(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildBundleId(): string {
  return `bnd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function SaleFormModal({
  articles,
  leads,
  members = [],
  existing,
  prefill,
  onClose,
  onSaved,
  t,
}: SaleFormModalProps) {
  const formId = useId();
  const isEdit = Boolean(existing);

  const parsedExisting = useMemo(
    () => (existing ? parseSaleNotes(existing.notes) : null),
    [existing]
  );

  const activeArticles = useMemo(() => articles.filter((a) => a.active), [articles]);

  // When editing, keep the sale's current article selectable even if deactivated or legacy.
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

  const parsedArticleMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof parseArticleDescription>>();
    for (const art of selectableArticles) {
      map.set(art.code, parseArticleDescription(art.description, art.code));
    }
    return map;
  }, [selectableArticles]);

  const articleByCode = useMemo(() => {
    const map = new Map<string, CatalogArticle>();
    for (const art of selectableArticles) {
      map.set(art.code, art);
    }
    return map;
  }, [selectableArticles]);

  function createCartLine(article: CatalogArticle, size?: string | null): CartLine {
    const parsedMeta = parsedArticleMap.get(article.code)?.meta;
    const defaultSize =
      size && size.trim()
        ? size.trim()
        : parsedMeta?.sizes && parsedMeta.sizes.length === 1
        ? parsedMeta.sizes[0]
        : "";
    return {
      key: makeLineKey(),
      articleCode: article.code,
      size: defaultSize,
      quantity: "1",
      sellPrice: String(prefill?.isFreePack ? 0 : article.defaultSellPrice),
      costPrice: String(article.defaultCostPrice),
    };
  }

  const initialCartLines = useMemo<CartLine[]>(() => {
    if (existing && parsedExisting) {
      const listSell =
        parsedExisting.meta.discountDA &&
        parsedExisting.meta.discountDA > 0 &&
        parsedExisting.meta.listUnitPriceDA !== undefined
          ? parsedExisting.meta.listUnitPriceDA
          : existing.sellPrice;
      return [
        {
          key: "edit-line-0",
          articleCode: existing.article,
          size: parsedExisting.meta.size || "",
          quantity: String(existing.quantity),
          sellPrice: String(listSell),
          costPrice: String(existing.costPrice),
        },
      ];
    }

    if (prefill?.articleCodes && prefill.articleCodes.length > 0) {
      const matched = prefill.articleCodes
        .map((code) => activeArticles.find((a) => a.code === code))
        .filter((a): a is CatalogArticle => Boolean(a));
      if (matched.length > 0) {
        return matched.map((art) => createCartLine(art, prefill.size));
      }
    }

    if (prefill?.articleCode) {
      const match = activeArticles.find((a) => a.code === prefill.articleCode);
      if (match) return [createCartLine(match, prefill.size)];
    }

    if (activeArticles[0]) {
      return [createCartLine(activeArticles[0], prefill?.size)];
    }

    return [];
    // Initial state only: modal remounts on each open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client & Link state
  const [lookupSource, setLookupSource] = useState<LookupSource>("all");
  const [clientName, setClientName] = useState(existing?.clientName ?? prefill?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(existing?.clientPhone ?? prefill?.clientPhone ?? "");
  const [clientCategory, setClientCategory] = useState(
    parsedExisting?.meta.category ?? prefill?.category ?? ""
  );
  const [leadId, setLeadId] = useState(existing?.leadId ?? prefill?.leadId ?? "");
  const [memberId, setMemberId] = useState(parsedExisting?.meta.memberId ?? prefill?.memberId ?? "");
  const [swimId, setSwimId] = useState(parsedExisting?.meta.swimId ?? prefill?.swimId ?? "");
  const [suggestOpen, setSuggestOpen] = useState(false);

  // Catalog picker filters & UI mode
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<EquipmentCategory | "all">("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [clientView, setClientView] = useState(false);

  // Cart & Order fields
  const [cartLines, setCartLines] = useState<CartLine[]>(initialCartLines);
  const [discountInput, setDiscountInput] = useState(
    String(parsedExisting?.meta.discountDA ?? 0)
  );
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>(
    prefill?.isFreePack
      ? "included_pack"
      : parsedExisting?.meta.paymentMethod ?? "cash"
  );
  const [saleStatus, setSaleStatus] = useState<SaleFulfillmentStatus>(
    parsedExisting?.meta.saleStatus ?? "paid_delivered"
  );
  const [soldAt, setSoldAt] = useState(
    existing ? saleDateKey(existing.soldAt) : toDateInputValue()
  );
  const [userNotes, setUserNotes] = useState(parsedExisting?.userNotes ?? "");
  const [decrementStock, setDecrementStock] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = toDateInputValue();

  const linkedLead = useMemo(
    () => (leadId ? leads.find((l) => l.id === leadId) : undefined),
    [leadId, leads]
  );

  const linkedMember = useMemo(
    () => (memberId ? members.find((m) => m.id === memberId) : undefined),
    [memberId, members]
  );

  const memberTier = useMemo(() => {
    if (!linkedMember) return null;
    return resolveFormulaTier(linkedMember.duration, linkedMember.formula);
  }, [linkedMember]);

  const isFreePackEligible = memberTier === "gold" || memberTier === "diamond";

  // Lookup suggestions combining SwimMembers and SwimLeads
  const memberSuggestions = useMemo(() => {
    if (lookupSource === "walkin" || lookupSource === "demands") return [];
    const query = clientName.trim().toLowerCase();
    if (query.length < 2) return [];
    const digits = query.replace(/\D/g, "");
    return members
      .filter(
        (m) =>
          m.fullName.toLowerCase().includes(query) ||
          m.swimId.toLowerCase().includes(query) ||
          (digits.length >= 3 && m.phone.replace(/\D/g, "").includes(digits))
      )
      .slice(0, 5);
  }, [members, lookupSource, clientName]);

  const leadSuggestions = useMemo(() => {
    if (lookupSource === "walkin" || lookupSource === "members") return [];
    const query = clientName.trim().toLowerCase();
    if (query.length < 2) return [];
    const digits = query.replace(/\D/g, "");
    return leads
      .filter((lead) => {
        if (lookupSource === "demands" && !hasEquipmentDemand(lead)) return false;
        return (
          lead.fullName.toLowerCase().includes(query) ||
          (digits.length >= 3 && lead.phone.replace(/\D/g, "").includes(digits))
        );
      })
      .sort((a, b) => Number(hasEquipmentDemand(b)) - Number(hasEquipmentDemand(a)))
      .slice(0, 5);
  }, [leads, lookupSource, clientName]);

  const filteredCatalogArticles = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return selectableArticles.filter((art) => {
      const parsed = parsedArticleMap.get(art.code);
      if (catalogCategoryFilter !== "all" && parsed?.meta.category !== catalogCategoryFilter) {
        return false;
      }
      if (q) {
        const match =
          art.name.toLowerCase().includes(q) ||
          art.code.toLowerCase().includes(q) ||
          (parsed?.cleanDescription || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [selectableArticles, parsedArticleMap, catalogCategoryFilter, catalogSearch]);

  const hasTrackedStockInCart = useMemo(() => {
    return cartLines.some((line) => {
      const meta = parsedArticleMap.get(line.articleCode)?.meta;
      return meta?.stockQty !== null && meta?.stockQty !== undefined;
    });
  }, [cartLines, parsedArticleMap]);

  // Financial live calculations
  const totals = useMemo(() => {
    let totalUnits = 0;
    let grossSubtotal = 0;
    let totalCost = 0;
    let anyBelowCost = false;

    for (const line of cartLines) {
      const qty = parseIntegerInput(line.quantity) ?? 0;
      const sell = parseIntegerInput(line.sellPrice) ?? 0;
      const cost = parseIntegerInput(line.costPrice) ?? 0;
      totalUnits += qty;
      grossSubtotal += sell * qty;
      totalCost += cost * qty;
      if (sell < cost) anyBelowCost = true;
    }

    const rawDiscount = parseIntegerInput(discountInput) ?? 0;
    const effectiveDiscount = Math.min(rawDiscount, grossSubtotal);
    const netTotal = Math.max(0, grossSubtotal - effectiveDiscount);
    const netProfit = netTotal - totalCost;
    const marginPct = netTotal > 0 ? Math.round((netProfit / netTotal) * 100) : 0;

    return {
      totalUnits,
      grossSubtotal,
      effectiveDiscount,
      netTotal,
      totalCost,
      netProfit,
      marginPct,
      anyBelowCost: anyBelowCost || (netTotal < totalCost && paymentMethod !== "included_pack"),
    };
  }, [cartLines, discountInput, paymentMethod]);

  function handleSelectMember(member: SwimMemberForStore) {
    setMemberId(member.id);
    setSwimId(member.swimId);
    setLeadId("");
    setClientName(member.fullName);
    setClientPhone(member.phone || "");
    setClientCategory(member.category || "");
    setSuggestOpen(false);
  }

  function handleSelectLead(lead: SwimLeadItem) {
    setLeadId(lead.id);
    setMemberId("");
    setSwimId("");
    setClientName(lead.fullName);
    setClientPhone(lead.phone || "");
    setClientCategory(lead.category || "");
    setSuggestOpen(false);

    if (!isEdit && hasEquipmentDemand(lead)) {
      const reqSize = lead.details?.equipment.size || "";
      const reqCodes = lead.details?.equipment.articles || [];
      const codesToLoad = reqCodes.length > 0 ? reqCodes : ["goggles", "cap", "swimsuit"];
      const matched = codesToLoad
        .map((code) => activeArticles.find((a) => a.code === code))
        .filter((a): a is CatalogArticle => Boolean(a));
      if (matched.length > 0) {
        setCartLines(matched.map((art) => createCartLine(art, reqSize)));
      }
    }
  }

  function applyFreePack() {
    setPaymentMethod("included_pack");
    setDiscountInput("0");
    setCartLines((prev) => prev.map((line) => ({ ...line, sellPrice: "0" })));
  }

  function handleCatalogCardClick(article: CatalogArticle) {
    if (isEdit) {
      setCartLines((prev) =>
        prev.map((line, idx) =>
          idx === 0
            ? {
                ...line,
                articleCode: article.code,
                sellPrice: String(article.defaultSellPrice),
                costPrice: String(article.defaultCostPrice),
              }
            : line
        )
      );
      return;
    }

    setCartLines((prev) => {
      const existingIndex = prev.findIndex((l) => l.articleCode === article.code);
      if (existingIndex >= 0) {
        return prev.map((l, idx) => {
          if (idx !== existingIndex) return l;
          const nextQty = Math.min(MAX_SALE_QUANTITY, (parseIntegerInput(l.quantity) ?? 1) + 1);
          return { ...l, quantity: String(nextQty) };
        });
      }
      const inheritedSize = prev[0]?.size || prefill?.size || "";
      return [...prev, createCartLine(article, inheritedSize)];
    });
  }

  function applyQuickPack(codes: string[]) {
    const matched = codes
      .map((code) => activeArticles.find((a) => a.code === code))
      .filter((a): a is CatalogArticle => Boolean(a));
    if (matched.length === 0) return;

    const currentSize = cartLines[0]?.size || prefill?.size || "";
    setCartLines(matched.map((art) => createCartLine(art, currentSize)));
  }

  function updateLine(key: string, patch: Partial<CartLine>) {
    setCartLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const updated = { ...line, ...patch };
        if (patch.articleCode && patch.articleCode !== line.articleCode) {
          const art = articleByCode.get(patch.articleCode);
          if (art) {
            updated.sellPrice =
              paymentMethod === "included_pack" ? "0" : String(art.defaultSellPrice);
            updated.costPrice = String(art.defaultCostPrice);
          }
        }
        return updated;
      })
    );
  }

  function adjustLineQuantity(key: string, delta: number) {
    setCartLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const curr = parseIntegerInput(line.quantity) ?? 1;
        const next = Math.max(1, Math.min(MAX_SALE_QUANTITY, curr + delta));
        return { ...line, quantity: String(next) };
      })
    );
  }

  function removeLine(key: string) {
    setCartLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  function addBlankLine() {
    const firstUnused =
      activeArticles.find((a) => !cartLines.some((l) => l.articleCode === a.code)) ??
      activeArticles[0];
    if (!firstUnused) return;
    setCartLines((prev) => [...prev, createCartLine(firstUnused, prev[0]?.size || "")]);
  }

  function paymentMethodLabel(method: SalePaymentMethod): string {
    if (method === "cash") return t("payCash");
    if (method === "ccp") return t("payCcp");
    if (method === "card") return t("payCard");
    if (method === "transfer") return t("payTransfer");
    return t("payIncludedPack");
  }

  function saleStatusLabel(status: SaleFulfillmentStatus): string {
    if (status === "paid_delivered") return t("statusPaidDelivered");
    if (status === "paid_pending") return t("statusPaidPending");
    return t("statusReserved");
  }

  function categoryLabel(cat: EquipmentCategory | "all"): string {
    if (cat === "all") return t("catAll");
    if (cat === "goggles") return t("catGoggles");
    if (cat === "cap") return t("catCap");
    if (cat === "swimsuit") return t("catSwimsuit");
    if (cat === "fins") return t("catFins");
    if (cat === "pack") return t("catPack");
    return t("catAccessories");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const cleanName = clientName.trim();
    const cleanPhone = clientPhone.replace(/\s+/g, " ").trim();

    if (!cleanName) {
      setError(t("errClientRequired"));
      return;
    }
    if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
      setError(t("errPhoneInvalid"));
      return;
    }
    if (cartLines.length === 0) {
      setError(t("errArticleRequired"));
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

    const parsedDiscount = parseIntegerInput(discountInput);
    if (parsedDiscount === null) {
      setError(t("errPriceInvalid"));
      return;
    }

    const validatedLines: Array<{
      articleCode: string;
      size: string;
      quantity: number;
      listUnitSell: number;
      costPrice: number;
    }> = [];

    for (const line of cartLines) {
      if (!line.articleCode) {
        setError(t("errArticleRequired"));
        return;
      }
      const sellVal = parseIntegerInput(line.sellPrice);
      const costVal = parseIntegerInput(line.costPrice);
      const qtyVal = parseIntegerInput(line.quantity);

      if (
        sellVal === null ||
        sellVal > MAX_UNIT_PRICE_DA ||
        costVal === null ||
        costVal > MAX_UNIT_PRICE_DA
      ) {
        setError(t("errPriceInvalid"));
        return;
      }
      if (qtyVal === null || qtyVal < 1 || qtyVal > MAX_SALE_QUANTITY) {
        setError(t("errQuantityInvalid", { max: MAX_SALE_QUANTITY }));
        return;
      }

      validatedLines.push({
        articleCode: line.articleCode,
        size: line.size,
        quantity: qtyVal,
        listUnitSell: sellVal,
        costPrice: costVal,
      });
    }

    // Distribute flat discount proportionally across line items so stored sellPrice * qty reflects net revenue
    const grossTotal = validatedLines.reduce(
      (sum, l) => sum + l.listUnitSell * l.quantity,
      0
    );
    const totalDiscount = Math.min(parsedDiscount, grossTotal);
    const bundleId =
      !isEdit && validatedLines.length > 1
        ? buildBundleId()
        : parsedExisting?.meta.bundleId ?? null;

    let remainingDiscount = totalDiscount;

    const payloads = validatedLines.map((line, index) => {
      const lineGross = line.listUnitSell * line.quantity;
      let lineDiscount = 0;
      if (totalDiscount > 0 && grossTotal > 0) {
        if (index === validatedLines.length - 1) {
          lineDiscount = Math.min(lineGross, remainingDiscount);
        } else {
          lineDiscount = Math.min(
            lineGross,
            Math.round((lineGross / grossTotal) * totalDiscount)
          );
          remainingDiscount = Math.max(0, remainingDiscount - lineDiscount);
        }
      }

      const effectiveUnitSell =
        lineDiscount > 0
          ? Math.max(0, Math.round((lineGross - lineDiscount) / line.quantity))
          : line.listUnitSell;

      const encodedNotes = formatSaleNotes(
        {
          size: line.size || null,
          paymentMethod,
          saleStatus,
          discountDA: lineDiscount > 0 ? lineDiscount : 0,
          listUnitPriceDA: lineDiscount > 0 ? line.listUnitSell : undefined,
          memberId: memberId || null,
          swimId: swimId || null,
          category: clientCategory || null,
          bundleId,
        },
        userNotes
      );

      return {
        article: line.articleCode,
        clientName: cleanName,
        clientPhone: cleanPhone,
        leadId: leadId || null,
        sellPrice: effectiveUnitSell,
        costPrice: line.costPrice,
        quantity: line.quantity,
        notes: encodedNotes,
        soldAt,
      };
    });

    setSubmitting(true);
    setError(null);

    try {
      const isBatch = !isEdit && payloads.length > 1;
      const res = await fetch(
        isEdit ? `/api/admin/swim/equipment/${existing!.id}` : "/api/admin/swim/equipment",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit
              ? payloads[0]
              : isBatch
              ? { items: payloads, decrementStock }
              : { ...payloads[0], decrementStock }
          ),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" && data.error ? data.error : t("errorGeneric")
        );
      }

      if (isEdit) {
        onSaved(t("saleUpdatedSuccess"));
      } else if (isBatch) {
        onSaved(t("batchCreatedSuccess", { count: payloads.length }));
      } else {
        onSaved(t("createdSuccess"));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  const noArticles = selectableArticles.length === 0;
  const hasPack3 = ["goggles", "cap", "swimsuit"].every((c) =>
    activeArticles.some((a) => a.code === c)
  );
  const hasPackDuo = ["goggles", "cap"].every((c) =>
    activeArticles.some((a) => a.code === c)
  );

  return (
    <ModalShell
      title={isEdit ? t("modalEditTitle") : t("modalAddTitle")}
      closeLabel={t("closeLabel")}
      onClose={onClose}
      busy={submitting}
      maxWidth="max-w-3xl"
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setClientView((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                clientView
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                  : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              {clientView ? t("clientViewOn") : t("clientViewOff")}
            </button>
            <div className="flex items-center gap-2 ms-auto">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={submitting}
              >
                {t("cancelBtn")}
              </Button>
              {!noArticles ? (
                <Button type="submit" form={formId} variant="primary" size="sm" disabled={submitting}>
                  {submitting
                    ? t("savingBtn")
                    : isEdit
                    ? t("updateSaleBtn")
                    : cartLines.length > 1
                    ? t("saveBatchBtn", { count: cartLines.length })
                    : t("saveBtn")}
                </Button>
              ) : null}
            </div>
          </div>
        </>
      }
    >
      {noArticles ? (
        <div className="p-4 rounded-[10px] bg-[var(--warning-bg)] border border-[var(--warning)]/30 text-[var(--warning-text)] text-xs text-center">
          {t("noActiveArticles")}
        </div>
      ) : (
        <form id={formId} onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* SECTION 1: CLIENT & SWIMMER LOOKUP */}
          <div className="p-3.5 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)]/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                {t("sectionClient")}
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {(["all", "members", "demands", "walkin"] as LookupSource[]).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setLookupSource(src)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                      lookupSource === src
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)]"
                    }`}
                  >
                    {src === "all"
                      ? t("lookupAll")
                      : src === "members"
                      ? t("lookupSwimmers")
                      : src === "demands"
                      ? t("lookupDemands")
                      : t("lookupWalkin")}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5 relative">
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
                {suggestOpen && (memberSuggestions.length > 0 || leadSuggestions.length > 0) ? (
                  <ul
                    role="listbox"
                    className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-[12px] border border-[var(--border-strong,var(--border))] bg-[var(--surface)] shadow-2xl divide-y divide-[var(--border)]"
                  >
                    {memberSuggestions.map((m) => {
                      const tier = resolveFormulaTier(m.duration, m.formula);
                      return (
                        <li key={`mem-${m.id}`} role="option" aria-selected={false}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectMember(m);
                            }}
                            className="w-full text-start px-3 py-2 hover:bg-[var(--surface-2)] transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                                {m.fullName}
                              </span>
                              <span className="text-[10px] font-mono text-cyan-400 shrink-0" dir="ltr">
                                {m.swimId}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--muted)] flex items-center gap-2 mt-0.5">
                              <span className="font-mono" dir="ltr">{m.phone || "-"}</span>
                              {m.group?.name ? <span>| {m.group.name}</span> : null}
                              {tier === "gold" || tier === "diamond" ? (
                                <span className="text-amber-400 font-bold uppercase">{tier}</span>
                              ) : null}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                    {leadSuggestions.map((lead) => (
                      <li key={`lead-${lead.id}`} role="option" aria-selected={false}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectLead(lead);
                          }}
                          className="w-full text-start px-3 py-2 hover:bg-[var(--surface-2)] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                              {lead.fullName}
                            </span>
                            <span className="text-[10px] text-sky-400 font-semibold shrink-0">
                              {hasEquipmentDemand(lead) ? t("packYes") : t("leadTag")}
                            </span>
                          </div>
                          <div className="text-[10px] text-[var(--muted)] font-mono mt-0.5" dir="ltr">
                            {lead.phone || "-"}
                            {lead.details?.equipment.size ? ` | ${lead.details.equipment.size}` : ""}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="sm:col-span-4">
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

              <div className="sm:col-span-3">
                <label htmlFor={`${formId}-client-cat`} className={LABEL_CLASS}>
                  {t("inputClientCategory")}
                </label>
                <select
                  id={`${formId}-client-cat`}
                  value={clientCategory}
                  onChange={(e) => setClientCategory(e.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="">-</option>
                  <option value="homme">{t("clientCatHomme")}</option>
                  <option value="femme">{t("clientCatFemme")}</option>
                  <option value="enfants">{t("clientCatEnfants")}</option>
                  <option value="apnea">{t("clientCatApnea")}</option>
                </select>
              </div>
            </div>

            {memberId || leadId ? (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[10px] bg-[var(--info-bg)] border border-[var(--primary)]/30">
                <div className="text-xs text-[var(--info-text)] space-y-0.5">
                  <div>
                    {memberId
                      ? t("linkedSwimmer", {
                          name: linkedMember?.fullName ?? clientName,
                          id: swimId || linkedMember?.swimId || "",
                        })
                      : t("linkedLead", { name: linkedLead?.fullName ?? clientName })}
                  </div>
                  {linkedLead && hasEquipmentDemand(linkedLead) ? (
                    <div className="text-[11px] text-cyan-300">
                      {t("requestedSummary", {
                        items:
                          linkedLead.details?.equipment.articleLabels.join(", ") ||
                          t("packComplete"),
                        size: linkedLead.details?.equipment.size || "-",
                      })}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLeadId("");
                    setMemberId("");
                    setSwimId("");
                  }}
                  className="text-[11px] font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] shrink-0"
                >
                  {t("unlinkLead")}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">{t("clientLookupHint")}</p>
            )}

            {isFreePackEligible ? (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[10px] bg-amber-500/10 border border-amber-500/30">
                <span className="text-xs text-amber-200 font-semibold">
                  {t("freePackBanner", { tier: (memberTier || "").toUpperCase() })}
                </span>
                <button
                  type="button"
                  onClick={applyFreePack}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-[11px] font-bold text-amber-200 hover:bg-amber-500/30 transition-colors"
                >
                  {t("applyFreePackBtn")}
                </button>
              </div>
            ) : null}
          </div>

          {/* SECTION 2: ARTICLE CATALOG PICKER & PACK PRESETS */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                {t("inputArticle")} <span className="text-[var(--danger)]">*</span>
              </span>
              {!isEdit && (hasPack3 || hasPackDuo) ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {hasPack3 ? (
                    <button
                      type="button"
                      onClick={() => applyQuickPack(["goggles", "cap", "swimsuit"])}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 text-[11px] font-bold transition-colors"
                    >
                      {t("quickPack3")}
                    </button>
                  ) : null}
                  {hasPackDuo ? (
                    <button
                      type="button"
                      onClick={() => applyQuickPack(["goggles", "cap"])}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25 text-[11px] font-bold transition-colors"
                    >
                      {t("quickPackDuo")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder={t("searchCatalogPlaceholder")}
                className="px-3 py-1.5 rounded-[10px] bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-slate-500 focus:outline-none focus:border-[var(--primary)] w-full sm:w-52"
              />
              <div className="flex flex-wrap items-center gap-1">
                {(["all", ...EQUIPMENT_CATEGORIES] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatalogCategoryFilter(cat)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                      catalogCategoryFilter === cat
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {categoryLabel(cat)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pe-1">
              {filteredCatalogArticles.map((article) => {
                const selectedQty = cartLines
                  .filter((l) => l.articleCode === article.code)
                  .reduce((s, l) => s + (parseIntegerInput(l.quantity) ?? 0), 0);
                const selected = selectedQty > 0;
                const parsed = parsedArticleMap.get(article.code);
                const stock = parsed?.meta.stockQty;
                const alertAt = parsed?.meta.minStockAlert ?? 5;

                return (
                  <button
                    key={article.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleCatalogCardClick(article)}
                    className={`p-2.5 rounded-[10px] border text-start transition-all ${
                      selected
                        ? "bg-[var(--primary-light)] text-[var(--foreground)] border-[var(--primary)] shadow-[var(--shadow-glow)]"
                        : "bg-[var(--surface-2)]/60 text-[var(--muted)] border-[var(--border)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="font-bold text-xs truncate">{article.name}</div>
                      {selected ? (
                        <Badge tone="primary" size="sm">x{selectedQty}</Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <span className="text-[11px] text-[var(--success)] font-mono" dir="ltr">
                        {formatDA(article.defaultSellPrice)}
                      </span>
                      {stock !== null && stock !== undefined ? (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            stock === 0
                              ? "bg-red-500/20 text-red-300"
                              : stock <= alertAt
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-emerald-500/15 text-emerald-300"
                          }`}
                        >
                          {t("stockBadgeShort", { count: stock })}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: CART LINES */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                {t("cartLinesTitle", { count: cartLines.length })}
              </span>
              {!isEdit ? (
                <button
                  type="button"
                  onClick={addBlankLine}
                  className="text-[11px] font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
                >
                  {t("addLineBtn")}
                </button>
              ) : null}
            </div>

            <div className="space-y-2">
              {cartLines.map((line) => {
                const art = articleByCode.get(line.articleCode);
                const parsedArt = parsedArticleMap.get(line.articleCode);
                const artSizes = parsedArt?.meta.sizes || [];
                const sizeChoices = Array.from(
                  new Set([...artSizes, ...EQUIPMENT_SIZES, ...(line.size ? [line.size] : [])])
                );
                const lineQty = parseIntegerInput(line.quantity) ?? 0;
                const lineSell = parseIntegerInput(line.sellPrice) ?? 0;
                const lineCost = parseIntegerInput(line.costPrice) ?? 0;
                const lineRevenue = lineQty * lineSell;
                const lineProfit = lineRevenue - lineQty * lineCost;
                const lineMargin =
                  lineRevenue > 0 ? Math.round((lineProfit / lineRevenue) * 100) : 0;

                return (
                  <div
                    key={line.key}
                    className="p-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)]/50 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <select
                        value={line.articleCode}
                        onChange={(e) => updateLine(line.key, { articleCode: e.target.value })}
                        aria-label={t("inputArticle")}
                        className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-bold text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                      >
                        {selectableArticles.map((opt) => (
                          <option key={opt.id} value={opt.code}>
                            {opt.name} ({opt.code})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--accent,#00f2ff)]" dir="ltr">
                          {formatDA(lineRevenue)}
                        </span>
                        {!clientView ? (
                          <span
                            className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${
                              lineProfit < 0
                                ? "bg-red-500/15 text-red-300"
                                : "bg-emerald-500/15 text-emerald-300"
                            }`}
                            dir="ltr"
                          >
                            {lineProfit >= 0 ? "+" : ""}
                            {formatDA(lineProfit)} ({lineMargin}%)
                          </span>
                        ) : null}
                        {!isEdit && cartLines.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeLine(line.key)}
                            aria-label={t("removeLineBtn")}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--muted)] mb-1">
                          {t("colSize")}
                        </label>
                        <select
                          value={line.size}
                          onChange={(e) => updateLine(line.key, { size: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                        >
                          <option value="">{t("sizeUnspecified")}</option>
                          {sizeChoices.map((sz) => (
                            <option key={sz} value={sz}>
                              {sz}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--muted)] mb-1">
                          {t("inputQuantity")}
                        </label>
                        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => adjustLineQuantity(line.key, -1)}
                            className="px-2.5 py-1.5 text-xs font-bold text-[var(--muted)] hover:text-white hover:bg-[var(--surface-2)]"
                          >
                            -
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.key, {
                                quantity: e.target.value.replace(/[^\d]/g, ""),
                              })
                            }
                            className="w-full text-center bg-transparent text-xs font-mono text-[var(--foreground)] focus:outline-none py-1.5"
                          />
                          <button
                            type="button"
                            onClick={() => adjustLineQuantity(line.key, 1)}
                            className="px-2.5 py-1.5 text-xs font-bold text-[var(--muted)] hover:text-white hover:bg-[var(--surface-2)]"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-[var(--muted)] mb-1">
                          {t("inputSellPrice")}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          dir="ltr"
                          value={line.sellPrice}
                          onChange={(e) =>
                            updateLine(line.key, {
                              sellPrice: e.target.value.replace(/[^\d]/g, ""),
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-end text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                        />
                      </div>

                      {!clientView ? (
                        <div>
                          <label className="block text-[10px] font-semibold text-[var(--muted)] mb-1">
                            {t("inputCostPrice")}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            value={line.costPrice}
                            onChange={(e) =>
                              updateLine(line.key, {
                                costPrice: e.target.value.replace(/[^\d]/g, ""),
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-end text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                          />
                        </div>
                      ) : (
                        <div className="flex items-end pb-1.5 text-[11px] text-[var(--muted)]">
                          {art?.name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: PAYMENT, STATUS, DISCOUNT & NOTES */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor={`${formId}-pay-method`} className={LABEL_CLASS}>
                {t("inputPaymentMethod")}
              </label>
              <select
                id={`${formId}-pay-method`}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as SalePaymentMethod)}
                className={FIELD_CLASS}
              >
                {SALE_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {paymentMethodLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={`${formId}-sale-status`} className={LABEL_CLASS}>
                {t("inputSaleStatus")}
              </label>
              <select
                id={`${formId}-sale-status`}
                value={saleStatus}
                onChange={(e) => setSaleStatus(e.target.value as SaleFulfillmentStatus)}
                className={FIELD_CLASS}
              >
                {SALE_FULFILLMENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {saleStatusLabel(st)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={`${formId}-discount`} className={LABEL_CLASS}>
                {t("inputDiscount")}
              </label>
              <input
                id={`${formId}-discount`}
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value.replace(/[^\d]/g, ""))}
                className={`${FIELD_CLASS} font-mono text-end`}
              />
            </div>

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
          </div>

          <div>
            <label htmlFor={`${formId}-notes`} className={LABEL_CLASS}>
              {t("inputNotes")}
            </label>
            <input
              id={`${formId}-notes`}
              type="text"
              maxLength={800}
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder={t("placeholderNotes")}
              className={FIELD_CLASS}
            />
          </div>

          {!isEdit && hasTrackedStockInCart ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={decrementStock}
                onChange={(e) => setDecrementStock(e.target.checked)}
                className="w-4 h-4 rounded accent-sky-500"
              />
              <span className="text-xs text-[var(--foreground)]">{t("autoDecrementStock")}</span>
            </label>
          ) : null}

          {totals.anyBelowCost ? (
            <p className="text-xs text-[var(--warning-text)]">{t("warnLoss")}</p>
          ) : null}

          {/* SECTION 5: LIVE SUMMARY */}
          <div className="p-4 rounded-[14px] bg-gradient-to-r from-[var(--surface)] via-[var(--surface-2)] to-[var(--primary-light)] border border-[var(--primary)]/30 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">
                  {t("totalDue")} ({t("unitsSoldHint", { count: totals.totalUnits })})
                </div>
                {totals.effectiveDiscount > 0 ? (
                  <div className="text-xs text-[var(--muted)] mt-0.5 font-mono" dir="ltr">
                    {formatDA(totals.grossSubtotal)} - {formatDA(totals.effectiveDiscount)}
                  </div>
                ) : null}
              </div>
              <div className="text-2xl font-extrabold font-mono text-[var(--accent,#00f2ff)]" dir="ltr">
                {formatDA(totals.netTotal)}
              </div>
            </div>

            {!clientView ? (
              <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-[var(--muted)] font-mono" dir="ltr">
                  {t("totalCost")}: <span className="text-[var(--foreground)] font-semibold">{formatDA(totals.totalCost)}</span>
                </div>
                <div className="flex items-center gap-2 font-mono" dir="ltr">
                  <span className="text-[var(--muted)]">{t("totalProfit")}:</span>
                  <span
                    className={`font-bold ${
                      totals.netProfit < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
                    }`}
                  >
                    {totals.netProfit >= 0 ? "+" : ""}
                    {formatDA(totals.netProfit)}
                  </span>
                  <Badge tone={totals.marginPct < 0 ? "danger" : "success"} size="sm">
                    {totals.marginPct}%
                  </Badge>
                </div>
              </div>
            ) : null}
          </div>
        </form>
      )}
    </ModalShell>
  );
}
