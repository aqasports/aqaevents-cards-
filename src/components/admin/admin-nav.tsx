"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useTranslations } from "@/lib/i18n";

const links = [
  {
    key: "dashboard",
    href: "/admin",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    key: "clients",
    href: "/admin/clients",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: "packages",
    href: "/admin/packages",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: "activities",
    href: "/admin/activities",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    key: "redeem",
    href: "/admin/redeem",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "invoices",
    href: "/admin/invoices",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
  },
  {
    key: "reports",
    href: "/admin/reports",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: "print",
    href: "/admin/print",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
    ),
  },
  {
    key: "staff",
    href: "/admin/users",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    key: "settings",
    href: "/admin/settings",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, locale, setLocale, dir } = useTranslations("nav");

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md shadow-[var(--shadow-sm)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
        {/* Logo */}
        <Link href="/admin" className={`flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity ${dir === "rtl" ? "flex-row-reverse text-right" : ""}`}>
          <img src="/image/logoevents.png" alt="AQA Events Logo" className="h-9 w-auto object-contain" />
          <div className="hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] leading-none">
              AQA Sports
            </p>
            <p className="text-xs font-bold text-[var(--foreground)] leading-tight mt-0.5">
              Event Card Admin
            </p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className={`hidden lg:flex items-center gap-0.5 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 border ${
                isActive(link.href)
                  ? "bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/20 shadow-[var(--shadow-glow)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] border-transparent"
              } ${dir === "rtl" ? "flex-row-reverse" : ""}`}
            >
              {link.icon}
              {t(link.key)}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className={`flex items-center gap-3.5 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
          {/* Language Selector Dropdown */}
          <div className="relative">
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as "en" | "fr" | "ar")}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-bold text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] cursor-pointer hover:bg-[var(--surface)] transition-colors"
            >
              <option value="en">EN</option>
              <option value="fr">FR</option>
              <option value="ar">AR</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className={`hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] transition-all duration-150 active:scale-[0.98] ${
              dir === "rtl" ? "flex-row-reverse" : ""
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {t("signOut")}
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)] active:scale-95 transition-all"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 py-3 animate-fade-in">
          <nav className="flex flex-col gap-0.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive(link.href)
                    ? "bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20 shadow-[var(--shadow-glow)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] border border-transparent"
                } ${dir === "rtl" ? "flex-row-reverse" : ""}`}
              >
                {link.icon}
                {t(link.key)}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                signOut({ callbackUrl: "/admin/login" });
              }}
              className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)] ${
                dir === "rtl" ? "flex-row-reverse" : ""
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t("signOut")}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
