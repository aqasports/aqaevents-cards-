import { describe, it, expect } from "vitest";
import {
  buildCsv,
  buildEquipmentDemandMessage,
  buildSaleReceiptWhatsAppMessage,
  buildWhatsAppLink,
  cleanArticleDescriptionDisplay,
  cleanSaleNotesDisplay,
  countSalesByLead,
  filterSales,
  formatArticleDescription,
  formatDA,
  formatSaleDate,
  formatSaleNotes,
  inferArticleCategory,
  parseArticleDescription,
  parseIntegerInput,
  parseSaleNotes,
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

  it("builds a clean receipt message with Western numerals", () => {
    const msg = buildSaleReceiptWhatsAppMessage({
      clientName: "Anis",
      soldDate: "17/11/2026",
      items: [{ articleName: "Lunettes Pro", size: "M", quantity: 2, unitPrice: 2500 }],
      totalDA: 5000,
      paymentLabel: "Especes",
    });
    expect(msg).toContain("Salam Anis");
    expect(msg).toContain("Lunettes Pro (M) x2");
    expect(msg).toContain("Especes");
    expect(/[\u0660-\u0669]/.test(msg)).toBe(false);
  });
});

describe("sale notes metadata helpers", () => {
  it("parses legacy plain notes with safe defaults", () => {
    const parsed = parseSaleNotes("Taille L, regle cash");
    expect(parsed.userNotes).toBe("Taille L, regle cash");
    expect(parsed.meta.paymentMethod).toBe("cash");
    expect(parsed.meta.saleStatus).toBe("paid_delivered");
    expect(parsed.meta.size).toBeNull();
  });

  it("round-trips structured metadata and human notes cleanly", () => {
    const encoded = formatSaleNotes(
      {
        size: "L",
        paymentMethod: "ccp",
        saleStatus: "paid_pending",
        discountDA: 500,
        listUnitPriceDA: 4500,
        memberId: "mem-1",
        swimId: "SWM-001025",
        category: "homme",
        bundleId: "bnd-abc",
      },
      "Remise groupe"
    );
    expect(encoded).toContain("[SALE_META_START]");
    expect(cleanSaleNotesDisplay(encoded)).toBe("Remise groupe");

    const decoded = parseSaleNotes(encoded);
    expect(decoded.meta.size).toBe("L");
    expect(decoded.meta.paymentMethod).toBe("ccp");
    expect(decoded.meta.saleStatus).toBe("paid_pending");
    expect(decoded.meta.discountDA).toBe(500);
    expect(decoded.meta.listUnitPriceDA).toBe(4500);
    expect(decoded.meta.memberId).toBe("mem-1");
    expect(decoded.meta.swimId).toBe("SWM-001025");
    expect(decoded.meta.category).toBe("homme");
    expect(decoded.meta.bundleId).toBe("bnd-abc");
    expect(decoded.userNotes).toBe("Remise groupe");
  });

  it("filters sales by status, payment method, size, and swimId", () => {
    const richSales = [
      {
        ...sales[0],
        notes: formatSaleNotes({
          size: "M",
          paymentMethod: "ccp",
          saleStatus: "reserved",
          swimId: "SWM-001042",
        }),
      },
      {
        ...sales[1],
        notes: formatSaleNotes({
          size: "L",
          paymentMethod: "cash",
          saleStatus: "paid_delivered",
        }),
      },
    ];

    expect(filterSales(richSales, { saleStatus: "reserved" }).map((s) => s.id)).toEqual(["1"]);
    expect(filterSales(richSales, { paymentMethod: "ccp" }).map((s) => s.id)).toEqual(["1"]);
    expect(filterSales(richSales, { size: "l" }).map((s) => s.id)).toEqual(["2"]);
    expect(filterSales(richSales, { search: "SWM-001042" }).map((s) => s.id)).toEqual(["1"]);
  });
});

describe("catalog description metadata helpers", () => {
  it("infers category from article code when metadata is absent", () => {
    expect(inferArticleCategory("goggles-pro")).toBe("goggles");
    expect(inferArticleCategory("bonnet-silicone")).toBe("cap");
    expect(inferArticleCategory("maillot-jammer")).toBe("swimsuit");
    expect(inferArticleCategory("pack-complet")).toBe("pack");
    expect(inferArticleCategory("palmes-courtes")).toBe("fins");
    expect(inferArticleCategory("kickboard")).toBe("accessories");
  });

  it("round-trips catalog metadata and clean description", () => {
    const encoded = formatArticleDescription(
      {
        category: "swimsuit",
        stockQty: 14,
        minStockAlert: 4,
        sizes: ["S", "M", "L"],
        sku: "AQA-SW-10",
      },
      "Tissu resistant au chlore"
    );
    expect(cleanArticleDescriptionDisplay(encoded)).toBe("Tissu resistant au chlore");

    const parsed = parseArticleDescription(encoded, "swimsuit");
    expect(parsed.meta.category).toBe("swimsuit");
    expect(parsed.meta.stockQty).toBe(14);
    expect(parsed.meta.minStockAlert).toBe(4);
    expect(parsed.meta.sizes).toEqual(["S", "M", "L"]);
    expect(parsed.meta.sku).toBe("AQA-SW-10");
    expect(parsed.cleanDescription).toBe("Tissu resistant au chlore");
  });
});
