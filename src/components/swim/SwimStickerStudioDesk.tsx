"use client";

import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import { useLocale } from "@/lib/i18n";
import { Badge, Button, Card, Input } from "@/components/admin/ui";
import {
  DEFAULT_STICKER_STUDIO_CONFIG,
  STICKER_SIZE_PRESETS,
  SwimStickerStudioConfig,
  StudioClientItem,
  StudioClientFilters,
  StudioGroupRef,
  filterStudioClients,
  resolveClientGroups,
  formatLevelShort,
  formatValidityRange,
  getStickerColorScheme,
  paginateStickersOnA4,
  getClientQrTargetUrl,
  renderA4PagesHtml,
} from "@/lib/swim-sticker-studio";

const STORAGE_KEY = "aqa_swim_sticker_studio_v1";

interface SwimStickerStudioDeskProps {
  members: StudioClientItem[];
  groups: StudioGroupRef[];
  onRefreshData: () => Promise<void>;
}

const SAMPLE_CLIENT: StudioClientItem = {
  id: "sample",
  swimId: "SWM-001001",
  fullName: "AMINE BENALI",
  phone: "0550123456",
  category: "homme",
  level: "new_aqa",
  formula: "G10",
  duration: "3m",
  paymentStatus: "paid",
  subscriptionStart: "2026-09-01T00:00:00.000Z",
  subscriptionEnd: "2026-12-01T00:00:00.000Z",
  effectiveGroups: [
    {
      id: "g-sample",
      name: "Homme Mardi 19h",
      coachName: "Walid",
      schedule: "Mardi 19:00 - 20:00",
      level: "G10",
    },
  ],
  card: {
    id: "c-sample",
    cardCode: "SWM-000001",
    publicToken: "sample-token",
    status: "active",
  },
};

export function SwimStickerStudioDesk({
  members,
  groups,
  onRefreshData,
}: SwimStickerStudioDeskProps) {
  const { t } = useLocale();

  // Studio configuration state (persisted in localStorage)
  const [config, setConfig] = useState<SwimStickerStudioConfig>(DEFAULT_STICKER_STUDIO_CONFIG);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setConfig((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const updateConfig = (patch: Partial<SwimStickerStudioConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleResetStudio = () => {
    setConfig(DEFAULT_STICKER_STUDIO_CONFIG);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Client search & filters
  const [filters, setFilters] = useState<StudioClientFilters>({
    query: "",
    category: "all",
    groupFilter: "all",
    cardFilter: "all",
    paymentFilter: "all",
  });

  // Selected clients map: member.id -> copies count
  const [selectedMap, setSelectedMap] = useState<Record<string, number>>({});

  // Currently previewed client in the Studio
  const [previewClientId, setPreviewClientId] = useState<string | null>(null);

  // Current A4 preview page (1-indexed)
  const [currentA4Page, setCurrentA4Page] = useState<number>(1);

  // QR data URL cache keyed by `${clientId}_${bgMode}`
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [printing, setPrinting] = useState<boolean>(false);

  // Batch auto-issue card state
  const [issuingCards, setIssuingCards] = useState<boolean>(false);
  const [issueSuccessMsg, setIssueSuccessMsg] = useState<string | null>(null);

  // Filtered clients
  const filteredClients = useMemo(
    () => filterStudioClients(members, filters),
    [members, filters]
  );

  // Selected client entries in order
  const selectedEntries = useMemo(() => {
    const list: Array<{ item: StudioClientItem; copies: number }> = [];
    for (const m of members) {
      const copies = selectedMap[m.id];
      if (copies && copies > 0) {
        list.push({ item: m, copies });
      }
    }
    return list;
  }, [members, selectedMap]);

  // Unlinked selected clients count
  const unlinkedSelectedIds = useMemo(() => {
    return selectedEntries
      .filter((e) => !e.item.card)
      .map((e) => e.item.id);
  }, [selectedEntries]);

  // Active client for the Studio Live Ticket Preview
  const previewClient = useMemo<StudioClientItem>(() => {
    if (previewClientId) {
      const found = members.find((m) => m.id === previewClientId);
      if (found) return found;
    }
    if (selectedEntries.length > 0) {
      return selectedEntries[0].item;
    }
    if (filteredClients.length > 0) {
      return filteredClients[0];
    }
    return {
      ...SAMPLE_CLIENT,
      fullName: t("swimStickerStudio.sampleClientName"),
    };
  }, [previewClientId, members, selectedEntries, filteredClients, t]);

  // Paginated A4 sheets
  const paginatedA4 = useMemo(
    () => paginateStickersOnA4(selectedEntries, config),
    [selectedEntries, config]
  );

  // Keep currentA4Page within bounds
  useEffect(() => {
    if (currentA4Page > paginatedA4.totalPages) {
      setCurrentA4Page(Math.max(1, paginatedA4.totalPages));
    }
  }, [currentA4Page, paginatedA4.totalPages]);

  // Scheme colors for live preview
  const scheme = useMemo(() => getStickerColorScheme(config), [config]);

  // Generate QR code for previewClient + visible A4 page clients
  useEffect(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://aqasports.com";
    const pageSlots = paginatedA4.pages[currentA4Page - 1] || [];
    const targets = new Map<string, StudioClientItem>();
    targets.set(previewClient.id, previewClient);
    for (const slot of pageSlots) {
      if (slot) targets.set(slot.id, slot);
    }

    let cancelled = false;

    async function buildQrs() {
      const updates: Record<string, string> = {};
      for (const [, client] of targets) {
        const cacheKey = `${client.id}_${config.bgMode}`;
        if (qrMap[cacheKey]) continue;
        const url = getClientQrTargetUrl(client, origin);
        try {
          const dataUrl = await QRCode.toDataURL(url, {
            width: 320,
            margin: 1,
            color: {
              dark: scheme.qrFg,
              light: scheme.qrBg,
            },
          });
          updates[cacheKey] = dataUrl;
        } catch {
          // ignore QR error
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setQrMap((prev) => ({ ...prev, ...updates }));
      }
    }

    buildQrs();
    return () => {
      cancelled = true;
    };
  }, [previewClient, paginatedA4.pages, currentA4Page, config.bgMode, scheme.qrFg, scheme.qrBg, qrMap]);

  // Selection helpers
  const toggleClientSelection = (clientId: string) => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[clientId]) {
        delete next[clientId];
      } else {
        next[clientId] = 1;
      }
      return next;
    });
  };

  const setClientCopies = (clientId: string, copies: number) => {
    const safe = Math.max(1, Math.min(20, copies));
    setSelectedMap((prev) => ({
      ...prev,
      [clientId]: safe,
    }));
  };

  const selectAllFiltered = () => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      for (const c of filteredClients) {
        if (!next[c.id]) next[c.id] = 1;
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedMap({});
  };

  // Auto-issue PVC cards for selected clients who don't have one
  const handleAutoIssueCards = async () => {
    if (unlinkedSelectedIds.length === 0) return;
    setIssuingCards(true);
    setIssueSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/swim/cards/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoIssueMemberIds: unlinkedSelectedIds }),
      });
      if (res.ok) {
        const data = await res.json();
        await onRefreshData();
        setIssueSuccessMsg(
          t("swimStickerStudio.autoIssueSuccess", { count: data.issuedCount || 0 })
        );
        setTimeout(() => setIssueSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error("Failed to auto-issue cards:", err);
    } finally {
      setIssuingCards(false);
    }
  };

  // Send A4 wrapped sheets to printer
  const handleSendToPrinter = async () => {
    const entriesToPrint =
      selectedEntries.length > 0
        ? selectedEntries
        : [{ item: previewClient, copies: 1 }];

    setPrinting(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "https://aqasports.com";
      const printPaginated = paginateStickersOnA4(entriesToPrint, config);
      const printQrMap: Record<string, string> = {};

      // Ensure high-DPI QR codes for all unique clients in the print batch
      const uniqueClients = new Map<string, StudioClientItem>();
      for (const entry of entriesToPrint) {
        uniqueClients.set(entry.item.id, entry.item);
      }

      await Promise.all(
        Array.from(uniqueClients.values()).map(async (client) => {
          const cacheKey = `${client.id}_${config.bgMode}`;
          if (qrMap[cacheKey]) {
            printQrMap[client.id] = qrMap[cacheKey];
            return;
          }
          const url = getClientQrTargetUrl(client, origin);
          try {
            const dataUrl = await QRCode.toDataURL(url, {
              width: 320,
              margin: 1,
              color: {
                dark: scheme.qrFg,
                light: scheme.qrBg,
              },
            });
            printQrMap[client.id] = dataUrl;
          } catch {
            // ignore
          }
        })
      );

      const docHtml = renderA4PagesHtml(printPaginated.pages, printQrMap, config);

      const printWindow = window.open("", "_blank", "width=1024,height=840");
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(docHtml);
        printWindow.document.close();
      } else {
        // Fallback hidden iframe if popup blocker is active
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(docHtml);
          iframeDoc.close();
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 2000);
          }, 500);
        }
      }
    } finally {
      setPrinting(false);
    }
  };

  // Resolved data for the live preview client
  const previewGroups = useMemo(() => resolveClientGroups(previewClient), [previewClient]);
  const previewQrUrl = qrMap[`${previewClient.id}_${config.bgMode}`] || null;
  const previewValidity = useMemo(
    () => (config.showValidity ? formatValidityRange(previewClient) : null),
    [config.showValidity, previewClient]
  );

  // Scale factor for the live studio ticket preview (1mm -> ~4.2px)
  const previewScalePxPerMm = 4.2;
  const effectivePreviewQrMm = Math.min(
    Math.max(16, config.qrSizeMm),
    Math.max(16, config.cardHeightMm - config.paddingMm * 2 - (config.showCardCode ? 5 : 2))
  );

  const activePageSlots = paginatedA4.pages[currentA4Page - 1] || [];

  return (
    <div className="space-y-6">
      {/* ─── TOP WORKFLOW SUMMARY BAR ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-4 flex items-center gap-3.5 shadow-[0_0_15px_rgba(0,242,255,0.08)]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono font-bold text-sm">
            01
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {t("swimStickerStudio.step1Title")}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {config.cardWidthMm} x {config.cardHeightMm} mm · {config.bgMode.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-slate-900/90 p-4 flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono font-bold text-sm">
            02
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {t("swimStickerStudio.step2Title")}
            </div>
            <div className="text-[11px] text-cyan-300 font-mono">
              {t("swimStickerStudio.selectedClientsBadge", {
                clients: selectedEntries.length,
                stickers: paginatedA4.totalStickers,
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold text-sm">
              03
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {t("swimStickerStudio.step3Title")}
              </div>
              <div className="text-[11px] text-emerald-300 font-mono truncate">
                {paginatedA4.cols}x{paginatedA4.rows} ({paginatedA4.perPage}/A4) · {paginatedA4.totalPages} A4
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendToPrinter}
            disabled={printing}
          >
            {printing ? t("swimStickerStudio.preparingPrint") : "Print A4"}
          </Button>
        </div>
      </div>

      {/* ─── STEP 1: STICKER STUDIO & LIVE TICKET PREVIEW ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Studio Controls */}
        <Card className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                {t("swimStickerStudio.step1Title")}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleResetStudio}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-white/10 transition-colors"
            >
              {t("swimStickerStudio.resetStudioBtn")}
            </button>
          </div>

          {/* 1A. Size Presets & Custom Dimensions */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              {t("swimStickerStudio.presetSizesLabel")}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STICKER_SIZE_PRESETS.map((preset) => {
                const isActive =
                  Math.abs(config.cardWidthMm - preset.widthMm) < 0.15 &&
                  Math.abs(config.cardHeightMm - preset.heightMm) < 0.15;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      updateConfig({
                        cardWidthMm: preset.widthMm,
                        cardHeightMm: preset.heightMm,
                      })
                    }
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border text-left transition-all ${
                      isActive
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                        : "bg-slate-800/60 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {t(`swimStickerStudio.${preset.labelKey}`)}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 items-end">
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">
                  {t("swimStickerStudio.widthMm")}
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="30"
                  max="180"
                  value={config.cardWidthMm}
                  onChange={(e) =>
                    updateConfig({ cardWidthMm: parseFloat(e.target.value) || 85.6 })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">
                  {t("swimStickerStudio.heightMm")}
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="25"
                  max="180"
                  value={config.cardHeightMm}
                  onChange={(e) =>
                    updateConfig({ cardHeightMm: parseFloat(e.target.value) || 54 })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  updateConfig({
                    cardWidthMm: config.cardHeightMm,
                    cardHeightMm: config.cardWidthMm,
                  })
                }
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-xs font-semibold transition-colors"
              >
                {t("swimStickerStudio.swapOrientation")}
              </button>
            </div>
          </div>

          {/* 1B. Sticker Theme & Accent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                {t("swimStickerStudio.themeTitle")}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "white", label: t("swimStickerStudio.bgWhite") },
                    { id: "dark", label: t("swimStickerStudio.bgDark") },
                    { id: "bw", label: t("swimStickerStudio.bgBw") },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => updateConfig({ bgMode: mode.id })}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border transition-all ${
                      config.bgMode === mode.id
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                        : "bg-slate-800/60 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                {t("swimStickerStudio.accentLabel")}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: "sky", label: t("swimStickerStudio.accentSky"), dot: "bg-sky-500" },
                    { id: "teal", label: t("swimStickerStudio.accentTeal"), dot: "bg-cyan-400" },
                    { id: "emerald", label: t("swimStickerStudio.accentEmerald"), dot: "bg-emerald-500" },
                    { id: "black", label: t("swimStickerStudio.accentBlack"), dot: "bg-slate-950 border border-white/40" },
                  ] as const
                ).map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => updateConfig({ accentColor: acc.id })}
                    className={`px-2 py-2 rounded-xl text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      config.accentColor === acc.id
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                        : "bg-slate-800/60 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${acc.dot}`} />
                    <span className="truncate">{acc.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 1C. QR Layout & Typography Sliders */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {t("swimStickerStudio.qrLayoutTitle")}
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">
                  {t("swimStickerStudio.qrPositionLabel")}:
                </span>
                {(["left", "right"] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => updateConfig({ qrPosition: pos })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                      config.qrPosition === pos
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                        : "bg-slate-800 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    {pos === "left"
                      ? t("swimStickerStudio.qrLeft")
                      : t("swimStickerStudio.qrRight")}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* QR Size */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    {t("swimStickerStudio.qrSizeLabel")}
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">{config.qrSizeMm} mm</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="44"
                  step="0.5"
                  value={config.qrSizeMm}
                  onChange={(e) => updateConfig({ qrSizeMm: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Font Size */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    {t("swimStickerStudio.fontSizeLabel")}
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">{config.fontSize} px</span>
                </div>
                <input
                  type="range"
                  min="7"
                  max="15"
                  step="0.5"
                  value={config.fontSize}
                  onChange={(e) => updateConfig({ fontSize: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* QR / Info Spacing */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    {t("swimStickerStudio.qrSpacingLabel")}
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {config.qrInfoSpacingMm} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={config.qrInfoSpacingMm}
                  onChange={(e) =>
                    updateConfig({ qrInfoSpacingMm: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Padding */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    {t("swimStickerStudio.paddingLabel")}
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {config.paddingMm} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="0.5"
                  value={config.paddingMm}
                  onChange={(e) => updateConfig({ paddingMm: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 1D. Visible Fields Checkboxes */}
          <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              {t("swimStickerStudio.fieldsTitle")}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {(
                [
                  { key: "showName", label: t("swimStickerStudio.fieldName") },
                  { key: "showSwimId", label: t("swimStickerStudio.fieldSwimId") },
                  { key: "showCardCode", label: t("swimStickerStudio.fieldCardCode") },
                  { key: "showCategory", label: t("swimStickerStudio.fieldCategory") },
                  { key: "showGroupTypeFormula", label: t("swimStickerStudio.fieldFormula") },
                  { key: "showGroupName", label: t("swimStickerStudio.fieldGroupName") },
                  { key: "showGroupDayHour", label: t("swimStickerStudio.fieldSchedule") },
                  { key: "showCoach", label: t("swimStickerStudio.fieldCoach") },
                  { key: "showValidity", label: t("swimStickerStudio.fieldValidity") },
                  { key: "showPhone", label: t("swimStickerStudio.fieldPhone") },
                  { key: "showHeaderBadge", label: t("swimStickerStudio.fieldHeaderBadge") },
                  { key: "cuttingLines", label: t("swimStickerStudio.cuttingLinesLabel") },
                ] as const
              ).map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(config[key])}
                    onChange={(e) => updateConfig({ [key]: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-800 accent-cyan-500"
                  />
                  <span className="truncate">{label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-white/5">
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">
                  {t("swimStickerStudio.fieldHeaderBadge")}
                </span>
                <Input
                  value={config.headerBadgeText}
                  onChange={(e) => updateConfig({ headerBadgeText: e.target.value })}
                  placeholder={t("swimStickerStudio.headerBadgePlaceholder")}
                />
              </div>
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">
                  {t("swimStickerStudio.customFooterLabel")}
                </span>
                <Input
                  value={config.customFooterText}
                  onChange={(e) => updateConfig({ customFooterText: e.target.value })}
                  placeholder={t("swimStickerStudio.customFooterPlaceholder")}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Right: Live Ticket Studio Canvas */}
        <Card className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  {t("swimStickerStudio.liveTicketPreview")}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {t("swimStickerStudio.previewingClient")}{" "}
                  <span className="text-cyan-300 font-semibold">{previewClient.fullName}</span>{" "}
                  <span className="font-mono text-slate-500">({previewClient.swimId})</span>
                </p>
              </div>
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800/40">
                {config.cardWidthMm} x {config.cardHeightMm} mm
              </span>
            </div>

            {/* Interactive Sticker Canvas */}
            <div className="flex items-center justify-center p-5 rounded-2xl bg-slate-950/90 border border-white/10 min-h-[260px] overflow-x-auto">
              <div
                style={{
                  width: `${Math.min(420, config.cardWidthMm * previewScalePxPerMm)}px`,
                  aspectRatio: `${config.cardWidthMm} / ${config.cardHeightMm}`,
                  background: scheme.bg,
                  border: `1.5px solid ${scheme.border}`,
                  borderRadius: `${config.borderRadiusMm * 3.5}px`,
                  display: "flex",
                  flexDirection: config.qrPosition === "left" ? "row" : "row-reverse",
                  alignItems: "stretch",
                  overflow: "hidden",
                  position: "relative",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
                  ...(config.cuttingLines
                    ? { outline: "2px dashed rgba(0,242,255,0.65)", outlineOffset: "2px" }
                    : {}),
                }}
              >
                {/* QR Block */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: `${config.paddingMm * 3.5}px`,
                    borderRight:
                      config.qrPosition === "left" ? `1px solid ${scheme.divider}` : "none",
                    borderLeft:
                      config.qrPosition === "right" ? `1px solid ${scheme.divider}` : "none",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      background: scheme.qrBg,
                      padding: "4px",
                      borderRadius: "6px",
                      border: `1px solid ${scheme.border}`,
                    }}
                  >
                    {previewQrUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewQrUrl}
                        alt="QR"
                        style={{
                          width: `${effectivePreviewQrMm * 3.2}px`,
                          height: `${effectivePreviewQrMm * 3.2}px`,
                          display: "block",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: `${effectivePreviewQrMm * 3.2}px`,
                          height: `${effectivePreviewQrMm * 3.2}px`,
                          background: "#e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#475569",
                        }}
                      >
                        QR
                      </div>
                    )}
                  </div>
                  {config.showCardCode && (
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "8.5px",
                        fontWeight: 800,
                        color: scheme.mono,
                        marginTop: "4px",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {previewClient.card?.cardCode || previewClient.swimId}
                    </span>
                  )}
                </div>

                {/* Spacer */}
                <div
                  style={{
                    width: `${Math.max(4, config.qrInfoSpacingMm * 3.2)}px`,
                    flexShrink: 0,
                  }}
                />

                {/* Info Block */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding:
                      config.qrPosition === "left"
                        ? `${config.paddingMm * 3.2}px ${config.paddingMm * 3.2}px ${config.paddingMm * 3.2}px 0`
                        : `${config.paddingMm * 3.2}px 0 ${config.paddingMm * 3.2}px ${config.paddingMm * 3.2}px`,
                    gap: "2px",
                    overflow: "hidden",
                  }}
                >
                  {config.showName && (
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: `${config.fontSize * 1.15}px`,
                        textTransform: "uppercase",
                        color: scheme.text,
                        lineHeight: 1.15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {previewClient.fullName}
                    </div>
                  )}

                  {config.showSwimId && (
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 800,
                        fontSize: `${config.fontSize * 0.92}px`,
                        color: scheme.mono,
                        lineHeight: 1.1,
                      }}
                    >
                      {previewClient.swimId}
                    </div>
                  )}

                  {config.showPhone && previewClient.phone && (
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: `${config.fontSize * 0.8}px`,
                        fontWeight: 600,
                        color: scheme.textMuted,
                        lineHeight: 1.1,
                      }}
                    >
                      {previewClient.phone}
                    </div>
                  )}

                  {config.showCategory && (
                    <div
                      style={{
                        fontSize: `${config.fontSize * 0.82}px`,
                        fontWeight: 700,
                        color: scheme.textMuted,
                        lineHeight: 1.15,
                      }}
                    >
                      {(previewClient.category || "SWIM").toUpperCase()} (
                      {formatLevelShort(previewClient.level)})
                    </div>
                  )}

                  {config.showGroupTypeFormula && (
                    <div
                      style={{
                        fontSize: `${config.fontSize * 0.84}px`,
                        fontWeight: 700,
                        color: scheme.accent,
                        lineHeight: 1.15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {previewClient.formula || "G10"}
                      {previewClient.duration ? ` · ${previewClient.duration}` : ""}
                    </div>
                  )}

                  {(config.showGroupName || config.showGroupDayHour || config.showCoach) &&
                    previewGroups.map((g, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: `${config.fontSize * 0.76}px`,
                          color: scheme.textMuted,
                          lineHeight: 1.25,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "5px",
                            height: "5px",
                            background: scheme.accent,
                            borderRadius: "50%",
                            flexShrink: 0,
                            marginTop: "4px",
                          }}
                        />
                        <span className="truncate">
                          {config.showGroupName && g.name && (
                            <strong style={{ color: scheme.text }}>{g.name} </strong>
                          )}
                          {config.showGroupDayHour && g.schedule && (
                            <strong style={{ color: scheme.text }}>{g.schedule}</strong>
                          )}
                          {config.showCoach && g.coachName && (
                            <span>
                              {(config.showGroupName && g.name) ||
                              (config.showGroupDayHour && g.schedule)
                                ? " · "
                                : ""}
                              Coach: {g.coachName}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}

                  {previewValidity && (
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: `${config.fontSize * 0.72}px`,
                        fontWeight: 600,
                        color: scheme.textMuted,
                        lineHeight: 1.15,
                      }}
                    >
                      {previewValidity}
                    </div>
                  )}

                  {config.customFooterText.trim() && (
                    <div
                      style={{
                        fontSize: `${config.fontSize * 0.7}px`,
                        fontWeight: 600,
                        color: scheme.textMuted,
                        lineHeight: 1.15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {config.customFooterText.trim()}
                    </div>
                  )}
                </div>

                {/* Top Watermark */}
                {config.showHeaderBadge && config.headerBadgeText.trim() && (
                  <div
                    style={{
                      position: "absolute",
                      top: "5px",
                      ...(config.qrPosition === "left" ? { right: "7px" } : { left: "7px" }),
                      fontSize: "7px",
                      fontWeight: 900,
                      letterSpacing: "1px",
                      color: scheme.accent,
                      opacity: 0.7,
                      textTransform: "uppercase",
                    }}
                  >
                    {config.headerBadgeText.trim()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Preview Client Switcher */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">
                {t("swimStickerStudio.previewingClient")}
              </span>
              <select
                value={previewClient.id}
                onChange={(e) => setPreviewClientId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 max-w-[240px]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.swimId})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── STEP 2: SEARCH & SELECT CLIENTS ─────────────────────────── */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                {t("swimStickerStudio.searchClientsTitle")}
              </h2>
              <p className="text-xs text-cyan-300 font-mono mt-0.5">
                {t("swimStickerStudio.selectedClientsBadge", {
                  clients: selectedEntries.length,
                  stickers: paginatedA4.totalStickers,
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {unlinkedSelectedIds.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAutoIssueCards}
                disabled={issuingCards}
              >
                {issuingCards
                  ? t("swimStickerStudio.autoIssuingCards")
                  : t("swimStickerStudio.autoIssueCardsBtn", {
                      count: unlinkedSelectedIds.length,
                    })}
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={selectAllFiltered}>
              {t("swimStickerStudio.selectAllFiltered", {
                count: filteredClients.length,
              })}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={clearSelection}
              disabled={selectedEntries.length === 0}
            >
              {t("swimStickerStudio.deselectAll")}
            </Button>
          </div>
        </div>

        {issueSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
            {issueSuccessMsg}
          </div>
        )}

        {/* Search & Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="lg:col-span-2">
            <Input
              value={filters.query}
              onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
              placeholder={t("swimStickerStudio.searchPlaceholder")}
            />
          </div>

          <select
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="all">{t("swimStickerStudio.filterCategoryAll")}</option>
            <option value="homme">Homme</option>
            <option value="femme">Femme</option>
            <option value="enfants">Enfants</option>
            <option value="apnea">Apnee</option>
          </select>

          <select
            value={filters.groupFilter}
            onChange={(e) => setFilters((prev) => ({ ...prev, groupFilter: e.target.value }))}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="all">{t("swimStickerStudio.filterGroupAll")}</option>
            <option value="assigned">{t("swimStickerStudio.filterGroupAssigned")}</option>
            <option value="unassigned">{t("swimStickerStudio.filterGroupUnassigned")}</option>
            {groups
              .filter((g) => g.active !== false)
              .map((g) => (
                <option key={g.id || g.name} value={g.id || g.name}>
                  {g.name} ({g.coachName || "Coach"})
                </option>
              ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={filters.cardFilter}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  cardFilter: e.target.value as StudioClientFilters["cardFilter"],
                }))
              }
              className="px-2.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="all">{t("swimStickerStudio.filterCardAll")}</option>
              <option value="linked">{t("swimStickerStudio.filterCardLinked")}</option>
              <option value="unlinked">{t("swimStickerStudio.filterCardUnlinked")}</option>
            </select>

            <select
              value={filters.paymentFilter}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, paymentFilter: e.target.value }))
              }
              className="px-2.5 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="all">{t("swimStickerStudio.filterPaymentAll")}</option>
              <option value="paid">{t("swimStickerStudio.filterPaymentPaid")}</option>
              <option value="partial">{t("swimStickerStudio.filterPaymentPartial")}</option>
              <option value="unpaid">{t("swimStickerStudio.filterPaymentUnpaid")}</option>
            </select>
          </div>
        </div>

        {/* Clients Table */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="sticky top-0 z-10 bg-slate-900 border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2.5 px-3 w-12">{t("swimStickerStudio.colSelect")}</th>
                <th className="py-2.5 px-3">{t("swimStickerStudio.colSwimmer")}</th>
                <th className="py-2.5 px-3">{t("swimStickerStudio.colCategoryFormula")}</th>
                <th className="py-2.5 px-3">{t("swimStickerStudio.colGroupSchedule")}</th>
                <th className="py-2.5 px-3">{t("swimStickerStudio.colCardCode")}</th>
                <th className="py-2.5 px-3 text-center">{t("swimStickerStudio.colCopies")}</th>
                <th className="py-2.5 px-3 text-right">{t("swimStickerStudio.colPreview")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 text-xs">
                    {t("swimStickerStudio.noClientsMatch")}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const copies = selectedMap[client.id] || 0;
                  const isSelected = copies > 0;
                  const isPreviewing = previewClient.id === client.id;
                  const clientGroups = resolveClientGroups(client);

                  return (
                    <tr
                      key={client.id}
                      onClick={() => toggleClientSelection(client.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-cyan-500/10 hover:bg-cyan-500/15"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleClientSelection(client.id)}
                          className="h-4 w-4 accent-cyan-500 rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">{client.fullName}</div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-300">
                          <span>{client.swimId}</span>
                          {client.phone && (
                            <span className="text-slate-400">· {client.phone}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200 uppercase text-[11px]">
                          {client.category} · {formatLevelShort(client.level)}
                        </div>
                        <div className="text-[10px] text-sky-300 font-mono">
                          {client.formula || "G10"}
                          {client.duration ? ` (${client.duration})` : ""}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {clientGroups.length > 0 ? (
                          <div className="space-y-0.5">
                            {clientGroups.map((g, i) => (
                              <div key={i} className="text-[11px] text-slate-300">
                                <span className="font-semibold text-white">{g.name}</span>
                                {g.schedule && (
                                  <span className="text-slate-400"> · {g.schedule}</span>
                                )}
                                {g.coachName && (
                                  <span className="text-cyan-300"> · {g.coachName}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] italic text-slate-500">
                            {t("swimStickerStudio.filterGroupUnassigned")}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {client.card ? (
                          <span className="font-mono font-bold text-cyan-300 text-xs">
                            {client.card.cardCode}
                          </span>
                        ) : (
                          <Badge tone="info">
                            {t("swimStickerStudio.noCardFallbackBadge")}
                          </Badge>
                        )}
                      </td>
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isSelected ? (
                          <div className="inline-flex items-center gap-1 bg-slate-900 border border-white/15 rounded-lg px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => setClientCopies(client.id, copies - 1)}
                              className="px-1.5 text-slate-300 hover:text-white font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-cyan-300 w-5 text-center">
                              {copies}
                            </span>
                            <button
                              type="button"
                              onClick={() => setClientCopies(client.id, copies + 1)}
                              className="px-1.5 text-slate-300 hover:text-white font-bold"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono">0</span>
                        )}
                      </td>
                      <td
                        className="py-2.5 px-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setPreviewClientId(client.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                            isPreviewing
                              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                              : "bg-slate-800 border-white/10 text-slate-300 hover:text-white"
                          }`}
                        >
                          {isPreviewing
                            ? t("swimStickerStudio.activePreviewBadge")
                            : t("swimStickerStudio.previewBtn")}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── STEP 3: A4 PAGE WRAPPING & SEND TO PRINTER ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: A4 Wrapping Configuration */}
        <Card className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              {t("swimStickerStudio.a4ConfigTitle")}
            </h2>
          </div>

          {/* A4 Orientation */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              {t("swimStickerStudio.a4OrientationLabel")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["portrait", "landscape"] as const).map((orient) => (
                <button
                  key={orient}
                  type="button"
                  onClick={() => updateConfig({ a4Orientation: orient })}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    config.a4Orientation === orient
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                      : "bg-slate-800/60 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {orient === "portrait"
                    ? t("swimStickerStudio.a4Portrait")
                    : t("swimStickerStudio.a4Landscape")}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              {t("swimStickerStudio.gridModeLabel")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["auto", "custom"] as const).map((gm) => (
                <button
                  key={gm}
                  type="button"
                  onClick={() => updateConfig({ gridMode: gm })}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    config.gridMode === gm
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                      : "bg-slate-800/60 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {gm === "auto"
                    ? t("swimStickerStudio.gridAuto")
                    : t("swimStickerStudio.gridCustom")}
                </button>
              ))}
            </div>

            {config.gridMode === "custom" && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">
                    {t("swimStickerStudio.colsLabel")}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={config.customCols}
                    onChange={(e) =>
                      updateConfig({ customCols: parseInt(e.target.value, 10) || 2 })
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">
                    {t("swimStickerStudio.rowsLabel")}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={config.customRows}
                    onChange={(e) =>
                      updateConfig({ customRows: parseInt(e.target.value, 10) || 4 })
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Page Margin & Sticker Gap */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  {t("swimStickerStudio.marginMmLabel")}
                </span>
                <span className="font-mono text-cyan-300 font-bold">
                  {config.pageMarginMm} mm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={config.pageMarginMm}
                onChange={(e) => updateConfig({ pageMarginMm: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">
                  {t("swimStickerStudio.gapMmLabel")}
                </span>
                <span className="font-mono text-cyan-300 font-bold">{config.gapMm} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={config.gapMm}
                onChange={(e) => updateConfig({ gapMm: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Skip Initial Slots on Page 1 */}
          <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">
                {t("swimStickerStudio.skipSlotsLabel")}
              </span>
              <span className="font-mono text-cyan-300 font-bold">
                {config.startSlotOffset} / {Math.max(0, paginatedA4.perPage - 1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(0, paginatedA4.perPage - 1)}
              step="1"
              value={Math.min(config.startSlotOffset, Math.max(0, paginatedA4.perPage - 1))}
              onChange={(e) =>
                updateConfig({ startSlotOffset: parseInt(e.target.value, 10) || 0 })
              }
              className="w-full accent-cyan-400 h-1.5 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              {t("swimStickerStudio.skipSlotsHint")}
            </p>
          </div>

          {/* Big Send to Printer Button */}
          <button
            type="button"
            onClick={handleSendToPrinter}
            disabled={printing}
            className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(0,242,255,0.3)] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>
              {printing
                ? t("swimStickerStudio.preparingPrint")
                : t("swimStickerStudio.sendToPrinterBtn", {
                    stickers: Math.max(1, paginatedA4.totalStickers),
                    pages: paginatedA4.totalPages,
                  })}
            </span>
          </button>
        </Card>

        {/* Right: Live A4 Wrapped Sheet Preview */}
        <Card className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                {t("swimStickerStudio.a4PreviewTitle")}
              </h3>
              <p className="text-[11px] font-mono text-cyan-300 mt-0.5">
                {t("swimStickerStudio.a4StatsSummary", {
                  perPage: paginatedA4.perPage,
                  cols: paginatedA4.cols,
                  rows: paginatedA4.rows,
                  totalStickers: paginatedA4.totalStickers,
                  totalPages: paginatedA4.totalPages,
                })}
              </p>
            </div>

            {paginatedA4.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentA4Page((p) => Math.max(1, p - 1))}
                  disabled={currentA4Page <= 1}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-white border border-white/10"
                >
                  {t("swimStickerStudio.prevPage")}
                </button>
                <span className="text-xs font-mono text-slate-300">
                  {t("swimStickerStudio.pageIndicator", {
                    current: currentA4Page,
                    total: paginatedA4.totalPages,
                  })}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentA4Page((p) => Math.min(paginatedA4.totalPages, p + 1))
                  }
                  disabled={currentA4Page >= paginatedA4.totalPages}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-white border border-white/10"
                >
                  {t("swimStickerStudio.nextPage")}
                </button>
              </div>
            )}
          </div>

          {/* Proportional A4 Sheet Visual Canvas */}
          <div className="flex items-center justify-center p-4 rounded-2xl bg-slate-950/90 border border-white/10 min-h-[420px]">
            <div
              style={{
                width: config.a4Orientation === "portrait" ? "320px" : "440px",
                aspectRatio: `${paginatedA4.pageWidthMm} / ${paginatedA4.pageHeightMm}`,
                padding: `${(config.pageMarginMm / paginatedA4.pageWidthMm) * 100}%`,
              }}
              className="relative bg-white rounded-md shadow-2xl border border-slate-300 overflow-hidden flex items-start justify-center"
            >
              <div
                style={{
                  display: "grid",
                  width: "100%",
                  gridTemplateColumns: `repeat(${paginatedA4.cols}, minmax(0, 1fr))`,
                  gap: `${Math.max(2, config.gapMm * 1.4)}px`,
                }}
              >
                {Array.from({ length: paginatedA4.perPage }).map((_, slotIdx) => {
                  const slotClient =
                    selectedEntries.length === 0 && slotIdx === config.startSlotOffset
                      ? previewClient
                      : activePageSlots[slotIdx] || null;

                  const isSkippedSlot =
                    currentA4Page === 1 && slotIdx < config.startSlotOffset;

                  if (!slotClient) {
                    return (
                      <div
                        key={slotIdx}
                        style={{
                          aspectRatio: `${config.cardWidthMm} / ${config.cardHeightMm}`,
                        }}
                        className={`rounded flex flex-col items-center justify-center text-[8px] font-mono ${
                          isSkippedSlot
                            ? "border border-dashed border-amber-400/70 bg-amber-50/60 text-amber-700"
                            : "border border-dashed border-slate-200 bg-slate-50/50 text-slate-300"
                        }`}
                      >
                        <span>
                          {isSkippedSlot
                            ? t("swimStickerStudio.emptySlotLabel")
                            : `#${slotIdx + 1}`}
                        </span>
                      </div>
                    );
                  }

                  const slotQr = qrMap[`${slotClient.id}_${config.bgMode}`] || null;
                  const slotGroups = resolveClientGroups(slotClient);

                  return (
                    <div
                      key={slotIdx}
                      onClick={() => setPreviewClientId(slotClient.id)}
                      style={{
                        aspectRatio: `${config.cardWidthMm} / ${config.cardHeightMm}`,
                        background: scheme.bg,
                        border: `1px solid ${scheme.border}`,
                        flexDirection: config.qrPosition === "left" ? "row" : "row-reverse",
                        ...(config.cuttingLines
                          ? { outline: "1px dashed #64748b", outlineOffset: "-1px" }
                          : {}),
                      }}
                      className="rounded flex items-center p-1 gap-1.5 overflow-hidden cursor-pointer hover:ring-2 hover:ring-cyan-400 transition-all"
                      title={`${slotClient.fullName} (${slotClient.swimId})`}
                    >
                      {/* Mini QR */}
                      <div className="shrink-0 flex flex-col items-center justify-center">
                        {slotQr ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={slotQr}
                            alt="QR"
                            className="w-8 h-8 object-contain rounded-xs bg-white p-0.5"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-slate-200 rounded-xs flex items-center justify-center text-[6px] font-bold text-slate-600">
                            QR
                          </div>
                        )}
                        {config.showCardCode && (
                          <span
                            style={{ color: scheme.mono }}
                            className="text-[5px] font-mono font-bold leading-none mt-0.5 truncate max-w-[36px]"
                          >
                            {slotClient.card?.cardCode || slotClient.swimId}
                          </span>
                        )}
                      </div>

                      {/* Mini Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center leading-tight overflow-hidden">
                        {config.showName && (
                          <div
                            style={{ color: scheme.text }}
                            className="text-[7px] font-black uppercase truncate"
                          >
                            {slotClient.fullName}
                          </div>
                        )}
                        {config.showSwimId && (
                          <div
                            style={{ color: scheme.mono }}
                            className="text-[6px] font-mono font-bold truncate"
                          >
                            {slotClient.swimId}
                          </div>
                        )}
                        {config.showGroupTypeFormula && (
                          <div
                            style={{ color: scheme.accent }}
                            className="text-[6px] font-bold truncate"
                          >
                            {slotClient.formula || "G10"}
                          </div>
                        )}
                        {(config.showGroupDayHour || config.showCoach) &&
                          slotGroups[0] && (
                            <div
                              style={{ color: scheme.textMuted }}
                              className="text-[5.5px] truncate"
                            >
                              {slotGroups[0].schedule || slotGroups[0].name}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedEntries.length === 0 && (
            <p className="text-center text-xs text-slate-400">
              {t("swimStickerStudio.noSelectionForA4")}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
