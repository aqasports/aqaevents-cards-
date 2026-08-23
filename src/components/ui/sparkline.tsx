"use client";

import React from "react";

type Props = {
  data: number[];
  color?: string; // Hex or CSS variable
  width?: number;
  height?: number;
  className?: string;
  glow?: boolean;
};

export function Sparkline({
  data,
  color = "#00f2ff",
  width = 84,
  height = 28,
  className = "",
  glow = true,
}: Props) {
  const gradientId = React.useId().replace(/:/g, "_");

  if (!data || data.length < 2) {
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const padding = 3;
  const effHeight = height - padding * 2;
  const effWidth = width - padding * 2;

  const points = data.map((val, index) => {
    const x = padding + (index / (data.length - 1)) * effWidth;
    const y = padding + effHeight - ((val - min) / range) * effHeight;
    return { x, y };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
          {glow && (
            <filter id={`glow_${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          )}
        </defs>

        {/* Gradient fill beneath the line */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Sparkline stroke */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={glow ? `url(#glow_${gradientId})` : undefined}
          className="transition-all duration-300"
        />

        {/* Glowing end point */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="2.5"
          fill={color}
          className="animate-pulse"
        />
      </svg>
    </div>
  );
}
