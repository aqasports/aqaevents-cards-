"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/i18n";
import TurnstileWidget from "@/components/TurnstileWidget";

type Package = {
  id: string;
  name: string;
  creditAmount: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
};

export default function ClientDemandPage() {
  const { t: tDemands, locale, setLocale, dir } = useTranslations("demands");
  const { t: tNav } = useTranslations("nav");

  const [packages, setPackages] = useState<Package[]>([]);
  const [creditRate, setCreditRate] = useState(1900);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creditType, setCreditType] = useState<"package" | "custom">("package");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch Packages
  useEffect(() => {
    async function fetchPackages() {
      try {
        const res = await fetch("/api/public/packages");
        if (res.ok) {
          const rateHeader = res.headers.get("X-Credit-Rate");
          if (rateHeader) {
            const parsedRate = parseFloat(rateHeader);
            if (!isNaN(parsedRate) && parsedRate > 0) {
              setCreditRate(parsedRate);
            }
          }
          const data = await res.json();
          setPackages(data);
          if (data.length > 0) {
            setSelectedPackageId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load packages:", err);
      } finally {
        setLoadingPackages(false);
      }
    }
    fetchPackages();
  }, []);

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  // Calculate Price
  const calculatedPrice =
    creditType === "package"
      ? selectedPackage?.price ?? 0
      : (parseInt(customAmount, 10) || 0) * creditRate;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(locale === "ar" ? "الاسم مطلوب" : locale === "fr" ? "Le nom est requis" : "Name is required");
      return;
    }
    if (!phone.trim()) {
      setError(locale === "ar" ? "رقم الهاتف مطلوب" : locale === "fr" ? "Le numéro de téléphone est requis" : "Phone number is required");
      return;
    }

    if (creditType === "package" && !selectedPackageId) {
      setError(locale === "ar" ? "الرجاء اختيار باقة" : locale === "fr" ? "Veuillez choisir un forfait" : "Please select a package");
      return;
    }

    if (creditType === "custom") {
      const amt = parseInt(customAmount, 10);
      if (isNaN(amt) || amt <= 0) {
        setError(locale === "ar" ? "الرجاء إدخال عدد حصص صالح" : locale === "fr" ? "Veuillez saisir un nombre valide d'activités" : "Please enter a valid credit amount");
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/public/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          creditType,
          packageId: creditType === "package" ? selectedPackageId : null,
          amount: creditType === "custom" ? parseInt(customAmount, 10) : null,
          captchaToken,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setName("");
        setPhone("");
        setCustomAmount("");
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to submit demand");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col relative" dir={dir}>
      {/* Glow Orbs */}
      <div className="bg-glow-orb-1" />
      <div className="bg-glow-orb-2" />

      {/* Header / Language Selector */}
      <header className="w-full max-w-4xl mx-auto px-4 pt-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <img src="/image/logoevents.png" alt="AQA Events Logo" className="h-10 w-auto object-contain" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] leading-none">
              AQA Sports
            </p>
            <p className="text-xs font-bold text-[var(--foreground)] leading-tight mt-0.5">
              Client Portal
            </p>
          </div>
        </div>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as "en" | "fr" | "ar")}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-bold text-[var(--foreground)] outline-none focus:border-[var(--primary)] cursor-pointer hover:bg-[var(--surface)] transition-colors"
        >
          <option value="en">English (EN)</option>
          <option value="fr">Français (FR)</option>
          <option value="ar">العربية (AR)</option>
        </select>
      </header>

      {/* Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-slate-300">
          <div className="space-y-5">
            {/* Status Banner */}
            <div className="bg-slate-700/80 border border-slate-600 rounded-xl p-4 text-center space-y-2">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-slate-600 text-slate-300 mb-1">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-slate-100">
                {locale === "ar"
                  ? "التسجيل غير مسموح به"
                  : locale === "fr"
                  ? "Inscription non autorisée"
                  : "Registration Not Allowed"}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                {locale === "ar"
                  ? "جميع المجموعات والتسجيلات مغلقة حالياً. لا يمكن تقديم طلبات جديدة."
                  : locale === "fr"
                  ? "Toutes les inscriptions et tous les groupes sont actuellement fermés. Impossible d'envoyer de nouvelles demandes."
                  : "All group registrations are currently closed. New requests cannot be submitted."}
              </p>
            </div>

            <div className="space-y-1 pt-2 opacity-60">
              <h1 className="text-xl font-bold text-slate-300">
                {locale === "ar" ? "طلب بطاقة AQA" : locale === "fr" ? "Demander une carte AQA" : "Request an AQA Card"}
              </h1>
              <p className="text-xs text-slate-400">
                {locale === "ar"
                  ? "نماذج التسجيل للمجموعات مغلقة."
                  : locale === "fr"
                  ? "Les formulaires d'inscription pour tous les groupes sont fermés."
                  : "Group registration forms are closed."}
              </p>
            </div>

            {/* Client Name (Disabled - Solid Grey) */}
            <div className="space-y-1.5 opacity-60">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {locale === "ar" ? "اسم الزبون" : locale === "fr" ? "Nom du client" : "Client Name"}
              </label>
              <input
                type="text"
                disabled
                value=""
                placeholder={locale === "ar" ? "التسجيل مغلق..." : locale === "fr" ? "Inscription fermée..." : "Registration closed..."}
                className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-slate-400 cursor-not-allowed outline-none"
              />
            </div>

            {/* Phone (Disabled - Solid Grey) */}
            <div className="space-y-1.5 opacity-60">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {locale === "ar" ? "رقم الهاتف (واتساب)" : locale === "fr" ? "Téléphone (WhatsApp)" : "Phone (WhatsApp)"}
              </label>
              <input
                type="tel"
                disabled
                value=""
                placeholder="+213XXXXXXXXX"
                className="w-full rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-slate-400 cursor-not-allowed outline-none font-mono"
              />
            </div>

            {/* Groups / Credit Selector (Disabled - Solid Grey) */}
            <div className="space-y-2 opacity-60">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {locale === "ar" ? "المجموعات والباقات" : locale === "fr" ? "Groupes et forfaits" : "Groups & Packages"}
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-700/50 p-1 border border-slate-600 rounded-xl">
                <button
                  type="button"
                  disabled
                  className="py-2 text-xs font-bold rounded-lg bg-slate-600 text-slate-400 cursor-not-allowed"
                >
                  {locale === "ar" ? "مجموعة مغلقة" : locale === "fr" ? "Groupe fermé" : "Group Closed"}
                </button>
                <button
                  type="button"
                  disabled
                  className="py-2 text-xs font-bold rounded-lg bg-slate-600 text-slate-400 cursor-not-allowed"
                >
                  {locale === "ar" ? "مجموعة مغلقة" : locale === "fr" ? "Groupe fermé" : "Group Closed"}
                </button>
              </div>
            </div>

            {/* Submit Button (Disabled - Solid Grey) */}
            <div className="border-t border-slate-700 pt-4 mt-6">
              <button
                type="button"
                disabled
                className="w-full py-3 bg-slate-700 border border-slate-600 text-slate-400 text-sm font-bold rounded-xl cursor-not-allowed text-center shadow-none"
              >
                {locale === "ar"
                  ? "التسجيل غير مسموح به (مغلق)"
                  : locale === "fr"
                  ? "Inscription non autorisée (fermé)"
                  : "Registration Not Allowed (Closed)"}
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-[10px] text-[var(--muted)] border-t border-[var(--border)] mt-auto z-10">
        &copy; {new Date().getFullYear()} AQA Sports &bull; All Rights Reserved.
      </footer>
    </div>
  );
}
