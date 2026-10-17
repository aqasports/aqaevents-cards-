"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { playSensorySound, isSensorySoundEnabled, setSensorySoundEnabled, triggerHaptic } from "@/lib/sensory";

type CommandItem = {
  id: string;
  label: string;
  category: "AQA ERP" | "1. Sports Academy" | "2. AQA Events" | "3. AQA Store" | "System";
  shortcut?: string;
  action: () => void;
  icon: React.ReactNode;
};

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [soundActive, setSoundActive] = useState(true);

  useEffect(() => {
    setSoundActive(isSensorySoundEnabled());
  }, [isOpen]);

  const toggleSoundPref = () => {
    const next = !soundActive;
    setSensorySoundEnabled(next);
    setSoundActive(next);
    playSensorySound(next ? "success" : "tap");
    triggerHaptic("light");
    onClose();
  };

  const commands: CommandItem[] = [
    // AQA ERP Hub
    {
      id: "nav-erp-hub",
      label: "AQA ERP Executive Hub",
      category: "AQA ERP",
      action: () => { router.push("/admin"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },

    // 1. AQA Sports Academy (AQA Swim derived)
    {
      id: "nav-academy-hub",
      label: "1. AQA Sports Academy Hub",
      category: "1. Sports Academy",
      action: () => { router.push("/admin/academy"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "nav-swim-workspace",
      label: "AQA Swim Inscription Manager",
      category: "1. Sports Academy",
      action: () => { router.push("/admin/swim"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "nav-swim-members",
      label: "AQA Swim · Confirmed Swimmers & Profiles",
      category: "1. Sports Academy",
      action: () => { router.push("/admin/swim/members"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: "nav-swim-leads",
      label: "AQA Swim · Waitlist & Leads",
      category: "1. Sports Academy",
      action: () => { router.push("/admin/swim/leads"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      id: "nav-swim-groups",
      label: "AQA Swim · Training Groups",
      category: "1. Sports Academy",
      action: () => { router.push("/admin/swim/groups"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: "nav-swim-pool",
      label: "AQA Swim · Pool Direction & Bordereaux",
      category: "1. Sports Academy",
      action: () => { router.push("/admin/swim/pool"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "nav-swim-coaching",
      label: "AQA Swim · Coaches & Mobile Attendance",
      category: "1. Sports Academy",
      action: () => { router.push("/admin/swim/coaching"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "nav-swim-calls",
      label: "AQA Swim · Reinscription Call Desk",
      category: "1. Sports Academy",
      action: () => { router.push("/admin/swim/calls"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    },

    // 2. AQA Events
    {
      id: "nav-events-console",
      label: "2. AQA Events Operations Console",
      category: "2. AQA Events",
      action: () => { router.push("/admin?view=events"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "nav-clients",
      label: "Clients & Event Card Directory",
      category: "2. AQA Events",
      action: () => { router.push("/admin/clients"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: "nav-redeem",
      label: "Redeem Activity (Events POS)",
      category: "2. AQA Events",
      action: () => { router.push("/admin/redeem"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H9m2-2a2 2 0 00-2 2v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V5a2 2 0 00-2-2h-2m-4 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "nav-invoices",
      label: "Invoices & Ledger Records",
      category: "2. AQA Events",
      action: () => { router.push("/admin/invoices"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "nav-activities",
      label: "Sports Activities & Sessions",
      category: "2. AQA Events",
      action: () => { router.push("/admin/activities"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "nav-terminal",
      label: "Scanner Terminal Station",
      category: "2. AQA Events",
      action: () => { router.push("/admin/terminal"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      id: "action-new-client",
      label: "Register New Event Client",
      category: "2. AQA Events",
      shortcut: "N",
      action: () => { router.push("/admin/clients/new"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      id: "action-print-cards",
      label: "Print Client Badges / QR Cards",
      category: "2. AQA Events",
      shortcut: "P",
      action: () => { router.push("/admin/print"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      ),
    },

    // 3. AQA Store
    {
      id: "nav-store-hub",
      label: "3. AQA Store Hub",
      category: "3. AQA Store",
      action: () => { router.push("/admin/store"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      id: "nav-store-pos",
      label: "AQA Store · Products Catalog & POS",
      category: "3. AQA Store",
      action: () => { router.push("/admin/products"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      id: "nav-store-swim-gear",
      label: "AQA Store · Swim Gear Boutique & Packs",
      category: "3. AQA Store",
      action: () => { router.push("/admin/store?tab=swim-gear"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },

    // System
    {
      id: "nav-insights",
      label: "AI Insights & Anomalies",
      category: "System",
      action: () => { router.push("/admin/insights"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: "nav-settings",
      label: "Platform Settings & Rates",
      category: "System",
      action: () => { router.push("/admin/settings"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: "action-toggle-sound",
      label: soundActive ? "Disable UI Sensory Sounds" : "Enable UI Sensory Sounds",
      category: "System",
      action: toggleSoundPref,
      icon: soundActive ? (
        <svg className="h-4 w-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      ) : (
        <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      ),
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      playSensorySound("tap");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      playSensorySound("tap");
    } else if (e.key === "Enter" && filteredCommands.length > 0) {
      e.preventDefault();
      playSensorySound("click");
      filteredCommands[selectedIndex]?.action();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_0_40px_rgba(0,242,255,0.15)] overflow-hidden animate-slide-up sm:animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border)] bg-[var(--surface-2)]/30 gap-3">
          <svg className="h-5 w-5 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search AQA ERP (1. Sports Academy, 2. AQA Events, 3. AQA Store)..."
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder-[var(--muted-light)] outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-[var(--muted)] bg-[var(--surface-2)] border border-[var(--border)]">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted)]">
              No matching commands or pages found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    playSensorySound("click");
                    cmd.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "bg-[var(--primary-light)] text-white border border-[var(--primary)]/40 shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                      : "text-[var(--foreground)] hover:bg-[var(--surface-2)] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                      {cmd.icon}
                    </div>
                    <span className="font-medium truncate">{cmd.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase font-semibold text-[var(--muted)] px-2 py-0.5 rounded-full bg-[var(--surface-2)]">
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)]">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-4 py-2 text-[10px] text-[var(--muted)] border-t border-[var(--border)] bg-[var(--surface-2)]/20">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="font-mono font-bold text-[var(--foreground)]">Up/Down</kbd> to navigate</span>
            <span><kbd className="font-mono font-bold text-[var(--foreground)]">Enter</kbd> to select</span>
          </div>
          <span className="font-mono text-cyan-400">AQA ERP Command Hub</span>
        </div>
      </div>
    </div>
  );
}
