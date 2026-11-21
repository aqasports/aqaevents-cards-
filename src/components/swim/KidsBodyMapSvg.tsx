"use client";

import React, { useState } from "react";
import type {
  ClinicalSeverity,
  KidsBodyZoneStatus,
  KidsPhysicalAssessment,
} from "@/lib/swim-kids-physical";

export type BodyZoneKey = keyof KidsBodyZoneStatus;

interface KidsBodyMapSvgProps {
  assessment: KidsPhysicalAssessment;
  bodyZones: KidsBodyZoneStatus;
  labels: {
    backView: string;
    sideView: string;
    lowerLimbsView: string;
    zoneHead: string;
    zoneShoulders: string;
    zoneSpineFrontal: string;
    zoneThoracic: string;
    zoneLumbar: string;
    zonePelvis: string;
    zoneKnees: string;
    zoneFeet: string;
    statusOptimal: string;
    statusInfo: string;
    statusWatch: string;
    statusReferral: string;
    tapZoneHint: string;
    adamsShort?: string;
    schoberShort?: string;
    jackShort?: string;
  };
  compact?: boolean;
  formatValue?: (val: string) => string;
}

const STATUS_STYLE: Record<
  ClinicalSeverity,
  {
    dot: string;
    ring: string;
    pulse: string;
    badge: string;
    chipActive: string;
  }
> = {
  optimal: {
    dot: "bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.95)]",
    ring: "border-emerald-400/80 bg-emerald-500/20",
    pulse: "bg-emerald-400/35",
    badge: "bg-emerald-950/85 text-emerald-300 border-emerald-500/45",
    chipActive: "border-emerald-400/60 bg-emerald-950/70 text-emerald-200",
  },
  info: {
    dot: "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.95)]",
    ring: "border-sky-400/80 bg-sky-500/20",
    pulse: "bg-sky-400/35",
    badge: "bg-sky-950/85 text-sky-300 border-sky-500/45",
    chipActive: "border-sky-400/60 bg-sky-950/70 text-sky-200",
  },
  watch: {
    dot: "bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.95)]",
    ring: "border-amber-400/85 bg-amber-500/25",
    pulse: "bg-amber-400/40",
    badge: "bg-amber-950/85 text-amber-300 border-amber-500/45",
    chipActive: "border-amber-400/60 bg-amber-950/70 text-amber-200",
  },
  referral: {
    dot: "bg-rose-500 shadow-[0_0_14px_rgba(239,68,68,1)]",
    ring: "border-rose-400/90 bg-rose-500/30",
    pulse: "bg-rose-500/45",
    badge: "bg-rose-950/85 text-rose-300 border-rose-500/50",
    chipActive: "border-rose-400/65 bg-rose-950/75 text-rose-200",
  },
};

// Coordinates calibrated to /image/kids-suivi/hero-body-scan.jpg (16:9 3D child hologram)
const LANDMARKS: { key: BodyZoneKey; leftPct: number; topPct: number }[] = [
  { key: "head", leftPct: 50.2, topPct: 16.5 },
  { key: "shoulders", leftPct: 45.8, topPct: 27.5 },
  { key: "spineFrontal", leftPct: 49.4, topPct: 33.5 },
  { key: "thoracic", leftPct: 51.6, topPct: 39.5 },
  { key: "lumbar", leftPct: 49.6, topPct: 46.5 },
  { key: "pelvis", leftPct: 49.8, topPct: 53.5 },
  { key: "knees", leftPct: 49.8, topPct: 71.0 },
  { key: "feet", leftPct: 49.8, topPct: 89.5 },
];

/**
 * Interactive 3D Holographic Anatomical Posture Scanner.
 * Renders the 4K Dark Ocean pediatric body scan with precision-pinned
 * interactive clinical hotspots and glassmorphic telemetry readouts.
 */
export function KidsBodyMapSvg({
  assessment,
  bodyZones,
  labels,
  compact = false,
  formatValue,
}: KidsBodyMapSvgProps) {
  const [selectedZone, setSelectedZone] = useState<BodyZoneKey>("spineFrontal");
  const fmtVal = (val: string) => (formatValue ? formatValue(val) : val.replace(/_/g, " "));

  const statusText = (s: ClinicalSeverity) => {
    if (s === "referral") return labels.statusReferral;
    if (s === "watch") return labels.statusWatch;
    if (s === "info") return labels.statusInfo;
    return labels.statusOptimal;
  };

  const zoneTitle: Record<BodyZoneKey, string> = {
    head: labels.zoneHead,
    shoulders: labels.zoneShoulders,
    spineFrontal: labels.zoneSpineFrontal,
    thoracic: labels.zoneThoracic,
    lumbar: labels.zoneLumbar,
    pelvis: labels.zonePelvis,
    knees: labels.zoneKnees,
    feet: labels.zoneFeet,
  };

  const selectedSeverity = bodyZones[selectedZone];
  const selectedMetrics = (() => {
    switch (selectedZone) {
      case "head":
        return assessment.sagittalArrowC7Mm !== null
          ? `${fmtVal(assessment.headPosture)} · C7: ${assessment.sagittalArrowC7Mm} mm`
          : fmtVal(assessment.headPosture);
      case "shoulders":
        return `${fmtVal(assessment.shouldersLevel)} · ${fmtVal(assessment.scapulaeSymmetry)}`;
      case "spineFrontal":
        return [
          `${labels.adamsShort ?? "Adams"}: ${fmtVal(assessment.adamsTest)}`,
          assessment.scoliometerAtrDeg !== null ? `ATR: ${assessment.scoliometerAtrDeg}°` : null,
          assessment.plumbLineC7DeviationMm !== null ? `C7: ${assessment.plumbLineC7DeviationMm} mm` : null,
        ]
          .filter(Boolean)
          .join(" · ");
      case "thoracic":
        return [
          fmtVal(assessment.thoracicKyphosis),
          assessment.sagittalArrowT6Mm !== null ? `T6: ${assessment.sagittalArrowT6Mm} mm` : null,
        ]
          .filter(Boolean)
          .join(" · ");
      case "lumbar":
        return [
          fmtVal(assessment.lumbarLordosis),
          assessment.sagittalArrowL3Mm !== null ? `L3: ${assessment.sagittalArrowL3Mm} mm` : null,
          assessment.schoberCm !== null ? `${labels.schoberShort ?? "Schöber"}: +${assessment.schoberCm} cm` : null,
        ]
          .filter(Boolean)
          .join(" · ");
      case "pelvis":
        return [
          fmtVal(assessment.pelvisLevel),
          assessment.limbLengthDiffMm !== null ? `ILMI: ${assessment.limbLengthDiffMm} mm` : null,
        ]
          .filter(Boolean)
          .join(" · ");
      case "knees":
        return [
          fmtVal(assessment.kneeAlignment),
          assessment.intermalleolarDistCm !== null ? `DIM: ${assessment.intermalleolarDistCm} cm` : null,
          assessment.intercondylarDistCm !== null ? `DIC: ${assessment.intercondylarDistCm} cm` : null,
        ]
          .filter(Boolean)
          .join(" · ");
      case "feet":
        return [
          fmtVal(assessment.footArch),
          fmtVal(assessment.heelAlignment),
          assessment.jackTest !== "not_tested"
            ? `${labels.jackShort ?? "Jack"}: ${fmtVal(assessment.jackTest)}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");
    }
  })();

  return (
    <div className="space-y-3">
      {/* 4K 3D Holographic Anatomical Scanner Viewport */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#030712] shadow-[inset_0_0_40px_rgba(0,242,255,0.08)] ${
          compact ? "aspect-[16/10]" : "aspect-[16/9]"
        }`}
        dir="ltr"
      >
        <img
          src="/image/kids-suivi/hero-body-scan.jpg"
          alt={labels.zoneSpineFrontal}
          className="h-full w-full object-cover object-center select-none"
        />

        {/* Subtle Dark Ocean vignette & HUD corner framing brackets */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030712]/80 via-transparent to-[#030712]/35" />
        <div className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l-2 border-t-2 border-cyan-400/50 rounded-tl-sm" />
        <div className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r-2 border-t-2 border-cyan-400/50 rounded-tr-sm" />
        <div className="pointer-events-none absolute left-3 bottom-3 h-4 w-4 border-l-2 border-b-2 border-cyan-400/50 rounded-bl-sm" />
        <div className="pointer-events-none absolute right-3 bottom-3 h-4 w-4 border-r-2 border-b-2 border-cyan-400/50 rounded-br-sm" />

        {/* Interactive Glowing Anatomical Telemetry Hotspots */}
        {LANDMARKS.map(({ key, leftPct, topPct }) => {
          const sev = bodyZones[key];
          const st = STATUS_STYLE[sev];
          const isSelected = selectedZone === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedZone(key)}
              aria-label={zoneTitle[key]}
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none z-10"
            >
              {isSelected && (
                <span
                  className={`absolute inset-0 -m-2.5 rounded-full animate-ping ${st.pulse}`}
                />
              )}
              <span
                className={`relative flex items-center justify-center rounded-full border backdrop-blur-sm transition-transform ${st.ring} ${
                  isSelected ? "h-6 w-6 scale-110" : "h-4.5 w-4.5 hover:scale-110"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${st.dot}`} />
              </span>
            </button>
          );
        })}

        {/* Floating HUD hint in bottom corner */}
        <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[10px] text-cyan-200/80">
          <span className="rounded-full border border-white/10 bg-slate-950/75 px-2.5 py-0.5 backdrop-blur-md font-medium">
            {zoneTitle[selectedZone]}
          </span>
          <span className="hidden sm:inline rounded-full border border-white/10 bg-slate-950/75 px-2.5 py-0.5 backdrop-blur-md text-slate-300">
            {labels.tapZoneHint}
          </span>
        </div>
      </div>

      {/* Quick Anatomical Zone Selector Pills */}
      <div className="flex flex-wrap gap-1.5">
        {LANDMARKS.map(({ key }) => {
          const sev = bodyZones[key];
          const st = STATUS_STYLE[sev];
          const isSelected = selectedZone === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedZone(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-all cursor-pointer ${
                isSelected
                  ? st.chipActive
                  : "border-white/10 bg-slate-950/70 text-slate-400 hover:border-white/20 hover:text-slate-200"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
              <span>{zoneTitle[key]}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Zone Clinical Readout Card */}
      <div className="rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_STYLE[selectedSeverity].dot}`} />
            <span className="text-xs font-bold text-white">{zoneTitle[selectedZone]}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[selectedSeverity].badge}`}
            >
              {statusText(selectedSeverity)}
            </span>
          </div>
          <p className="text-[11px] font-mono text-cyan-100/90 leading-snug">{selectedMetrics}</p>
        </div>
      </div>
    </div>
  );
}
