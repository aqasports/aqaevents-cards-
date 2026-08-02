"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/portal", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { label: "Employees", href: "/portal/employees", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { label: "Credit Pool", href: "/portal/credits", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Activities", href: "/portal/activities", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { label: "Reports", href: "/portal/reports", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { label: "Settings", href: "/portal/settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
];

export const dynamic = "force-dynamic";

export default function PortalDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sessionRes = useSession();
  const session = sessionRes?.data;
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = session?.user?.role || "VIEWER";
  const userEmail = session?.user?.email || "";

  function isActive(href: string) {
    if (href === "/portal") return pathname === "/portal";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col lg:flex-row font-sans">
      {/* Sidebar navigation */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 shrink-0 border-r border-slate-800 bg-[#0f172a]/80 backdrop-blur-lg justify-between p-4 z-20">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold text-base">
              AQA
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-400 leading-none">Corporate</p>
              <p className="text-sm font-bold text-white leading-tight mt-0.5">AQA Events Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-lg shadow-sky-500/5"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white border border-transparent"
                  }`}
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
            <p className="text-[10px] uppercase font-bold text-slate-500">Logged in as</p>
            <p className="font-medium text-slate-200 truncate mt-0.5">{userEmail}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold rounded-md uppercase">
              Role: {role}
            </span>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/portal/login" })}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-sm text-white">Corporate Portal</span>
        </div>
        <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 text-[10px] font-bold rounded border border-sky-500/20 uppercase">
          {role}
        </span>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex">
          <div className="w-64 bg-[#0f172a] h-full p-4 flex flex-col justify-between border-r border-slate-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-sm text-white">AQA Portal Navigation</span>
                <button type="button" onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive(item.href)
                        ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/portal/login" })}
              className="w-full py-2.5 bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 text-xs font-bold rounded-xl border border-slate-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
