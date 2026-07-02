"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/i18n";

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
  const [loadingPackages, setLoadingPackages] = useState(true);

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
      : (parseInt(customAmount, 10) || 0) * 1900;

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
        <div className="w-full max-w-lg bg-[var(--surface)]/70 backdrop-blur-lg border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-glow)] hover:border-[var(--primary)]/20">
          
          {success ? (
            <div className="text-center py-8 space-y-5 animate-fade-in">
              <div className="h-16 w-16 mx-auto bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">
                {locale === "ar" ? "تم إرسال الطلب بنجاح!" : locale === "fr" ? "Demande envoyée avec succès !" : "Demand Submitted Successfully!"}
              </h2>
              <p className="text-[var(--muted)] text-sm max-w-sm mx-auto leading-relaxed">
                {locale === "ar"
                  ? "طلبك الآن في قائمة الانتظار. سنقوم بالتواصل معك عبر واتساب لتسليم بطاقتك الفعلية."
                  : locale === "fr"
                  ? "Votre demande est dans notre file d'attente. Nous vous contacterons via WhatsApp pour vous remettre votre carte physique."
                  : "Your demand is in our queue. We will contact you via WhatsApp to deliver your physical card."}
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="mt-4 px-6 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-bold rounded-xl transition-all duration-150 active:scale-[0.98] shadow-md shadow-sky-500/20"
              >
                {locale === "ar" ? "طلب بطاقة أخرى" : locale === "fr" ? "Demander une autre carte" : "Demand another card"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
                  {locale === "ar" ? "طلب بطاقة AQA" : locale === "fr" ? "Demander une carte AQA" : "Request an AQA Card"}
                </h1>
                <p className="text-xs text-[var(--muted)]">
                  {locale === "ar"
                    ? "املأ هذا النموذج لطلب بطاقة أنشطة AQA الرياضية الخاصة بك."
                    : locale === "fr"
                    ? "Remplissez ce formulaire pour demander votre carte d'activités AQA Sports."
                    : "Fill out this form to request your AQA Sports activity card."}
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-xs font-semibold animate-fade-in">
                  {error}
                </div>
              )}

              {/* Client Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
                  {locale === "ar" ? "اسم الزبون" : locale === "fr" ? "Nom du client" : "Client Name"}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={locale === "ar" ? "الاسم الكامل..." : locale === "fr" ? "Nom complet..." : "Full name..."}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-light)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                />
              </div>

              {/* Phone (WhatsApp) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
                  {locale === "ar" ? "رقم الهاتف (واتساب)" : locale === "fr" ? "Téléphone (WhatsApp)" : "Phone (WhatsApp)"}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+213XXXXXXXXX"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-light)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all font-mono"
                />
                <span className="text-[10px] text-[var(--muted)] block">
                  {locale === "ar"
                    ? "يرجى كتابة رمز الدولة (مثال: +213540454907)"
                    : locale === "fr"
                    ? "Veuillez inclure l'indicatif pays (ex: +213540454907)"
                    : "Please include country code (e.g. +213540454907)"}
                </span>
              </div>

              {/* Credit Type Tab Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
                  {locale === "ar" ? "نوع الرصيد المطلوب" : locale === "fr" ? "Type de crédit souhaité" : "Desired Credit Type"}
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[var(--surface-2)]/40 p-1 border border-[var(--border)] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCreditType("package")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      creditType === "package"
                        ? "bg-[var(--primary)] text-white shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {locale === "ar" ? "باقة محددة" : locale === "fr" ? "Forfait prédéfini" : "Predefined Package"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditType("custom")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      creditType === "custom"
                        ? "bg-[var(--primary)] text-white shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {locale === "ar" ? "رصيد مخصص" : locale === "fr" ? "Crédit personnalisé" : "Custom Credits"}
                  </button>
                </div>
              </div>

              {/* Conditional Inputs */}
              {creditType === "package" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
                    {locale === "ar" ? "اختر الباقة" : locale === "fr" ? "Choisir le forfait" : "Select Package"}
                  </label>
                  {loadingPackages ? (
                    <div className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 animate-pulse flex items-center justify-center text-xs text-[var(--muted)]">
                      {locale === "ar" ? "جاري تحميل الباقات..." : locale === "fr" ? "Chargement des forfaits..." : "Loading packages..."}
                    </div>
                  ) : (
                    <select
                      value={selectedPackageId}
                      onChange={(e) => setSelectedPackageId(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-all cursor-pointer"
                    >
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} — {pkg.totalCredits} {locale === "ar" ? "حصة" : "credits"} ({pkg.price.toLocaleString("fr-DZ")} DA)
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedPackage && (
                    <div className="bg-[var(--surface-2)]/20 border border-[var(--border)] rounded-xl p-3.5 text-xs text-[var(--muted)] space-y-1">
                      <div className="flex justify-between">
                        <span>{locale === "ar" ? "حصص مدفوعة" : locale === "fr" ? "Crédits payants" : "Paid credits"}:</span>
                        <span className="font-bold text-[var(--foreground)]">{selectedPackage.creditAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{locale === "ar" ? "حصص إضافية مجانية" : locale === "fr" ? "Crédits bonus offerts" : "Free bonus credits"}:</span>
                        <span className="font-bold text-[var(--success-text)]">+{selectedPackage.bonusCredits}</span>
                      </div>
                      <div className="flex justify-between border-t border-[var(--border)] pt-1 mt-1">
                        <span className="font-semibold text-[var(--foreground)]">{locale === "ar" ? "إجمالي الحصص" : locale === "fr" ? "Total des crédits" : "Total credits"}:</span>
                        <span className="font-bold text-[var(--primary)]">{selectedPackage.totalCredits}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
                    {locale === "ar" ? "عدد الحصص المطلوبة" : locale === "fr" ? "Nombre de crédits requis" : "Amount of credits"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={locale === "ar" ? "مثال: 10..." : locale === "fr" ? "Ex: 10..." : "E.g. 10..."}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-light)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all font-mono"
                  />
                  <span className="text-[10px] text-[var(--muted)] block">
                    {locale === "ar" ? "سعر الحصة هو 1,900 دج" : locale === "fr" ? "Le tarif est de 1 900 DA par crédit" : "Rate is 1,900 DA per credit"}
                  </span>
                </div>
              )}

              {/* Price Preview & Submit */}
              <div className="border-t border-[var(--border)] pt-4 mt-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">
                    {locale === "ar" ? "السعر الإجمالي التقديري" : locale === "fr" ? "Prix total estimé" : "Estimated Total Price"}
                  </p>
                  <p className="text-2xl font-black text-[var(--primary)] font-mono leading-none mt-1">
                    {calculatedPrice.toLocaleString("fr-DZ")} <span className="text-xs font-bold text-[var(--foreground)]">DA</span>
                  </p>
                </div>
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-bold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>{locale === "ar" ? "جاري الإرسال..." : locale === "fr" ? "Envoi..." : "Submitting..."}</span>
                    </>
                  ) : (
                    <span>{locale === "ar" ? "إرسال طلب البطاقة" : locale === "fr" ? "Envoyer la demande" : "Submit Demand"}</span>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-[10px] text-[var(--muted)] border-t border-[var(--border)] mt-auto z-10">
        &copy; {new Date().getFullYear()} AQA Sports &bull; All Rights Reserved.
      </footer>
    </div>
  );
}
