import { describe, it, expect } from "vitest";
import {
  DEFAULT_STICKER_STUDIO_CONFIG,
  computeA4GridLayout,
  paginateStickersOnA4,
  filterStudioClients,
  renderSingleStickerHtml,
  renderA4PagesHtml,
  formatValidityRange,
  escapeHtml,
  StudioClientItem,
} from "./swim-sticker-studio";

const MOCK_CLIENTS: StudioClientItem[] = [
  {
    id: "m1",
    swimId: "SWM-001001",
    fullName: "Amine Benali",
    phone: "0550112233",
    category: "homme",
    level: "new_aqa",
    formula: "G10",
    duration: "3m",
    paymentStatus: "paid",
    subscriptionStart: "2026-09-01T00:00:00.000Z",
    subscriptionEnd: "2026-12-01T00:00:00.000Z",
    effectiveGroups: [
      {
        id: "g1",
        name: "Homme Mardi 19h",
        coachName: "Walid",
        schedule: "Mardi 19:00 - 20:00",
        level: "G10",
      },
    ],
    card: {
      id: "c1",
      cardCode: "SWM-000010",
      publicToken: "tok_10",
      status: "active",
    },
  },
  {
    id: "m2",
    swimId: "SWM-001002",
    fullName: "Sara Khelifi",
    phone: "0661445566",
    category: "femme",
    level: "old_aqa",
    formula: "MAX5",
    duration: "6m",
    paymentStatus: "unpaid",
    effectiveGroups: [],
    card: null,
  },
];

describe("swim-sticker-studio", () => {
  it("computes auto A4 grid layout for standard CR80 cards in portrait", () => {
    const layout = computeA4GridLayout(DEFAULT_STICKER_STUDIO_CONFIG);
    // 210mm width - 16mm margin = 194mm -> fits 2 cols of 85.6mm + 3mm gap (174.2mm)
    // 297mm height - 16mm margin = 281mm -> fits 5 rows of 54mm + 3mm gap (282mm -> 4 rows = 225mm, wait: (281 + 3) / (54 + 3) = 284 / 57 = 4.98 -> 4 rows)
    expect(layout.pageWidthMm).toBe(210);
    expect(layout.pageHeightMm).toBe(297);
    expect(layout.cols).toBe(2);
    expect(layout.rows).toBe(4);
    expect(layout.perPage).toBe(8);
  });

  it("computes custom grid layout when gridMode is custom", () => {
    const layout = computeA4GridLayout({
      ...DEFAULT_STICKER_STUDIO_CONFIG,
      a4Orientation: "landscape",
      gridMode: "custom",
      customCols: 3,
      customRows: 3,
    });
    expect(layout.pageWidthMm).toBe(297);
    expect(layout.pageHeightMm).toBe(210);
    expect(layout.cols).toBe(3);
    expect(layout.rows).toBe(3);
    expect(layout.perPage).toBe(9);
  });

  it("paginates stickers across multiple A4 pages with copies and startSlotOffset", () => {
    const result = paginateStickersOnA4(
      [
        { item: MOCK_CLIENTS[0], copies: 5 },
        { item: MOCK_CLIENTS[1], copies: 3 },
      ],
      {
        ...DEFAULT_STICKER_STUDIO_CONFIG,
        startSlotOffset: 2, // skips 2 slots on page 1 -> 2 + 8 = 10 slots -> 2 pages of 8
      }
    );

    expect(result.totalStickers).toBe(8);
    expect(result.perPage).toBe(8);
    expect(result.totalPages).toBe(2);
    expect(result.pages[0].length).toBe(8);
    expect(result.pages[0][0]).toBeNull();
    expect(result.pages[0][1]).toBeNull();
    expect(result.pages[0][2]?.id).toBe("m1");
    expect(result.pages[1].length).toBe(2);
    expect(result.pages[1][0]?.id).toBe("m2");
  });

  it("filters clients by search query, category, group, card status, and payment status", () => {
    expect(
      filterStudioClients(MOCK_CLIENTS, {
        query: "walid",
        category: "all",
        groupFilter: "all",
        cardFilter: "all",
        paymentFilter: "all",
      }).map((c) => c.id)
    ).toEqual(["m1"]);

    expect(
      filterStudioClients(MOCK_CLIENTS, {
        query: "",
        category: "femme",
        groupFilter: "unassigned",
        cardFilter: "unlinked",
        paymentFilter: "unpaid",
      }).map((c) => c.id)
    ).toEqual(["m2"]);
  });

  it("formats validity range and escapes HTML safely", () => {
    expect(formatValidityRange(MOCK_CLIENTS[0])).toBe("01/09/2026 -> 01/12/2026");
    expect(escapeHtml("<script>alert('x')</script>")).toBe(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;"
    );
  });

  it("renders single sticker and A4 pages HTML with configured fields", () => {
    const html = renderSingleStickerHtml(MOCK_CLIENTS[0], "data:image/png;base64,AAA", {
      ...DEFAULT_STICKER_STUDIO_CONFIG,
      showGroupName: true,
      showValidity: true,
      showPhone: true,
      customFooterText: "Olympic Pool",
    });

    expect(html).toContain("Amine Benali");
    expect(html).toContain("SWM-001001");
    expect(html).toContain("SWM-000010");
    expect(html).toContain("Homme Mardi 19h");
    expect(html).toContain("Mardi 19:00 - 20:00");
    expect(html).toContain("Coach: Walid");
    expect(html).toContain("01/09/2026 -&gt; 01/12/2026");
    expect(html).toContain("Olympic Pool");

    const docHtml = renderA4PagesHtml(
      [[null, MOCK_CLIENTS[0]]],
      { m1: "data:image/png;base64,AAA" },
      DEFAULT_STICKER_STUDIO_CONFIG
    );
    expect(docHtml).toContain("a4-sheet");
    expect(docHtml).toContain("visibility: hidden;");
    expect(docHtml).toContain("Amine Benali");
  });
});
