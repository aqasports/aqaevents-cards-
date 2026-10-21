"use client";

import React from "react";

export interface ApneaChartPoint {
  date: string;
  value: number;
}

interface ApneaEvolutionChartProps {
  points: ApneaChartPoint[];
  unit: string;
  /** Optional dashed target line (e.g. 240 seconds for the static goal). */
  goal?: number;
  goalLabel?: string;
  locale?: string;
  ariaLabel: string;
  emptyLabel: string;
}

const W = 320;
const H = 140;
const PAD_L = 34;
const PAD_R = 10;
const PAD_T = 12;
const PAD_B = 24;

/**
 * Lightweight SVG line chart (no chart dependency) showing the evolution of a
 * record in chronological order. Needs at least 2 points to draw a line.
 */
export function ApneaEvolutionChart({
  points,
  unit,
  goal,
  goalLabel,
  locale,
  ariaLabel,
  emptyLabel,
}: ApneaEvolutionChartProps) {
  if (points.length < 2) {
    return (
      <div className="flex h-[140px] items-center justify-center rounded-[10px] border border-white/[0.08] bg-slate-900/60 px-4 text-center text-xs text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const maxData = Math.max(...values, goal ?? 0);
  const yMax = Math.max(10, Math.ceil((maxData * 1.1) / 10) * 10);
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const x = (i: number) => PAD_L + (innerW * i) / (points.length - 1);
  const y = (v: number) => PAD_T + innerH - (innerH * v) / yMax;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ", {
      day: "2-digit",
      month: "2-digit",
    });

  const ticks = [0, 0.5, 1].map((r) => Math.round(yMax * r));
  const gradientId = `apnea-grad-${unit}-${goal ?? 0}`;

  return (
    <div className="rounded-[10px] border border-white/[0.08] bg-slate-900/60 p-2" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#00f2ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tv) => (
          <g key={tv}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(tv)} y2={y(tv)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x={PAD_L - 6} y={y(tv) + 3} textAnchor="end" fontSize="9" fill="#64748b">
              {tv}
            </text>
          </g>
        ))}

        {goal !== undefined && goal <= yMax && (
          <g>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y(goal)}
              y2={y(goal)}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            {goalLabel && (
              <text x={W - PAD_R} y={y(goal) - 3} textAnchor="end" fontSize="9" fill="#10b981">
                {goalLabel}
              </text>
            )}
          </g>
        )}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke="#00f2ff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <circle key={`${p.date}-${i}`} cx={x(i)} cy={y(p.value)} r="3" fill="#0ea5e9" stroke="#00f2ff" strokeWidth="1" />
        ))}

        <text x={PAD_L} y={H - 6} fontSize="9" fill="#94a3b8" textAnchor="start">
          {fmtDate(points[0].date)}
        </text>
        <text x={W - PAD_R} y={H - 6} fontSize="9" fill="#94a3b8" textAnchor="end">
          {fmtDate(points[points.length - 1].date)}
        </text>
        <text x={PAD_L} y={8} fontSize="9" fill="#64748b" textAnchor="start">
          {unit}
        </text>
      </svg>
    </div>
  );
}
