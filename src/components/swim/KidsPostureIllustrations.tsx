"use client";

import React from "react";
import type {
  KidsPhysicalAssessment,
  OverallStatus,
} from "@/lib/swim-kids-physical";

// ─── 1. Hero 3D Holographic Banner Visual ────────────────────────────────────

export function KidsHeroBannerVisual({
  status = "pending",
  score,
  statusLabel,
  scoreLabel,
  compact = false,
}: {
  status?: OverallStatus | "pending";
  score?: number | null;
  statusLabel: string;
  scoreLabel?: string;
  compact?: boolean;
}) {
  const pillCls =
    status === "referral"
      ? "border-rose-400/50 bg-rose-950/85 text-rose-200"
      : status === "watch"
        ? "border-amber-400/50 bg-amber-950/85 text-amber-200"
        : status === "optimal"
          ? "border-emerald-400/50 bg-emerald-950/85 text-emerald-200"
          : "border-cyan-400/45 bg-cyan-950/85 text-cyan-200";

  const dotCls =
    status === "referral"
      ? "bg-rose-400"
      : status === "watch"
        ? "bg-amber-400"
        : status === "optimal"
          ? "bg-emerald-400"
          : "bg-cyan-400";

  const ringColor =
    status === "referral"
      ? "#ef4444"
      : status === "watch"
        ? "#f59e0b"
        : "#10b981";

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-cyan-500/20 bg-[#030712] ${
        compact ? "h-40 sm:h-44" : "h-44 sm:h-52"
      }`}
    >
      <img
        src="/image/kids-suivi/hero-body-scan.jpg"
        alt={statusLabel}
        className="h-full w-full object-cover object-[50%_26%] scale-[1.08] select-none"
      />
      {/* Seamless Dark Ocean glass gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-slate-950/35" />

      {/* Top HUD Bar: Status Badge + Optional Score Ring */}
      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-lg ${pillCls}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
          {statusLabel}
        </span>

        {typeof score === "number" && (
          <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/80 px-2.5 py-1.5 backdrop-blur-md shadow-lg">
            <div className="relative h-9 w-9 flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="h-9 w-9 -rotate-90">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 100.53} 100.53`}
                />
              </svg>
              <span className="absolute font-mono text-[11px] font-black text-white">
                {score}
              </span>
            </div>
            {scoreLabel && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 leading-tight max-w-[60px]">
                {scoreLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 2. 4K 3D Scoliosis Hologram Comparison Card ─────────────────────────────

export function ScoliosisAdamsIllustration({
  assessment,
  labels,
}: {
  assessment?: KidsPhysicalAssessment | null;
  labels: {
    normal: string;
    curved: string;
    adams: string;
    yourChild: string;
  };
}) {
  const hasDeviation =
    Boolean(assessment) &&
    (assessment!.adamsTest !== "negative" ||
      (assessment!.scoliometerAtrDeg !== null && assessment!.scoliometerAtrDeg >= 4) ||
      assessment!.shouldersLevel !== "balanced" ||
      assessment!.pelvisLevel !== "balanced");

  const atr = assessment?.scoliometerAtrDeg ?? null;
  const atrPct = atr !== null ? Math.min(96, Math.max(4, (atr / 12) * 100)) : null;

  return (
    <div className="space-y-3">
      {/* 4K 3D Side-by-Side Pediatric Spine Hologram */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#030712]" dir="ltr">
        <img
          src="/image/kids-suivi/scoliosis-hologram.jpg"
          alt={labels.normal}
          className="w-full aspect-[16/9] object-cover select-none"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/25" />

        {/* Subtle split highlight border indicating the child's side */}
        {assessment && (
          <div
            className={`pointer-events-none absolute inset-y-2 w-[47%] rounded-xl border-2 transition-all ${
              hasDeviation
                ? "right-2 border-amber-400/75 shadow-[0_0_24px_rgba(245,158,11,0.3)]"
                : "left-2 border-emerald-400/75 shadow-[0_0_24px_rgba(16,185,129,0.28)]"
            }`}
          />
        )}

        {/* Bottom HUD labels over Left (Aligned) & Right (Scoliotic) */}
        <div className="absolute inset-x-2.5 bottom-2.5 grid grid-cols-2 gap-2">
          <div className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-slate-950/85 px-2 py-1 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-200 truncate">{labels.normal}</span>
            {assessment && !hasDeviation && (
              <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-300">
                {labels.yourChild}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-slate-950/85 px-2 py-1 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-[10px] font-bold text-amber-200 truncate">{labels.curved}</span>
            {assessment && hasDeviation && (
              <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-300">
                {labels.yourChild}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Scoliometer ATR Clinical Scale (when ATR is recorded) */}
      {atrPct !== null && (
        <div className="rounded-xl border border-white/10 bg-slate-950/75 p-3 space-y-1.5" dir="ltr">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold text-slate-300">{labels.adams} · ATR</span>
            <span className="font-mono font-bold text-cyan-300">{atr}°</span>
          </div>
          <div className="relative h-2 w-full rounded-full overflow-hidden flex">
            <div className="h-full bg-emerald-500/80" style={{ width: "33%" }} />
            <div className="h-full bg-amber-500/80" style={{ width: "25%" }} />
            <div className="h-full bg-rose-500/80" style={{ width: "42%" }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(0,242,255,0.95)]"
              style={{ left: `${atrPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500">
            <span>0° - 3°</span>
            <span>4° - 6°</span>
            <span>7°+</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared 3-Column Holographic Comparison Plate ────────────────────────────

type PanelTone = "emerald" | "amber" | "sky";

function HologramThreePanelPlate({
  src,
  alt,
  activeKey,
  yourChildLabel,
  panels,
}: {
  src: string;
  alt: string;
  activeKey: string | null;
  yourChildLabel: string;
  panels: readonly [
    readonly [string, string, PanelTone],
    readonly [string, string, PanelTone],
    readonly [string, string, PanelTone],
  ];
}) {
  const activeIdx = activeKey ? panels.findIndex(([key]) => key === activeKey) : -1;
  const activeTone = activeIdx >= 0 ? panels[activeIdx][2] : null;
  const posCls = activeIdx === 0 ? "left-[1.2%]" : activeIdx === 1 ? "left-[34.5%]" : "left-[67.8%]";
  const frameTone =
    activeTone === "emerald"
      ? "border-emerald-400/75 shadow-[0_0_24px_rgba(16,185,129,0.28)]"
      : activeTone === "sky"
        ? "border-sky-400/75 shadow-[0_0_24px_rgba(56,189,248,0.3)]"
        : "border-amber-400/75 shadow-[0_0_24px_rgba(245,158,11,0.3)]";

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#030712]" dir="ltr">
      <img src={src} alt={alt} className="w-full aspect-[16/9] object-cover select-none" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/20" />

      {activeIdx >= 0 && (
        <div
          className={`pointer-events-none absolute inset-y-2 w-[31%] rounded-xl border-2 transition-all ${posCls} ${frameTone}`}
        />
      )}

      <div className="absolute inset-x-2 bottom-2 grid grid-cols-3 gap-1.5">
        {panels.map(([key, label, tone]) => {
          const isMatch = activeKey === key;
          const dotCls =
            tone === "emerald" ? "bg-emerald-400" : tone === "sky" ? "bg-sky-400" : "bg-amber-400";
          const borderCls = isMatch
            ? tone === "emerald"
              ? "border-emerald-400/60 bg-slate-950/90 text-emerald-200"
              : tone === "sky"
                ? "border-sky-400/60 bg-slate-950/90 text-sky-200"
                : "border-amber-400/60 bg-slate-950/90 text-amber-200"
            : "border-white/10 bg-slate-950/80 text-slate-300";
          const badgeCls =
            tone === "emerald"
              ? "bg-emerald-500/25 text-emerald-300"
              : tone === "sky"
                ? "bg-sky-500/25 text-sky-300"
                : "bg-amber-500/25 text-amber-300";
          return (
            <div
              key={key}
              className={`flex flex-col items-center justify-center rounded-lg border px-1.5 py-1 backdrop-blur-md text-center ${borderCls}`}
            >
              <div className="flex items-center justify-center gap-1 max-w-full">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotCls}`} />
                <span className="text-[9px] sm:text-[10px] font-bold leading-tight truncate">
                  {label}
                </span>
              </div>
              {isMatch && (
                <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[8px] font-black uppercase ${badgeCls}`}>
                  {yourChildLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 3. Sagittal Spine 3D Hologram Comparison Card ───────────────────────────

export function SagittalSpineIllustration({
  assessment,
  labels,
}: {
  assessment?: KidsPhysicalAssessment | null;
  labels: {
    ideal: string;
    kyphosis: string;
    lordosis: string;
    yourChild: string;
  };
}) {
  const isKyphosis =
    assessment &&
    (assessment.thoracicKyphosis === "hyperkyphosis_rigid" ||
      assessment.thoracicKyphosis === "hyperkyphosis_reducible" ||
      assessment.thoracicKyphosis === "postural_round_back");
  const isLordosis = assessment && assessment.lumbarLordosis === "hyperlordosis";
  const activeKey = !assessment ? null : isKyphosis ? "kyphosis" : isLordosis ? "lordosis" : "ideal";

  return (
    <div className="space-y-2.5">
      <HologramThreePanelPlate
        src="/image/kids-suivi/sagittal-hologram.jpg"
        alt={labels.ideal}
        activeKey={activeKey}
        yourChildLabel={labels.yourChild}
        panels={[
          ["ideal", labels.ideal, "emerald"],
          ["kyphosis", labels.kyphosis, "amber"],
          ["lordosis", labels.lordosis, "amber"],
        ]}
      />

      {/* Delmas / Stagnara Sagittal Plumb Telemetry Strip (C7 / T6 / L3) */}
      <div className="grid grid-cols-3 gap-2 text-center" dir="ltr">
        <div className="rounded-xl border border-cyan-500/20 bg-slate-950/75 px-2 py-1.5">
          <span className="block text-[9px] font-semibold text-slate-400">C7</span>
          <span className="font-mono text-[11px] font-bold text-cyan-300">
            {assessment?.sagittalArrowC7Mm !== null && assessment?.sagittalArrowC7Mm !== undefined
              ? `${assessment.sagittalArrowC7Mm} mm`
              : "20-35 mm"}
          </span>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-slate-950/75 px-2 py-1.5">
          <span className="block text-[9px] font-semibold text-slate-400">T6</span>
          <span className="font-mono text-[11px] font-bold text-cyan-300">
            {assessment?.sagittalArrowT6Mm !== null && assessment?.sagittalArrowT6Mm !== undefined
              ? `${assessment.sagittalArrowT6Mm} mm`
              : "0 mm"}
          </span>
        </div>
        <div className="rounded-xl border border-cyan-500/20 bg-slate-950/75 px-2 py-1.5">
          <span className="block text-[9px] font-semibold text-slate-400">L3</span>
          <span className="font-mono text-[11px] font-bold text-cyan-300">
            {assessment?.sagittalArrowL3Mm !== null && assessment?.sagittalArrowL3Mm !== undefined
              ? `${assessment.sagittalArrowL3Mm} mm`
              : "25-40 mm"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 4. Knees & Lower-Limbs 3D Hologram Comparison Card ──────────────────────

export function KneeAlignmentIllustration({
  assessment,
  labels,
}: {
  assessment?: KidsPhysicalAssessment | null;
  labels: {
    normal: string;
    valgum: string;
    varum: string;
    yourChild: string;
  };
}) {
  const activeKey = !assessment
    ? null
    : assessment.kneeAlignment === "genu_valgum"
      ? "valgum"
      : assessment.kneeAlignment === "genu_varum"
        ? "varum"
        : assessment.kneeAlignment === "normal"
          ? "normal"
          : null;

  const hasCaliper =
    (assessment?.intermalleolarDistCm !== null && assessment?.intermalleolarDistCm !== undefined) ||
    (assessment?.intercondylarDistCm !== null && assessment?.intercondylarDistCm !== undefined);

  return (
    <div className="space-y-2.5">
      <HologramThreePanelPlate
        src="/image/kids-suivi/knees-hologram.jpg"
        alt={labels.normal}
        activeKey={activeKey}
        yourChildLabel={labels.yourChild}
        panels={[
          ["normal", labels.normal, "emerald"],
          ["valgum", labels.valgum, "amber"],
          ["varum", labels.varum, "amber"],
        ]}
      />

      {/* Salenius & Vankka Caliper Distance Strip (DIM / DIC when recorded) */}
      {hasCaliper && (
        <div className="grid grid-cols-2 gap-2 text-center" dir="ltr">
          <div className="rounded-xl border border-cyan-500/20 bg-slate-950/75 px-2.5 py-1.5">
            <span className="block text-[9px] font-semibold text-slate-400 truncate">
              DIM · {labels.valgum}
            </span>
            <span className="font-mono text-[11px] font-bold text-cyan-300">
              {assessment?.intermalleolarDistCm !== null && assessment?.intermalleolarDistCm !== undefined
                ? `${assessment.intermalleolarDistCm} cm`
                : "-"}
            </span>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-slate-950/75 px-2.5 py-1.5">
            <span className="block text-[9px] font-semibold text-slate-400 truncate">
              DIC · {labels.varum}
            </span>
            <span className="font-mono text-[11px] font-bold text-cyan-300">
              {assessment?.intercondylarDistCm !== null && assessment?.intercondylarDistCm !== undefined
                ? `${assessment.intercondylarDistCm} cm`
                : "-"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 5. Podology & Foot Arch 3D Hologram Comparison Card ─────────────────────

export function FootArchIllustration({
  assessment,
  labels,
}: {
  assessment?: KidsPhysicalAssessment | null;
  labels: {
    normal: string;
    flat: string;
    jack: string;
    yourChild: string;
  };
}) {
  const isFlat =
    assessment && (assessment.footArch === "flat_flexible" || assessment.footArch === "flat_rigid");
  const isJackPositiveFlat = isFlat && assessment?.jackTest === "positive_reducible";
  const activeKey = !assessment
    ? null
    : isJackPositiveFlat
      ? "jack"
      : isFlat
        ? "flat"
        : assessment.footArch === "normal"
          ? "normal"
          : null;

  return (
    <HologramThreePanelPlate
      src="/image/kids-suivi/feet-hologram.jpg"
      alt={labels.normal}
      activeKey={activeKey}
      yourChildLabel={labels.yourChild}
      panels={[
        ["normal", labels.normal, "emerald"],
        ["flat", labels.flat, "amber"],
        ["jack", labels.jack, "sky"],
      ]}
    />
  );
}

// ─── 6. Cinematic Underwater Ocean Banner for Aquatic Corrective Plan ────────

export function AquaticProgramHeroBanner({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative h-36 w-full overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#030712]">
      <img
        src="/image/kids-suivi/ocean-rays.jpg"
        alt={title}
        className="h-full w-full object-cover object-center select-none"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-sky-950/20" />
      <div className="absolute inset-x-4 bottom-3.5 space-y-1">
        <h3 className="text-sm font-extrabold text-white font-display tracking-wide">
          {title}
        </h3>
        <p className="text-[11px] text-cyan-100/85 leading-snug">{subtitle}</p>
      </div>
    </div>
  );
}
