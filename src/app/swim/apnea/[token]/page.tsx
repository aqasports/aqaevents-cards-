"use client";

import React, { use, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "@/lib/i18n";
import { formatApneaDuration } from "@/lib/swim-apnea";

interface TerminalMember {
  id: string;
  swimId: string;
  fullName: string;
  hasFins: boolean;
  sessionsTotal: number;
  sessionsAttended: number;
  sessionsRemaining: number;
  bestStaticSeconds: number | null;
  bestDynamicMeters: number | null;
  todayStatus: "present" | "absent" | null;
}

interface TerminalData {
  coach: { id: string; name: string };
  members: TerminalMember[];
}

/** Parses "155" or "2:35" into seconds. Returns NaN when invalid. */
function parseSeconds(raw: string): number {
  const v = raw.trim();
  if (/^\d+:\d{1,2}$/.test(v)) {
    const [m, s] = v.split(":").map(Number);
    return m * 60 + s;
  }
  return /^\d+$/.test(v) ? Number(v) : NaN;
}

function newMutationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ApneaCoachTerminalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { t } = useTranslations("swimApnea");
  const { locale, setLocale, dir } = useLocale();

  const [data, setData] = useState<TerminalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [openRecordFor, setOpenRecordFor] = useState<string | null>(null);
  const [recordKind, setRecordKind] = useState<"static" | "dynamic">("static");
  const [recordValue, setRecordValue] = useState("");

  const endpoint = `/api/public/swim/apnea/terminal/${encodeURIComponent(token)}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) {
        setInvalid(true);
        return;
      }
      setData(await res.json());
      setInvalid(false);
    } catch {
      setMessage({ kind: "error", text: t("loadError") });
    } finally {
      setLoading(false);
    }
  }, [endpoint, t]);

  // Single read on mount. No polling: the coach can refresh manually.
  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.members;
    return data.members.filter(
      (m) => m.fullName.toLowerCase().includes(q) || m.swimId.toLowerCase().includes(q)
    );
  }, [data, search]);

  async function post(body: Record<string, unknown>, memberId: string) {
    setBusyId(memberId);
    setMessage(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof json?.error === "string" ? json.error : "";
        const text =
          code === "static_out_of_range"
            ? t("staticOutOfRange")
            : code === "dynamic_out_of_range"
              ? t("dynamicOutOfRange")
              : code === "invalid_value"
                ? t("invalidValue")
                : t("actionError");
        setMessage({ kind: "error", text });
        return false;
      }
      return true;
    } catch {
      setMessage({ kind: "error", text: t("actionError") });
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function setPresence(m: TerminalMember, status: "present" | "absent") {
    if (m.todayStatus === status) return;
    const ok = await post({ action: "presence", memberId: m.id, status }, m.id);
    if (!ok) return;
    setData((prev) =>
      prev
        ? {
            ...prev,
            members: prev.members.map((x) => {
              if (x.id !== m.id) return x;
              const wasPresent = x.todayStatus === "present";
              const nowPresent = status === "present";
              const attended = x.sessionsAttended + (nowPresent ? 1 : 0) - (wasPresent ? 1 : 0);
              return {
                ...x,
                todayStatus: status,
                sessionsAttended: attended,
                sessionsRemaining: Math.max(0, x.sessionsTotal - attended),
              };
            }),
          }
        : prev
    );
    setMessage({ kind: "ok", text: `${m.fullName}: ${t(status)}` });
  }

  async function saveRecord(m: TerminalMember) {
    const value = recordKind === "static" ? parseSeconds(recordValue) : Number(recordValue);
    if (!Number.isInteger(value) || value <= 0) {
      setMessage({ kind: "error", text: t("invalidValue") });
      return;
    }
    const ok = await post(
      { action: "record", memberId: m.id, kind: recordKind, value, clientMutationId: newMutationId() },
      m.id
    );
    if (!ok) return;
    setData((prev) =>
      prev
        ? {
            ...prev,
            members: prev.members.map((x) =>
              x.id !== m.id
                ? x
                : {
                    ...x,
                    bestStaticSeconds:
                      recordKind === "static"
                        ? Math.max(x.bestStaticSeconds ?? 0, value)
                        : x.bestStaticSeconds,
                    bestDynamicMeters:
                      recordKind === "dynamic"
                        ? Math.max(x.bestDynamicMeters ?? 0, value)
                        : x.bestDynamicMeters,
                  }
            ),
          }
        : prev
    );
    setOpenRecordFor(null);
    setRecordValue("");
    setMessage({ kind: "ok", text: `${m.fullName}: ${t("saved")}` });
  }

  const shell = "relative min-h-screen overflow-x-hidden bg-[#030712] px-4 py-6 font-sans text-slate-100";

  if (loading && !data) {
    return (
      <div className={`${shell} flex items-center justify-center`} dir={dir}>
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  if (invalid || !data) {
    return (
      <div className={`${shell} flex items-center justify-center`} dir={dir}>
        <div className="w-full max-w-md rounded-[20px] border border-white/10 bg-slate-900/90 p-6 text-center">
          <h1 className="text-lg font-bold text-white">{t("terminalTitle")}</h1>
          <p className="mt-2 text-sm text-slate-400">{t("terminalInvalid")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={shell} dir={dir}>
      <div className="pointer-events-none fixed left-[-10%] top-[-10%] h-[60vh] w-[60vw] rounded-full bg-sky-500/10 blur-[130px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] h-[60vh] w-[60vw] rounded-full bg-cyan-400/10 blur-[130px]" />

      <div className="relative z-10 mx-auto w-full max-w-2xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">{t("terminalTitle")}</h1>
            <p className="text-xs text-slate-400">
              {t("coach")}: <span className="text-cyan-300">{data.coach.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/90 p-1">
            {(["fr", "ar", "en"] as const).map((lng) => (
              <button
                key={lng}
                onClick={() => setLocale(lng)}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase ${
                  locale === lng ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                {lng}
              </button>
            ))}
          </div>
        </header>

        <p className="text-xs text-slate-400">{t("terminalHint")}</p>

        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchMembers")}
            className="min-h-[44px] flex-1 rounded-[10px] border border-white/[0.15] bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-400"
          />
          <button
            onClick={load}
            disabled={loading}
            className="min-h-[44px] rounded-[10px] border border-white/[0.15] bg-slate-800 px-4 text-xs font-semibold text-cyan-300 hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? t("loading") : t("refresh")}
          </button>
        </div>

        {message && (
          <div
            className={`rounded-[10px] border p-3 text-center text-xs font-medium ${
              message.kind === "ok"
                ? "border-emerald-500/40 bg-emerald-950/50 text-emerald-300"
                : "border-red-500/40 bg-red-950/50 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="rounded-[14px] border border-white/[0.08] bg-slate-900/80 p-6 text-center text-sm text-slate-400">
            {t("noMembers")}
          </div>
        )}

        <ul className="space-y-3">
          {filtered.map((m) => {
            const busy = busyId === m.id;
            const recordOpen = openRecordFor === m.id;
            return (
              <li
                key={m.id}
                className="rounded-[14px] border border-white/[0.08] bg-slate-900/80 p-4 shadow-[0_0_15px_rgba(0,242,255,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{m.fullName}</p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {m.swimId}
                      {m.hasFins ? `  -  ${t("withFins")}` : ""}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-mono text-lg font-semibold text-cyan-300">{m.sessionsRemaining}</p>
                    <p className="text-[10px] text-slate-400">{t("sessionsRemaining")}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="rounded-[10px] bg-slate-800/60 p-2">
                    <p className="font-mono text-sm text-white">
                      {m.sessionsAttended}/{m.sessionsTotal}
                    </p>
                    <p className="text-slate-400">{t("sessionsAttended")}</p>
                  </div>
                  <div className="rounded-[10px] bg-slate-800/60 p-2">
                    <p className="font-mono text-sm text-white" dir="ltr">
                      {m.bestStaticSeconds !== null ? formatApneaDuration(m.bestStaticSeconds) : "-"}
                    </p>
                    <p className="text-slate-400">{t("staticRecord")}</p>
                  </div>
                  <div className="rounded-[10px] bg-slate-800/60 p-2">
                    <p className="font-mono text-sm text-white" dir="ltr">
                      {m.bestDynamicMeters !== null ? `${m.bestDynamicMeters} ${t("metersShort")}` : "-"}
                    </p>
                    <p className="text-slate-400">{t("dynamicRecord")}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    disabled={busy}
                    onClick={() => setPresence(m, "present")}
                    className={`min-h-[44px] rounded-[10px] border text-xs font-semibold transition-all disabled:opacity-50 ${
                      m.todayStatus === "present"
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                        : "border-white/[0.15] bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {t("present")}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => setPresence(m, "absent")}
                    className={`min-h-[44px] rounded-[10px] border text-xs font-semibold transition-all disabled:opacity-50 ${
                      m.todayStatus === "absent"
                        ? "border-red-500/50 bg-red-500/20 text-red-300"
                        : "border-white/[0.15] bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {t("absent")}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setOpenRecordFor(recordOpen ? null : m.id);
                      setRecordValue("");
                    }}
                    className="min-h-[44px] rounded-[10px] border border-sky-500/40 bg-sky-500/10 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
                  >
                    {t("addRecord")}
                  </button>
                </div>

                {recordOpen && (
                  <div className="mt-3 space-y-2 rounded-[10px] border border-white/[0.08] bg-slate-950/60 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      {(["static", "dynamic"] as const).map((k) => (
                        <button
                          key={k}
                          onClick={() => {
                            setRecordKind(k);
                            setRecordValue("");
                          }}
                          className={`min-h-[40px] rounded-[10px] border text-xs font-semibold ${
                            recordKind === k
                              ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-300"
                              : "border-white/[0.15] bg-slate-800 text-slate-300"
                          }`}
                        >
                          {k === "static" ? t("kindStatic") : t("kindDynamic")}
                        </button>
                      ))}
                    </div>
                    <input
                      value={recordValue}
                      onChange={(e) => setRecordValue(e.target.value)}
                      inputMode={recordKind === "static" ? "text" : "numeric"}
                      dir="ltr"
                      placeholder={
                        recordKind === "static" ? `${t("valueSeconds")} (155 / 2:35)` : t("valueMeters")
                      }
                      className="min-h-[44px] w-full rounded-[10px] border border-white/[0.15] bg-slate-900 px-3 font-mono text-sm text-white outline-none focus:border-cyan-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setOpenRecordFor(null)}
                        className="min-h-[44px] rounded-[10px] border border-white/[0.15] bg-slate-800 text-xs font-semibold text-slate-300"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => saveRecord(m)}
                        className="min-h-[44px] rounded-[10px] bg-[#0ea5e9] text-xs font-semibold text-white hover:bg-[#38bdf8] disabled:opacity-50"
                      >
                        {busy ? t("saving") : t("save")}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
