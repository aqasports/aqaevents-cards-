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
  };
  compact?: boolean;
  formatValue?: (val: string) => string;
}

const STATUS_COLOR: Record<ClinicalSeverity, { stroke: string; fill: string; glow: string; badge: string }> = {
  optimal: {
    stroke: "#10b981",
    fill: "rgba(16, 185, 129, 0.22)",
    glow: "rgba(16, 185, 129, 0.55)",
    badge: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
  },
  info: {
    stroke: "#38bdf8",
    fill: "rgba(56, 189, 248, 0.22)",
    glow: "rgba(56, 189, 248, 0.55)",
    badge: "bg-sky-950/80 text-sky-300 border-sky-500/40",
  },
  watch: {
    stroke: "#f59e0b",
    fill: "rgba(245, 158, 11, 0.24)",
    glow: "rgba(245, 158, 11, 0.55)",
    badge: "bg-amber-950/80 text-amber-300 border-amber-500/40",
  },
  referral: {
    stroke: "#ef4444",
    fill: "rgba(239, 68, 68, 0.26)",
    glow: "rgba(239, 68, 68, 0.65)",
    badge: "bg-rose-950/80 text-rose-300 border-rose-500/40",
  },
};

function Hotspot({
  cx,
  cy,
  severity,
  selected,
  onClick,
  ariaLabel,
}: {
  cx: number;
  cy: number;
  severity: ClinicalSeverity;
  selected: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  const c = STATUS_COLOR[severity];
  return (
    <g
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer outline-none"
    >
      <circle
        cx={cx}
        cy={cy}
        r={selected ? 11 : 8.5}
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={selected ? 1.8 : 1.2}
      />
      <circle cx={cx} cy={cy} r={3.5} fill={c.stroke} />
    </g>
  );
}

/**
 * Interactive 3-view clinical morphostatic posture diagram (Posterior, Lateral, Anterior Lower Limbs).
 * Dynamically adapts spine curve, shoulder tilt, sagittal curve, knee axis, and plantar arch.
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

  // Dynamic anatomical geometry helpers
  const shoulderTiltY =
    assessment.shouldersLevel === "left_higher"
      ? -3
      : assessment.shouldersLevel === "right_higher"
        ? 3
        : 0;
  const pelvisTiltY =
    assessment.pelvisLevel === "left_higher"
      ? -2.5
      : assessment.pelvisLevel === "right_higher"
        ? 2.5
        : 0;
  const spineCurveOffset =
    bodyZones.spineFrontal === "referral"
      ? 7
      : bodyZones.spineFrontal === "watch"
        ? 4
        : 0;

  const headForwardOffset =
    assessment.headPosture === "forward_marked"
      ? 6
      : assessment.headPosture === "forward_mild"
        ? 3
        : 0;
  const kyphosisCurve =
    assessment.thoracicKyphosis === "hyperkyphosis_rigid"
      ? -9
      : assessment.thoracicKyphosis === "hyperkyphosis_reducible" ||
          assessment.thoracicKyphosis === "postural_round_back"
        ? -6
        : assessment.thoracicKyphosis === "flat_back"
          ? -1
          : -3.5;
  const lordosisCurve =
    assessment.lumbarLordosis === "hyperlordosis"
      ? 7.5
      : assessment.lumbarLordosis === "hypolordosis"
        ? 1.5
        : 3.5;

  const kneeXShift =
    assessment.kneeAlignment === "genu_valgum"
      ? 4.5
      : assessment.kneeAlignment === "genu_varum"
        ? -4.5
        : 0;
  const ankleXShift =
    assessment.kneeAlignment === "genu_valgum"
      ? -4
      : assessment.kneeAlignment === "genu_varum"
        ? 3
        : 0;

  const flatFoot =
    assessment.footArch === "flat_flexible" || assessment.footArch === "flat_rigid";
  const highArch = assessment.footArch === "high_arch";

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
          `Adams: ${fmtVal(assessment.adamsTest)}`,
          assessment.scoliometerAtrDeg !== null ? `ATR: ${assessment.scoliometerAtrDeg} deg` : null,
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
          assessment.schoberCm !== null ? `Schober: +${assessment.schoberCm} cm` : null,
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
          assessment.jackTest !== "not_tested" ? `Jack: ${fmtVal(assessment.jackTest)}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
    }
  })();

  return (
    <div className="space-y-3" dir="ltr">
      <div className={`grid gap-2.5 ${compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
        {/* 1. POSTERIOR VIEW — SCOLIOSIS & FRONTAL SPINE */}
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-2.5 flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1 text-center">
            {labels.backView}
          </span>
          <svg viewBox="0 0 120 220" className="w-full max-w-[120px] h-auto" role="img" aria-label={labels.backView}>
            {/* Reference vertical plumb line */}
            <line
              x1="60"
              y1="24"
              x2="60"
              y2="206"
              stroke="rgba(0,242,255,0.22)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* Silhouette Back */}
            <circle cx="60" cy="24" r="13" fill="rgba(30,41,59,0.75)" stroke="rgba(148,163,184,0.45)" strokeWidth="1.2" />
            <path
              d="M48 39 Q60 36 72 39 L84 48 L92 108 L84 110 L76 62 L73 108 L78 130 L74 198 L65 198 L62 136 L58 136 L55 198 L46 198 L42 130 L47 108 L44 62 L36 110 L28 108 L36 48 Z"
              fill="rgba(30,41,59,0.7)"
              stroke="rgba(148,163,184,0.45)"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Shoulder bi-acromial line */}
            <line
              x1="36"
              y1={48 + shoulderTiltY}
              x2="84"
              y2={48 - shoulderTiltY}
              stroke={STATUS_COLOR[bodyZones.shoulders].stroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Pelvic crest line */}
            <line
              x1="43"
              y1={116 + pelvisTiltY}
              x2="77"
              y2={116 - pelvisTiltY}
              stroke={STATUS_COLOR[bodyZones.pelvis].stroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Dynamic Spine Curve C7 -> S2 */}
            <path
              d={`M60 42 Q${60 + spineCurveOffset} 72 60 92 Q${60 - spineCurveOffset * 0.6} 106 60 120`}
              fill="none"
              stroke={STATUS_COLOR[bodyZones.spineFrontal].stroke}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {/* Hotspots */}
            <Hotspot
              cx={42}
              cy={50}
              severity={bodyZones.shoulders}
              selected={selectedZone === "shoulders"}
              onClick={() => setSelectedZone("shoulders")}
              ariaLabel={labels.zoneShoulders}
            />
            <Hotspot
              cx={60 + spineCurveOffset * 0.5}
              cy={76}
              severity={bodyZones.spineFrontal}
              selected={selectedZone === "spineFrontal"}
              onClick={() => setSelectedZone("spineFrontal")}
              ariaLabel={labels.zoneSpineFrontal}
            />
            <Hotspot
              cx={60}
              cy={116}
              severity={bodyZones.pelvis}
              selected={selectedZone === "pelvis"}
              onClick={() => setSelectedZone("pelvis")}
              ariaLabel={labels.zonePelvis}
            />
          </svg>
        </div>

        {/* 2. LATERAL VIEW — CYPHOSE / HYPERLORDOSE */}
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-2.5 flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1 text-center">
            {labels.sideView}
          </span>
          <svg viewBox="0 0 120 220" className="w-full max-w-[120px] h-auto" role="img" aria-label={labels.sideView}>
            {/* Sagittal plumb reference line */}
            <line
              x1="56"
              y1="14"
              x2="56"
              y2="206"
              stroke="rgba(0,242,255,0.25)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text x="48" y="45" fontSize="7" fill="#64748b" textAnchor="end">C7</text>
            <text x="45" y="75" fontSize="7" fill="#64748b" textAnchor="end">T6</text>
            <text x="45" y="106" fontSize="7" fill="#64748b" textAnchor="end">L3</text>
            <text x="48" y="124" fontSize="7" fill="#64748b" textAnchor="end">S2</text>

            {/* Side Silhouette (facing right) */}
            <circle
              cx={60 + headForwardOffset}
              cy="24"
              r="12"
              fill="rgba(30,41,59,0.75)"
              stroke="rgba(148,163,184,0.45)"
              strokeWidth="1.2"
            />
            <path
              d={`M${56 + headForwardOffset * 0.5} 37 Q${54 + kyphosisCurve} 68 57 96 Q${57 + lordosisCurve * 0.4} 112 56 124 L54 198 L72 198 L72 192 L65 188 L67 128 Q74 108 72 88 Q74 62 68 42 Z`}
              fill="rgba(30,41,59,0.7)"
              stroke="rgba(148,163,184,0.45)"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />

            {/* Dynamic Sagittal Spine */}
            <path
              d={`M${59 + headForwardOffset * 0.5} 40 Q${55 + kyphosisCurve} 70 58 92 Q${59 + lordosisCurve} 106 57 122`}
              fill="none"
              stroke={
                bodyZones.thoracic === "referral" || bodyZones.lumbar === "referral"
                  ? "#ef4444"
                  : bodyZones.thoracic === "watch" || bodyZones.lumbar === "watch"
                    ? "#f59e0b"
                    : "#10b981"
              }
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* Hotspots */}
            <Hotspot
              cx={60 + headForwardOffset}
              cy={26}
              severity={bodyZones.head}
              selected={selectedZone === "head"}
              onClick={() => setSelectedZone("head")}
              ariaLabel={labels.zoneHead}
            />
            <Hotspot
              cx={56 + kyphosisCurve * 0.6}
              cy={72}
              severity={bodyZones.thoracic}
              selected={selectedZone === "thoracic"}
              onClick={() => setSelectedZone("thoracic")}
              ariaLabel={labels.zoneThoracic}
            />
            <Hotspot
              cx={58 + lordosisCurve * 0.6}
              cy={105}
              severity={bodyZones.lumbar}
              selected={selectedZone === "lumbar"}
              onClick={() => setSelectedZone("lumbar")}
              ariaLabel={labels.zoneLumbar}
            />
          </svg>
        </div>

        {/* 3. LOWER LIMBS & FEET — GENU VALGUM/VARUM & PIED PLAT */}
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-2.5 flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1 text-center">
            {labels.lowerLimbsView}
          </span>
          <svg viewBox="0 0 120 220" className="w-full max-w-[120px] h-auto" role="img" aria-label={labels.lowerLimbsView}>
            {/* Pelvis anchor */}
            <rect
              x="36"
              y="26"
              width="48"
              height="24"
              rx="10"
              fill="rgba(30,41,59,0.75)"
              stroke="rgba(148,163,184,0.45)"
              strokeWidth="1.2"
            />
            {/* Mechanical axis lines Left & Right Legs */}
            <polyline
              points={`46,48 ${48 + kneeXShift},112 ${46 + ankleXShift},176`}
              fill="none"
              stroke={STATUS_COLOR[bodyZones.knees].stroke}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.35"
            />
            <polyline
              points={`74,48 ${72 - kneeXShift},112 ${74 - ankleXShift},176`}
              fill="none"
              stroke={STATUS_COLOR[bodyZones.knees].stroke}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.35"
            />
            <polyline
              points={`46,48 ${48 + kneeXShift},112 ${46 + ankleXShift},176`}
              fill="none"
              stroke={STATUS_COLOR[bodyZones.knees].stroke}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={`74,48 ${72 - kneeXShift},112 ${74 - ankleXShift},176`}
              fill="none"
              stroke={STATUS_COLOR[bodyZones.knees].stroke}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Plantar Arch Schematic at Bottom */}
            <line x1="20" y1="204" x2="100" y2="204" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
            <path
              d={
                flatFoot
                  ? "M24 203 Q42 202 55 203 L55 196 Q42 194 24 198 Z"
                  : highArch
                    ? "M24 203 Q40 190 55 203 L55 196 Q40 183 24 196 Z"
                    : "M24 203 Q40 195 55 203 L55 196 Q40 190 24 197 Z"
              }
              fill={STATUS_COLOR[bodyZones.feet].fill}
              stroke={STATUS_COLOR[bodyZones.feet].stroke}
              strokeWidth="1.5"
            />
            <path
              d={
                flatFoot
                  ? "M65 203 Q80 202 96 203 L96 198 Q80 194 65 196 Z"
                  : highArch
                    ? "M65 203 Q80 190 96 203 L96 196 Q80 183 65 196 Z"
                    : "M65 203 Q80 195 96 203 L96 197 Q80 190 65 196 Z"
              }
              fill={STATUS_COLOR[bodyZones.feet].fill}
              stroke={STATUS_COLOR[bodyZones.feet].stroke}
              strokeWidth="1.5"
            />

            {/* Hotspots */}
            <Hotspot
              cx={60}
              cy={112}
              severity={bodyZones.knees}
              selected={selectedZone === "knees"}
              onClick={() => setSelectedZone("knees")}
              ariaLabel={labels.zoneKnees}
            />
            <Hotspot
              cx={60}
              cy={192}
              severity={bodyZones.feet}
              selected={selectedZone === "feet"}
              onClick={() => setSelectedZone("feet")}
              ariaLabel={labels.zoneFeet}
            />
          </svg>
        </div>
      </div>

      {/* Selected Zone Clinical Readout */}
      <div className="rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: STATUS_COLOR[selectedSeverity].stroke }}
            />
            <span className="text-xs font-bold text-white">{zoneTitle[selectedZone]}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLOR[selectedSeverity].badge}`}
            >
              {statusText(selectedSeverity)}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-300 mt-1 truncate">{selectedMetrics}</p>
        </div>
        <span className="text-[10px] text-slate-500 hidden sm:inline shrink-0">
          {labels.tapZoneHint}
        </span>
      </div>
    </div>
  );
}
