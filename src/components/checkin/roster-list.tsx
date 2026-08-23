"use client";

import React from "react";

type RosterItem = {
  clientName: string;
  checkedInAt: string;
  activityId: string;
  sessionId: string | null;
};

type RosterListProps = {
  roster: RosterItem[];
  selectedActivityId: string;
  selectedSessionId: string | null;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function RosterList({
  roster,
  selectedActivityId,
  selectedSessionId,
}: RosterListProps) {
  // Filter roster items for the selected activity and session
  const filtered = roster.filter((item) => {
    const matchesActivity = item.activityId === selectedActivityId;
    const matchesSession = !selectedSessionId || item.sessionId === selectedSessionId;
    return matchesActivity && matchesSession;
  });

  return (
    <div className="space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-white tracking-tight">
            Attendance Roster
          </h4>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 tabular-nums">
            {filtered.length}
          </span>
        </div>
        <span className="text-[10px] uppercase font-semibold tracking-wider text-white/40">
          Live Feed
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/5 animate-fade-in">
          <svg className="h-6 w-6 mx-auto text-white/30 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-xs text-white/40">No client scans recorded today.</p>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {filtered.map((item, idx) => {
            const isFirst = idx === 0;
            const timeStr = new Date(item.checkedInAt).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <div
                key={idx}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all duration-300 ${
                  isFirst
                    ? "border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-slide-in-down"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isFirst
                      ? "bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  }`}>
                    {getInitials(item.clientName)}
                  </div>
                  <span className="text-xs font-semibold text-white/95 truncate">
                    {item.clientName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isFirst && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Just now
                    </span>
                  )}
                  <span className="text-[10px] text-white/50 font-mono tabular-nums">
                    {timeStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
