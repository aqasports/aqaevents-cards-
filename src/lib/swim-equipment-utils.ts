import { formatWhatsAppNumber, resolveSwimWhatsApp } from "./swim-whatsapp";

/**
 * Pure helpers for the AQA Swim equipment shop UI (filters, formatting, CSV, WhatsApp).
 * No emojis, Western Arabic numerals only.
 */

export interface SaleFilterable {
  article: string;
  clientName: string;
  clientPhone: string;
  soldAt: string | Date;
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

/** Filters sales by free text, article code and an inclusive date range. */
export function filterSales<T extends SaleFilterable>(sales: T[], options: SaleFilterOptions = {}): T[] {
  const query = (options.search || "").toLowerCase().trim();
  const article = options.article && options.article !== "all" ? options.article : null;
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

    if (query) {
      const articleName = options.articleNames?.[sale.article] || "";
      const haystack = [sale.clientName, sale.clientPhone, sale.article, articleName]
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
