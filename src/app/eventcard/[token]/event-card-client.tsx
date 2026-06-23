"use client";

import { useState } from "react";
import { useTranslations } from "@/lib/i18n";

type HistoryItem = {
  activity: string;
  date: Date | string;
  creditsUsed: number;
  redeemedAt: Date | string;
  location: string | null;
};

type CreditItem = {
  label: string;
  amount: number;
  paid: number;
  bonus: number;
  date: Date | string;
};

type Props = {
  cardCode: string;
  clientFirstName: string;
  balance: number;
  history: HistoryItem[];
  credits: CreditItem[];
  qrDataUrl: string;
};

export function EventCardClient({
  cardCode,
  clientFirstName,
  balance,
  history,
  credits,
  qrDataUrl,
}: Props) {
  const { t, locale, setLocale, dir } = useTranslations("publicCard");
  const [isFlipped, setIsFlipped] = useState(false);

  const totalPaid = credits.reduce((sum, item) => sum + item.paid, 0);
  const totalBonus = credits.reduce((sum, item) => sum + item.bonus, 0);
  const totalAll = totalPaid + totalBonus;

  const total = totalAll > 0 ? totalAll : (balance > 0 ? balance : 1);
  const used = Math.max(0, total - balance);
  const percentage =
    total > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((balance / total) * 100),
          ),
        )
      : 0;

  return (
    <div
      className="min-h-screen text-white bg-transparent relative overflow-x-hidden"
      dir={dir}
    >
      {/* Header with Language Selector */}
      <header className="mx-auto max-w-md px-4 pt-8 pb-0 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
            AQA Sports
          </span>
        </div>
        <div>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as "en" | "fr" | "ar")}
            className="text-[11px] font-bold bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-3 py-1.5 text-white focus:outline-none backdrop-blur-sm cursor-pointer"
          >
            <option value="en" className="text-slate-900 bg-white">EN</option>
            <option value="fr" className="text-slate-900 bg-white">FR</option>
            <option value="ar" className="text-slate-900 bg-white">AR</option>
          </select>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 space-y-5">
        {/* Interactive 3D flip card */}
        <div className="flex flex-col items-center select-none">
          <div
            className="relative w-full aspect-[1.58/1] cursor-pointer group"
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
              {/* Front Face */}
              <div
                className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-white/10"
                style={{
                  backfaceVisibility: "hidden",
                  backgroundImage: "url('/image/face.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* Front overlay details */}
                <div className={`absolute inset-0 bg-black/10 flex flex-col justify-between p-6 text-white ${
                  dir === "rtl" ? "flex-col" : ""
                }`}>
                  <div className={`flex justify-between items-start ${
                    dir === "rtl" ? "flex-row-reverse" : ""
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-blue-700/80 backdrop-blur-sm px-2.5 py-0.5 rounded-full shadow">
                      AQA
                    </span>
                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
                      {t("subtitle")}
                    </span>
                  </div>
                  <div className={`flex justify-between items-end ${
                    dir === "rtl" ? "flex-row-reverse" : ""
                  }`}>
                    <div className={`space-y-0.5 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                      <p className="text-[10px] text-white/60 font-semibold tracking-wider uppercase">
                        {t("title")}
                      </p>
                      <h1 className="text-xl font-bold tracking-wide drop-shadow-md">
                        {clientFirstName}
                      </h1>
                      <p className="font-mono text-[10px] text-white/50 tracking-widest">
                        {cardCode}
                      </p>
                    </div>
                    <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          className="text-white/10"
                          strokeWidth="4.5"
                          stroke="currentColor"
                          fill="transparent"
                          r="23"
                          cx="32"
                          cy="32"
                        />
                        <circle
                          className="text-cyan-400 transition-all duration-1000 ease-out"
                          strokeWidth="4.5"
                          strokeDasharray="144.5"
                          strokeDashoffset={144.5 - (percentage / 100) * 144.5}
                          strokeLinecap="round"
                          stroke="url(#cardGradient)"
                          fill="transparent"
                          r="23"
                          cx="32"
                          cy="32"
                          style={{ filter: "drop-shadow(0 0 3px rgba(34, 211, 238, 0.45))" }}
                        />
                        <defs>
                          <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="100%" stopColor="#0ea5e9" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none text-center">
                        <span className="text-sm font-black text-white drop-shadow">
                          {balance}
                        </span>
                        <div className="h-[0.5px] w-4 bg-white/20 my-0.5" />
                        <span className="text-[8px] font-bold text-white/50">
                          {total}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Back Face */}
              <div
                className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-white/10"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  backgroundImage: "url('/image/back.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* Back overlay details: QR sticker */}
                <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center p-4">
                  <div className="bg-white p-2 rounded-xl shadow-2xl flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      className="w-[100px] h-[100px] sm:w-[115px] sm:h-[115px]"
                    />
                    <span className="font-mono text-[9px] font-black text-slate-800 tracking-wider leading-none mt-1">
                      {cardCode}
                    </span>
                  </div>
                  <span className="text-[9px] text-white/80 font-bold tracking-widest uppercase mt-3 drop-shadow bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                    {t("scanToCheck")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-white/40 mt-3 text-center italic">
            {t("tapToFlip")}
          </p>
        </div>

        {/* Balance status & progress */}
        <div className="space-y-3">
          {credits.length > 0 && (
            <>
              {/* Credit Breakdown Grid */}
              <div className={`grid grid-cols-3 gap-3 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 leading-none">{t("paidCredits")}</p>
                  <p className="text-lg font-black text-white mt-1.5 leading-none">{totalPaid}</p>
                </div>
                <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-3 text-center backdrop-blur-md relative overflow-hidden">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/60 leading-none">{t("bonusCredits")}</p>
                  <p className="text-lg font-black text-cyan-400 mt-1.5 leading-none">{totalBonus}</p>
                </div>
                <div className="bg-white/10 border border-white/15 rounded-2xl p-3 text-center backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/60 leading-none">{t("totalCredits")}</p>
                  <p className="text-lg font-black text-cyan-300 mt-1.5 leading-none">{totalAll}</p>
                </div>
              </div>

              {/* Circular Progress Ring Card */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <svg className="w-36 h-36 transform -rotate-90 drop-shadow-[0_0_12px_rgba(34,211,238,0.25)]">
                    <circle
                      className="text-white/5"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                      r="54"
                      cx="72"
                      cy="72"
                    />
                    <circle
                      className="text-cyan-400 transition-all duration-1000 ease-out"
                      strokeWidth="10"
                      strokeDasharray="339.3"
                      strokeDashoffset={339.3 - (percentage / 100) * 339.3}
                      strokeLinecap="round"
                      stroke="url(#widgetGradient)"
                      fill="transparent"
                      r="54"
                      cx="72"
                      cy="72"
                    />
                    <defs>
                      <linearGradient id="widgetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="50%" stopColor="#0ea5e9" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center leading-none text-center">
                    <span className="text-4xl font-black tracking-tight text-white drop-shadow">
                      {balance}
                    </span>
                    <div className="h-[1.5px] w-8 bg-white/20 my-1.5" />
                    <span className="text-white/40 text-xs font-bold uppercase tracking-wider">
                      {total}
                    </span>
                  </div>
                </div>

                <div className="text-center mt-5 space-y-1">
                  <h3 className="text-base font-bold text-white tracking-wide">
                    {balance} / {total} {balance === 1 ? t("oneRemaining") : t("remaining")}
                  </h3>
                  <p className="text-xs text-white/50">
                    {used} {t("used")} · {t("usedProgress")} ({100 - percentage}% {t("used")})
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="text-center">
            {balance === 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/30 px-4 py-1.5 text-xs font-semibold text-red-200">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                {t("noCredits")} — {t("purchaseNewPackage")}
              </span>
            ) : balance <= 2 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-4 py-1.5 text-xs font-semibold text-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                {t("lowCredits")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-4 py-1.5 text-xs font-semibold text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t("goodToGo")}
              </span>
            )}
          </div>
        </div>

        {/* Credits purchased */}
        {credits.length > 0 && (
          <section
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgb(255 255 255 / 0.05)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgb(255 255 255 / 0.1)",
            }}
          >
            <div className={`px-5 py-4 border-b border-white/10 ${
              dir === "rtl" ? "text-right" : "text-left"
            }`}>
              <h2 className="text-sm font-semibold text-white">
                {t("creditsPurchased")}
              </h2>
            </div>
            <ul className="divide-y divide-white/10">
              {credits.map((credit, i) => (
                <li
                  key={i}
                  className={`flex items-center justify-between px-5 py-3.5 ${
                    dir === "rtl" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div className={dir === "rtl" ? "text-right" : "text-left"}>
                    <p className="text-sm font-medium text-white">{credit.label}</p>
                    <div className={`flex items-center gap-1.5 mt-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                      <p className="text-xs text-white/40">
                        {new Date(credit.date).toLocaleDateString(locale, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {credit.bonus > 0 && (
                        <>
                          <span className="text-[10px] text-white/20">•</span>
                          <span className="inline-flex items-center text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/10">
                            {credit.paid} + {credit.bonus} {t("freeSuffix")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">
                    +{credit.amount}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Activity history */}
        <section
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgb(255 255 255 / 0.05)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgb(255 255 255 / 0.1)",
          }}
        >
          <div className={`px-5 py-4 border-b border-white/10 ${
            dir === "rtl" ? "text-right" : "text-left"
          }`}>
            <h2 className="text-sm font-semibold text-white">
              {t("activityHistory")}
            </h2>
          </div>
          {history.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <svg className="mx-auto mb-4 h-12 w-12 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
              </svg>
              <p className="text-sm font-medium text-white/70">
                {t("noActivitiesYet")}
              </p>
              <p className="mt-1 text-xs text-white/40">
                {t("noActivitiesYetDesc")}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {history.map((item, i) => (
                <li
                  key={i}
                  className={`flex items-center justify-between px-5 py-3 ${
                    dir === "rtl" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div className={`flex items-center gap-3 ${
                    dir === "rtl" ? "flex-row-reverse" : ""
                  }`}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                      <ActivityIcon name={item.activity} className="h-5 w-5" />
                    </div>
                    <div className={dir === "rtl" ? "text-right" : "text-left"}>
                      <p className="text-sm font-medium text-white">
                        {item.activity}
                      </p>
                      <p className="text-xs text-white/50">
                        {new Date(item.redeemedAt).toLocaleDateString(locale, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {item.location ? ` · ${item.location}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-white/60 bg-white/10 rounded-full px-2 py-0.5">
                    −{item.creditsUsed}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Footer */}
        <p className="pb-8 text-center text-xs text-white/30">
          aqasports.com · {t("scanToCheck")}
        </p>
      </main>
    </div>
  );
}

function ActivityIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const lower = name.toLowerCase();

  // 1. Kayaking
  if (lower.includes("kayak")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15M3.5 17.5l3 3M17.5 3.5l3 3M6.5 17.5l11-11" />
      </svg>
    );
  }
  // 2. Rock Climbing
  if (lower.includes("climb")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M5 20l7-13 7 13M9 20l3-5.5 3 5.5" />
      </svg>
    );
  }
  // 3. Mountain Biking
  if (lower.includes("bike")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="6" cy="15" r="3" />
        <circle cx="18" cy="15" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 15h6.5l3.5-5.5H10.5L6 15zM18 15l-3-5.5M12 9.5l1.5-3M16.5 9.5l1.5-2h1.5" />
      </svg>
    );
  }
  // 4. Hiking
  if (lower.includes("hik") || lower.includes("walk")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 20h20M5 20l6-10 6 10M10 20l3-5.5 4.5 5.5M17 7a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    );
  }
  // 5. Swimming
  if (lower.includes("swim")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M2 12c3-1.5 3 1.5 6 0s3-1.5 6 0 3 1.5 6 0 M2 16c3-1.5 3 1.5 6 0s3-1.5 6 0 3 1.5 6 0" />
      </svg>
    );
  }
  // 6. Surfing
  if (lower.includes("surf")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 17c4-4 8-4 12-1.5s6 4.5 8 1.5M6 14C9.5 8 15 4 19 6c3 1.5.5 6-3 9-3 2.5-6.5.5-10-1z" />
      </svg>
    );
  }
  // 7. Yoga
  if (lower.includes("yoga") || lower.includes("medit")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7a2 2 0 100-4 2 2 0 000 4z M5 16c2-1 4-3 4-5.5a3 3 0 016 0c0 2.5 2 4.5 4 5.5M7 21h10" />
      </svg>
    );
  }
  // 8. Paddleboarding
  if (lower.includes("paddle") || lower.includes("board")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 17c4 1.5 12 1.5 16 0M8 5v11M5 8h6" />
      </svg>
    );
  }
  // Default: Star/Activity
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.246.58 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.17 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.98 10.1c-.78-.564-.38-1.81.58-1.81h4.908a1 1 0 00.95-.69l1.519-4.674z" />
    </svg>
  );
}
