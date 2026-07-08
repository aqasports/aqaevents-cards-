"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Session = {
  id: string;
  sessionDate: Date | string;
  location: string | null;
  activity: { id: string; name: string };
  _count: { redemptions: number; clubCheckIns: number };
};

type Club = {
  id: string;
  name: string;
  sessions: Session[];
};

type ScanResult = {
  success: boolean;
  status:
    | "checked_in"
    | "already_checked_in"
    | "not_redeemed"
    | "not_found"
    | "voided"
    | "unassigned"
    | "error";
  message: string;
  clientName?: string;
  creditBalance?: number;
  checkedAt?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("fr-DZ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("fr-DZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Status Card ─────────────────────────────────────────────────────────────

function StatusCard({
  result,
  countdown,
  onDismiss,
}: {
  result: ScanResult;
  countdown: number;
  onDismiss: () => void;
}) {
  const isSuccess = result.status === "checked_in";
  const isWarning = result.status === "already_checked_in";
  const isError = !isSuccess && !isWarning;

  const color = isSuccess
    ? { bg: "#0d2b1a", border: "#16a34a", glow: "rgba(22,163,74,0.25)", text: "#4ade80", icon: "#16a34a" }
    : isWarning
    ? { bg: "#2b1f0a", border: "#d97706", glow: "rgba(217,119,6,0.25)", text: "#fbbf24", icon: "#d97706" }
    : { bg: "#2b0a0a", border: "#dc2626", glow: "rgba(220,38,38,0.25)", text: "#f87171", icon: "#dc2626" };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        padding: "1.5rem",
        animation: "fadeIn 0.25s ease",
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          background: color.bg,
          border: `2px solid ${color.border}`,
          borderRadius: "1.5rem",
          padding: "2.5rem",
          maxWidth: "440px",
          width: "100%",
          boxShadow: `0 0 60px ${color.glow}, 0 25px 50px rgba(0,0,0,0.8)`,
          textAlign: "center",
          animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: `${color.icon}22`,
            border: `2px solid ${color.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          {isSuccess ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color.icon} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : isWarning ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color.icon} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color.icon} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
        </div>

        {/* Status label */}
        <div
          style={{
            display: "inline-block",
            padding: "0.25rem 0.875rem",
            borderRadius: "9999px",
            background: `${color.border}22`,
            color: color.text,
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "0.75rem",
          }}
        >
          {isSuccess ? "Check-In Confirmed" : isWarning ? "Already Checked In" : "Access Denied"}
        </div>

        {/* Client name */}
        {result.clientName && (
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#f1f5f9",
              letterSpacing: "-0.025em",
              marginBottom: "0.5rem",
            }}
          >
            {result.clientName}
          </div>
        )}

        {/* Message */}
        <div style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
          {result.message}
        </div>

        {/* Credit balance */}
        {result.creditBalance !== undefined && (
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.75rem",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Credit balance:</span>
            <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "0.9rem" }}>
              {result.creditBalance.toLocaleString("fr-DZ", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} credits
            </span>
          </div>
        )}

        {/* Countdown + dismiss */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#475569",
            }}
          >
            Auto-reset in {countdown}s
          </div>
          <button
            onClick={onDismiss}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "0.625rem",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#cbd5e1",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            Scan Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Terminal ────────────────────────────────────────────────────────────

export default function TerminalClient({ club, token }: { club: Club; token: string }) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(
    club.sessions.length === 1 ? club.sessions[0] : null
  );
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [checkinCount, setCheckinCount] = useState(
    selectedSession?._count.clubCheckIns ?? 0
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScannedRef = useRef<string>("");

  // ── Card scan function ────────────────────────────────────────────────────
  const processCardCode = useCallback(
    async (code: string) => {
      if (!selectedSession || scanning) return;
      const normalized = code.trim().toUpperCase();
      if (!normalized) return;

      setScanning(true);

      try {
        const res = await fetch(`/api/check/${token}/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardCode: normalized, sessionId: selectedSession.id }),
        });
        const data = await res.json();

        if (!res.ok && !data.status) {
          setResult({ success: false, status: "error", message: data.error ?? "Unknown error" });
        } else {
          setResult(data);
          if (data.status === "checked_in") {
            setCheckinCount((c) => c + 1);
          }
        }
      } catch {
        setResult({ success: false, status: "error", message: "Network error. Check your connection." });
      } finally {
        setScanning(false);
        setCountdown(5);
      }
    },
    [selectedSession, scanning, token]
  );

  // ── Auto countdown & dismiss ──────────────────────────────────────────────
  useEffect(() => {
    if (!result) return;
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          setResult(null);
          lastScannedRef.current = "";
          return 5;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [result]);

  // ── Camera / QR scanner ───────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError("Camera access denied. Use manual card code entry below.");
    }
  }, []);

  // ── QR scan loop using BarcodeDetector API or jsQR fallback ──────────────
  useEffect(() => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Prefer native BarcodeDetector (available in Chrome/Android)
    const barcodeDetector =
      typeof window !== "undefined" && "BarcodeDetector" in window
        ? new (window as unknown as { BarcodeDetector: new (opts: object) => { detect: (img: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: ["qr_code", "code_128", "code_39"] })
        : null;

    let active = true;

    async function tick() {
      if (!active || result) return;
      if (video.readyState >= 2) {
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(video);
            for (const barcode of barcodes) {
              if (barcode.rawValue && barcode.rawValue !== lastScannedRef.current) {
                lastScannedRef.current = barcode.rawValue;
                processCardCode(barcode.rawValue);
                return;
              }
            }
          } catch { /* ignore */ }
        } else if (ctx) {
          // jsQR canvas fallback
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          // jsQR is loaded dynamically
          try {
            const jsQR = (await import("jsqr")).default;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code?.data && code.data !== lastScannedRef.current) {
              lastScannedRef.current = code.data;
              processCardCode(code.data);
              return;
            }
          } catch { /* ignore */ }
        }
      }
      scanLoopRef.current = requestAnimationFrame(tick);
    }

    scanLoopRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [cameraActive, result, processCardCode]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Update count when session changes ────────────────────────────────────
  useEffect(() => {
    setCheckinCount(selectedSession?._count.clubCheckIns ?? 0);
  }, [selectedSession]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processCardCode(manualCode);
    setManualCode("");
  };

  const dismissResult = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setResult(null);
    lastScannedRef.current = "";
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, sans-serif; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes scanLine { 0% { top: 10%; } 100% { top: 90%; } }
        .scan-btn:hover { background: rgba(255,255,255,0.12) !important; }
        .session-card:hover { border-color: rgba(99,102,241,0.6) !important; background: rgba(99,102,241,0.08) !important; }
        .session-card.selected { border-color: #6366f1 !important; background: rgba(99,102,241,0.12) !important; }
        input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
      `}</style>

      <div
        style={{
          minHeight: "100dvh",
          background: "linear-gradient(135deg, #0a0f1a 0%, #0d1425 50%, #080c14 100%)",
          color: "#f1f5f9",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            {/* AQA Logo mark */}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "0.625rem",
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                AQA Sports
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.015em", color: "#f1f5f9" }}>
                {club.name}
              </div>
            </div>
          </div>

          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 8px #22c55e",
                animation: "pulse 2s infinite",
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Terminal Active</span>
          </div>
        </header>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "1.5rem", gap: "1.25rem", maxWidth: 680, width: "100%", margin: "0 auto" }}>

          {/* ── Session Selector ──────────────────────────────────────────── */}
          {club.sessions.length === 0 ? (
            <div
              style={{
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.2)",
                borderRadius: "1rem",
                padding: "2rem",
                textAlign: "center",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={1.5} style={{ margin: "0 auto 1rem" }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p style={{ color: "#f87171", fontWeight: 600, margin: 0 }}>No sessions assigned to this club.</p>
              <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.5rem" }}>Contact AQA admin to assign sessions to this terminal.</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                Select Event
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {club.sessions.map((session) => (
                  <button
                    key={session.id}
                    className={`session-card ${selectedSession?.id === session.id ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedSession(session);
                      setResult(null);
                      lastScannedRef.current = "";
                    }}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${selectedSession?.id === session.id ? "#6366f1" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: "0.875rem",
                      padding: "0.875rem 1.125rem",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    {/* Selection indicator */}
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: `2px solid ${selectedSession?.id === session.id ? "#6366f1" : "rgba(255,255,255,0.2)"}`,
                        background: selectedSession?.id === session.id ? "#6366f1" : "transparent",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      {selectedSession?.id === session.id && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "0.9rem" }}>
                        {session.activity.name}
                      </div>
                      <div style={{ color: "#64748b", fontSize: "0.78rem", marginTop: "0.15rem" }}>
                        {formatDate(session.sessionDate)}
                        {session.location && ` — ${session.location}`}
                      </div>
                    </div>

                    {/* Check-in count */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#6366f1" }}>
                        {session._count.clubCheckIns}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#475569", fontWeight: 600 }}>checked</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Scanner Area ──────────────────────────────────────────────── */}
          {selectedSession && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                Scan AQA Card
              </div>

              {/* Camera viewport */}
              <div
                style={{
                  position: "relative",
                  borderRadius: "1rem",
                  overflow: "hidden",
                  background: "#000",
                  aspectRatio: "16/9",
                  border: "1px solid rgba(255,255,255,0.07)",
                  marginBottom: "1rem",
                }}
              >
                <video
                  ref={videoRef}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: cameraActive ? "block" : "none",
                  }}
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {!cameraActive && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "1rem",
                      background: "rgba(0,0,0,0.7)",
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "rgba(99,102,241,0.12)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={1.5}>
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <path d="M14 14h1v1h-1zm2 0h1v1h-1zm2 0h1v3h-3v-1h1v-1h1zM14 17h1v1h-1zm2 0h1v1h-1z" fill="#818cf8" stroke="none" />
                      </svg>
                    </div>
                    {cameraError ? (
                      <p style={{ color: "#f87171", fontSize: "0.82rem", textAlign: "center", margin: 0, padding: "0 1rem" }}>{cameraError}</p>
                    ) : (
                      <p style={{ color: "#64748b", fontSize: "0.82rem", margin: 0 }}>Camera not started</p>
                    )}
                    <button
                      className="scan-btn"
                      onClick={startCamera}
                      style={{
                        padding: "0.6rem 1.5rem",
                        borderRadius: "0.625rem",
                        background: "rgba(99,102,241,0.15)",
                        border: "1px solid rgba(99,102,241,0.4)",
                        color: "#818cf8",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      Start Camera
                    </button>
                  </div>
                )}

                {/* Scanning overlay */}
                {cameraActive && !scanning && (
                  <>
                    {/* Corner brackets */}
                    {[
                      { top: "15%", left: "20%", borderTop: "3px solid #6366f1", borderLeft: "3px solid #6366f1" },
                      { top: "15%", right: "20%", borderTop: "3px solid #6366f1", borderRight: "3px solid #6366f1" },
                      { bottom: "15%", left: "20%", borderBottom: "3px solid #6366f1", borderLeft: "3px solid #6366f1" },
                      { bottom: "15%", right: "20%", borderBottom: "3px solid #6366f1", borderRight: "3px solid #6366f1" },
                    ].map((style, i) => (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          width: 24,
                          height: 24,
                          ...style,
                        }}
                      />
                    ))}
                    {/* Scan line */}
                    <div
                      style={{
                        position: "absolute",
                        left: "20%",
                        right: "20%",
                        height: 2,
                        background: "linear-gradient(90deg, transparent, #6366f1, transparent)",
                        animation: "scanLine 2s ease-in-out infinite alternate",
                      }}
                    />
                  </>
                )}

                {/* Scanning spinner */}
                {scanning && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.5)",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        border: "3px solid rgba(99,102,241,0.2)",
                        borderTopColor: "#6366f1",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}

                {/* Stop camera button */}
                {cameraActive && (
                  <button
                    onClick={stopCamera}
                    style={{
                      position: "absolute",
                      top: "0.625rem",
                      right: "0.625rem",
                      padding: "0.375rem 0.75rem",
                      borderRadius: "0.5rem",
                      background: "rgba(0,0,0,0.6)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#94a3b8",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Stop
                  </button>
                )}
              </div>

              {/* Manual entry */}
              <form onSubmit={handleManualSubmit}>
                <div style={{ display: "flex", gap: "0.625rem" }}>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter card code manually (e.g. AQA-123456)"
                    disabled={scanning}
                    style={{
                      flex: 1,
                      padding: "0.75rem 1rem",
                      borderRadius: "0.75rem",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#f1f5f9",
                      fontSize: "0.875rem",
                      fontFamily: "Inter, monospace",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim() || scanning}
                    style={{
                      padding: "0.75rem 1.25rem",
                      borderRadius: "0.75rem",
                      background: scanning || !manualCode.trim() ? "rgba(99,102,241,0.2)" : "#6366f1",
                      border: "none",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      cursor: scanning || !manualCode.trim() ? "not-allowed" : "pointer",
                      transition: "background 0.15s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Check In
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Stats Footer ──────────────────────────────────────────────── */}
          {selectedSession && (
            <div
              style={{
                marginTop: "auto",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              {[
                { label: "Checked In", value: checkinCount, color: "#22c55e" },
                { label: "Total Redemptions", value: selectedSession._count.redemptions, color: "#6366f1" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "0.875rem",
                    padding: "1rem",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "1.75rem", fontWeight: 900, color, lineHeight: 1 }}>
                    {value}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600, marginTop: "0.375rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Result Overlay ──────────────────────────────────────────────────── */}
      {result && (
        <StatusCard result={result} countdown={countdown} onDismiss={dismissResult} />
      )}
    </>
  );
}
