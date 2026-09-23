"use client";

import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import { useLocale } from "@/lib/i18n";

export interface SwimPrintMemberInfo {
  fullName: string;
  swimId: string;
  category: string;
  level?: string;
  formula?: string;
  duration?: string | null;
  coachMessage?: string | null;
  group?: {
    name: string;
    coachName?: string | null;
    schedule?: string | null;
    level?: string;
  } | null;
  effectiveGroup?: {
    name: string;
    coachName?: string | null;
    schedule?: string | null;
    level?: string;
  } | null;
  groups?: Array<{
    name: string;
    coachName?: string | null;
    schedule?: string | null;
    level?: string;
  }>;
  effectiveGroups?: Array<{
    name: string;
    coachName?: string | null;
    schedule?: string | null;
    level?: string;
  }>;
  card?: {
    cardCode: string;
    publicToken: string;
    status?: string;
  } | null;
}

interface SwimPvcPrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: SwimPrintMemberInfo;
  qrDataUrl?: string | null;
}

type A4PlacementMode = "top-left" | "top-center" | "top-right" | "center" | "grid-2x4";

export function SwimPvcPrintDialog({
  isOpen,
  onClose,
  member,
  qrDataUrl: precomputedQr,
}: SwimPvcPrintDialogProps) {
  const { t } = useLocale();

  // Card dimensions
  const [cardWidthMm, setCardWidthMm] = useState<number>(85.6);
  const [cardHeightMm, setCardHeightMm] = useState<number>(54);

  // Field checkboxes
  const [showName, setShowName] = useState<boolean>(true);
  const [showId, setShowId] = useState<boolean>(true);
  const [showCoach, setShowCoach] = useState<boolean>(true);
  const [showGroupTypeFormula, setShowGroupTypeFormula] = useState<boolean>(true);
  const [showGroupDayHour, setShowGroupDayHour] = useState<boolean>(true);
  const [showCategory, setShowCategory] = useState<boolean>(true);

  // Layout & Spacing
  const [fontSize, setFontSize] = useState<number>(11);
  const [qrInfoSpacingMm, setQrInfoSpacingMm] = useState<number>(4);
  const [a4Placement, setA4Placement] = useState<A4PlacementMode>("top-left");
  const [cuttingLines, setCuttingLines] = useState<boolean>(true);

  // Sticker background options
  const [bgMode, setBgMode] = useState<"white" | "dark">("white");

  // QR state
  const [generatedQr, setGeneratedQr] = useState<string | null>(precomputedQr || null);

  // Generate QR if not precomputed
  useEffect(() => {
    if (precomputedQr) {
      setGeneratedQr(precomputedQr);
      return;
    }
    if (member.card?.publicToken) {
      const publicUrl = typeof window !== "undefined"
        ? `${window.location.origin}/swim/card/${member.card.publicToken}`
        : `https://aqasports.com/swim/card/${member.card.publicToken}`;

      QRCode.toDataURL(publicUrl, {
        width: 320,
        margin: 1,
        color: {
          dark: bgMode === "dark" ? "#00f2ff" : "#030712",
          light: bgMode === "dark" ? "#0f172a" : "#ffffff",
        },
      })
        .then(setGeneratedQr)
        .catch(() => setGeneratedQr(null));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.card?.publicToken, precomputedQr, bgMode]);

  // Resolved multi-group data — show ALL assigned groups
  const allGroups = useMemo(() => {
    const arr =
      (member.effectiveGroups && member.effectiveGroups.length > 0
        ? member.effectiveGroups
        : member.groups && member.groups.length > 0
        ? member.groups
        : member.effectiveGroup
        ? [member.effectiveGroup]
        : member.group
        ? [member.group]
        : []);
    return arr;
  }, [member.effectiveGroups, member.groups, member.effectiveGroup, member.group]);

  // Unique coaches across all groups
  const allCoaches = useMemo(() => {
    const coaches = allGroups
      .map((g) => g.coachName)
      .filter((c): c is string => Boolean(c));
    return [...new Set(coaches)];
  }, [allGroups]);

  // All schedules across all groups
  const allSchedules = useMemo(() => {
    return allGroups
      .map((g) => g.schedule)
      .filter((s): s is string => Boolean(s));
  }, [allGroups]);

  // Formula / group type display
  const formulaDisplay = useMemo(() => {
    const formulaText = member.formula || "Standard";
    const durText = member.duration ? ` · ${member.duration}` : "";
    return `${formulaText}${durText}`;
  }, [member.formula, member.duration]);

  // Group type display (from first group level)
  const groupTypeDisplay = useMemo(() => {
    const lvl = allGroups[0]?.level || member.level || "";
    const formulaText = member.formula || "Standard";
    const durText = member.duration ? ` · ${member.duration}` : "";
    return lvl ? `${lvl} - ${formulaText}${durText}` : `${formulaText}${durText}`;
  }, [allGroups, member.formula, member.duration, member.level]);

  // Category display
  const categoryDisplay = useMemo(() => {
    const cat = member.category ? member.category.toUpperCase() : "SWIM";
    const lvl = member.level ? ` (${member.level})` : "";
    return `${cat}${lvl}`;
  }, [member.category, member.level]);

  // Sticker color scheme
  const scheme = useMemo(() => {
    if (bgMode === "dark") {
      return {
        bg: "#0f172a",
        border: "#1e293b",
        text: "#f8fafc",
        textMuted: "#94a3b8",
        accent: "#00f2ff",
        mono: "#38bdf8",
        qrBg: "#0f172a",
        qrFg: "#00f2ff",
        divider: "rgba(255,255,255,0.10)",
        nameShadow: "none",
      };
    }
    return {
      bg: "#ffffff",
      border: "#e2e8f0",
      text: "#0f172a",
      textMuted: "#475569",
      accent: "#0ea5e9",
      mono: "#0284c7",
      qrBg: "#ffffff",
      qrFg: "#030712",
      divider: "#e2e8f0",
      nameShadow: "none",
    };
  }, [bgMode]);

  // Print sticker HTML for a single card — NO background images, sticker only
  const renderSingleStickerHtml = () => {
    const qrSizeMm = Math.min(cardHeightMm * 0.60, 38);
    const paddingMm = 2.5;

    const groupRowsHtml = allGroups.map((g) => `
      <div style="
        display: flex;
        align-items: flex-start;
        gap: 1.5mm;
        margin-top: 0.8mm;
        font-size: ${fontSize * 0.75}px;
        color: ${scheme.textMuted};
        line-height: 1.2;
      ">
        <span style="
          display: inline-block;
          width: 3.5mm;
          height: 3.5mm;
          background: ${scheme.accent};
          border-radius: 0.5mm;
          flex-shrink: 0;
          margin-top: 0.3mm;
        "></span>
        <div>
          ${g.schedule ? `<div style="font-weight:600; color:${scheme.text};">${g.schedule}</div>` : ""}
          ${g.coachName ? `<div style="color:${scheme.textMuted};">Coach: ${g.coachName}</div>` : ""}
        </div>
      </div>
    `).join("");

    const coachLineHtml = allCoaches.length > 0
      ? `<div style="
          font-size: ${fontSize * 0.78}px;
          font-weight: 700;
          color: ${scheme.accent};
          margin-top: 0.5mm;
          line-height: 1.2;
        ">Coach: ${allCoaches.join(" / ")}</div>`
      : "";

    const scheduleLinesHtml = showGroupDayHour
      ? allSchedules.map((s) => `<div style="
          font-size: ${fontSize * 0.75}px;
          color: ${scheme.textMuted};
          line-height: 1.2;
          margin-top: 0.3mm;
        ">${s}</div>`).join("")
      : "";

    return `
      <div class="pvc-sticker" style="
        width: ${cardWidthMm}mm;
        height: ${cardHeightMm}mm;
        position: relative;
        display: flex;
        align-items: stretch;
        border-radius: 2.5mm;
        box-sizing: border-box;
        background: ${scheme.bg};
        border: 0.3mm solid ${scheme.border};
        overflow: hidden;
        font-family: Inter, system-ui, sans-serif;
        ${cuttingLines ? "outline: 0.5mm dashed #94a3b8; outline-offset: -0.5mm;" : ""}
      ">
        <!-- QR Section -->
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: ${paddingMm}mm;
          border-right: 0.3mm solid ${scheme.divider};
          flex-shrink: 0;
        ">
          <div style="
            background: ${scheme.qrBg};
            padding: 1mm;
            border-radius: 1.5mm;
            border: 0.3mm solid ${scheme.border};
          ">
            ${generatedQr ? `
              <img
                src="${generatedQr}"
                alt="QR"
                style="
                  width: ${qrSizeMm}mm;
                  height: ${qrSizeMm}mm;
                  display: block;
                  object-fit: contain;
                "
              />
            ` : `
              <div style="
                width: ${qrSizeMm}mm;
                height: ${qrSizeMm}mm;
                background: #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
                color: #475569;
                font-weight: bold;
              ">QR</div>
            `}
          </div>
          ${showId && member.card?.cardCode ? `
            <div style="
              font-family: monospace;
              font-size: 6.5px;
              font-weight: 800;
              color: ${scheme.mono};
              margin-top: 1mm;
              letter-spacing: 0.5px;
              text-align: center;
            ">${member.card.cardCode}</div>
          ` : ""}
        </div>

        <!-- Spacing between QR and Information -->
        <div style="width: ${qrInfoSpacingMm}mm; flex-shrink: 0;"></div>

        <!-- Information Section -->
        <div style="
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: ${paddingMm}mm ${paddingMm}mm ${paddingMm}mm 0;
          overflow: hidden;
        ">
          ${showName ? `
            <div style="
              font-weight: 900;
              font-size: ${fontSize * 1.1}px;
              text-transform: uppercase;
              color: ${scheme.text};
              line-height: 1.15;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              letter-spacing: 0.5px;
            ">${member.fullName}</div>
          ` : ""}

          ${showId ? `
            <div style="
              font-family: monospace;
              font-weight: 800;
              font-size: ${fontSize * 0.9}px;
              color: ${scheme.mono};
              margin-top: 0.5mm;
              line-height: 1;
            ">${member.swimId}</div>
          ` : ""}

          ${showCategory ? `
            <div style="
              font-size: ${fontSize * 0.8}px;
              font-weight: 700;
              color: ${scheme.textMuted};
              margin-top: 0.5mm;
              line-height: 1.1;
            ">${categoryDisplay}</div>
          ` : ""}

          ${showGroupTypeFormula ? `
            <div style="
              font-size: ${fontSize * 0.82}px;
              font-weight: 600;
              color: ${scheme.accent};
              margin-top: 0.8mm;
              line-height: 1.1;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            ">${groupTypeDisplay}</div>
          ` : ""}

          ${showGroupDayHour || showCoach ? `
            <div style="margin-top: 0.5mm;">
              ${allGroups.map((g) => `
                <div style="
                  font-size: ${fontSize * 0.72}px;
                  color: ${scheme.textMuted};
                  line-height: 1.3;
                  display: flex;
                  align-items: flex-start;
                  gap: 1mm;
                  margin-top: 0.4mm;
                ">
                  <span style="
                    display:inline-block;
                    width:1.5mm;
                    height:1.5mm;
                    background:${scheme.accent};
                    border-radius:50%;
                    flex-shrink:0;
                    margin-top:1mm;
                  "></span>
                  <span>
                    ${showGroupDayHour && g.schedule ? `<strong style="color:${scheme.text};">${g.schedule}</strong>` : ""}
                    ${showCoach && g.coachName ? `${showGroupDayHour && g.schedule ? " · " : ""}Coach: ${g.coachName}` : ""}
                  </span>
                </div>
              `).join("")}
            </div>
          ` : ""}
        </div>

        <!-- AQA Logo Watermark top-right -->
        <div style="
          position: absolute;
          top: 2mm;
          right: 2mm;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 1px;
          color: ${scheme.accent};
          text-transform: uppercase;
          opacity: 0.6;
        ">AQA SWIM</div>
      </div>
    `;
  };

  // Build full A4 page HTML
  const renderA4Html = () => {
    if (a4Placement === "grid-2x4") {
      const cardsHtml = Array.from({ length: 8 }).map(() => renderSingleStickerHtml()).join("");
      return `
        <div class="a4-sheet" style="
          width: 210mm;
          height: 297mm;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          background: white;
          page-break-after: always;
        ">
          <div style="
            display: grid;
            grid-template-columns: repeat(2, ${cardWidthMm}mm);
            gap: 3mm;
            justify-content: center;
            align-content: center;
          ">
            ${cardsHtml}
          </div>
        </div>
      `;
    }

    let posStyle = "top: 15mm; left: 15mm;";
    if (a4Placement === "top-center") posStyle = "top: 15mm; left: 50%; transform: translateX(-50%);";
    else if (a4Placement === "top-right") posStyle = "top: 15mm; right: 15mm;";
    else if (a4Placement === "center") posStyle = "top: 50%; left: 50%; transform: translate(-50%, -50%);";

    return `
      <div class="a4-sheet" style="
        width: 210mm;
        height: 297mm;
        position: relative;
        box-sizing: border-box;
        background: white;
        page-break-after: always;
      ">
        <div style="position: absolute; ${posStyle}">
          ${renderSingleStickerHtml()}
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=960,height=800");
    if (!printWindow) {
      alert("Please allow popups to print.");
      return;
    }

    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>AQA Swim - PVC Sticker - ${member.fullName}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-family: Inter, system-ui, -apple-system, sans-serif;
            }
            * { box-sizing: border-box; }
            @media screen {
              body { background: #0f172a; padding: 20px; display: flex; flex-direction: column; align-items: center; }
              .a4-sheet { background: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.5); margin-bottom: 20px; }
            }
          </style>
        </head>
        <body>
          ${renderA4Html()}
          <script>
            window.onload = function() {
              setTimeout(function() { window.focus(); window.print(); }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(doc);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  // ─── Visionator — Live sticker preview ────────────────────────────────────
  const previewQrSize = Math.min(cardHeightMm * 3.6, 96);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">{t("swimPvcPrint.dialogTitle")}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{member.fullName}</span>
                <span>·</span>
                <span className="font-mono text-cyan-300">{member.swimId}</span>
                {allGroups.length > 1 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                    {allGroups.length} groups
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {/* Left: Controls */}
          <div className="lg:col-span-5 p-5 space-y-5 bg-slate-900/90 overflow-y-auto">

            {/* 1. Background Mode (Sticker Style) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">Sticker Style</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBgMode("white")}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    bgMode === "white"
                      ? "bg-white border-cyan-400 text-slate-900 shadow-[0_0_12px_rgba(0,242,255,0.20)]"
                      : "bg-slate-800/60 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="w-3 h-3 rounded-sm bg-white border border-slate-300 shrink-0" />
                  White
                </button>
                <button
                  type="button"
                  onClick={() => setBgMode("dark")}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    bgMode === "dark"
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                      : "bg-slate-800/60 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="w-3 h-3 rounded-sm bg-slate-900 border border-slate-700 shrink-0" />
                  Dark
                </button>
              </div>
            </div>

            {/* 2. Card Dimensions */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">{t("swimPvcPrint.sizeMm")}</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">{t("swimPvcPrint.width")}</span>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="150"
                    value={cardWidthMm}
                    onChange={(e) => setCardWidthMm(parseFloat(e.target.value) || 54)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">{t("swimPvcPrint.height")}</span>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="150"
                    value={cardHeightMm}
                    onChange={(e) => setCardHeightMm(parseFloat(e.target.value) || 54)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
              <div className="text-[10px] text-slate-500 italic">Standard PVC card: 85.6 × 54 mm</div>
            </div>

            {/* 3. Printable Fields */}
            <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">{t("swimPvcPrint.fieldsTitle")}</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { label: t("swimPvcPrint.fieldName"), checked: showName, onChange: setShowName },
                  { label: t("swimPvcPrint.fieldId"), checked: showId, onChange: setShowId },
                  { label: t("swimPvcPrint.fieldCoach"), checked: showCoach, onChange: setShowCoach },
                  { label: t("swimPvcPrint.fieldGroupTypeFormula"), checked: showGroupTypeFormula, onChange: setShowGroupTypeFormula },
                  { label: t("swimPvcPrint.fieldGroupDayHour"), checked: showGroupDayHour, onChange: setShowGroupDayHour },
                  { label: t("swimPvcPrint.fieldCategory"), checked: showCategory, onChange: setShowCategory },
                ].map(({ label, checked, onChange }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onChange(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 4. Font Size Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300">{t("swimPvcPrint.fontSize")}</span>
                <span className="font-mono text-cyan-300 font-bold">{fontSize} px</span>
              </div>
              <input
                type="range" min="7" max="15" step="0.5" value={fontSize}
                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* 5. QR to Info Spacing */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300">{t("swimPvcPrint.qrInfoSpacing")}</span>
                <span className="font-mono text-cyan-300 font-bold">{qrInfoSpacingMm} mm</span>
              </div>
              <input
                type="range" min="1" max="12" step="0.5" value={qrInfoSpacingMm}
                onChange={(e) => setQrInfoSpacingMm(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* 6. A4 Placement */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">{t("swimPvcPrint.a4Placement")}</label>
              <select
                value={a4Placement}
                onChange={(e) => setA4Placement(e.target.value as A4PlacementMode)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="top-left">{t("swimPvcPrint.placementTopLeft")}</option>
                <option value="top-center">{t("swimPvcPrint.placementTopCenter")}</option>
                <option value="top-right">{t("swimPvcPrint.placementTopRight")}</option>
                <option value="center">{t("swimPvcPrint.placementCenter")}</option>
                <option value="grid-2x4">{t("swimPvcPrint.placementGrid2x4")}</option>
              </select>
            </div>

            {/* 7. Cutting Lines */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5">
              <div>
                <span className="text-xs font-bold text-slate-300 block">{t("swimPvcPrint.cuttingLines")}</span>
                <span className="text-[10px] text-slate-400">
                  {cuttingLines ? t("swimPvcPrint.cuttingLinesOn") : t("swimPvcPrint.cuttingLinesOff")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCuttingLines(!cuttingLines)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${cuttingLines ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"}`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>

          {/* Right: Visionators */}
          <div className="lg:col-span-7 p-5 space-y-5 bg-slate-950 overflow-y-auto flex flex-col">
            {/* Live Sticker Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white">{t("swimPvcPrint.livePreview")}</span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                  {cardWidthMm} × {cardHeightMm} mm
                </span>
              </div>

              <div
                className={`flex items-center justify-center p-4 rounded-2xl border border-white/5 min-h-[180px] ${bgMode === "dark" ? "bg-slate-800/60" : "bg-slate-700/40"}`}
              >
                {/* Sticker preview — white bg, QR + text only */}
                <div
                  style={{
                    width: "100%",
                    maxWidth: "380px",
                    aspectRatio: `${cardWidthMm} / ${cardHeightMm}`,
                    background: bgMode === "white" ? "#ffffff" : "#0f172a",
                    border: `1px solid ${bgMode === "white" ? "#e2e8f0" : "#1e293b"}`,
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "stretch",
                    overflow: "hidden",
                    position: "relative",
                    ...(cuttingLines ? { outline: "2px dashed rgba(0,242,255,0.6)", outlineOffset: "2px" } : {}),
                  }}
                >
                  {/* QR Left */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px",
                      borderRight: `1px solid ${bgMode === "white" ? "#e2e8f0" : "rgba(255,255,255,0.1)"}`,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        background: bgMode === "white" ? "#fff" : "#0f172a",
                        padding: "4px",
                        borderRadius: "6px",
                        border: `1px solid ${bgMode === "white" ? "#e2e8f0" : "rgba(255,255,255,0.1)"}`,
                      }}
                    >
                      {generatedQr ? (
                        <img
                          src={generatedQr}
                          alt="QR"
                          style={{ width: `${previewQrSize}px`, height: `${previewQrSize}px`, display: "block", objectFit: "contain" }}
                        />
                      ) : (
                        <div style={{ width: `${previewQrSize}px`, height: `${previewQrSize}px`, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "10px", color: "#94a3b8" }}>QR</span>
                        </div>
                      )}
                    </div>
                    {showId && member.card?.cardCode && (
                      <span style={{ fontFamily: "monospace", fontSize: "8px", fontWeight: 800, color: bgMode === "white" ? "#0284c7" : "#38bdf8", marginTop: "4px", letterSpacing: "0.5px" }}>
                        {member.card.cardCode}
                      </span>
                    )}
                  </div>

                  {/* Spacer */}
                  <div style={{ width: `${Math.max(4, qrInfoSpacingMm * 2.8)}px`, flexShrink: 0 }} />

                  {/* Info Right */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      padding: "8px 8px 8px 0",
                      gap: "2px",
                    }}
                  >
                    {showName && (
                      <div style={{ fontWeight: 900, fontSize: `${fontSize}px`, textTransform: "uppercase", color: bgMode === "white" ? "#0f172a" : "#f8fafc", lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {member.fullName}
                      </div>
                    )}

                    {showId && (
                      <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: `${fontSize * 0.88}px`, color: bgMode === "white" ? "#0284c7" : "#38bdf8" }}>
                        {member.swimId}
                      </div>
                    )}

                    {showCategory && (
                      <div style={{ fontSize: `${fontSize * 0.78}px`, fontWeight: 700, color: bgMode === "white" ? "#475569" : "#94a3b8" }}>
                        {categoryDisplay}
                      </div>
                    )}

                    {showGroupTypeFormula && (
                      <div style={{ fontSize: `${fontSize * 0.78}px`, fontWeight: 600, color: bgMode === "white" ? "#0ea5e9" : "#00f2ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {groupTypeDisplay}
                      </div>
                    )}

                    {/* All groups with schedules and coaches */}
                    {(showGroupDayHour || showCoach) && allGroups.map((g, i) => (
                      <div key={i} style={{ fontSize: `${fontSize * 0.72}px`, color: bgMode === "white" ? "#64748b" : "#94a3b8", lineHeight: 1.3, display: "flex", alignItems: "flex-start", gap: "3px" }}>
                        <span style={{ display: "inline-block", width: "5px", height: "5px", background: bgMode === "white" ? "#0ea5e9" : "#00f2ff", borderRadius: "50%", flexShrink: 0, marginTop: "3px" }} />
                        <span>
                          {showGroupDayHour && g.schedule && <strong style={{ color: bgMode === "white" ? "#334155" : "#e2e8f0" }}>{g.schedule}</strong>}
                          {showCoach && g.coachName && <span style={{ color: bgMode === "white" ? "#64748b" : "#94a3b8" }}>{showGroupDayHour && g.schedule ? " · " : ""}Coach: {g.coachName}</span>}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* AQA watermark */}
                  <div style={{ position: "absolute", top: "3px", right: "4px", fontSize: "6px", fontWeight: 900, letterSpacing: "1px", color: bgMode === "white" ? "#0ea5e9" : "#00f2ff", opacity: 0.5, textTransform: "uppercase" }}>
                    AQA SWIM
                  </div>
                </div>
              </div>
            </div>

            {/* A4 Sheet Preview */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{t("swimPvcPrint.pagePreview")}</span>
                <span className="text-[10px] text-slate-400 font-mono">{t("swimPvcPrint.pageSummary")}</span>
              </div>
              <div className="flex items-center justify-center p-3 rounded-2xl bg-slate-900/60 border border-white/5">
                <div
                  style={{ width: "160px", height: "226px" }}
                  className="relative bg-white rounded shadow-lg border border-slate-200 overflow-hidden flex flex-col justify-between p-1.5"
                >
                  <div className="absolute inset-2 border border-slate-100 pointer-events-none" />

                  {a4Placement === "grid-2x4" ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="grid grid-cols-2 gap-1">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={i}
                            style={{ width: "55px", aspectRatio: `${cardWidthMm} / ${cardHeightMm}` }}
                            className={`rounded-sm flex items-center justify-center text-[6px] font-mono font-bold ${bgMode === "dark" ? "bg-slate-800 text-cyan-300" : "bg-slate-100 text-slate-500"} ${cuttingLines ? "border border-dashed border-cyan-500" : "border border-slate-200"}`}
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full h-full">
                      <div
                        style={{
                          width: `${Math.min(65, (cardWidthMm / 85.6) * 55)}px`,
                          aspectRatio: `${cardWidthMm} / ${cardHeightMm}`,
                          ...(a4Placement === "top-left" && { top: "4px", left: "4px", position: "absolute" }),
                          ...(a4Placement === "top-center" && { top: "4px", left: "50%", transform: "translateX(-50%)", position: "absolute" }),
                          ...(a4Placement === "top-right" && { top: "4px", right: "4px", position: "absolute" }),
                          ...(a4Placement === "center" && { top: "50%", left: "50%", transform: "translate(-50%, -50%)", position: "absolute" }),
                        }}
                        className={`rounded-sm flex items-center justify-center text-[7px] font-mono font-bold shadow ${bgMode === "dark" ? "bg-slate-800 text-cyan-300" : "bg-slate-100 text-slate-500"} ${cuttingLines ? "border border-dashed border-cyan-400" : "border border-slate-300"}`}
                      >
                        PVC
                      </div>
                    </div>
                  )}

                  <div className="relative z-10 flex justify-between text-[6.5px] font-mono text-slate-400">
                    <span>A4</span>
                    <span>{a4Placement}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-slate-950/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {t("swimPvcPrint.closeBtn")}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(0,242,255,0.3)] active:scale-[0.98] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>{t("swimPvcPrint.printBtn")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
