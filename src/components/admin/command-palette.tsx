"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { playSensorySound, isSensorySoundEnabled, setSensorySoundEnabled, triggerHaptic } from "@/lib/sensory";

type CommandItem = {
  id: string;
  label: string;
  category: "Navigation" | "Quick Action" | "System";
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
    // Navigation
    {
      id: "nav-dashboard",
      label: "Dashboard & Overview",
      category: "Navigation",
      action: () => { router.push("/admin"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "nav-clients",
      label: "Clients & Member Directory",
      category: "Navigation",
      action: () => { router.push("/admin/clients"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: "nav-redeem",
      label: "Redemptions & Usage",
      category: "Navigation",
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
      category: "Navigation",
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
      category: "Navigation",
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
      category: "Navigation",
      action: () => { router.push("/admin/terminal"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      id: "nav-insights",
      label: "AI Insights & Anomalies",
      category: "Navigation",
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
      category: "Navigation",
      action: () => { router.push("/admin/settings"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },

    // Quick Actions
    {
      id: "action-new-client",
      label: "Register New Client",
      category: "Quick Action",
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
      label: "Print Client Badges / Cards",
      category: "Quick Action",
      shortcut: "P",
      action: () => { router.push("/admin/print"); onClose(); },
      icon: (
        <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
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
            placeholder="Type a command, page, or action..."
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
          <span className="font-mono text-cyan-400">AQA Command Hub</span>
        </div>
      </div>
    </div>
  );
}
