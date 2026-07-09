"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type ClientCardData = {
  name: string;
  fullName: string;
  cardCode: string;
  balance: number;
  totalCredits: number;
  publicToken: string;
};

type ResultBannerProps = {
  status: "SUCCESS" | "DUPLICATE" | "NOT_REDEEMED" | "INVALID_CARD" | null;
  clientName?: string;
  activityName?: string;
  timestamp?: string;
  errorMessage?: string;
  client?: ClientCardData;
};

export default function ResultBanner({
  status,
  clientName,
  activityName,
  timestamp,
  errorMessage,
  client,
}: ResultBannerProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");

  // Load QR code when client token is present
  useEffect(() => {
    if (client?.publicToken) {
      const cardUrl = `${window.location.origin}/eventscard/${client.publicToken}`;
      QRCode.toDataURL(cardUrl, { width: 250, margin: 1 })
        .then(setQrUrl)
        .catch((err) => console.error("Error generating QR:", err));
    } else {
      setQrUrl("");
    }
  }, [client?.publicToken]);

  // Handle auto-flip on scan
  useEffect(() => {
    if (status && status !== "INVALID_CARD") {
      setIsFlipped(true);
      const timer = setTimeout(() => {
        setIsFlipped(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsFlipped(false);
    }
  }, [status, timestamp]);

  // Determine status configurations
  const configs = {
    SUCCESS: {
      glow: "shadow-[0_0_30px_rgba(16,185,129,0.35)] border-green-500/50",
      badgeBg: "bg-green-500/20 text-green-400 border border-green-500/30",
      badgeText: "Check-in Successful",
    },
    DUPLICATE: {
      glow: "shadow-[0_0_30px_rgba(245,158,11,0.35)] border-amber-500/50",
      badgeBg: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
      badgeText: "Already Checked In",
    },
    NOT_REDEEMED: {
      glow: "shadow-[0_0_30px_rgba(239,68,68,0.35)] border-red-500/50",
      badgeBg: "bg-red-500/20 text-red-400 border border-red-500/30",
      badgeText: "Not Redeemed",
    },
    INVALID_CARD: {
      glow: "shadow-[0_0_30px_rgba(239,68,68,0.35)] border-red-500/50",
      badgeBg: "bg-red-500/20 text-red-400 border border-red-500/30",
      badgeText: "Card Unrecognized",
    },
  };

  const currentConfig = status ? configs[status] : null;

  // Render ready-to-scan state
  if (!status) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        {/* Holographic scanning card placeholder */}
        <div 
          className="relative w-full aspect-[1.58/1] max-w-sm rounded-3xl overflow-hidden bg-slate-900/40 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none shadow-[0_0_20px_rgba(14,165,233,0.05)]"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-indigo-500/5" />
          <div className="relative z-10 space-y-3">
            <div className="h-12 w-12 rounded-full bg-slate-900/80 border border-white/10 flex items-center justify-center mx-auto shadow-inner">
              <svg className="h-6 w-6 text-cyan-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 4v1m-6-8H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-white tracking-wide">Terminal Ready</h4>
            <p className="text-xs text-slate-400 max-w-[240px] mx-auto">
              Scan client QR code to check in and verify activity balance.
            </p>
          </div>
          {/* Subtle animated border scanner line */}
          <div className="absolute left-0 right-0 h-[1px] bg-cyan-400/20 shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-pulse" style={{ top: "50%" }} />
        </div>
        <p className="text-[11px] text-slate-500 mt-3 text-center italic">
          Awaiting card scan
        </p>
      </div>
    );
  }

  // Card parameters
  const activeClientName = client?.name || clientName || "Guest Card";
  const activeCardCode = client?.cardCode || "AQA-UNKNOWN";
  const balanceVal = client?.balance ?? 0;
  const totalVal = client?.totalCredits ?? 1;
  const percentage = Math.max(0, Math.min(100, Math.round((balanceVal / totalVal) * 100)));

  return (
    <div className="flex flex-col items-center justify-center p-2 space-y-4">
      {/* Dynamic Status Badge */}
      {currentConfig && (
        <div className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-md ${currentConfig.badgeBg} animate-fade-in`}>
          {currentConfig.badgeText}
        </div>
      )}

      {/* 3D Flip Card Container */}
      <div 
        className="relative w-full aspect-[1.58/1] max-w-sm cursor-pointer select-none group"
        style={{ perspective: "1000px" }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className="relative w-full h-full duration-500 transition-transform"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* FRONT FACE */}
          <div
            className={`absolute inset-0 w-full h-full rounded-3xl overflow-hidden bg-slate-900 border ${
              currentConfig ? currentConfig.glow : "border-white/10 shadow-2xl"
            } transition-all duration-300`}
            style={{
              backfaceVisibility: "hidden",
              backgroundImage: "url('/image/face.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Dark tint overlay */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Front details layout */}
            <div className="absolute inset-0 flex flex-col justify-between p-5 text-white">
              {/* Header: Brand and scan status marker */}
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  Activity Card
                </span>
                {status === "SUCCESS" && (
                  <span className="h-5 w-5 rounded-full bg-green-500/25 border border-green-400 flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.4)]">
                    <svg className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {status === "DUPLICATE" && (
                  <span className="h-5 w-5 rounded-full bg-amber-500/25 border border-amber-400 flex items-center justify-center">
                    <svg className="h-3 w-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </span>
                )}
                {(status === "NOT_REDEEMED" || status === "INVALID_CARD") && (
                  <span className="h-5 w-5 rounded-full bg-red-500/25 border border-red-400 flex items-center justify-center">
                    <svg className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                )}
              </div>

              {/* Bottom: Client Name, Code, and Progress */}
              <div className="flex justify-between items-end">
                <div className="space-y-0.5 text-left">
                  <h3 className="text-lg font-bold tracking-wide drop-shadow-md truncate max-w-[180px]">
                    {activeClientName}
                  </h3>
                  <p className="font-mono text-[9px] text-white/40 tracking-wider">
                    {activeCardCode}
                  </p>
                </div>

                {/* Progress Wheel */}
                {status !== "INVALID_CARD" && (
                  <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                    <svg className="w-14 h-14 transform -rotate-90">
                      <circle
                        className="text-white/10"
                        strokeWidth="4"
                        stroke="currentColor"
                        fill="transparent"
                        r="20"
                        cx="28"
                        cy="28"
                      />
                      <circle
                        className="text-cyan-400 transition-all duration-1000 ease-out"
                        strokeWidth="4"
                        strokeDasharray="125.6"
                        strokeDashoffset={125.6 - (percentage / 100) * 125.6}
                        strokeLinecap="round"
                        stroke={status === "SUCCESS" ? "url(#successGrad)" : "url(#accentGrad)"}
                        fill="transparent"
                        r="20"
                        cx="28"
                        cy="28"
                      />
                      <defs>
                        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="100%" stopColor="#0ea5e9" />
                        </linearGradient>
                        <linearGradient id="successGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none text-center">
                      <span className="text-xs font-black text-white drop-shadow">
                        {balanceVal}
                      </span>
                      <div className="h-[0.5px] w-3 bg-white/20 my-0.5" />
                      <span className="text-[8px] font-bold text-white/40">
                        {totalVal}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BACK FACE */}
          <div
            className={`absolute inset-0 w-full h-full rounded-3xl overflow-hidden bg-slate-900 border ${
              currentConfig ? currentConfig.glow : "border-white/10 shadow-2xl"
            }`}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              backgroundImage: "url('/image/back.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Back details layout: QR sticker */}
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-4">
              {qrUrl ? (
                <div className="bg-white p-1.5 rounded-2xl shadow-xl flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt="QR Code"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                  />
                </div>
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 bg-slate-800/80 rounded-2xl flex items-center justify-center border border-white/10">
                  <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15h.008v.008H15V15zm0 2.25h.008v.008H15v-.008zm2.25-2.25h.008v.008H17.25V15zm0 2.25h.008v.008H17.25v-.008zm2.25-2.25h.008v.008H19.5V15zm0 2.25h.008v.008H19.5v-.008zm-4.5 2.25h.008v.008H15V17.25zm2.25 0h.008v.008H17.25V17.25zm2.25 0h.008v.008H19.5V17.25z" />
                  </svg>
                </div>
              )}
              <span className="font-mono text-[8px] text-white/50 mt-2 select-none tracking-widest">
                {activeCardCode}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Result feedback description */}
      <div className="text-center space-y-1 animate-fade-in max-w-sm">
        {status === "SUCCESS" && activityName && (
          <p className="text-sm font-semibold text-green-400">
            Checked in for {activityName}
          </p>
        )}
        {status === "DUPLICATE" && timestamp && (
          <p className="text-xs text-amber-400">
            Already verified at {new Date(timestamp).toLocaleTimeString()}
          </p>
        )}
        {errorMessage && (
          <p className="text-xs text-red-400 font-medium">
            {errorMessage}
          </p>
        )}
        {timestamp && (
          <p className="text-[10px] text-slate-500 tabular-nums">
            Scanned at {new Date(timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>
      
      <p className="text-[10px] text-slate-500 italic">
        Click card to flip
      </p>
    </div>
  );
}
