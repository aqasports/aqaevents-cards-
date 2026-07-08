"use client";

import { use, useEffect, useState } from "react";
import Scanner from "@/components/checkin/scanner";
import ResultBanner from "@/components/checkin/result-banner";
import RosterList from "@/components/checkin/roster-list";

type Session = {
  id: string;
  date: string;
  location: string | null;
};

type RosterItem = {
  clientName: string;
  checkedInAt: string;
  activityId: string;
  sessionId: string | null;
};

type Activity = {
  id: string;
  name: string;
  sessions: Session[];
  roster: RosterItem[];
};

type TerminalData = {
  club: { name: string };
  activities: Activity[];
};

// Sleek audio feedback using Web Audio API
function playAudioFeedback(type: "success" | "error") {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (err) {
    console.error("Audio feedback error:", err);
  }
}

export default function CheckinTerminalPage({ params }: { params: Promise<{ clubToken: string }> }) {
  const { clubToken } = use(params);

  const [clubName, setClubName] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selections
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");

  // Scan state
  const [isPaused, setIsPaused] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: "SUCCESS" | "DUPLICATE" | "NOT_REDEEMED" | "INVALID_CARD" | null;
    clientName?: string;
    activityName?: string;
    timestamp?: string;
    errorMessage?: string;
  }>({ status: null });

  // Roster list combining initially fetched roster with live scans
  const [liveRoster, setLiveRoster] = useState<RosterItem[]>([]);

  useEffect(() => {
    async function loadTerminalData() {
      try {
        const res = await fetch(`/api/public/checkin/${clubToken}`);
        if (res.ok) {
          const data = (await res.json()) as TerminalData;
          setClubName(data.club.name);
          setActivities(data.activities);

          // Populate the active roster items
          const initialRoster: RosterItem[] = [];
          data.activities.forEach((act) => {
            if (act.roster) {
              initialRoster.push(...act.roster);
            }
          });
          setLiveRoster(initialRoster);

          // Auto-select first activity if available
          if (data.activities.length > 0) {
            const firstAct = data.activities[0];
            setSelectedActivityId(firstAct.id);

            // Auto-select today's session if any
            const todayStr = new Date().toISOString().split("T")[0];
            const todaySession = firstAct.sessions.find((s) => s.date === todayStr);
            if (todaySession) {
              setSelectedSessionId(todaySession.id);
            } else if (firstAct.sessions.length > 0) {
              setSelectedSessionId(firstAct.sessions[0].id);
            }
          }
        } else {
          const data = await res.json();
          setErrorMsg(data.error || "Terminal is inactive or not found.");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to connect to the check-in server.");
      } finally {
        setLoading(false);
      }
    }

    loadTerminalData();
  }, [clubToken]);

  // Adjust session options when activity selection changes
  useEffect(() => {
    if (!selectedActivityId) return;
    const act = activities.find((a) => a.id === selectedActivityId);
    if (act) {
      const todayStr = new Date().toISOString().split("T")[0];
      const todaySession = act.sessions.find((s) => s.date === todayStr);
      if (todaySession) {
        setSelectedSessionId(todaySession.id);
      } else if (act.sessions.length > 0) {
        setSelectedSessionId(act.sessions[0].id);
      } else {
        setSelectedSessionId("");
      }
    }
  }, [selectedActivityId, activities]);

  async function handleScanSuccess(decodedText: string) {
    if (isPaused || !selectedActivityId) return;

    setIsPaused(true);
    setScanResult({ status: null });

    try {
      const res = await fetch(`/api/public/checkin/${clubToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scannedValue: decodedText,
          activityId: selectedActivityId,
          sessionId: selectedSessionId || null,
        }),
      });

      const data = await res.json();

      if (res.ok || res.status === 404 || res.status === 400 || res.status === 422) {
        const status = data.status as "SUCCESS" | "DUPLICATE" | "NOT_REDEEMED" | "INVALID_CARD";
        
        // Play beep sound
        if (status === "SUCCESS") {
          playAudioFeedback("success");
        } else {
          playAudioFeedback("error");
        }

        setScanResult({
          status,
          clientName: data.clientName,
          activityName: data.activityName,
          timestamp: data.timestamp || new Date().toISOString(),
          errorMessage: data.message,
        });

        // Add to local roster immediately if successful
        if (status === "SUCCESS" && data.clientName) {
          setLiveRoster((prev) => [
            {
              clientName: data.clientName,
              checkedInAt: data.timestamp || new Date().toISOString(),
              activityId: selectedActivityId,
              sessionId: selectedSessionId || null,
            },
            ...prev,
          ]);
        }
      } else {
        playAudioFeedback("error");
        setScanResult({
          status: "INVALID_CARD",
          errorMessage: data.error || "Check-in failed. Please try again.",
        });
      }
    } catch (err) {
      console.error(err);
      playAudioFeedback("error");
      setScanResult({
        status: "INVALID_CARD",
        errorMessage: "Network error. Please check connection.",
      });
    }

    // Auto-resume scanner and clear result after 2.5 seconds
    setTimeout(() => {
      setScanResult({ status: null });
      setIsPaused(false);
    }, 2500);
  }

  const selectedActivity = activities.find((a) => a.id === selectedActivityId);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100 p-4">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-indigo-500 mx-auto" />
          <p className="text-sm font-semibold">Initializing Terminal...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-red-950 text-red-500 flex items-center justify-center mx-auto border border-red-800">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold">Terminal Access Error</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Premium Header */}
      <header className="border-b border-slate-900 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
            Partner Check-In Terminal
          </span>
          <h1 className="text-lg font-extrabold text-white leading-tight">
            {clubName}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Online
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {/* Left Column: Config & Scanning */}
        <div className="lg:col-span-3 space-y-6 flex flex-col justify-start">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Terminal Setup
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Activity
                </label>
                <select
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  className="w-full rounded-xl border border-slate-850 bg-slate-950 text-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {activities.map((act) => (
                    <option key={act.id} value={act.id}>
                      {act.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Session
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  disabled={!selectedActivity || selectedActivity.sessions.length === 0}
                  className="w-full rounded-xl border border-slate-850 bg-slate-950 text-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {selectedActivity && selectedActivity.sessions.length > 0 ? (
                    <>
                      <option value="">— Select Session —</option>
                      {selectedActivity.sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.date} {s.location ? `(${s.location})` : ""}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value="">No Active Sessions Scheduled</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 flex-1 flex flex-col justify-center">
            <Scanner onScanSuccess={handleScanSuccess} isPaused={isPaused} />
          </div>
        </div>

        {/* Right Column: Scan Result & Live Roster */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* Result Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 flex flex-col justify-center min-h-[220px]">
            <ResultBanner
              status={scanResult.status}
              clientName={scanResult.clientName}
              activityName={scanResult.activityName}
              timestamp={scanResult.timestamp}
              errorMessage={scanResult.errorMessage}
            />
          </div>

          {/* Roster Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 flex-1">
            <RosterList
              roster={liveRoster}
              selectedActivityId={selectedActivityId}
              selectedSessionId={selectedSessionId || null}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
