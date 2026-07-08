"use client";

import { useEffect, useState, useCallback } from "react";
import Scanner from "@/components/checkin/scanner";
import { Button, PageHeader, Card, Alert, Badge } from "@/components/admin/ui";
import { formatDate, useLocale } from "@/lib/i18n";

type Session = {
  id: string;
  sessionDate: string;
  location: string | null;
  activity: {
    id: string;
    name: string;
    creditCost: number;
  };
};

type Client = {
  id: string;
  fullName: string;
  balance: number;
};

type SessionDetail = {
  id: string;
  sessionDate: string;
  location: string | null;
  activity: {
    id: string;
    name: string;
    creditCost: number;
  };
  redemptions: {
    id: string;
    redeemedAt: string;
    client: {
      id: string;
      fullName: string;
      phone: string | null;
      email: string | null;
    };
  }[];
};

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
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (err) {
    console.error("Audio feedback error:", err);
  }
}

export default function MasterTerminalPage() {
  const { locale } = useLocale();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);

  // Search & input states
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showClientDropdown, setShowClientDropdown] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>("");

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkInLoading, setCheckInLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  // Duplicate confirm popup
  const [confirmConfig, setConfirmConfig] = useState<{
    clientId?: string | null;
    scannedValue?: string | null;
    clientName: string;
  } | null>(null);

  // Load basic lists
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sessions?activeOnly=true");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0) {
          setSelectedSessionId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) {
        setClients(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadSessions(), loadClients()]).then(() => setLoading(false));
  }, [loadSessions, loadClients]);

  // Load details of selected session
  const loadSessionDetails = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`);
      if (res.ok) {
        setSessionDetail(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionDetails(selectedSessionId);
    } else {
      setSessionDetail(null);
    }
  }, [selectedSessionId, loadSessionDetails]);

  // Check in API call
  async function performCheckIn(payload: {
    clientId?: string | null;
    scannedValue?: string | null;
    sessionId: string;
    bypassDuplicateCheck?: boolean;
  }) {
    setCheckInLoading(true);
    setMessage(null);
    setIsPaused(true);

    try {
      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.status === "DUPLICATE") {
          playAudioFeedback("error");
          setConfirmConfig({
            clientId: payload.clientId,
            scannedValue: payload.scannedValue,
            clientName: data.clientName,
          });
        } else {
          playAudioFeedback("success");
          setMessage({
            text: `Successfully checked in ${data.clientName} for activity "${data.activityName}".`,
            tone: "success",
          });
          // Reset input fields
          setSelectedClientId("");
          setSearchQuery("");
          setManualToken("");
          // Reload attendance list
          loadSessionDetails(selectedSessionId);
          loadClients(); // Reload credit balances
        }
      } else {
        playAudioFeedback("error");
        setMessage({ text: data.error || "Failed to check in client.", tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      playAudioFeedback("error");
      setMessage({ text: "Network error occurred.", tone: "danger" });
    } finally {
      setCheckInLoading(false);
      // Auto-resume scan if not waiting on duplicate confirmation
      if (!confirmConfig) {
        setTimeout(() => setIsPaused(false), 2000);
      }
    }
  }

  // Handle scanned token
  function handleScanSuccess(decodedText: string) {
    if (isPaused || !selectedSessionId) return;
    performCheckIn({ scannedValue: decodedText, sessionId: selectedSessionId });
  }

  // Handle manual submit
  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSessionId) return;

    if (selectedClientId) {
      performCheckIn({ clientId: selectedClientId, sessionId: selectedSessionId });
    } else if (manualToken) {
      performCheckIn({ scannedValue: manualToken, sessionId: selectedSessionId });
    }
  }

  // Confirm duplicate bypass
  async function handleConfirmDuplicate() {
    if (!confirmConfig || !selectedSessionId) return;
    const config = confirmConfig;
    setConfirmConfig(null);

    await performCheckIn({
      clientId: config.clientId,
      scannedValue: config.scannedValue,
      sessionId: selectedSessionId,
      bypassDuplicateCheck: true,
    });

    setIsPaused(false);
  }

  function handleCancelDuplicate() {
    setConfirmConfig(null);
    setSelectedClientId("");
    setSearchQuery("");
    setManualToken("");
    setIsPaused(false);
  }

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Event Check-in Terminal"
        description="Check in late-arriving clients for any active scheduled session. Scanning or selecting card automatically registers the attendance and manages credits."
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Configuration & Action Area */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-2">
              Terminal Settings
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Target Event Session
              </label>
              {sessions.length === 0 ? (
                <p className="text-xs text-[var(--danger)] font-medium">
                  No active scheduled events available. Go to Activities to schedule one first.
                </p>
              ) : (
                <select
                  value={selectedSessionId}
                  onChange={(e) => {
                    setSelectedSessionId(e.target.value);
                    setMessage(null);
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.activity.name} — {formatDate(s.sessionDate, locale, true)} {s.location ? `(${s.location})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Card>

          {/* Verification / Input Panel */}
          {selectedSessionId && (
            <Card className="p-5 space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-2">
                Card Scanner &amp; Manual Entry
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Camera Scanner */}
                <div className="flex flex-col justify-center bg-slate-50 border border-[var(--border)] rounded-2xl p-4">
                  <Scanner onScanSuccess={handleScanSuccess} isPaused={isPaused} />
                </div>

                {/* Manual check in form */}
                <form onSubmit={handleManualSubmit} className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Client search suggestion */}
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                        Search Client Name
                      </label>
                      <input
                        type="text"
                        placeholder="Type client name..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowClientDropdown(true);
                          if (!e.target.value) {
                            setSelectedClientId("");
                          }
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {showClientDropdown && (
                        <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                          {(() => {
                            const q = searchQuery.toLowerCase();
                            const matching = q
                              ? clients.filter((c) =>
                                  c.fullName.toLowerCase().split(/\s+/).some((part) => part.startsWith(q))
                                )
                              : clients.slice(0, 10);

                            if (matching.length === 0) {
                              return <p className="p-3 text-xs text-[var(--muted)] text-center">No clients match</p>;
                            }

                            return matching.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedClientId(c.id);
                                  setSearchQuery(c.fullName);
                                  setShowClientDropdown(false);
                                  setManualToken(""); // Clear card token if client selected
                                }}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition flex items-center justify-between border-b border-[var(--border)] last:border-0"
                              >
                                <span className="font-bold text-slate-800">{c.fullName}</span>
                                <Badge tone={c.balance === 0 ? "danger" : c.balance <= 2 ? "warning" : "success"} size="sm">
                                  {c.balance} credits
                                </Badge>
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink mx-3 text-xs text-slate-400 font-semibold uppercase tracking-wider">Or</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    {/* Card code entry */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                        Card Code or Card URL
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AQA-123456"
                        value={manualToken}
                        onChange={(e) => {
                          setManualToken(e.target.value);
                          if (e.target.value) {
                            setSelectedClientId("");
                            setSearchQuery("");
                          }
                        }}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-4"
                    loading={checkInLoading}
                    disabled={!selectedClientId && !manualToken}
                  >
                    Check In Client
                  </Button>
                </form>
              </div>
            </Card>
          )}
        </div>

        {/* Live Attendance List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 flex flex-col h-full min-h-[450px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--border)] pb-2 mb-3">
              Checked-in Attendees
            </h3>

            {!sessionDetail || sessionDetail.redemptions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[var(--border)] rounded-2xl">
                <svg className="h-10 w-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-xs font-bold text-slate-500">No attendees checked in</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Use the scanner or manual input to register clients.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[500px] pr-1">
                {sessionDetail.redemptions.map((red) => (
                  <div
                    key={red.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-xs text-slate-800">{red.client.fullName}</p>
                      {red.client.phone && <p className="text-[10px] text-slate-500 mt-0.5">{red.client.phone}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        {new Date(red.redeemedAt).toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Duplicate warning Modal */}
      {confirmConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Duplicate Attendance Warning</h3>
              <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
                Client <span className="font-bold text-slate-800">{confirmConfig.clientName}</span> is already in the list of attendees for this event session.
              </p>
              <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed font-semibold">
                Did they bring a friend? Proceeding will deduct another credit and add them to the roster again.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" size="sm" onClick={handleCancelDuplicate}>
                No, Abort
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmDuplicate}>
                Yes, Deduct Credit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
