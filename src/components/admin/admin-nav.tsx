"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useTranslations } from "@/lib/i18n";

const links = [
  {
    key: "dashboard",
    href: "/admin",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    key: "clients",
    href: "/admin/clients",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: "packages",
    href: "/admin/packages",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: "products",
    href: "/admin/products",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    key: "activities",
    href: "/admin/activities",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    key: "clubs",
    href: "/admin/clubs",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    key: "events",
    href: "/admin/events",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: "terminal",
    href: "/admin/terminal",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: "redeem",
    href: "/admin/redeem",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "invoices",
    href: "/admin/invoices",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
  },
  {
    key: "demands",
    href: "/admin/demands",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    key: "proposals",
    href: "/admin/proposals",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    key: "reports",
    href: "/admin/reports",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: "print",
    href: "/admin/print",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
    ),
  },
  {
    key: "staff",
    href: "/admin/users",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    key: "settings",
    href: "/admin/settings",
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

  const [pendingCount, setPendingCount] = useState(0);
  const [pendingDemandsCount, setPendingDemandsCount] = useState(0);
  const [pendingProposalsCount, setPendingProposalsCount] = useState(0);

  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const res = await fetch("/api/admin/invoices/pending-count");
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.count);
        }
      } catch (err) {
        console.error("Failed to fetch pending count:", err);
      }
    }
    async function fetchPendingDemandsCount() {
      try {
        const res = await fetch("/api/admin/demands/pending-count");
        if (res.ok) {
          const data = await res.json();
          setPendingDemandsCount(data.count);
        }
      } catch (err) {
        console.error("Failed to fetch pending demands count:", err);
      }
    }
    async function fetchPendingProposalsCount() {
      try {
        const res = await fetch("/api/admin/proposals/pending-count");
        if (res.ok) {
          const data = await res.json();
          setPendingProposalsCount(data.count);
        }
      } catch (err) {
        console.error("Failed to fetch pending proposals count:", err);
      }
    }
    fetchPendingCount();
    fetchPendingDemandsCount();
    fetchPendingProposalsCount();

    const interval = setInterval(() => {
      fetchPendingCount();
      fetchPendingDemandsCount();
      fetchPendingProposalsCount();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  // Common Nav Links component
  const NavLinksList = ({ isMobile = false }) => (
    <nav className="flex flex-col gap-1 w-full">
      {links.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => isMobile && setMobileOpen(false)}
            className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 border ${
              active
                ? "bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/20 shadow-[var(--shadow-glow)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              {link.icon}
              <span>{t(link.key)}</span>
            </div>

            {/* Badges */}
            {link.key === "invoices" && pendingCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)] leading-none">
                {pendingCount}
              </span>
            )}
            {link.key === "demands" && pendingDemandsCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)] leading-none">
                {pendingDemandsCount}
              </span>
            )}
            {link.key === "proposals" && pendingProposalsCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cyan-500 px-1 text-[9px] font-black text-white animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.4)] leading-none">
                {pendingProposalsCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* 1. DESKTOP SIDEBAR PANEL */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 shrink-0 border-r border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur-lg shadow-xl z-20 justify-between select-none">
        
        {/* Top Header & Brand */}
        <div className="p-5 border-b border-[var(--border)]">
          <Link href="/admin" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src="/image/logoevents.png" alt="AQA Events Logo" className="h-10 w-auto object-contain shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] leading-none">
                AQA Sports
              </p>
              <p className="text-xs font-bold text-[var(--foreground)] leading-tight mt-0.5">
                Admin Console
              </p>
            </div>
          </Link>
        </div>

        {/* Scrollable Middle links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
          <NavLinksList />
        </div>

        {/* Bottom controls */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)]/20 space-y-3">
          {/* Language Selector */}
          <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)]/60 border border-[var(--border)] rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-[var(--muted)]">{locale.toUpperCase()}</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as "en" | "fr" | "ar")}
              className="bg-transparent text-xs font-extrabold text-[var(--foreground)] outline-none cursor-pointer hover:text-[var(--primary)] transition-colors border-none"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </select>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-bold text-[var(--muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] border border-transparent hover:border-[var(--danger)]/10 transition-all active:scale-[0.98]"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>{t("signOut")}</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE TOP STICKY BAR */}
      <header className="lg:hidden w-full sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md shadow-sm flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)] active:scale-95 transition-all"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link href="/admin" className="flex items-center gap-2">
          <img src="/image/logoevents.png" alt="AQA Events Logo" className="h-8 w-auto object-contain" />
          <span className="font-extrabold text-sm text-[var(--foreground)]">AQA Sports</span>
        </Link>

        {/* Small pending demand badge indicator in header */}
        <div className="flex items-center gap-1.5">
          {pendingProposalsCount > 0 && (
            <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          )}
          {pendingDemandsCount > 0 && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          )}
          {pendingCount > 0 && (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          )}
          <span className="w-9" /> {/* Spacer to center the logo perfectly */}
        </div>
      </header>

      {/* 3. MOBILE SIDE DRAWER (Overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Panel Container */}
          <div
            className={`fixed top-0 bottom-0 z-50 w-64 bg-[var(--surface)]/95 backdrop-blur-lg border-[var(--border)] shadow-2xl flex flex-col justify-between transition-transform duration-300 ${
              dir === "rtl"
                ? "right-0 border-l animate-slide-in-right"
                : "left-0 border-r animate-slide-in-left"
            }`}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/image/logoevents.png" alt="Logo" className="h-8 w-auto object-contain" />
                <span className="font-bold text-sm">AQA Sports</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              <NavLinksList isMobile />
            </div>

            {/* Bottom Controls */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)]/20 space-y-3">
              <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)]/60 border border-[var(--border)] rounded-xl px-3 py-2">
                <span className="text-xs font-bold text-[var(--muted)]">{locale.toUpperCase()}</span>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as "en" | "fr" | "ar")}
                  className="bg-transparent text-xs font-extrabold text-[var(--foreground)] outline-none cursor-pointer border-none"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ callbackUrl: "/admin/login" });
                }}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-bold text-[var(--muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] border border-transparent transition-all active:scale-95"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>{t("signOut")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
