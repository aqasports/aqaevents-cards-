export interface StudioGroupRef {
  id?: string;
  name: string;
  coachName?: string | null;
  schedule?: string | null;
  level?: string;
  category?: string;
  active?: boolean;
}

export interface StudioClientItem {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  category: string;
  level: string;
  formula: string;
  duration: string | null;
  paymentStatus: string;
  dateOfStart?: string | null;
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  group?: StudioGroupRef | null;
  effectiveGroup?: StudioGroupRef | null;
  groups?: StudioGroupRef[];
  effectiveGroups?: StudioGroupRef[];
  card?: {
    id?: string;
    cardCode: string;
    publicToken: string;
    status?: string;
  } | null;
}

export interface SwimStickerStudioConfig {
  cardWidthMm: number;
  cardHeightMm: number;
  bgMode: "white" | "dark" | "bw";
  accentColor: "sky" | "teal" | "emerald" | "black";
  qrPosition: "left" | "right";
  qrSizeMm: number;
  qrInfoSpacingMm: number;
  paddingMm: number;
  borderRadiusMm: number;
  fontSize: number;
  cuttingLines: boolean;
  showName: boolean;
  showSwimId: boolean;
  showCardCode: boolean;
  showCategory: boolean;
  showGroupTypeFormula: boolean;
  showGroupName: boolean;
  showGroupDayHour: boolean;
  showCoach: boolean;
  showValidity: boolean;
  showPhone: boolean;
  showHeaderBadge: boolean;
  headerBadgeText: string;
  customFooterText: string;
  a4Orientation: "portrait" | "landscape";
  gridMode: "auto" | "custom";
  customCols: number;
  customRows: number;
  pageMarginMm: number;
  gapMm: number;
  startSlotOffset: number;
}

export const DEFAULT_STICKER_STUDIO_CONFIG: SwimStickerStudioConfig = {
  cardWidthMm: 85.6,
  cardHeightMm: 54,
  bgMode: "white",
  accentColor: "sky",
  qrPosition: "left",
  qrSizeMm: 31,
  qrInfoSpacingMm: 3.5,
  paddingMm: 2.5,
  borderRadiusMm: 2.5,
  fontSize: 10.5,
  cuttingLines: true,
  showName: true,
  showSwimId: true,
  showCardCode: true,
  showCategory: true,
  showGroupTypeFormula: true,
  showGroupName: false,
  showGroupDayHour: true,
  showCoach: true,
  showValidity: false,
  showPhone: false,
  showHeaderBadge: true,
  headerBadgeText: "AQA SWIM",
  customFooterText: "",
  a4Orientation: "portrait",
  gridMode: "auto",
  customCols: 2,
  customRows: 5,
  pageMarginMm: 8,
  gapMm: 3,
  startSlotOffset: 0,
};

export const STICKER_SIZE_PRESETS = [
  { id: "cr80", widthMm: 85.6, heightMm: 54, labelKey: "presetCr80" },
  { id: "cr80_inset", widthMm: 82, heightMm: 50, labelKey: "presetCr80Inset" },
  { id: "compact", widthMm: 70, heightMm: 45, labelKey: "presetCompact" },
  { id: "square", widthMm: 50, heightMm: 50, labelKey: "presetSquare" },
] as const;

export interface StudioClientFilters {
  query: string;
  category: string;
  groupFilter: string;
  cardFilter: "all" | "linked" | "unlinked";
  paymentFilter: string;
}

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function resolveClientGroups(client: StudioClientItem): StudioGroupRef[] {
  if (client.effectiveGroups && client.effectiveGroups.length > 0) {
    return client.effectiveGroups;
  }
  if (client.groups && client.groups.length > 0) {
    return client.groups;
  }
  if (client.effectiveGroup) {
    return [client.effectiveGroup];
  }
  if (client.group) {
    return [client.group];
  }
  return [];
}

export function formatLevelShort(level: string): string {
  if (level === "new_aqa" || level === "beginner") return "New AQA";
  if (level === "old_aqa" || level === "intermediate" || level === "advanced") return "Old AQA";
  return level;
}

export function formatValidityRange(client: StudioClientItem): string | null {
  const startRaw = client.subscriptionStart || client.dateOfStart;
  const endRaw = client.subscriptionEnd;
  const fmt = (iso: string | null | undefined): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  const s = fmt(startRaw);
  const e = fmt(endRaw);
  if (s && e) return `${s} -> ${e}`;
  if (e) return `Exp: ${e}`;
  if (s) return `Start: ${s}`;
  return null;
}

export function filterStudioClients(
  clients: StudioClientItem[],
  filters: StudioClientFilters
): StudioClientItem[] {
  const q = filters.query.trim().toLowerCase();

  return clients.filter((c) => {
    if (filters.category !== "all" && c.category !== filters.category) {
      return false;
    }

    if (filters.paymentFilter !== "all" && c.paymentStatus !== filters.paymentFilter) {
      return false;
    }

    if (filters.cardFilter === "linked" && !c.card) {
      return false;
    }
    if (filters.cardFilter === "unlinked" && c.card) {
      return false;
    }

    const groups = resolveClientGroups(c);
    if (filters.groupFilter === "assigned" && groups.length === 0) {
      return false;
    }
    if (filters.groupFilter === "unassigned" && groups.length > 0) {
      return false;
    }
    if (
      filters.groupFilter !== "all" &&
      filters.groupFilter !== "assigned" &&
      filters.groupFilter !== "unassigned"
    ) {
      const matchesGroup = groups.some(
        (g) => g.id === filters.groupFilter || g.name === filters.groupFilter
      );
      if (!matchesGroup) return false;
    }

    if (!q) return true;

    const matchName = c.fullName.toLowerCase().includes(q);
    const matchSwimId = c.swimId.toLowerCase().includes(q);
    const matchPhone = (c.phone || "").toLowerCase().includes(q);
    const matchCard = (c.card?.cardCode || "").toLowerCase().includes(q);
    const matchGroup = groups.some(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.coachName || "").toLowerCase().includes(q) ||
        (g.schedule || "").toLowerCase().includes(q)
    );

    return matchName || matchSwimId || matchPhone || matchCard || matchGroup;
  });
}

export interface StickerColorScheme {
  bg: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  mono: string;
  qrBg: string;
  qrFg: string;
  divider: string;
}

export function getStickerColorScheme(config: SwimStickerStudioConfig): StickerColorScheme {
  const accentMap: Record<SwimStickerStudioConfig["accentColor"], { light: string; dark: string }> = {
    sky: { light: "#0ea5e9", dark: "#38bdf8" },
    teal: { light: "#0891b2", dark: "#00f2ff" },
    emerald: { light: "#059669", dark: "#10b981" },
    black: { light: "#0f172a", dark: "#f8fafc" },
  };

  const chosenAccent = accentMap[config.accentColor] || accentMap.sky;

  if (config.bgMode === "bw") {
    return {
      bg: "#ffffff",
      border: "#000000",
      text: "#000000",
      textMuted: "#1e293b",
      accent: "#000000",
      mono: "#000000",
      qrBg: "#ffffff",
      qrFg: "#000000",
      divider: "#000000",
    };
  }

  if (config.bgMode === "dark") {
    return {
      bg: "#0f172a",
      border: "#1e293b",
      text: "#f8fafc",
      textMuted: "#94a3b8",
      accent: chosenAccent.dark,
      mono: "#38bdf8",
      qrBg: "#0f172a",
      qrFg: "#00f2ff",
      divider: "rgba(255,255,255,0.12)",
    };
  }

  return {
    bg: "#ffffff",
    border: "#cbd5e1",
    text: "#0f172a",
    textMuted: "#475569",
    accent: chosenAccent.light,
    mono: "#0284c7",
    qrBg: "#ffffff",
    qrFg: "#030712",
    divider: "#e2e8f0",
  };
}

export interface A4GridLayout {
  pageWidthMm: number;
  pageHeightMm: number;
  cols: number;
  rows: number;
  perPage: number;
}

export function computeA4GridLayout(config: SwimStickerStudioConfig): A4GridLayout {
  const pageWidthMm = config.a4Orientation === "portrait" ? 210 : 297;
  const pageHeightMm = config.a4Orientation === "portrait" ? 297 : 210;

  const w = Math.max(25, config.cardWidthMm);
  const h = Math.max(20, config.cardHeightMm);
  const margin = Math.max(0, Math.min(30, config.pageMarginMm));
  const gap = Math.max(0, Math.min(20, config.gapMm));

  if (config.gridMode === "custom") {
    const cols = Math.max(1, Math.min(6, Math.round(config.customCols || 1)));
    const rows = Math.max(1, Math.min(12, Math.round(config.customRows || 1)));
    return {
      pageWidthMm,
      pageHeightMm,
      cols,
      rows,
      perPage: cols * rows,
    };
  }

  const usableWidth = Math.max(w, pageWidthMm - 2 * margin);
  const usableHeight = Math.max(h, pageHeightMm - 2 * margin);

  const cols = Math.max(1, Math.floor((usableWidth + gap) / (w + gap)));
  const rows = Math.max(1, Math.floor((usableHeight + gap) / (h + gap)));

  return {
    pageWidthMm,
    pageHeightMm,
    cols,
    rows,
    perPage: cols * rows,
  };
}

export interface PaginatedA4Result<T> extends A4GridLayout {
  totalStickers: number;
  totalPages: number;
  pages: Array<Array<T | null>>;
}

export function paginateStickersOnA4<T>(
  entries: Array<{ item: T; copies: number }>,
  config: SwimStickerStudioConfig
): PaginatedA4Result<T> {
  const layout = computeA4GridLayout(config);
  const expanded: T[] = [];

  for (const entry of entries) {
    const count = Math.max(1, Math.min(20, Math.round(entry.copies || 1)));
    for (let i = 0; i < count; i++) {
      expanded.push(entry.item);
    }
  }

  if (expanded.length === 0) {
    return {
      ...layout,
      totalStickers: 0,
      totalPages: 1,
      pages: [[]],
    };
  }

  const safeOffset = Math.max(0, Math.min(layout.perPage - 1, Math.round(config.startSlotOffset || 0)));
  const allSlots: Array<T | null> = [
    ...Array.from({ length: safeOffset }, () => null),
    ...expanded,
  ];

  const pages: Array<Array<T | null>> = [];
  for (let i = 0; i < allSlots.length; i += layout.perPage) {
    pages.push(allSlots.slice(i, i + layout.perPage));
  }

  return {
    ...layout,
    totalStickers: expanded.length,
    totalPages: pages.length,
    pages,
  };
}

export function getClientQrTargetUrl(client: StudioClientItem, origin: string): string {
  const base = origin || "https://aqasports.com";
  if (client.card?.publicToken) {
    return `${base}/swim/card/${client.card.publicToken}`;
  }
  return `${base}/swim/profile/${client.swimId}`;
}

export function renderSingleStickerHtml(
  client: StudioClientItem,
  qrDataUrl: string | null,
  config: SwimStickerStudioConfig
): string {
  const scheme = getStickerColorScheme(config);
  const allGroups = resolveClientGroups(client);
  const effectiveQrMm = Math.min(
    Math.max(16, config.qrSizeMm),
    Math.max(16, config.cardHeightMm - config.paddingMm * 2 - (config.showCardCode ? 5 : 2))
  );

  const lvlShort = formatLevelShort(client.level);
  const categoryDisplay = `${(client.category || "SWIM").toUpperCase()}${lvlShort ? ` (${lvlShort})` : ""}`;

  const firstGrpLevel = allGroups[0]?.level || "";
  const formulaText = client.formula || "Standard";
  const durText = client.duration ? ` · ${client.duration}` : "";
  const groupTypeDisplay =
    firstGrpLevel && firstGrpLevel !== client.formula
      ? `${firstGrpLevel} - ${formulaText}${durText}`
      : `${formulaText}${durText}`;

  const validityDisplay = config.showValidity ? formatValidityRange(client) : null;

  const qrBlockHtml = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: ${config.paddingMm}mm;
      ${config.qrPosition === "left" ? `border-right: 0.3mm solid ${scheme.divider};` : `border-left: 0.3mm solid ${scheme.divider};`}
      flex-shrink: 0;
    ">
      <div style="
        background: ${scheme.qrBg};
        padding: 0.8mm;
        border-radius: 1.2mm;
        border: 0.25mm solid ${scheme.border};
      ">
        ${
          qrDataUrl
            ? `<img src="${qrDataUrl}" alt="QR" style="width: ${effectiveQrMm}mm; height: ${effectiveQrMm}mm; display: block; object-fit: contain;" />`
            : `<div style="width: ${effectiveQrMm}mm; height: ${effectiveQrMm}mm; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #475569; font-weight: 700;">QR</div>`
        }
      </div>
      ${
        config.showCardCode
          ? `<div style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 6.5px;
              font-weight: 800;
              color: ${scheme.mono};
              margin-top: 0.8mm;
              letter-spacing: 0.4px;
              text-align: center;
            ">${escapeHtml(client.card?.cardCode || client.swimId)}</div>`
          : ""
      }
    </div>
  `;

  const infoBlockHtml = `
    <div style="
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: ${config.paddingMm}mm ${config.qrPosition === "left" ? `${config.paddingMm}mm ${config.paddingMm}mm 0` : `0 ${config.paddingMm}mm ${config.paddingMm}mm`};
      overflow: hidden;
    ">
      ${
        config.showName
          ? `<div style="
              font-weight: 900;
              font-size: ${config.fontSize * 1.08}px;
              text-transform: uppercase;
              color: ${scheme.text};
              line-height: 1.15;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              letter-spacing: 0.3px;
            ">${escapeHtml(client.fullName)}</div>`
          : ""
      }
      ${
        config.showSwimId
          ? `<div style="
              font-family: 'JetBrains Mono', monospace;
              font-weight: 800;
              font-size: ${config.fontSize * 0.88}px;
              color: ${scheme.mono};
              margin-top: 0.4mm;
              line-height: 1.05;
            ">${escapeHtml(client.swimId)}</div>`
          : ""
      }
      ${
        config.showPhone && client.phone
          ? `<div style="
              font-family: 'JetBrains Mono', monospace;
              font-size: ${config.fontSize * 0.76}px;
              font-weight: 600;
              color: ${scheme.textMuted};
              margin-top: 0.3mm;
              line-height: 1.05;
            ">${escapeHtml(client.phone)}</div>`
          : ""
      }
      ${
        config.showCategory
          ? `<div style="
              font-size: ${config.fontSize * 0.78}px;
              font-weight: 700;
              color: ${scheme.textMuted};
              margin-top: 0.4mm;
              line-height: 1.1;
            ">${escapeHtml(categoryDisplay)}</div>`
          : ""
      }
      ${
        config.showGroupTypeFormula
          ? `<div style="
              font-size: ${config.fontSize * 0.8}px;
              font-weight: 700;
              color: ${scheme.accent};
              margin-top: 0.6mm;
              line-height: 1.1;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            ">${escapeHtml(groupTypeDisplay)}</div>`
          : ""
      }
      ${
        (config.showGroupName || config.showGroupDayHour || config.showCoach) && allGroups.length > 0
          ? `<div style="margin-top: 0.5mm;">
              ${allGroups
                .map((g) => {
                  const parts: string[] = [];
                  if (config.showGroupName && g.name) {
                    parts.push(`<strong style="color:${scheme.text};">${escapeHtml(g.name)}</strong>`);
                  }
                  if (config.showGroupDayHour && g.schedule) {
                    parts.push(`<strong style="color:${scheme.text};">${escapeHtml(g.schedule)}</strong>`);
                  }
                  if (config.showCoach && g.coachName) {
                    parts.push(`<span>Coach: ${escapeHtml(g.coachName)}</span>`);
                  }
                  if (parts.length === 0) return "";
                  return `
                    <div style="
                      font-size: ${config.fontSize * 0.72}px;
                      color: ${scheme.textMuted};
                      line-height: 1.25;
                      display: flex;
                      align-items: flex-start;
                      gap: 1mm;
                      margin-top: 0.3mm;
                    ">
                      <span style="
                        display: inline-block;
                        width: 1.3mm;
                        height: 1.3mm;
                        background: ${scheme.accent};
                        border-radius: 50%;
                        flex-shrink: 0;
                        margin-top: 0.9mm;
                      "></span>
                      <span>${parts.join(" · ")}</span>
                    </div>
                  `;
                })
                .join("")}
            </div>`
          : ""
      }
      ${
        validityDisplay
          ? `<div style="
              font-family: 'JetBrains Mono', monospace;
              font-size: ${config.fontSize * 0.68}px;
              font-weight: 600;
              color: ${scheme.textMuted};
              margin-top: 0.5mm;
              line-height: 1.1;
            ">${escapeHtml(validityDisplay)}</div>`
          : ""
      }
      ${
        config.customFooterText.trim()
          ? `<div style="
              font-size: ${config.fontSize * 0.66}px;
              font-weight: 600;
              color: ${scheme.textMuted};
              margin-top: 0.6mm;
              line-height: 1.1;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            ">${escapeHtml(config.customFooterText.trim())}</div>`
          : ""
      }
    </div>
  `;

  const spacerHtml = `<div style="width: ${config.qrInfoSpacingMm}mm; flex-shrink: 0;"></div>`;

  return `
    <div class="pvc-sticker" style="
      width: ${config.cardWidthMm}mm;
      height: ${config.cardHeightMm}mm;
      position: relative;
      display: flex;
      align-items: stretch;
      border-radius: ${config.borderRadiusMm}mm;
      box-sizing: border-box;
      background: ${scheme.bg};
      border: 0.3mm solid ${scheme.border};
      overflow: hidden;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      ${config.cuttingLines ? "outline: 0.45mm dashed #94a3b8; outline-offset: -0.45mm;" : ""}
    ">
      ${
        config.qrPosition === "left"
          ? `${qrBlockHtml}${spacerHtml}${infoBlockHtml}`
          : `${infoBlockHtml}${spacerHtml}${qrBlockHtml}`
      }
      ${
        config.showHeaderBadge && config.headerBadgeText.trim()
          ? `<div style="
              position: absolute;
              top: 1.6mm;
              ${config.qrPosition === "left" ? "right: 2mm;" : "left: 2mm;"}
              font-size: 5.8px;
              font-weight: 900;
              letter-spacing: 0.8px;
              color: ${scheme.accent};
              text-transform: uppercase;
              opacity: 0.7;
            ">${escapeHtml(config.headerBadgeText.trim())}</div>`
          : ""
      }
    </div>
  `;
}

export function renderA4PagesHtml(
  pages: Array<Array<StudioClientItem | null>>,
  qrMap: Record<string, string>,
  config: SwimStickerStudioConfig
): string {
  const layout = computeA4GridLayout(config);

  const sheetsHtml = pages
    .map((pageSlots, pageIdx) => {
      const cellsHtml = pageSlots
        .map((slot) => {
          if (!slot) {
            return `<div style="width: ${config.cardWidthMm}mm; height: ${config.cardHeightMm}mm; visibility: hidden;"></div>`;
          }
          return renderSingleStickerHtml(slot, qrMap[slot.id] || null, config);
        })
        .join("");

      const isLast = pageIdx === pages.length - 1;
      return `
        <div class="a4-sheet" style="
          width: ${layout.pageWidthMm}mm;
          height: ${layout.pageHeightMm}mm;
          padding: ${config.pageMarginMm}mm;
          box-sizing: border-box;
          background: #ffffff;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          ${!isLast ? "page-break-after: always; break-after: page;" : ""}
        ">
          <div style="
            display: grid;
            grid-template-columns: repeat(${layout.cols}, ${config.cardWidthMm}mm);
            grid-auto-rows: ${config.cardHeightMm}mm;
            gap: ${config.gapMm}mm;
            justify-content: center;
            align-content: start;
          ">
            ${cellsHtml}
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>AQA Swim - PVC Stickers A4 Sheet</title>
        <style>
          @page {
            size: A4 ${config.a4Orientation};
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-family: Inter, system-ui, -apple-system, sans-serif;
          }
          * {
            box-sizing: border-box;
          }
          @media screen {
            body {
              background: #0f172a;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 20px;
            }
            .a4-sheet {
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }
          }
        </style>
      </head>
      <body>
        ${sheetsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 350);
          };
        </script>
      </body>
    </html>
  `;
}
