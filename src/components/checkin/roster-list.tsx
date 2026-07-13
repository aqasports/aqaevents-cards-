"use client";

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
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h4 className="text-sm font-bold text-white">
          Attendance Roster ({filtered.length})
        </h4>
        <span className="text-[10px] uppercase font-semibold tracking-wider text-white/40">
          Today
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
          <svg className="h-6 w-6 mx-auto text-white/30 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-xs text-white/40">No client scans recorded today.</p>
        </div>
      ) : (
        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-3 py-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition"
            >
              <span className="text-xs font-semibold text-white/90">
                {item.clientName}
              </span>
              <span className="text-[10px] text-white/40 tabular-nums">
                {new Date(item.checkedInAt).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
