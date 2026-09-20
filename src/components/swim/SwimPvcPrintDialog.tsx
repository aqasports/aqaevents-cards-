"use client";

import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import { useLocale } from "@/lib/i18n";
import { getCardTier, CardTierInfo } from "@/lib/swim-pricing";

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

type OrientationMode = "landscape" | "portrait";
type A4PlacementMode = "top-left" | "top-center" | "top-right" | "center" | "grid-2x4";

export function SwimPvcPrintDialog({
  isOpen,
  onClose,
  member,
  qrDataUrl: precomputedQr,
}: SwimPvcPrintDialogProps) {
  const { t } = useLocale();

  // Print configuration state
  const [orientation, setOrientation] = useState<OrientationMode>("landscape");
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

  // Visionator state
  const [activeFace, setActiveFace] = useState<"back" | "front">("back");
  const [generatedQr, setGeneratedQr] = useState<string | null>(precomputedQr || null);

  // Tier info for background images
  const tier: CardTierInfo = useMemo(() => {
    return getCardTier(member.formula, member.duration);
  }, [member.formula, member.duration]);

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
          dark: "#030712",
          light: "#ffffff",
        },
      })
        .then(setGeneratedQr)
        .catch(() => setGeneratedQr(null));
    }
  }, [member.card?.publicToken, precomputedQr]);

  // Derived member labels
  const coachName = useMemo(() => {
    return (
      member.effectiveGroup?.coachName ||
      member.group?.coachName ||
      member.groups?.find((g) => g.coachName)?.coachName ||
      "AQA Coach"
    );
  }, [member]);

  const groupTypeFormula = useMemo(() => {
    const groupType =
      member.effectiveGroup?.level ||
      member.group?.level ||
      member.groups?.[0]?.level ||
      member.level ||
      "Standard";
    const formulaText = member.formula || tier.badge;
    const durText = member.duration ? ` · ${member.duration}` : "";
    return `${groupType} - ${formulaText}${durText}`;
  }, [member, tier.badge]);

  const groupSchedule = useMemo(() => {
    const schedule =
      member.effectiveGroup?.schedule ||
      member.group?.schedule ||
      member.groups?.map((g) => g.schedule).filter(Boolean).join(" | ");
    return schedule || "Weekly Sessions";
  }, [member]);

  const categoryLevel = useMemo(() => {
    const cat = member.category ? member.category.toUpperCase() : "SWIM";
    const lvl = member.level ? ` (${member.level})` : "";
    return `${cat}${lvl}`;
  }, [member]);

  // Orientation switch handler
  const handleOrientationChange = (newOrientation: OrientationMode) => {
    setOrientation(newOrientation);
    if (newOrientation === "landscape") {
      setCardWidthMm(85.6);
      setCardHeightMm(54);
    } else {
      // Square portrait
      setCardWidthMm(54);
      setCardHeightMm(54);
    }
  };

  // Print execution
  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=960,height=800");
    if (!printWindow) {
      alert("Please allow popups to print the card.");
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const bgImageSrc = activeFace === "front"
      ? `${origin}${tier.frontImage}`
      : `${origin}${tier.backImage}`;

    // Aspect ratio styling
    const qrSizeMm = Math.min(cardHeightMm * 0.52, 34);

    // Build Single Card HTML
    const renderSingleCardHtml = () => `
      <div class="pvc-card" style="
        width: ${cardWidthMm}mm;
        height: ${cardHeightMm}mm;
        position: relative;
        overflow: hidden;
        border-radius: 2.5mm;
        box-sizing: border-box;
        background-color: #0f172a;
        ${cuttingLines ? "outline: 0.35mm dashed #64748b; outline-offset: -0.35mm;" : ""}
      ">
        <img
          src="${bgImageSrc}"
          alt="Card Background"
          style="
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 1;
            display: block;
          "
        />

        <div style="
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(3, 7, 18, 0.45) 0%, rgba(3, 7, 18, 0.25) 50%, rgba(3, 7, 18, 0.65) 100%);
          z-index: 2;
        "></div>

        ${activeFace === "front" ? `
          <div style="
            position: relative;
            z-index: 3;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 4mm;
            box-sizing: border-box;
            color: #ffffff;
            font-family: Inter, system-ui, sans-serif;
          ">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span style="
                background: #0284c7;
                color: #ffffff;
                font-weight: 900;
                font-size: 8px;
                letter-spacing: 1px;
                padding: 1.5px 5px;
                border-radius: 3px;
                text-transform: uppercase;
              ">AQA SPORTS</span>
              <span style="
                background: rgba(0,0,0,0.6);
                border: 0.3mm solid rgba(255,255,255,0.2);
                color: #f8fafc;
                font-weight: 800;
                font-size: 7.5px;
                padding: 1px 5px;
                border-radius: 10px;
                text-transform: uppercase;
              ">${member.formula || tier.badge}</span>
            </div>

            <div>
              ${showName ? `<div style="font-weight: 900; font-size: ${fontSize * 1.2}px; text-transform: uppercase; line-height: 1.2; text-shadow: 0 1px 3px rgba(0,0,0,0.9);">${member.fullName}</div>` : ""}
              <div style="display: flex; gap: 4px; align-items: center; margin-top: 2px;">
                ${showId ? `<span style="font-family: monospace; font-weight: 800; font-size: ${fontSize * 0.9}px; color: #38bdf8; text-shadow: 0 1px 2px rgba(0,0,0,0.9);">${member.swimId}</span>` : ""}
                ${showCategory ? `<span style="font-size: 7.5px; background: rgba(0,0,0,0.5); padding: 1px 4px; border-radius: 3px; border: 0.2mm solid rgba(255,255,255,0.15);">${categoryLevel}</span>` : ""}
              </div>
            </div>
          </div>
        ` : `
          <div style="
            position: relative;
            z-index: 3;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            padding: 3.5mm;
            box-sizing: border-box;
            color: #ffffff;
            font-family: Inter, system-ui, sans-serif;
          ">
            <!-- QR Section -->
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: #ffffff;
              padding: 1.2mm;
              border-radius: 2mm;
              box-shadow: 0 1mm 2.5mm rgba(0,0,0,0.3);
              flex-shrink: 0;
            ">
              ${generatedQr ? `
                <img
                  src="${generatedQr}"
                  alt="Pass QR Code"
                  style="width: ${qrSizeMm}mm; height: ${qrSizeMm}mm; object-fit: contain; display: block;"
                />
              ` : `
                <div style="width: ${qrSizeMm}mm; height: ${qrSizeMm}mm; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #475569;">QR</div>
              `}
              ${showId && member.card?.cardCode ? `
                <div style="font-family: monospace; font-weight: 900; font-size: 7px; color: #0f172a; margin-top: 1px; letter-spacing: 0.5px;">
                  ${member.card.cardCode}
                </div>
              ` : ""}
            </div>

            <!-- Spacing between QR and Information -->
            <div style="width: ${qrInfoSpacingMm}mm; flex-shrink: 0;"></div>

            <!-- Swimmer Information -->
            <div style="
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 1mm;
              overflow: hidden;
            ">
              ${showName ? `
                <div style="
                  font-weight: 900;
                  font-size: ${fontSize * 1.15}px;
                  text-transform: uppercase;
                  color: #ffffff;
                  line-height: 1.15;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  text-shadow: 0 1px 3px rgba(0,0,0,0.9);
                ">
                  ${member.fullName}
                </div>
              ` : ""}

              ${showId ? `
                <div style="
                  font-family: monospace;
                  font-weight: 800;
                  font-size: ${fontSize * 0.95}px;
                  color: #38bdf8;
                  line-height: 1;
                  text-shadow: 0 1px 2px rgba(0,0,0,0.9);
                ">
                  ${member.swimId}
                </div>
              ` : ""}

              ${showCategory ? `
                <div style="
                  font-size: ${fontSize * 0.85}px;
                  font-weight: 700;
                  color: #cbd5e1;
                  line-height: 1.1;
                  text-shadow: 0 1px 2px rgba(0,0,0,0.9);
                ">
                  ${categoryLevel}
                </div>
              ` : ""}

              ${showGroupTypeFormula ? `
                <div style="
                  font-size: ${fontSize * 0.85}px;
                  font-weight: 600;
                  color: #93c5fd;
                  line-height: 1.1;
                  text-shadow: 0 1px 2px rgba(0,0,0,0.9);
                ">
                  ${groupTypeFormula}
                </div>
              ` : ""}

              ${showGroupDayHour ? `
                <div style="
                  font-size: ${fontSize * 0.8}px;
                  font-weight: 500;
                  color: #e2e8f0;
                  line-height: 1.1;
                  text-shadow: 0 1px 2px rgba(0,0,0,0.9);
                ">
                  ${groupSchedule}
                </div>
              ` : ""}

              ${showCoach ? `
                <div style="
                  font-size: ${fontSize * 0.8}px;
                  font-weight: 700;
                  color: #00f2ff;
                  line-height: 1.1;
                  text-shadow: 0 1px 2px rgba(0,0,0,0.9);
                ">
                  Coach: ${coachName}
                </div>
              ` : ""}
            </div>
          </div>
        `}
      </div>
    `;

    // Position container logic for A4
    let layoutHtml = "";
    if (a4Placement === "grid-2x4") {
      const cardsArray = Array.from({ length: 8 })
        .map(() => renderSingleCardHtml())
        .join("");

      layoutHtml = `
        <div class="a4-sheet" style="
          width: 210mm;
          height: 297mm;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          page-break-after: always;
        ">
          <div style="
            display: grid;
            grid-template-columns: repeat(2, ${cardWidthMm}mm);
            grid-gap: 3mm;
            justify-content: center;
            align-content: center;
          ">
            ${cardsArray}
          </div>
        </div>
      `;
    } else {
      let positionStyle = "top: 15mm; left: 15mm;";
      if (a4Placement === "top-center") {
        positionStyle = "top: 15mm; left: 50%; transform: translateX(-50%);";
      } else if (a4Placement === "top-right") {
        positionStyle = "top: 15mm; right: 15mm;";
      } else if (a4Placement === "center") {
        positionStyle = "top: 50%; left: 50%; transform: translate(-50%, -50%);";
      }

      layoutHtml = `
        <div class="a4-sheet" style="
          width: 210mm;
          height: 297mm;
          position: relative;
          box-sizing: border-box;
          page-break-after: always;
        ">
          <div style="position: absolute; ${positionStyle}">
            ${renderSingleCardHtml()}
          </div>
        </div>
      `;
    }

    const printDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>AQA Swim - PVC Pass Card - ${member.fullName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-family: Inter, system-ui, -apple-system, sans-serif;
            }
            * {
              box-sizing: border-box;
            }
            @media screen {
              body {
                background-color: #0f172a;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .a4-sheet {
                background-color: #ffffff;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                margin-bottom: 20px;
              }
            }
          </style>
        </head>
        <body>
          ${layoutHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printDocument);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-white/15 shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                {t("swimPvcPrint.dialogTitle")}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{member.fullName}</span>
                <span>·</span>
                <span className="font-mono text-cyan-300">{member.swimId}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Dialog Content Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {/* Left Column: Configuration Controls (5 cols) */}
          <div className="lg:col-span-5 p-5 space-y-5 bg-slate-900/90 overflow-y-auto max-h-[calc(92vh-140px)]">
            {/* 1. Orientation */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {t("swimPvcPrint.orientation")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOrientationChange("landscape")}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    orientation === "landscape"
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                      : "bg-slate-800/60 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-3.5 border border-current rounded-sm" fill="none" viewBox="0 0 16 11" />
                  <span>{t("swimPvcPrint.landscape")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOrientationChange("portrait")}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    orientation === "portrait"
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,242,255,0.15)]"
                      : "bg-slate-800/60 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 border border-current rounded-sm" fill="none" viewBox="0 0 12 12" />
                  <span>{t("swimPvcPrint.portrait")}</span>
                </button>
              </div>
            </div>

            {/* 2. Card Dimensions (mm) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {t("swimPvcPrint.sizeMm")}
              </label>
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
            </div>

            {/* 3. Checkboxes: Printable Fields */}
            <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                {t("swimPvcPrint.fieldsTitle")}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showName}
                    onChange={(e) => setShowName(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>{t("swimPvcPrint.fieldName")}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showId}
                    onChange={(e) => setShowId(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>{t("swimPvcPrint.fieldId")}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showCoach}
                    onChange={(e) => setShowCoach(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>{t("swimPvcPrint.fieldCoach")}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showGroupTypeFormula}
                    onChange={(e) => setShowGroupTypeFormula(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>{t("swimPvcPrint.fieldGroupTypeFormula")}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showGroupDayHour}
                    onChange={(e) => setShowGroupDayHour(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>{t("swimPvcPrint.fieldGroupDayHour")}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showCategory}
                    onChange={(e) => setShowCategory(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>{t("swimPvcPrint.fieldCategory")}</span>
                </label>
              </div>
            </div>

            {/* 4. Font Size Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300">{t("swimPvcPrint.fontSize")}</span>
                <span className="font-mono text-cyan-300 font-bold">{fontSize} px</span>
              </div>
              <input
                type="range"
                min="8"
                max="16"
                step="0.5"
                value={fontSize}
                onChange={(e) => setFontSize(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* 5. Space between QR code and infos (mm) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300">{t("swimPvcPrint.qrInfoSpacing")}</span>
                <span className="font-mono text-cyan-300 font-bold">{qrInfoSpacingMm} mm</span>
              </div>
              <input
                type="range"
                min="1"
                max="16"
                step="0.5"
                value={qrInfoSpacingMm}
                onChange={(e) => setQrInfoSpacingMm(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            {/* 6. Placement in A4 Page */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                {t("swimPvcPrint.a4Placement")}
              </label>
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

            {/* 7. Cutting Lines Toggle */}
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
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  cuttingLines ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Column: Dynamic Visionators (7 cols) */}
          <div className="lg:col-span-7 p-5 space-y-6 bg-slate-950 flex flex-col justify-between overflow-y-auto max-h-[calc(92vh-140px)]">
            {/* Top Visionator: Real PVC Card Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    {t("swimPvcPrint.livePreview")}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                    {cardWidthMm} × {cardHeightMm} mm
                  </span>
                </div>

                {/* Face Toggle */}
                <div className="flex rounded-lg bg-slate-900 p-0.5 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveFace("back")}
                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                      activeFace === "back"
                        ? "bg-cyan-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {t("swimPvcPrint.backFace")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFace("front")}
                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                      activeFace === "front"
                        ? "bg-cyan-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {t("swimPvcPrint.frontFace")}
                  </button>
                </div>
              </div>

              {/* Dynamic PVC Card Canvas Container */}
              <div className="flex items-center justify-center p-4 rounded-2xl bg-slate-900/60 border border-white/5 min-h-[220px]">
                <div
                  style={{
                    width: "100%",
                    maxWidth: "380px",
                    aspectRatio: `${cardWidthMm} / ${cardHeightMm}`,
                  }}
                  className={`relative rounded-2xl overflow-hidden shadow-2xl transition-all ${
                    cuttingLines ? "ring-2 ring-dashed ring-cyan-400/80 ring-offset-2 ring-offset-slate-950" : ""
                  }`}
                >
                  {/* Real Card Background Photo */}
                  <img
                    src={activeFace === "front" ? tier.frontImage : tier.backImage}
                    alt="Card Face"
                    className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                  />

                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-black/20 to-black/60 pointer-events-none" />

                  {activeFace === "front" ? (
                    <div className="relative z-10 w-full h-full flex flex-col justify-between p-3.5 text-white select-none">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-600 text-white shadow">
                          AQA SPORTS
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-black/60 border border-white/20 text-white shadow">
                          {member.formula || tier.badge}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        {showName && (
                          <div
                            style={{ fontSize: `${fontSize * 1.15}px` }}
                            className="font-black uppercase text-white truncate drop-shadow-md"
                          >
                            {member.fullName}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {showId && (
                            <span
                              style={{ fontSize: `${fontSize * 0.9}px` }}
                              className="font-mono font-bold text-cyan-300 drop-shadow"
                            >
                              {member.swimId}
                            </span>
                          )}
                          {showCategory && (
                            <span className="text-[8px] uppercase px-1.5 py-0.5 rounded bg-black/60 text-slate-200 border border-white/10">
                              {categoryLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 w-full h-full flex items-center p-3 text-white select-none">
                      {/* Left: Dynamic QR */}
                      <div className="flex flex-col items-center justify-center p-1.5 bg-white rounded-xl shadow-lg shrink-0">
                        {generatedQr ? (
                          <img
                            src={generatedQr}
                            alt="QR"
                            style={{
                              width: `${Math.min(cardHeightMm * 1.3, 76)}px`,
                              height: `${Math.min(cardHeightMm * 1.3, 76)}px`,
                            }}
                            className="object-contain"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-[9px] font-mono text-slate-800 font-bold">
                            QR
                          </div>
                        )}
                        {showId && member.card?.cardCode && (
                          <span className="font-mono text-[7.5px] font-black text-slate-900 tracking-wider mt-0.5">
                            {member.card.cardCode}
                          </span>
                        )}
                      </div>

                      {/* Spacer between QR and Information */}
                      <div style={{ width: `${Math.max(4, qrInfoSpacingMm * 2.8)}px` }} className="shrink-0" />

                      {/* Right: Dynamic Swimmer Information */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 text-left">
                        {showName && (
                          <div
                            style={{ fontSize: `${fontSize}px` }}
                            className="font-black uppercase text-white tracking-wide truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                          >
                            {member.fullName}
                          </div>
                        )}

                        {showId && (
                          <div
                            style={{ fontSize: `${fontSize * 0.9}px` }}
                            className="font-mono font-bold text-cyan-300 drop-shadow"
                          >
                            {member.swimId}
                          </div>
                        )}

                        {showCategory && (
                          <div
                            style={{ fontSize: `${fontSize * 0.8}px` }}
                            className="font-bold text-slate-200 truncate drop-shadow"
                          >
                            {categoryLevel}
                          </div>
                        )}

                        {showGroupTypeFormula && (
                          <div
                            style={{ fontSize: `${fontSize * 0.8}px` }}
                            className="font-semibold text-blue-200 truncate drop-shadow"
                          >
                            {groupTypeFormula}
                          </div>
                        )}

                        {showGroupDayHour && (
                          <div
                            style={{ fontSize: `${fontSize * 0.75}px` }}
                            className="text-slate-300 truncate drop-shadow"
                          >
                            {groupSchedule}
                          </div>
                        )}

                        {showCoach && (
                          <div
                            style={{ fontSize: `${fontSize * 0.75}px` }}
                            className="font-bold text-cyan-400 truncate drop-shadow"
                          >
                            Coach: {coachName}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Visionator: A4 Sheet Preview Before Print */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {t("swimPvcPrint.pagePreview")}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {t("swimPvcPrint.pageSummary")}
                </span>
              </div>

              {/* Miniature A4 Sheet Mockup */}
              <div className="flex items-center justify-center p-3 rounded-2xl bg-slate-900/60 border border-white/5">
                <div
                  style={{ width: "160px", height: "226px" }}
                  className="relative bg-white rounded shadow-lg border border-slate-300 p-2 overflow-hidden flex flex-col justify-between"
                >
                  {/* Faint sheet margins outline */}
                  <div className="absolute inset-2 border border-slate-200 pointer-events-none" />

                  {a4Placement === "grid-2x4" ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="grid grid-cols-2 gap-1 w-full max-w-[134px]">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={i}
                            style={{
                              aspectRatio: `${cardWidthMm} / ${cardHeightMm}`,
                            }}
                            className={`rounded-sm bg-slate-800 flex items-center justify-center text-[6px] font-mono text-cyan-300 font-bold ${
                              cuttingLines ? "border border-dashed border-cyan-500" : ""
                            }`}
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
                        className={`rounded-sm bg-slate-800 p-1 flex items-center justify-center text-[7px] font-mono text-cyan-300 font-bold shadow ${
                          cuttingLines ? "border border-dashed border-cyan-500" : ""
                        }`}
                      >
                        PVC
                      </div>
                    </div>
                  )}

                  {/* A4 Sheet Footer Label */}
                  <div className="relative z-10 flex justify-between text-[7px] font-mono text-slate-400">
                    <span>A4</span>
                    <span>{a4Placement}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-slate-950/80">
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
