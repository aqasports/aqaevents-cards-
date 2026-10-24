"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useTranslations } from "@/lib/i18n";
import { CommandPalette } from "@/components/admin/command-palette";

type FiliereId = "all" | "academy" | "events" | "store";

type NavItem = {
  key: string;
  href: string;
  badgeType?: "invoices" | "demands" | "proposals" | "clubs" | "swim";
  icon: React.ReactNode;
};

type NavGroup = {
  groupKey: string;
  filiere: FiliereId;
  items: NavItem[];
};

const ICONS = {
  hub: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  academy: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  users: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  leads: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  groups: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  calendar: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  pool: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  coaching: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  calls: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  payments: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  cards: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  backup: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  ),
  redeem: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  terminal: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  activities: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  packages: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  building: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  equipment: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  print: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
  ),
  invoices: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
    </svg>
  ),
  proposals: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  campaigns: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  reports: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  store: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  staff: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  settings: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const NAV_GROUPS: NavGroup[] = [
  // ─── 1. AQA SPORTS ACADEMY (AQA SWIM DERIVED) ────────────────────────────────
  {
    groupKey: "groupAcademyCore",
    filiere: "academy",
    items: [
      { key: "academyOverview", href: "/admin/academy", icon: ICONS.hub },
      { key: "swimWorkspace", href: "/admin/swim", badgeType: "swim", icon: ICONS.academy },
      { key: "swimMembers", href: "/admin/swim/members", icon: ICONS.users },
      { key: "swimLeads", href: "/admin/swim/leads", badgeType: "swim", icon: ICONS.leads },
      { key: "swimGroups", href: "/admin/swim/groups", icon: ICONS.groups },
      { key: "swimCalendar", href: "/admin/swim?tab=calendar", icon: ICONS.calendar },
    ],
  },
  {
    groupKey: "groupAcademyOps",
    filiere: "academy",
    items: [
      { key: "poolDirection", href: "/admin/swim/pool", icon: ICONS.pool },
      { key: "swimCoaching", href: "/admin/swim/coaching", icon: ICONS.coaching },
      { key: "swimCalls", href: "/admin/swim/calls", icon: ICONS.calls },
    ],
  },
  {
    groupKey: "groupAcademyFinance",
    filiere: "academy",
    items: [
      { key: "swimPayments", href: "/admin/swim?tab=payments", icon: ICONS.payments },
      { key: "swimCards", href: "/admin/swim/cards", icon: ICONS.cards },
      { key: "swimBackups", href: "/admin/swim?tab=backups", icon: ICONS.backup },
    ],
  },

  // ─── 2. AQA EVENTS ───────────────────────────────────────────────────────────
  {
    groupKey: "groupEventsOps",
    filiere: "events",
    items: [
      { key: "eventsDashboard", href: "/admin?view=events", icon: ICONS.hub },
      { key: "redeem", href: "/admin/redeem", icon: ICONS.redeem },
      { key: "terminal", href: "/admin/terminal", icon: ICONS.terminal },
      { key: "clients", href: "/admin/clients", icon: ICONS.users },
      { key: "demands", href: "/admin/demands", badgeType: "demands", icon: ICONS.groups },
    ],
  },
  {
    groupKey: "groupEventsCatalog",
    filiere: "events",
    items: [
      { key: "activities", href: "/admin/activities", icon: ICONS.activities },
      { key: "events", href: "/admin/events", icon: ICONS.calendar },
      { key: "packages", href: "/admin/packages", icon: ICONS.packages },
      { key: "clubs", href: "/admin/clubs", badgeType: "clubs", icon: ICONS.building },
      { key: "equipment", href: "/admin/equipment", icon: ICONS.equipment },
      { key: "print", href: "/admin/print", icon: ICONS.print },
    ],
  },
  {
    groupKey: "groupEventsB2b",
    filiere: "events",
    items: [
      { key: "invoices", href: "/admin/invoices", badgeType: "invoices", icon: ICONS.invoices },
      { key: "organizations", href: "/admin/organizations", icon: ICONS.building },
      { key: "contracts", href: "/admin/contracts", icon: ICONS.pool },
      { key: "proposals", href: "/admin/proposals", badgeType: "proposals", icon: ICONS.proposals },
      { key: "campaigns", href: "/admin/campaigns", icon: ICONS.campaigns },
      { key: "aiProposals", href: "/admin/ai-proposals", icon: ICONS.pool },
    ],
  },

  // ─── 3. AQA STORE ────────────────────────────────────────────────────────────
  {
    groupKey: "groupStoreCatalog",
    filiere: "store",
    items: [
      { key: "storeOverview", href: "/admin/store", icon: ICONS.hub },
      { key: "storePosCatalog", href: "/admin/products", icon: ICONS.store },
      { key: "storeSwimGear", href: "/admin/store?tab=swim-gear", icon: ICONS.academy },
    ],
  },

  // ─── AQA ERP SYSTEM & ADMIN ──────────────────────────────────────────────────
  {
    groupKey: "groupErpSystem",
    filiere: "all",
    items: [
      { key: "erpHub", href: "/admin", icon: ICONS.hub },
      { key: "reports", href: "/admin/reports", icon: ICONS.reports },
      { key: "insights", href: "/admin/insights", icon: ICONS.activities },
      { key: "staff", href: "/admin/users", icon: ICONS.staff },
      { key: "settings", href: "/admin/settings", icon: ICONS.settings },
    ],
  },
];

function detectFiliereFromLocation(pathname: string, searchParams: URLSearchParams | null): FiliereId {
  const tab = searchParams?.get("tab");
  const view = searchParams?.get("view");

  if (pathname.startsWith("/admin/store") || pathname.startsWith("/admin/products")) {
    return "store";
  }
  if (pathname.startsWith("/admin/swim") && tab === "equipment") {
    return "store";
  }
  if (pathname.startsWith("/admin/academy") || pathname.startsWith("/admin/swim")) {
    return "academy";
  }
  if (pathname === "/admin" && view === "events") {
    return "events";
  }
  if (
    pathname.startsWith("/admin/clients") ||
    pathname.startsWith("/admin/organizations") ||
    pathname.startsWith("/admin/contracts") ||
    pathname.startsWith("/admin/equipment") ||
    pathname.startsWith("/admin/packages") ||
    pathname.startsWith("/admin/activities") ||
    pathname.startsWith("/admin/clubs") ||
    pathname.startsWith("/admin/events") ||
    pathname.startsWith("/admin/terminal") ||
    pathname.startsWith("/admin/redeem") ||
    pathname.startsWith("/admin/invoices") ||
    pathname.startsWith("/admin/demands") ||
    pathname.startsWith("/admin/proposals") ||
    pathname.startsWith("/admin/campaigns") ||
    pathname.startsWith("/admin/ai-proposals") ||
    pathname.startsWith("/admin/print")
  ) {
    return "events";
  }
  return "all";
}

function AdminNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { t, locale, setLocale, dir } = useTranslations("nav");

  const [selectedFiliere, setSelectedFiliere] = useState<FiliereId>(() =>
    detectFiliereFromLocation(pathname, searchParams)
  );

  // Sync active filiere when route or query changes
  useEffect(() => {
    setSelectedFiliere(detectFiliereFromLocation(pathname, searchParams));
  }, [pathname, searchParams]);

  const [pendingCount, setPendingCount] = useState(0);
  const [pendingDemandsCount, setPendingDemandsCount] = useState(0);
  const [pendingProposalsCount, setPendingProposalsCount] = useState(0);
  const [newCheckInsCount, setNewCheckInsCount] = useState(0);
  const [pendingSwimCount, setPendingSwimCount] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let lastFetchTime = 0;

    async function fetchNavCounts() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      lastFetchTime = Date.now();
      try {
        let since = localStorage.getItem("aqa_last_viewed_clubs_time");
        if (!since) {
          since = new Date().toISOString();
          localStorage.setItem("aqa_last_viewed_clubs_time", since);
        }
        const res = await fetch(
          `/api/admin/nav-counts?since=${encodeURIComponent(since)}`
        );
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.invoices ?? 0);
          setPendingDemandsCount(data.demands ?? 0);
          setPendingProposalsCount(data.proposals ?? 0);
          setNewCheckInsCount(data.checkIns ?? 0);
          setPendingSwimCount(data.swim ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch navigation badge counts:", err);
      }
    }

    fetchNavCounts();

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastFetchTime >= 60000
      ) {
        fetchNavCounts();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // --- Swipe-to-close gesture state ---
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);
  const SWIPE_THRESHOLD = 50;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isSwiping.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping.current || !drawerRef.current) return;
    touchCurrentX.current = e.touches[0].clientX;
    const deltaX = touchCurrentX.current - touchStartX.current;

    const isClosingDirection = dir === "rtl" ? deltaX > 0 : deltaX < 0;
    if (isClosingDirection) {
      const absDelta = Math.abs(deltaX);
      drawerRef.current.style.transform = dir === "rtl"
        ? `translateX(${absDelta}px)`
        : `translateX(-${absDelta}px)`;
      drawerRef.current.style.transition = "none";
    }
  }, [dir]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current || !drawerRef.current) return;
    const deltaX = touchCurrentX.current - touchStartX.current;
    const isClosingDirection = dir === "rtl" ? deltaX > 0 : deltaX < 0;
    const absDelta = Math.abs(deltaX);

    if (isClosingDirection && absDelta >= SWIPE_THRESHOLD) {
      drawerRef.current.style.transition = "transform 200ms ease-out";
      drawerRef.current.style.transform = dir === "rtl"
        ? "translateX(100%)"
        : "translateX(-100%)";
      setTimeout(() => setMobileOpen(false), 200);
    } else {
      drawerRef.current.style.transition = "transform 200ms ease-out";
      drawerRef.current.style.transform = "translateX(0)";
    }
    isSwiping.current = false;
  }, [dir]);

  function isActive(href: string) {
    const [targetPath, targetQuery] = href.split("?");
    const currentTab = searchParams?.get("tab");
    const currentView = searchParams?.get("view");

    if (targetQuery) {
      const qParams = new URLSearchParams(targetQuery);
      if (qParams.get("tab")) {
        return pathname === targetPath && currentTab === qParams.get("tab");
      }
      if (qParams.get("view")) {
        return pathname === targetPath && currentView === qParams.get("view");
      }
    }

    if (targetPath === "/admin") {
      return pathname === "/admin" && !currentView;
    }
    if (targetPath === "/admin/swim") {
      return pathname === "/admin/swim" && !currentTab;
    }
    if (targetPath === "/admin/store") {
      return pathname === "/admin/store" && !currentTab;
    }
    return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
  }

  const eventsTotalBadges =
    pendingCount + pendingDemandsCount + pendingProposalsCount + newCheckInsCount;

  const filiereTabs: { id: FiliereId; label: string; badge: number; accent: string }[] = [
    { id: "all", label: t("filiereAll"), badge: 0, accent: "cyan" },
    { id: "academy", label: t("filiereAcademy"), badge: pendingSwimCount, accent: "sky" },
    { id: "events", label: t("filiereEvents"), badge: eventsTotalBadges, accent: "emerald" },
    { id: "store", label: t("filiereStore"), badge: 0, accent: "purple" },
  ];

  // Groups visible based on selectedFiliere
  const visibleGroups =
    selectedFiliere === "all"
      ? [
          {
            groupKey: "groupErpSystem",
            filiere: "all" as FiliereId,
            items: [
              { key: "erpHub", href: "/admin", icon: ICONS.hub },
            ],
          },
          {
            groupKey: "academyFull",
            filiere: "academy" as FiliereId,
            items: [
              { key: "academyOverview", href: "/admin/academy", icon: ICONS.hub },
              { key: "swimWorkspace", href: "/admin/swim", badgeType: "swim" as const, icon: ICONS.academy },
              { key: "swimMembers", href: "/admin/swim/members", icon: ICONS.users },
              { key: "poolDirection", href: "/admin/swim/pool", icon: ICONS.pool },
              { key: "swimCoaching", href: "/admin/swim/coaching", icon: ICONS.coaching },
            ],
          },
          {
            groupKey: "eventsFull",
            filiere: "events" as FiliereId,
            items: [
              { key: "eventsDashboard", href: "/admin?view=events", icon: ICONS.hub },
              { key: "redeem", href: "/admin/redeem", icon: ICONS.redeem },
              { key: "clients", href: "/admin/clients", icon: ICONS.users },
              { key: "activities", href: "/admin/activities", icon: ICONS.activities },
              { key: "invoices", href: "/admin/invoices", badgeType: "invoices" as const, icon: ICONS.invoices },
            ],
          },
          {
            groupKey: "storeFull",
            filiere: "store" as FiliereId,
            items: [
              { key: "storeOverview", href: "/admin/store", icon: ICONS.hub },
              { key: "storePosCatalog", href: "/admin/products", icon: ICONS.store },
              { key: "storeSwimGear", href: "/admin/store?tab=swim-gear", icon: ICONS.academy },
            ],
          },
          {
            groupKey: "groupErpSystem",
            filiere: "all" as FiliereId,
            items: [
              { key: "reports", href: "/admin/reports", icon: ICONS.reports },
              { key: "insights", href: "/admin/insights", icon: ICONS.activities },
              { key: "staff", href: "/admin/users", icon: ICONS.staff },
              { key: "settings", href: "/admin/settings", icon: ICONS.settings },
            ],
          },
        ]
      : [
          ...NAV_GROUPS.filter((g) => g.filiere === selectedFiliere),
          ...NAV_GROUPS.filter((g) => g.filiere === "all"),
        ];

  function renderBadge(badgeType?: NavItem["badgeType"]) {
    if (!badgeType) return null;
    if (badgeType === "invoices" && pendingCount > 0) {
      return (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)] leading-none">
          {pendingCount}
        </span>
      );
    }
    if (badgeType === "demands" && pendingDemandsCount > 0) {
      return (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)] leading-none">
          {pendingDemandsCount}
        </span>
      );
    }
    if (badgeType === "proposals" && pendingProposalsCount > 0) {
      return (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cyan-500 px-1 text-[9px] font-black text-white animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.4)] leading-none">
          {pendingProposalsCount}
        </span>
      );
    }
    if (badgeType === "clubs" && newCheckInsCount > 0) {
      return (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-black text-white animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.4)] leading-none">
          {newCheckInsCount}
        </span>
      );
    }
    if (badgeType === "swim" && pendingSwimCount > 0) {
      return (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cyan-400 px-1 text-[9px] font-black text-slate-950 animate-pulse shadow-[0_0_8px_rgba(0,242,255,0.5)] leading-none">
          {pendingSwimCount}
        </span>
      );
    }
    return null;
  }

  const FiliereSwitcher = () => (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5 bg-[var(--surface-2)]/50 p-1.5 rounded-xl border border-[var(--border)]">
        {filiereTabs.map((tab) => {
          const isSelected = selectedFiliere === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFiliere(tab.id)}
              className={`relative flex items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-[11px] font-bold transition-all cursor-pointer text-left ${
                isSelected
                  ? "bg-[var(--primary)]/15 text-[var(--accent)] border border-[var(--accent)]/30 shadow-[0_0_12px_rgba(0,242,255,0.12)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]/60 border border-transparent"
              }`}
            >
              <span className="truncate">{tab.label}</span>
              {tab.badge > 0 && (
                <span className="inline-flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-cyan-400 px-1 text-[9px] font-black text-slate-950 leading-none">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contextual Filiere Banner */}
      {selectedFiliere === "academy" && (
        <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-sky-400">
              {t("academyFull")}
            </p>
            <p className="text-[11px] font-semibold text-slate-300 mt-0.5">
              {t("swimDerivedBadge")}
            </p>
          </div>
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,242,255,0.8)]" />
        </div>
      )}
      {selectedFiliere === "events" && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              {t("eventsFull")}
            </p>
            <p className="text-[11px] font-semibold text-slate-300 mt-0.5">
              Events, Cards & B2B
            </p>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        </div>
      )}
      {selectedFiliere === "store" && (
        <div className="rounded-xl bg-purple-500/10 border border-purple-500/25 px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-purple-400">
              {t("storeFull")}
            </p>
            <p className="text-[11px] font-semibold text-slate-300 mt-0.5">
              POS & Swim Gear Boutique
            </p>
          </div>
          <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
        </div>
      )}
    </div>
  );

  const NavLinksList = ({ isMobile = false }) => (
    <nav className="flex flex-col gap-4 w-full">
      {visibleGroups.map((group, idx) => (
        <div key={`${group.groupKey}-${idx}`} className="space-y-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted-light)] select-none">
            {t(group.groupKey)}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={`${group.groupKey}-${link.key}-${link.href}`}
                  href={link.href}
                  onClick={() => isMobile && setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3.5 ${
                    isMobile ? "py-3" : "py-2.5"
                  } text-xs font-semibold transition-all duration-200 border ${
                    active
                      ? "bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/20 shadow-[var(--shadow-glow)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {link.icon}
                    <span className="truncate">{t(link.key)}</span>
                  </div>
                  {renderBadge(link.badgeType)}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* 1. DESKTOP SIDEBAR PANEL */}
      <aside className="hidden lg:flex print:hidden flex-col w-72 h-screen sticky top-0 shrink-0 border-r border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur-lg shadow-xl z-20 justify-between select-none">
        {/* Top Header, Brand & Filiere Switcher */}
        <div className="p-4 border-b border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Link href="/admin" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <img src="/aqa-logo.png" alt="AQA ERP Logo" className="h-8 w-auto object-contain shrink-0" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--accent)] leading-none">
                  AQA ERP
                </p>
                <p className="text-[11px] font-semibold text-[var(--muted)] leading-tight mt-0.5">
                  {t("erpSubtitle")}
                </p>
              </div>
            </Link>
          </div>

          {/* Quick Search / Command Palette trigger */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex items-center justify-between w-full rounded-xl px-3 py-2 text-xs font-semibold text-[var(--muted)] bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] border border-[var(--border)] hover:border-cyan-500/40 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-cyan-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>{t("quickSearch")}</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] group-hover:border-cyan-500/30">
              Ctrl K
            </kbd>
          </button>

          {/* Filiere Switcher */}
          <FiliereSwitcher />
        </div>

        {/* Scrollable Middle links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 scrollbar-thin">
          <NavLinksList />
        </div>

        {/* Bottom controls */}
        <div className="p-3.5 border-t border-[var(--border)] bg-[var(--surface-2)]/20 space-y-2.5">
          {/* Language Selector */}
          <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)]/60 border border-[var(--border)] rounded-xl px-3 py-1.5">
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
            className="flex items-center justify-center gap-2 w-full rounded-xl py-2 text-xs font-bold text-[var(--muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] border border-transparent hover:border-[var(--danger)]/10 transition-all active:scale-[0.98]"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>{t("signOut")}</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE TOP STICKY BAR (AQA ERP 2.2) */}
      <header
        className="lg:hidden print:hidden w-full sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md shadow-sm flex items-center justify-between px-3.5 py-2.5"
        style={{ paddingTop: "max(0.6rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open Navigation Menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:text-white hover:bg-[var(--surface-2)] active:scale-95 transition-all touch-manipulation cursor-pointer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/admin" className="flex items-center gap-2">
            <img src="/aqa-logo.png" alt="AQA ERP Logo" className="h-6 w-auto object-contain shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-[var(--foreground)] tracking-tight">AQA ERP</span>
              <span className="inline-flex items-center rounded-md bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.2 text-[9px] font-black text-cyan-300 font-mono">
                2.2
              </span>
            </div>
          </Link>
        </div>

        {/* Search trigger & Notification pill badges in header */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            aria-label="Quick Search"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-cyan-400 hover:text-cyan-300 hover:bg-[var(--surface-2)] active:scale-95 transition-all touch-manipulation cursor-pointer shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {(pendingSwimCount > 0 || eventsTotalBadges > 0) && (
            <div className="flex items-center gap-1 bg-[var(--surface-2)]/80 border border-[var(--border)] rounded-xl px-2 py-1">
              {pendingSwimCount > 0 && (
                <span className="inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-cyan-400 px-1 text-[9px] font-black text-slate-950 animate-pulse leading-none" title="Swim Leads & Demands">
                  {pendingSwimCount}
                </span>
              )}
              {eventsTotalBadges > 0 && (
                <span className="inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white animate-pulse leading-none" title="Events & Invoices Pending">
                  {eventsTotalBadges}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 3. MOBILE BOTTOM DOCK (Thumb-Zone Navigation) */}
      <nav className="mobile-bottom-dock lg:hidden print:hidden select-none" aria-label="Mobile Bottom Navigation">
        <div className="grid grid-cols-5 items-center justify-around px-1 pt-1.5">
          {/* 1. Hub */}
          <Link
            href="/admin"
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all touch-manipulation cursor-pointer active:scale-90 ${
              pathname === "/admin" && !searchParams?.get("view")
                ? "text-[var(--accent)] font-bold"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
              pathname === "/admin" && !searchParams?.get("view") ? "bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(0,242,255,0.3)]" : ""
            }`}>
              {ICONS.hub}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[56px] text-center">
              {t("mobileDockHub")}
            </span>
          </Link>

          {/* 2. Academy */}
          <Link
            href="/admin/swim"
            className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition-all touch-manipulation cursor-pointer active:scale-90 ${
              pathname.startsWith("/admin/swim") || pathname.startsWith("/admin/academy")
                ? "text-sky-400 font-bold"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
              pathname.startsWith("/admin/swim") || pathname.startsWith("/admin/academy") ? "bg-sky-500/20 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.3)]" : ""
            }`}>
              {ICONS.academy}
            </div>
            {pendingSwimCount > 0 && (
              <span className="absolute top-0 right-3.5 inline-flex h-4 min-w-[14px] items-center justify-center rounded-full bg-cyan-400 px-1 text-[8px] font-black text-slate-950 animate-pulse leading-none">
                {pendingSwimCount}
              </span>
            )}
            <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[56px] text-center">
              {t("mobileDockAcademy")}
            </span>
          </Link>

          {/* 3. Redeem Center Action (Primary POS Action Button) */}
          <Link
            href="/admin/redeem"
            aria-label="Redeem & Scanner"
            className="flex flex-col items-center justify-center -mt-4 touch-manipulation cursor-pointer active:scale-95 group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-sky-400 text-slate-950 shadow-[0_0_18px_rgba(0,242,255,0.45)] border-2 border-[var(--surface)] group-hover:scale-105 transition-transform">
              <svg className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <span className="text-[10px] font-extrabold text-[var(--accent)] tracking-tight mt-0.5">
              {t("mobileDockRedeem")}
            </span>
          </Link>

          {/* 4. Events & Clients */}
          <Link
            href="/admin/clients"
            className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition-all touch-manipulation cursor-pointer active:scale-90 ${
              pathname.startsWith("/admin/clients") || pathname.startsWith("/admin/events") || searchParams?.get("view") === "events"
                ? "text-emerald-400 font-bold"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
              pathname.startsWith("/admin/clients") || pathname.startsWith("/admin/events") || searchParams?.get("view") === "events" ? "bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : ""
            }`}>
              {ICONS.users}
            </div>
            {eventsTotalBadges > 0 && (
              <span className="absolute top-0 right-3.5 inline-flex h-4 min-w-[14px] items-center justify-center rounded-full bg-amber-500 px-1 text-[8px] font-black text-white animate-pulse leading-none">
                {eventsTotalBadges}
              </span>
            )}
            <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[56px] text-center">
              {t("mobileDockEvents")}
            </span>
          </Link>

          {/* 5. Menu Drawer */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="All Modules Menu"
            className="flex flex-col items-center justify-center py-1 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] transition-all touch-manipulation cursor-pointer active:scale-90"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[56px] text-center">
              {t("mobileDockMenu")}
            </span>
          </button>
        </div>
      </nav>

      {/* 4. MOBILE SIDE DRAWER (Overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />

          <div
            ref={drawerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`fixed top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-[var(--surface)]/95 backdrop-blur-xl border-[var(--border)] shadow-2xl flex flex-col justify-between transition-transform duration-300 ${
              dir === "rtl"
                ? "right-0 border-l animate-slide-in-right"
                : "left-0 border-r animate-slide-in-left"
            }`}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img src="/aqa-logo.png" alt="AQA ERP" className="h-7 w-auto object-contain" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-black text-xs text-[var(--accent)] uppercase tracking-wider leading-none">AQA ERP</p>
                      <span className="rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-mono px-1 font-bold">2.2</span>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">{t("erpSubtitle")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] hover:text-white hover:bg-[var(--surface-2)] active:scale-95 transition-all touch-manipulation cursor-pointer"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Quick Search trigger inside drawer */}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setCommandOpen(true);
                }}
                className="flex items-center justify-between w-full rounded-xl px-3 py-2.5 text-xs font-semibold text-[var(--muted)] bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/90 hover:text-[var(--foreground)] border border-[var(--border)] transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>{t("quickSearch")}</span>
                </div>
                <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]">
                  Ctrl K
                </kbd>
              </button>

              <FiliereSwitcher />
            </div>

            {/* Scrollable list with touch-first row sizes */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 scrollbar-thin">
              <NavLinksList isMobile />
            </div>

            {/* Bottom Controls */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)]/30 space-y-2.5" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
              <div className="flex items-center justify-between gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2">
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
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-xs font-bold text-[var(--muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] border border-transparent transition-all active:scale-95 cursor-pointer"
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

      {/* Command Palette Modal */}
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
    </>
  );
}

export function AdminNav() {
  return (
    <Suspense fallback={<aside className="hidden lg:flex w-72 h-screen border-r border-[var(--border)] bg-[var(--surface)]/60" />}>
      <AdminNavInner />
    </Suspense>
  );
}
