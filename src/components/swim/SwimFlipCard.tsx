"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { getCardTier, CardTierInfo } from "@/lib/swim-pricing";

export interface SwimFlipCardMember {
  fullName: string;
  swimId: string;
  category: string;
  level?: string;
  formula: string;
  duration?: string | null;
  paymentStatus: "paid" | "partial" | "unpaid" | string;
  group?: {
    name: string;
    coachName?: string | null;
    schedule?: string | null;
  } | null;
  card?: {
    cardCode: string;
    publicToken: string;
    status?: string;
  } | null;
}

interface SwimFlipCardProps {
  member: SwimFlipCardMember;
  initialFlipped?: boolean;
  className?: string;
  qrDataUrl?: string | null;
}

export function SwimFlipCard({
  member,
  initialFlipped = false,
  className = "",
  qrDataUrl: precomputedQr,
}: SwimFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(initialFlipped);
  const [qrCode, setQrCode] = useState<string | null>(precomputedQr || null);

  const tier: CardTierInfo = getCardTier(member.formula, member.duration);

  // Generate QR code on client if not precomputed
  useEffect(() => {
    if (precomputedQr) {
      setQrCode(precomputedQr);
      return;
    }

    if (member.card?.publicToken) {
      const publicUrl = typeof window !== "undefined"
        ? `${window.location.origin}/swim/card/${member.card.publicToken}`
        : `https://aqasports.pro/swim/card/${member.card.publicToken}`;

      QRCode.toDataURL(publicUrl, {
        width: 260,
        margin: 1,
        color: {
          dark: "#030712",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCode(url))
        .catch(() => setQrCode(null));
    }
  }, [member.card?.publicToken, precomputedQr]);

  const isPaid = member.paymentStatus === "paid";
  const isPartial = member.paymentStatus === "partial";

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* 3D Card Container */}
      <div
        className="w-full max-w-sm sm:max-w-md aspect-[1.586/1] cursor-pointer group"
        style={{ perspective: "1200px" }}
        onClick={() => setIsFlipped((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-label={`Flip PVC pass card for ${member.fullName}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsFlipped((prev) => !prev);
          }
        }}
      >
        <div
          className="relative w-full h-full rounded-2xl transition-transform duration-700 shadow-2xl"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* ─── FRONT FACE ─── */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-slate-900"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {/* Real Card Background Photo */}
            <img
              src={tier.frontImage}
              alt={`${tier.title} Front`}
              className="w-full h-full object-cover"
              loading="eager"
            />

            {/* Subtle gloss shine overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none" />

            {/* Top Right Formula Badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-lg">
                {member.formula || tier.badge} · {member.duration || "3m"}
              </span>
            </div>

            {/* Bottom Member Overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 z-10">
              <div className="min-w-0">
                <div className="text-[13px] sm:text-[15px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate tracking-wide">
                  {member.fullName}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-cyan-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    {member.swimId}
                  </span>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/50 text-slate-200 border border-white/10">
                    {member.category}
                  </span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border shadow-md ${
                    isPaid
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/60"
                      : isPartial
                      ? "bg-amber-950/80 text-amber-300 border-amber-500/60"
                      : "bg-rose-950/80 text-rose-300 border-rose-500/60"
                  }`}
                >
                  {isPaid ? "Paid" : isPartial ? "Partial" : "Debt"}
                </span>
              </div>
            </div>
          </div>

          {/* ─── BACK FACE ─── */}
          <div
            className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-slate-900"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {/* Real Card Back Photo */}
            <img
              src={tier.backImage}
              alt="Card Back"
              className="w-full h-full object-cover"
              loading="eager"
            />

            {/* QR Code placed directly inside the white SCAN ME box */}
            {qrCode ? (
              <div
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  top: "18%",
                  left: "18%",
                  width: "37%",
                  height: "58%",
                }}
              >
                <img
                  src={qrCode}
                  alt="Pass QR Code"
                  className="w-full h-full object-contain p-1.5 rounded-xl"
                />
              </div>
            ) : (
              <div
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  top: "18%",
                  left: "18%",
                  width: "37%",
                  height: "58%",
                }}
              >
                <div className="text-[10px] text-slate-800 font-mono font-bold text-center">
                  {member.card?.cardCode || member.swimId}
                </div>
              </div>
            )}

            {/* Card Code Overlay on top left of back */}
            {member.card && (
              <div className="absolute top-2.5 left-3 z-10">
                <span className="text-[9px] font-mono font-bold text-cyan-300/90 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                  {member.card.cardCode}
                </span>
              </div>
            )}

            {/* Group info at top right */}
            {member.group && (
              <div className="absolute top-2.5 right-3 z-10 text-right">
                <span className="text-[9px] font-semibold text-slate-200 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                  {member.group.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Flip action button / hint */}
      <button
        type="button"
        onClick={() => setIsFlipped((prev) => !prev)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors focus:outline-none"
      >
        <svg
          className="w-4 h-4 text-cyan-400 animate-spin-slow"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>{isFlipped ? "Click to view card front" : "Click to flip and scan QR"}</span>
      </button>
    </div>
  );
}
