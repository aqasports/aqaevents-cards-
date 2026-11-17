import { formatWhatsAppNumber, resolveSwimWhatsApp } from "./swim-whatsapp";

/**
 * Pure helpers for the AQA Swim equipment shop UI (filters, formatting, CSV, WhatsApp, metadata).
 * No emojis, Western Arabic numerals only.
 */

export type SalePaymentMethod =
  | "cash"
  | "ccp"
  | "card"
  | "transfer"
  | "included_pack";

export type SaleFulfillmentStatus =
  | "paid_delivered"
  | "paid_pending"
  | "reserved";

export type EquipmentCategory =
  | "goggles"
  | "cap"
  | "swimsuit"
  | "fins"
  | "accessories"
  | "pack";

export const SALE_PAYMENT_METHODS: readonly SalePaymentMethod[] = [
  "cash",
  "ccp",
  "card",
  "transfer",
  "included_pack",
] as const;

export const SALE_FULFILLMENT_STATUSES: readonly SaleFulfillmentStatus[] = [
  "paid_delivered",
  "paid_pending",
  "reserved",
] as const;

export const EQUIPMENT_CATEGORIES: readonly EquipmentCategory[] = [
  "goggles",
  "cap",
  "swimsuit",
  "fins",
  "accessories",
  "pack",
] as const;

export const EQUIPMENT_SIZES = [
  "Unique",
  "Junior",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
] as const;

export interface SaleMetadata {
  size?: string | null;
  paymentMethod?: SalePaymentMethod;
  saleStatus?: SaleFulfillmentStatus;
  discountDA?: number;
  listUnitPriceDA?: number;
  memberId?: string | null;
  swimId?: string | null;
  category?: string | null;
  bundleId?: string | null;
}

export interface ParsedSaleNotes {
  meta: SaleMetadata;
  userNotes: string;
}

export interface CatalogArticleMetadata {
  category?: EquipmentCategory;
  stockQty?: number | null;
  minStockAlert?: number;
  sizes?: string[];
  sku?: string | null;
}

export interface ParsedArticleDescription {
  meta: CatalogArticleMetadata;
  cleanDescription: string;
}

export interface CatalogTemplateItem {
  code: string;
  name: string;
  cleanDescription: string;
  defaultSellPrice: number;
  defaultCostPrice: number;
  category: EquipmentCategory;
  sizes: string[];
  stockQty: number | null;
  minStockAlert: number;
  active: boolean;
}

export const DEFAULT_SWIM_CATALOG_TEMPLATES: CatalogTemplateItem[] = [
  {
    code: "goggles",
    name: "Lunettes de Natation Pro",
    cleanDescription: "Protection UV400, traitement anti-buee haute performance, pont nasal interchangeable",
    defaultSellPrice: 2500,
    defaultCostPrice: 1200,
    category: "goggles",
    sizes: ["Unique", "Junior"],
    stockQty: 20,
    minStockAlert: 5,
    active: true,
  },
  {
    code: "cap",
    name: "Bonnet de Natation Silicone",
    cleanDescription: "100% silicone hydrodynamique AQA, ergonomique et hypoallergenique",
    defaultSellPrice: 1200,
    defaultCostPrice: 500,
    category: "cap",
    sizes: ["Unique", "Junior"],
    stockQty: 30,
    minStockAlert: 5,
    active: true,
  },
  {
    code: "swimsuit",
    name: "Maillot / Jammer de Natation",
    cleanDescription: "Tissu technique haute resistance au chlore, coupe compressive et confort durable",
    defaultSellPrice: 4500,
    defaultCostPrice: 2200,
    category: "swimsuit",
    sizes: ["Junior", "XS", "S", "M", "L", "XL", "XXL"],
    stockQty: 15,
    minStockAlert: 4,
    active: true,
  },
  {
    code: "pack-complet",
    name: "Pack Complet AQA (Lunettes + Bonnet + Maillot)",
    cleanDescription: "Ensemble complet pret a nager AQA Sports (3 pieces)",
    defaultSellPrice: 7500,
    defaultCostPrice: 3900,
    category: "pack",
    sizes: ["Junior", "XS", "S", "M", "L", "XL", "XXL"],
    stockQty: 10,
    minStockAlert: 3,
    active: true,
  },
  {
    code: "fins",
    name: "Palmes d'Entrainement Courtes",
    cleanDescription: "Palmes courtes en silicone souple pour travail musculaire et propulsion",
    defaultSellPrice: 4800,
    defaultCostPrice: 2600,
    category: "fins",
    sizes: ["XS", "S", "M", "L", "XL"],
    stockQty: 12,
    minStockAlert: 3,
    active: true,
  },
  {
    code: "kickboard",
    name: "Planche de Natation EVA",
    cleanDescription: "Planche haute flottabilite mousse EVA dense pour travail des jambes",
    defaultSellPrice: 2200,
    defaultCostPrice: 1100,
    category: "accessories",
    sizes: ["Unique", "Junior"],
    stockQty: 15,
    minStockAlert: 4,
    active: true,
  },
  {
    code: "pull-buoy",
    name: "Pull Buoy Technique",
    cleanDescription: "Flotteur ergonomique pour travail isole du haut du corps",
    defaultSellPrice: 2000,
    defaultCostPrice: 950,
    category: "accessories",
    sizes: ["Unique"],
    stockQty: 12,
    minStockAlert: 4,
    active: true,
  },
  {
    code: "nose-clip",
    name: "Pince-Nez & Bouchons d'Oreilles",
    cleanDescription: "Set confort silicone hypoallergenique avec boitier de rangement",
    defaultSellPrice: 900,
    defaultCostPrice: 350,
    category: "accessories",
    sizes: ["Unique"],
    stockQty: 25,
    minStockAlert: 5,
    active: true,
  },
  {
    code: "mesh-bag",
    name: "Sac Filet AQA Natation",
    cleanDescription: "Sac filet respirant a sechage rapide pour equipement mouille",
    defaultSellPrice: 1800,
    defaultCostPrice: 800,
    category: "accessories",
    sizes: ["Unique"],
    stockQty: 15,
    minStockAlert: 4,
    active: true,
  },
  {
    code: "towel",
    name: "Serviette Microfibre Sport",
    cleanDescription: "Serviette ultra-absorbante compacte format piscine",
    defaultSellPrice: 2400,
    defaultCostPrice: 1100,
    category: "accessories",
    sizes: ["Unique"],
    stockQty: 15,
    minStockAlert: 4,
    active: true,
  },
];

export interface SaleFilterable {
  article: string;
  clientName: string;
  clientPhone: string;
  soldAt: string | Date;
  notes?: string | null;
}

export interface SaleFilterOptions {
  search?: string;
  article?: string;
  /** Inclusive lower bound, YYYY-MM-DD. */
  from?: string;
  /** Inclusive upper bound, YYYY-MM-DD. */
  to?: string;
  /** Optional map of article code to display name, so the search also matches names. */
  articleNames?: Record<string, string>;
  saleStatus?: string;
  paymentMethod?: string;
  size?: string;
}

export type EquipmentLocale = "en" | "fr" | "ar";

/** Local calendar date (not UTC) formatted for <input type="date">. */
export function toDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Calendar date (UTC) of a stored sale date as YYYY-MM-DD. */
export function saleDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** Formats a stored sale date. Always Western Arabic numerals, even in Arabic. */
export function formatSaleDate(value: string | Date, locale: EquipmentLocale = "fr"): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const tag = locale === "ar" ? "ar-DZ-u-nu-latn" : locale === "en" ? "en-GB" : "fr-FR";
  return date.toLocaleDateString(tag, { timeZone: "UTC" });
}

/** Formats an amount in Algerian dinars with Western Arabic numerals. */
export function formatDA(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${safe.toLocaleString("fr-FR", { useGrouping: true })} DA`;
}

/**
 * Parses a numeric text input as a non-negative integer.
 * Returns null for empty or invalid input so forms can distinguish "0" from "nothing typed".
 */
export function parseIntegerInput(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** Builds a catalog article code (lowercase slug, accents stripped) from a display name. */
export function slugifyArticleCode(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

/** Removes leading and trailing hyphens from a slug before it is submitted. */
export function trimSlugEdges(value: string): string {
  return value.replace(/^-+|-+$/g, "");
}

const SALE_META_TAG_REGEX = /\[SALE_META_START\]([\s\S]*?)\[SALE_META_END\]/;
const SALE_META_GLOBAL_REGEX = /\[SALE_META_START\][\s\S]*?\[SALE_META_END\]/g;
const CAT_META_TAG_REGEX = /\[CAT_META_START\]([\s\S]*?)\[CAT_META_END\]/;
const CAT_META_GLOBAL_REGEX = /\[CAT_META_START\][\s\S]*?\[CAT_META_END\]/g;

function isValidPaymentMethod(val: unknown): val is SalePaymentMethod {
  return typeof val === "string" && (SALE_PAYMENT_METHODS as readonly string[]).includes(val);
}

function isValidSaleStatus(val: unknown): val is SaleFulfillmentStatus {
  return typeof val === "string" && (SALE_FULFILLMENT_STATUSES as readonly string[]).includes(val);
}

function isValidEquipmentCategory(val: unknown): val is EquipmentCategory {
  return typeof val === "string" && (EQUIPMENT_CATEGORIES as readonly string[]).includes(val);
}

/** Infers an article category from its code when no explicit category tag is present. */
export function inferArticleCategory(code?: string | null): EquipmentCategory {
  const lower = (code || "").toLowerCase();
  if (lower.includes("pack") || lower.includes("kit") || lower.includes("bundle")) return "pack";
  if (lower.includes("goggle") || lower.includes("lunette")) return "goggles";
  if (lower.includes("cap") || lower.includes("bonnet")) return "cap";
  if (
    lower.includes("swimsuit") ||
    lower.includes("maillot") ||
    lower.includes("jammer") ||
    lower.includes("combinaison")
  ) {
    return "swimsuit";
  }
  if (lower.includes("fin") || lower.includes("palme")) return "fins";
  return "accessories";
}

/** Strips `[SALE_META_START]...[SALE_META_END]` blocks and returns clean human notes. */
export function cleanSaleNotesDisplay(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes.replace(SALE_META_GLOBAL_REGEX, "").trim();
}

/** Parses structured sale metadata and user notes from `SwimEquipmentSale.notes`. */
export function parseSaleNotes(notes: string | null | undefined): ParsedSaleNotes {
  const defaults: SaleMetadata = {
    size: null,
    paymentMethod: "cash",
    saleStatus: "paid_delivered",
    discountDA: 0,
    listUnitPriceDA: undefined,
    memberId: null,
    swimId: null,
    category: null,
    bundleId: null,
  };

  if (!notes || !notes.trim()) {
    return { meta: defaults, userNotes: "" };
  }

  const match = notes.match(SALE_META_TAG_REGEX);
  const userNotes = cleanSaleNotesDisplay(notes);
  if (!match || !match[1]) {
    return { meta: defaults, userNotes };
  }

  try {
    const raw = JSON.parse(match[1]) as Record<string, unknown>;
    const discountDA =
      typeof raw.discountDA === "number" && Number.isFinite(raw.discountDA) && raw.discountDA > 0
        ? Math.round(raw.discountDA)
        : 0;
    const listUnitPriceDA =
      typeof raw.listUnitPriceDA === "number" &&
      Number.isFinite(raw.listUnitPriceDA) &&
      raw.listUnitPriceDA >= 0
        ? Math.round(raw.listUnitPriceDA)
        : undefined;

    return {
      meta: {
        size: typeof raw.size === "string" && raw.size.trim() ? raw.size.trim() : null,
        paymentMethod: isValidPaymentMethod(raw.paymentMethod) ? raw.paymentMethod : "cash",
        saleStatus: isValidSaleStatus(raw.saleStatus) ? raw.saleStatus : "paid_delivered",
        discountDA,
        listUnitPriceDA,
        memberId: typeof raw.memberId === "string" && raw.memberId.trim() ? raw.memberId.trim() : null,
        swimId: typeof raw.swimId === "string" && raw.swimId.trim() ? raw.swimId.trim() : null,
        category: typeof raw.category === "string" && raw.category.trim() ? raw.category.trim() : null,
        bundleId: typeof raw.bundleId === "string" && raw.bundleId.trim() ? raw.bundleId.trim() : null,
      },
      userNotes,
    };
  } catch {
    return { meta: defaults, userNotes };
  }
}

/** Encodes structured sale metadata and user notes into a single string for `SwimEquipmentSale.notes`. */
export function formatSaleNotes(
  meta: Partial<SaleMetadata>,
  userNotes?: string | null
): string | null {
  const compact: Record<string, unknown> = {};
  if (meta.size && meta.size.trim()) compact.size = meta.size.trim();
  if (meta.paymentMethod && meta.paymentMethod !== "cash") {
    compact.paymentMethod = meta.paymentMethod;
  }
  if (meta.saleStatus && meta.saleStatus !== "paid_delivered") {
    compact.saleStatus = meta.saleStatus;
  }
  if (typeof meta.discountDA === "number" && meta.discountDA > 0) {
    compact.discountDA = Math.round(meta.discountDA);
  }
  if (typeof meta.listUnitPriceDA === "number" && meta.listUnitPriceDA >= 0) {
    compact.listUnitPriceDA = Math.round(meta.listUnitPriceDA);
  }
  if (meta.memberId && meta.memberId.trim()) compact.memberId = meta.memberId.trim();
  if (meta.swimId && meta.swimId.trim()) compact.swimId = meta.swimId.trim();
  if (meta.category && meta.category.trim()) compact.category = meta.category.trim();
  if (meta.bundleId && meta.bundleId.trim()) compact.bundleId = meta.bundleId.trim();

  const cleanUser = userNotes?.trim() || "";
  const hasMeta = Object.keys(compact).length > 0;
  if (!hasMeta && !cleanUser) return null;
  if (!hasMeta) return cleanUser;

  const tag = `[SALE_META_START]${JSON.stringify(compact)}[SALE_META_END]`;
  return cleanUser ? `${tag}\n${cleanUser}` : tag;
}

/** Strips `[CAT_META_START]...[CAT_META_END]` blocks and returns clean article description text. */
export function cleanArticleDescriptionDisplay(description: string | null | undefined): string {
  if (!description) return "";
  return description.replace(CAT_META_GLOBAL_REGEX, "").trim();
}

/** Parses structured catalog metadata (category, stock, sizes, SKU) from `SwimEquipmentArticle.description`. */
export function parseArticleDescription(
  description: string | null | undefined,
  code?: string
): ParsedArticleDescription {
  const defaults: CatalogArticleMetadata = {
    category: inferArticleCategory(code),
    stockQty: null,
    minStockAlert: 5,
    sizes: [],
    sku: null,
  };

  if (!description || !description.trim()) {
    return { meta: defaults, cleanDescription: "" };
  }

  const match = description.match(CAT_META_TAG_REGEX);
  const cleanDescription = cleanArticleDescriptionDisplay(description);
  if (!match || !match[1]) {
    return { meta: defaults, cleanDescription };
  }

  try {
    const raw = JSON.parse(match[1]) as Record<string, unknown>;
    const stockQty =
      typeof raw.stockQty === "number" && Number.isFinite(raw.stockQty) && raw.stockQty >= 0
        ? Math.round(raw.stockQty)
        : null;
    const minStockAlert =
      typeof raw.minStockAlert === "number" && Number.isFinite(raw.minStockAlert) && raw.minStockAlert >= 0
        ? Math.round(raw.minStockAlert)
        : 5;
    const sizes = Array.isArray(raw.sizes)
      ? raw.sizes.map((s) => String(s).trim()).filter(Boolean)
      : [];

    return {
      meta: {
        category: isValidEquipmentCategory(raw.category) ? raw.category : inferArticleCategory(code),
        stockQty,
        minStockAlert,
        sizes,
        sku: typeof raw.sku === "string" && raw.sku.trim() ? raw.sku.trim() : null,
      },
      cleanDescription,
    };
  } catch {
    return { meta: defaults, cleanDescription };
  }
}

/** Encodes structured catalog metadata and description text into `SwimEquipmentArticle.description`. */
export function formatArticleDescription(
  meta: Partial<CatalogArticleMetadata>,
  cleanDescription?: string | null
): string | null {
  const compact: Record<string, unknown> = {};
  if (meta.category) compact.category = meta.category;
  if (typeof meta.stockQty === "number" && Number.isFinite(meta.stockQty) && meta.stockQty >= 0) {
    compact.stockQty = Math.round(meta.stockQty);
  }
  if (typeof meta.minStockAlert === "number" && Number.isFinite(meta.minStockAlert) && meta.minStockAlert >= 0) {
    compact.minStockAlert = Math.round(meta.minStockAlert);
  }
  if (Array.isArray(meta.sizes) && meta.sizes.length > 0) {
    compact.sizes = meta.sizes.map((s) => s.trim()).filter(Boolean);
  }
  if (meta.sku && meta.sku.trim()) {
    compact.sku = meta.sku.trim();
  }

  const cleanText = cleanDescription?.trim() || "";
  const hasMeta = Object.keys(compact).length > 0;
  if (!hasMeta && !cleanText) return null;
  if (!hasMeta) return cleanText;

  const tag = `[CAT_META_START]${JSON.stringify(compact)}[CAT_META_END]`;
  return cleanText ? `${tag}\n${cleanText}` : tag;
}

/** Filters sales by free text, article code, status, payment method, size, and an inclusive date range. */
export function filterSales<T extends SaleFilterable>(sales: T[], options: SaleFilterOptions = {}): T[] {
  const query = (options.search || "").toLowerCase().trim();
  const article = options.article && options.article !== "all" ? options.article : null;
  const saleStatus = options.saleStatus && options.saleStatus !== "all" ? options.saleStatus : null;
  const paymentMethod =
    options.paymentMethod && options.paymentMethod !== "all" ? options.paymentMethod : null;
  const sizeFilter = options.size && options.size !== "all" ? options.size.toLowerCase() : null;
  const from = options.from || "";
  const to = options.to || "";

  return sales.filter((sale) => {
    if (article && sale.article !== article) return false;

    if (from || to) {
      const key = saleDateKey(sale.soldAt);
      if (!key) return false;
      if (from && key < from) return false;
      if (to && key > to) return false;
    }

    const parsed = parseSaleNotes(sale.notes);

    if (saleStatus && parsed.meta.saleStatus !== saleStatus) return false;
    if (paymentMethod && parsed.meta.paymentMethod !== paymentMethod) return false;
    if (sizeFilter && (parsed.meta.size || "").toLowerCase() !== sizeFilter) return false;

    if (query) {
      const articleName = options.articleNames?.[sale.article] || "";
      const haystack = [
        sale.clientName,
        sale.clientPhone,
        sale.article,
        articleName,
        parsed.meta.swimId || "",
        parsed.meta.size || "",
        parsed.userNotes || "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

/** Counts recorded sales per linked lead id. */
export function countSalesByLead(sales: { leadId: string | null }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const sale of sales) {
    if (!sale.leadId) continue;
    counts.set(sale.leadId, (counts.get(sale.leadId) || 0) + 1);
  }
  return counts;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  let text = String(value);
  // Neutralise spreadsheet formula injection for user-provided text.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[";\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * Builds an Excel-friendly CSV (UTF-8 BOM, semicolon separator, CRLF line endings).
 * Numbers are written as-is, text cells are quoted and protected against formula injection.
 */
export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(";"));
  return `\uFEFF${lines.join("\r\n")}`;
}

/** Message sent to a client who requested an equipment pack (client-facing, French). */
export function buildEquipmentDemandMessage(clientName: string): string {
  return `Salam ${clientName}, concernant votre demande de pack equipement natation AQA Sports.`;
}

/** Builds a clean WhatsApp receipt message for one or more sale items (no emojis, Western numerals). */
export function buildSaleReceiptWhatsAppMessage(params: {
  clientName: string;
  soldDate: string;
  items: Array<{
    articleName: string;
    size?: string | null;
    quantity: number;
    unitPrice: number;
  }>;
  totalDA: number;
  paymentLabel: string;
}): string {
  const lines: string[] = [
    `Salam ${params.clientName},`,
    `Voici votre recu AQA Swim Boutique (${params.soldDate}) :`,
  ];
  for (const item of params.items) {
    const sizePart = item.size ? ` (${item.size})` : "";
    const lineTotal = item.quantity * item.unitPrice;
    lines.push(`- ${item.articleName}${sizePart} x${item.quantity} : ${formatDA(lineTotal)}`);
  }
  lines.push(`Total : ${formatDA(params.totalDA)} (${params.paymentLabel})`);
  lines.push("Merci pour votre confiance - AQA Sports");
  return lines.join("\n");
}

/**
 * Builds the wa.me link for a lead. Prefers a distinct WhatsApp number stored in the lead,
 * falls back to the phone. Returns null when no usable number exists.
 */
export function buildWhatsAppLink(
  lead: { phone?: string | null; notes?: string | null; whatsapp?: string | null },
  message: string
): string | null {
  const resolved = resolveSwimWhatsApp(lead);
  const number = resolved.formattedNumber || formatWhatsAppNumber(lead.phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
