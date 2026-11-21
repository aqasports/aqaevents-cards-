"use client";

import React from "react";
import type { KidsDomainScores, WhoBmiBand } from "@/lib/swim-kids-physical";

// ─── 1. Six-Axis Clinical Radar Chart ────────────────────────────────────────

interface KidsDomainRadarChartProps {
  current: KidsDomainScores;
  baseline?: KidsDomainScores | null;
  labels: {
    growth: string;
    spineFrontal: string;
    spineSagittal: string;
    lowerLimbs: string;
    podology: string;
    mobilityCore: string;
    currentLabel: string;
    baselineLabel: string;
  };
}

const AXES: (keyof KidsDomainScores)[] = [
  "growth",
  "spineFrontal",
  "spineSagittal",
  "lowerLimbs",
  "podology",
  "mobilityCore",
];

export function KidsDomainRadarChart({
  current,
  baseline,
  labels,
}: KidsDomainRadarChartProps) {
  const cx = 140;
  const cy = 112;
  const rMax = 76;

  const angleFor = (idx: number) => ((Math.PI * 2) / AXES.length) * idx - Math.PI / 2;

  const pointFor = (idx: number, score: number) => {
    const ratio = Math.max(0, Math.min(100, score)) / 100;
    const a = angleFor(idx);
    return {
      x: cx + Math.cos(a) * rMax * ratio,
      y: cy + Math.sin(a) * rMax * ratio,
    };
  };

  const polygonPoints = (scores: KidsDomainScores) =>
    AXES.map((k, i) => {
      const p = pointFor(i, scores[k]);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ");

  const rings = [33, 66, 100];

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3" dir="ltr">
      <svg viewBox="0 0 280 228" className="w-full h-auto max-w-[300px] mx-auto" role="img" aria-label="6-Axis Clinical Radar">
        {/* Reference concentric hexagons */}
        {rings.map((pct) => {
          const pts = AXES.map((_, i) => {
            const p = pointFor(i, pct);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(" ");
          return (
            <polygon
              key={pct}
              points={pts}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis spokes */}
        {AXES.map((_, i) => {
          const p = pointFor(i, 100);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Baseline comparison polygon (if >= 2 bilans) */}
        {baseline && (
          <polygon
            points={polygonPoints(baseline)}
            fill="rgba(148,163,184,0.12)"
            stroke="#94a3b8"
            strokeWidth="1.4"
            strokeDasharray="4 3"
          />
        )}

        {/* Current evaluation polygon */}
        <polygon
          points={polygonPoints(current)}
          fill="rgba(0,242,255,0.18)"
          stroke="#00f2ff"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Vertex dots */}
        {AXES.map((key, i) => {
          const p = pointFor(i, current[key]);
          const color =
            current[key] >= 80 ? "#10b981" : current[key] >= 60 ? "#f59e0b" : "#ef4444";
          return (
            <circle
              key={key}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill={color}
              stroke="#030712"
              strokeWidth="1.2"
            />
          );
        })}

        {/* Axis Labels */}
        {AXES.map((key, i) => {
          const a = angleFor(i);
          const lx = cx + Math.cos(a) * (rMax + 20);
          const ly = cy + Math.sin(a) * (rMax + 17);
          const anchor =
            Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
          return (
            <g key={key}>
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                fontSize="8.5"
                fontWeight="600"
                fill="#cbd5e1"
              >
                {labels[key]}
              </text>
              <text
                x={lx}
                y={ly + 10}
                textAnchor={anchor}
                fontSize="8"
                fontFamily="monospace"
                fill="#38bdf8"
              >
                {current[key]}%
              </text>
            </g>
          );
        })}
      </svg>

      {baseline && (
        <div className="flex items-center justify-center gap-4 pt-1 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-sm bg-cyan-400/60 border border-cyan-300" />
            {labels.currentLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-sm border border-dashed border-slate-400" />
            {labels.baselineLabel}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── 2. WHO BMI-for-Age Z-Score Visual Gauge ─────────────────────────────────

interface KidsWhoBmiGaugeProps {
  bmi: number | null;
  zScore: number | null;
  band: WhoBmiBand | null;
  bandLabel: string;
  title: string;
}

export function KidsWhoBmiGauge({
  bmi,
  zScore,
  band,
  bandLabel,
  title,
}: KidsWhoBmiGaugeProps) {
  if (bmi === null) return null;

  // Map Z-score [-3.5, +3.5] to [2%, 98%]
  const clampedZ = zScore !== null ? Math.max(-3.5, Math.min(3.5, zScore)) : 0;
  const pct = zScore !== null ? ((clampedZ + 3.5) / 7) * 100 : 50;

  const badgeTone =
    band === "normal"
      ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
      : band === "overweight" || band === "thinness"
        ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
        : band === "obesity" || band === "severe_thinness"
          ? "bg-rose-950/80 text-rose-300 border-rose-500/40"
          : "bg-slate-800 text-slate-300 border-white/10";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-300">{title}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-white" dir="ltr">
            {bmi} kg/m2
          </span>
          {band && (
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeTone}`}>
              {bandLabel}
            </span>
          )}
        </div>
      </div>

      {zScore !== null && (
        <div className="space-y-1" dir="ltr">
          <div className="relative h-2.5 w-full rounded-full overflow-hidden flex">
            {/* -3.5 to -3 */}
            <div className="h-full bg-rose-500/75" style={{ width: "7.1%" }} />
            {/* -3 to -2 */}
            <div className="h-full bg-amber-500/75" style={{ width: "14.3%" }} />
            {/* -2 to +1 (WHO Normal Optimal) */}
            <div className="h-full bg-emerald-500/80" style={{ width: "42.9%" }} />
            {/* +1 to +2 (Overweight) */}
            <div className="h-full bg-amber-500/75" style={{ width: "14.3%" }} />
            {/* +2 to +3.5 (Obesity) */}
            <div className="h-full bg-rose-500/75" style={{ width: "21.4%" }} />
            {/* Pointer */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(0,242,255,0.95)] border border-slate-950"
              style={{ left: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500">
            <span>-3 SD</span>
            <span>-2 SD</span>
            <span className="text-emerald-400">WHO Optimal</span>
            <span>+1 SD</span>
            <span>+2 SD</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 text-right">
            Z-score: {zScore > 0 ? `+${zScore}` : zScore} SD
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. Growth & Metric Evolution Line Chart ─────────────────────────────────

interface KidsMetricTrendChartProps {
  title: string;
  unit: string;
  points: { date: string; value: number }[];
  locale?: string;
  emptyLabel: string;
  accentColor?: string;
  lowerIsBetter?: boolean;
}

export function KidsMetricTrendChart({
  title,
  unit,
  points,
  locale,
  emptyLabel,
  accentColor = "#00f2ff",
  lowerIsBetter = false,
}: KidsMetricTrendChartProps) {
  const W = 300;
  const H = 118;
  const PAD_L = 34;
  const PAD_R = 12;
  const PAD_T = 14;
  const PAD_B = 22;

  const latest = points.length > 0 ? points[points.length - 1].value : null;
  const prev = points.length >= 2 ? points[points.length - 2].value : null;
  const delta =
    latest !== null && prev !== null ? Math.round((latest - prev) * 10) / 10 : null;

  const deltaTone =
    delta === null || delta === 0
      ? "text-slate-400"
      : lowerIsBetter
        ? delta < 0
          ? "text-emerald-400"
          : "text-amber-400"
        : delta > 0
          ? "text-emerald-400"
          : "text-sky-400";

  if (points.length < 2) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-300">{title}</span>
          {latest !== null && (
            <span className="font-mono text-xs font-bold text-cyan-300" dir="ltr">
              {latest} {unit}
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-500">{emptyLabel}</p>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = Math.max(2, rawMax - rawMin);
  const yMin = Math.floor(rawMin - spread * 0.2);
  const yMax = Math.ceil(rawMax + spread * 0.2);
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const x = (i: number) => PAD_L + (innerW * i) / (points.length - 1);
  const y = (v: number) => PAD_T + innerH - (innerH * (v - yMin)) / Math.max(1, yMax - yMin);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ", {
      day: "2-digit",
      month: "2-digit",
    });

  const gradId = `kids-trend-${title.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-300">{title}</span>
        <div className="flex items-center gap-2 font-mono text-xs" dir="ltr">
          <span className="font-bold text-white">
            {latest} {unit}
          </span>
          {delta !== null && (
            <span className={`text-[10px] font-semibold ${deltaTone}`}>
              {delta > 0 ? `+${delta}` : delta} {unit}
            </span>
          )}
        </div>
      </div>

      <div dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={title}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[yMin, Math.round((yMin + yMax) / 2), yMax].map((tv, idx) => (
            <g key={idx}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y(tv)}
                y2={y(tv)}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="1"
              />
              <text x={PAD_L - 5} y={y(tv) + 3} textAnchor="end" fontSize="8.5" fill="#64748b">
                {tv}
              </text>
            </g>
          ))}

          <path d={area} fill={`url(#${gradId})`} />
          <path
            d={path}
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((p, i) => (
            <circle
              key={`${p.date}-${i}`}
              cx={x(i)}
              cy={y(p.value)}
              r="3"
              fill="#0ea5e9"
              stroke={accentColor}
              strokeWidth="1"
            />
          ))}

          <text x={PAD_L} y={H - 5} fontSize="8.5" fill="#94a3b8" textAnchor="start">
            {fmtDate(points[0].date)}
          </text>
          <text x={W - PAD_R} y={H - 5} fontSize="8.5" fill="#94a3b8" textAnchor="end">
            {fmtDate(points[points.length - 1].date)}
          </text>
        </svg>
      </div>
    </div>
  );
}
