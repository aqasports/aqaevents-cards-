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

type Package = {
  id: string;
  name: string;
  creditAmount: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
};

type Product = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  advertised: boolean;
  active: boolean;
};

type Props = {
  cardCode: string;
  clientFirstName: string;
  balance: number;
  history: HistoryItem[];
  credits: CreditItem[];
  qrDataUrl: string;
  packages: Package[];
  products: Product[];
  publicToken: string;
};

export function EventCardClient({
  cardCode,
  clientFirstName,
  balance,
  history,
  credits,
  qrDataUrl,
  packages,
  products,
  publicToken,
}: Props) {
  const { t, locale, setLocale, dir } = useTranslations("publicCard");
  const [isFlipped, setIsFlipped] = useState(false);
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditType, setCreditType] = useState<"package" | "custom">("package");
  const [selectedPackageId, setSelectedPackageId] = useState<string>(packages[0]?.id || "");
  const [customCreditsCount, setCustomCreditsCount] = useState<number>(5);

  async function handleBuy(
    type: "package" | "custom" | "product",
    payloadValue: string | number
  ) {
    setPurchasingItemId(String(payloadValue));
    setPurchaseMessage(null);

    const bodyPayload: Record<string, unknown> = { type };
    if (type === "package") {
      bodyPayload.packageId = payloadValue;
    } else if (type === "custom") {
      bodyPayload.customCredits = Number(payloadValue);
    } else if (type === "product") {
      bodyPayload.productId = payloadValue;
    }

    try {
      const res = await fetch(`/api/public/cards/${publicToken}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (res.ok) {
        setPurchaseMessage({
          text: t("orderSuccess"),
          tone: "success",
        });
        setIsCreditModalOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 2500);
      } else {
        const data = await res.json();
        setPurchaseMessage({
          text: data.error ?? t("orderError"),
          tone: "danger",
        });
      }
    } catch (err) {
      console.error(err);
      setPurchaseMessage({
        text: t("orderError"),
        tone: "danger",
      });
    } finally {
      setPurchasingItemId(null);
    }
  }

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
                  <div className={`flex justify-end items-start ${
                    dir === "rtl" ? "flex-row-reverse" : ""
                  }`}>
                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
                      {t("subtitle")}
                    </span>
                  </div>
                  <div className={`flex justify-between items-end ${
                    dir === "rtl" ? "flex-row-reverse" : ""
                  }`}>
                    <div className={`space-y-0.5 ${dir === "rtl" ? "text-right" : "text-left"}`}>
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

                <button
                  type="button"
                  onClick={() => setIsCreditModalOpen(true)}
                  className="mt-5 w-full max-w-xs rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 active:scale-[0.98] text-slate-950 text-xs font-black py-3 px-6 transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{t("demandCreditBtn")}</span>
                </button>
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

        {/* Vitrine Store Section */}
        <section className="space-y-6 pt-4">
          <div className={`border-b border-white/10 pb-2 ${dir === "rtl" ? "text-right" : "text-left"}`}>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 justify-start">
              <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {t("storeTitle")}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {t("storeDesc")}
            </p>
          </div>

          {purchaseMessage && (
            <div className={`rounded-2xl p-4 text-xs font-semibold backdrop-blur-md border ${
              purchaseMessage.tone === "success" 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200" 
                : "bg-red-500/10 border-red-500/20 text-red-200"
            }`}>
              <div className="flex items-center gap-2">
                {purchaseMessage.tone === "success" ? (
                  <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span>{purchaseMessage.text}</span>
              </div>
            </div>
          )}

          {/* Products Grid Showcase */}
          <div className="grid grid-cols-2 gap-4">
            {products.length === 0 ? (
              <p className="col-span-2 text-center text-xs text-white/40 italic py-6">
                No products available at the moment.
              </p>
            ) : (
              products.map((prod) => {
                const isBusy = purchasingItemId === prod.id;
                return (
                  <div
                    key={prod.id}
                    className="bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all duration-300 rounded-3xl overflow-hidden flex flex-col justify-between"
                  >
                    {/* Product Image or Gradient Placeholder */}
                    <div className="aspect-square w-full relative overflow-hidden bg-white/5 flex items-center justify-center">
                      {prod.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-slate-950 flex flex-col items-center justify-center p-4">
                          <svg className="h-10 w-10 text-cyan-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1 text-[10px] font-black text-cyan-300">
                        {prod.price.toLocaleString()} DA
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className={`space-y-1 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                        <h4 className="text-xs font-bold text-white line-clamp-1">
                          {prod.name}
                        </h4>
                        <p className="text-[10px] text-white/50 line-clamp-2 leading-relaxed h-7">
                          {prod.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleBuy("product", prod.id)}
                        disabled={purchasingItemId !== null}
                        className="mt-3.5 w-full rounded-2xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-950 text-[10px] font-black py-2 px-3 transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        {isBusy ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                            <span>{t("purchasing")}</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>{t("orderOnCredit")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Footer */}
        <p className="pb-8 text-center text-xs text-white/30">
          aqasports.com · {t("scanToCheck")}
        </p>
      </main>

      {/* Demand Credit Modal */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-5 relative overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t("modalTitle")}
              </h3>
              <button 
                onClick={() => setIsCreditModalOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-white/50">
              {t("modalDesc")}
            </p>

            {/* Tabs to select credit type */}
            <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setCreditType("package");
                  setPurchaseMessage(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  creditType === "package"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {t("predefinedPackageLabel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreditType("custom");
                  setPurchaseMessage(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  creditType === "custom"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {t("customCreditsLabel")}
              </button>
            </div>

            {creditType === "package" ? (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block font-bold">
                  {t("choosePackage")}
                </label>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex justify-between items-center ${
                        selectedPackageId === pkg.id
                          ? "bg-cyan-500/10 border-cyan-400 text-white"
                          : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <div>
                        <h4 className="text-xs font-bold">{pkg.name}</h4>
                        <p className="text-[10px] text-white/50 mt-0.5">
                          {pkg.creditAmount} + {pkg.bonusCredits} {t("freeSuffix")} ({pkg.totalCredits} {t("totalCreditsText")})
                        </p>
                      </div>
                      <span className="text-xs font-black text-cyan-400">
                        {pkg.price.toLocaleString()} DA
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block font-bold">
                  {t("customCreditsLabel")}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={customCreditsCount || ""}
                    onChange={(e) => setCustomCreditsCount(Math.max(1, Number(e.target.value)))}
                    placeholder={t("enterActivities")}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-400 transition-all font-semibold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 font-bold">
                    {t("remaining").split(" ")[0]}
                  </span>
                </div>
                <div className="text-[10px] text-white/40 italic">
                  * 1 activity = 1,900 DA
                </div>
              </div>
            )}

            {/* Pricing Summary */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
              <span className="text-xs font-bold text-white/60">
                {t("estimatedPrice")}
              </span>
              <span className="text-base font-black text-cyan-300">
                {creditType === "package"
                  ? (packages.find((p) => p.id === selectedPackageId)?.price.toLocaleString() ?? "0")
                  : ((customCreditsCount * 1900).toLocaleString())}{" "}
                DA
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsCreditModalOpen(false)}
                className="flex-1 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-3 transition-all"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={
                  purchasingItemId !== null ||
                  (creditType === "package" && !selectedPackageId) ||
                  (creditType === "custom" && (!customCreditsCount || customCreditsCount <= 0))
                }
                onClick={() => {
                  if (creditType === "package") {
                    handleBuy("package", selectedPackageId);
                  } else {
                    handleBuy("custom", customCreditsCount);
                  }
                }}
                className="flex-1 rounded-2xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-950 text-xs font-black py-3 transition-all flex items-center justify-center gap-1.5"
              >
                {purchasingItemId !== null ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    <span>{t("purchasing")}</span>
                  </>
                ) : (
                  <span>{t("submitRequest")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
