import { describe, it, expect } from "vitest";
import {
  buildCsv,
  buildEquipmentDemandMessage,
  buildWhatsAppLink,
  countSalesByLead,
  filterSales,
  formatDA,
  formatSaleDate,
  parseIntegerInput,
  saleDateKey,
  slugifyArticleCode,
  toDateInputValue,
  trimSlugEdges,
} from "./swim-equipment-utils";

const sales = [
  {
    id: "1",
    article: "goggles",
    clientName: "Karim Haddad",
    clientPhone: "0555000001",
    leadId: "lead-1",
    soldAt: "2026-09-10T12:00:00.000Z",
  },
  {
    id: "2",
    article: "cap",
    clientName: "Amine Said",
    clientPhone: "",
    leadId: null,
    soldAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "3",
    article: "cap",
    clientName: "Sofia Benali",
    clientPhone: "0661000002",
    leadId: "lead-1",
    soldAt: "2026-10-03T12:00:00.000Z",
  },
];

describe("filterSales", () => {
  it("filters by article", () => {
    expect(filterSales(sales, { article: "cap" }).map((s) => s.id)).toEqual(["2", "3"]);
    expect(filterSales(sales, { article: "all" })).toHaveLength(3);
  });

  it("filters by an inclusive date range", () => {
    expect(filterSales(sales, { from: "2026-10-01" }).map((s) => s.id)).toEqual(["2", "3"]);
    expect(filterSales(sales, { to: "2026-10-01" }).map((s) => s.id)).toEqual(["1", "2"]);
    expect(filterSales(sales, { from: "2026-10-01", to: "2026-10-01" }).map((s) => s.id)).toEqual(["2"]);
  });

  it("searches client, phone, code and display name, and tolerates a missing phone", () => {
    expect(filterSales(sales, { search: "amine" }).map((s) => s.id)).toEqual(["2"]);
    expect(filterSales(sales, { search: "0661" }).map((s) => s.id)).toEqual(["3"]);
    expect(
      filterSales(sales, { search: "lunettes", articleNames: { goggles: "Lunettes Pro" } }).map((s) => s.id)
    ).toEqual(["1"]);
  });
});

describe("countSalesByLead", () => {
  it("counts sales per linked lead and ignores walk-ins", () => {
    const counts = countSalesByLead(sales);
    expect(counts.get("lead-1")).toBe(2);
    expect(counts.size).toBe(1);
  });
});

describe("number and date helpers", () => {
  it("parses non-negative integers strictly", () => {
    expect(parseIntegerInput("1200")).toBe(1200);
    expect(parseIntegerInput(" 0 ")).toBe(0);
    expect(parseIntegerInput("")).toBeNull();
    expect(parseIntegerInput("12.5")).toBeNull();
    expect(parseIntegerInput("-3")).toBeNull();
    expect(parseIntegerInput("abc")).toBeNull();
  });

  it("formats dinars with Western numerals", () => {
    expect(formatDA(0)).toBe("0 DA");
    expect(formatDA(2500)).toMatch(/^2\s?500 DA$/);
    expect(/[\u0660-\u0669]/.test(formatDA(123456))).toBe(false);
  });

  it("formats sale dates in UTC with Western numerals in Arabic", () => {
    expect(saleDateKey("2026-10-01T00:00:00.000Z")).toBe("2026-10-01");
    expect(/[\u0660-\u0669]/.test(formatSaleDate("2026-10-01T12:00:00.000Z", "ar"))).toBe(false);
    expect(formatSaleDate("invalid")).toBe("");
  });

  it("builds a local date input value", () => {
    expect(toDateInputValue(new Date(2026, 9, 4))).toBe("2026-10-04");
  });
});

describe("slug helpers", () => {
  it("builds a lowercase slug without accents", () => {
    expect(slugifyArticleCode("Lunettes Pro UV400")).toBe("lunettes-pro-uv400");
    expect(slugifyArticleCode("Bonnet silicone ete")).toBe("bonnet-silicone-ete");
    expect(slugifyArticleCode("Maillot \u00e9t\u00e9 (L)")).toBe("maillot-ete-l");
  });

  it("trims hyphens at the edges", () => {
    expect(trimSlugEdges("-abc-")).toBe("abc");
  });
});

describe("buildCsv", () => {
  it("adds a BOM, uses semicolons and CRLF", () => {
    const csv = buildCsv(["A", "B"], [["x", 2]]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toBe("\uFEFFA;B\r\nx;2");
  });

  it("quotes separators, quotes and newlines", () => {
    const csv = buildCsv(["Note"], [['He said "hi"; ok'], ["two\nlines"]]);
    expect(csv).toContain('"He said ""hi""; ok"');
    expect(csv).toContain('"two\nlines"');
  });

  it("neutralises spreadsheet formulas in text but keeps negative numbers", () => {
    const csv = buildCsv(["V"], [["=HYPERLINK(1)"], ["+1"], [-500]]);
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain("'+1");
    expect(csv).toContain("-500");
    expect(csv).not.toContain("'-500");
  });

  it("writes empty cells for missing values", () => {
    expect(buildCsv(["A", "B"], [[null, undefined]])).toBe("\uFEFFA;B\r\n;");
  });
});

describe("WhatsApp helpers", () => {
  it("builds a link from a local Algerian number", () => {
    const link = buildWhatsAppLink({ phone: "0555123456" }, buildEquipmentDemandMessage("Karim"));
    expect(link).toContain("https://wa.me/213555123456?text=");
    expect(link).toContain(encodeURIComponent("Salam Karim"));
  });

  it("returns null when there is no usable number", () => {
    expect(buildWhatsAppLink({ phone: "" }, "x")).toBeNull();
    expect(buildWhatsAppLink({ phone: null }, "x")).toBeNull();
  });

  it("prefers a distinct WhatsApp number from lead metadata", () => {
    const link = buildWhatsAppLink({ phone: "0555123456", whatsapp: "0661234567" }, "x");
    expect(link).toContain("wa.me/213661234567");
  });
});
