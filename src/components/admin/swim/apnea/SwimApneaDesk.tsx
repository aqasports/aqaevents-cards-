"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "@/lib/i18n";
import { formatApneaDuration } from "@/lib/swim-apnea";

interface DeskPack {
  id: string;
  sessionsTotal: number;
  extraSessions: number;
  withFins: boolean;
  priceDA: number;
  startedAt: string;
}

interface DeskRecord {
  id: string;
  kind: "static" | "dynamic";
  value: number;
  recordedAt: string;
}

interface DeskMember {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  paymentStatus: string;
  packs: DeskPack[];
  sessionsTotal: number;
  sessionsAttended: number;
  sessionsRemaining: number;
  totalPriceDA: number;
  totalPaidDA: number;
  hasFins: boolean;
  bestStaticSeconds: number | null;
  bestDynamicMeters: number | null;
  lastPresenceDate: string | null;
  todayStatus: "present" | "absent" | null;
  recentRecords: DeskRecord[];
}

interface DeskTerminal {
  id: string;
  coachId: string;
  coachName: string;
  token: string;
  active: boolean;
  createdAt: string;
}

interface DeskData {
  constants: {
    packSessions: number;
    packPriceDA: number;
    packWithFinsPriceDA: number;
    extraSessionPriceDA: number;
    staticGoalSeconds: number;
  };
  members: DeskMember[];
  terminals: DeskTerminal[];
  coaches: { id: string; name: string }[];
}

type Panel =
  | { type: "pack"; memberId: string }
  | { type: "extras"; memberId: string }
  | { type: "record"; memberId: string }
  | null;

const inputClass =
  "min-h-[40px] w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-white outline-none focus:border-[var(--accent)]";
const btnPrimary =
  "min-h-[40px] rounded-[10px] bg-[var(--primary)] px-4 text-xs font-semibold text-white transition-all hover:bg-sky-400 disabled:opacity-50";
const btnGhost =
  "min-h-[36px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-slate-300 transition-all hover:text-white disabled:opacity-50";

function parseSeconds(raw: string): number {
  const v = raw.trim();
  if (/^\d+:\d{1,2}$/.test(v)) {
    const [m, s] = v.split(":").map(Number);
    return m * 60 + s;
  }
  return /^\d+$/.test(v) ? Number(v) : NaN;
}

/**
 * AQA Apnea management tab: packs (4 sessions, optional fins, extras),
 * presence, static / dynamic records and coach terminal links.
 * Data is loaded once (no polling) and reloaded after each action.
 */
export function SwimApneaDesk() {
  const { t } = useTranslations("swimApnea");
  const [data, setData] = useState<DeskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);

  const [withFins, setWithFins] = useState(false);
  const [extras, setExtras] = useState(0);
  const [recordKind, setRecordKind] = useState<"static" | "dynamic">("static");
  const [recordValue, setRecordValue] = useState("");
  const [terminalCoachId, setTerminalCoachId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/swim/apnea", { cache: "no-store" });
      if (!res.ok) throw new Error("load");
      setData(await res.json());
      setError(null);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/swim/apnea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const code = typeof json?.error === "string" ? json.error : "";
        setError(
          code === "static_out_of_range"
            ? t("staticOutOfRange")
            : code === "dynamic_out_of_range"
              ? t("dynamicOutOfRange")
              : code === "invalid_value"
                ? t("invalidValue")
                : t("actionError")
        );
        return false;
      }
      await load();
      return true;
    } catch {
      setError(t("actionError"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const members = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.members;
    return data.members.filter(
      (m) => m.fullName.toLowerCase().includes(q) || m.swimId.toLowerCase().includes(q)
    );
  }, [data, search]);

  const panelMember = useMemo(
    () => (panel && data ? data.members.find((m) => m.id === panel.memberId) ?? null : null),
    [panel, data]
  );

  function terminalUrl(token: string) {
    return `${typeof window !== "undefined" ? window.location.origin : ""}/swim/apnea/${token}`;
  }

  async function copyTerminal(tm: DeskTerminal) {
    try {
      await navigator.clipboard.writeText(terminalUrl(tm.token));
      setCopiedId(tm.id);
      window.setTimeout(() => setCopiedId((cur) => (cur === tm.id ? null : cur)), 2000);
    } catch {
      setError(t("actionError"));
    }
  }

  async function submitPack() {
    if (!panel || panel.type !== "pack") return;
    const ok = await act({
      action: "create_pack",
      memberId: panel.memberId,
      withFins,
      extraSessions: extras,
    });
    if (ok) closePanel();
  }

  async function submitExtras(packId: string) {
    const ok = await act({ action: "add_extras", packId, count: extras });
    if (ok) closePanel();
  }

  async function submitRecord() {
    if (!panel || panel.type !== "record") return;
    const value = recordKind === "static" ? parseSeconds(recordValue) : Number(recordValue);
    if (!Number.isInteger(value) || value <= 0) {
      setError(t("invalidValue"));
      return;
    }
    const ok = await act({ action: "add_record", memberId: panel.memberId, kind: recordKind, value });
    if (ok) closePanel();
  }

  function closePanel() {
    setPanel(null);
    setWithFins(false);
    setExtras(0);
    setRecordKind("static");
    setRecordValue("");
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-400">{t("loading")}</div>;
  }

  if (!data) {
    return (
      <div className="rounded-[14px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        {error ?? t("loadError")}
      </div>
    );
  }

  const c = data.constants;
  const activeTerminals = data.terminals.filter((x) => x.active);
  const totalRemaining = data.members.reduce((s, m) => s + m.sessionsRemaining, 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">{t("tabTitle")}</h2>
        <p className="text-xs text-slate-400">{t("tabSubtitle")}</p>
      </div>

      {error && (
        <div className="rounded-[10px] border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="font-mono text-xl font-semibold text-white">{data.members.length}</p>
          <p className="text-[11px] text-slate-400">{t("members")}</p>
        </div>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="font-mono text-xl font-semibold text-cyan-300">{totalRemaining}</p>
          <p className="text-[11px] text-slate-400">{t("sessionsRemaining")}</p>
        </div>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="font-mono text-xl font-semibold text-white">
            {c.packPriceDA} {t("currency")}
          </p>
          <p className="text-[11px] text-slate-400">{t("packBase")}</p>
        </div>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="font-mono text-xl font-semibold text-white">
            {c.packWithFinsPriceDA} {t("currency")}
          </p>
          <p className="text-[11px] text-slate-400">{t("packWithFins")}</p>
        </div>
      </div>

      {/* Coach terminals */}
      <section className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="text-sm font-bold text-white">{t("terminals")}</h3>
        <p className="mb-3 text-xs text-slate-400">{t("terminalDesc")}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={terminalCoachId}
            onChange={(e) => setTerminalCoachId(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("selectCoach")}</option>
            {data.coaches.map((co) => (
              <option key={co.id} value={co.id}>
                {co.name}
              </option>
            ))}
          </select>
          <button
            disabled={busy || !terminalCoachId}
            onClick={async () => {
              if (await act({ action: "create_terminal", coachId: terminalCoachId })) setTerminalCoachId("");
            }}
            className={`${btnPrimary} whitespace-nowrap`}
          >
            {activeTerminals.some((x) => x.coachId === terminalCoachId) ? t("regenerate") : t("generateLink")}
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {data.terminals.length === 0 && <li className="text-xs text-slate-500">{t("noTerminals")}</li>}
          {data.terminals.map((tm) => (
            <li
              key={tm.id}
              className="flex flex-col gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {tm.coachName}{" "}
                  <span
                    className={`ms-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      tm.active
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                    }`}
                  >
                    {tm.active ? t("linkActive") : t("linkRevoked")}
                  </span>
                </p>
                {tm.active && (
                  <p className="truncate font-mono text-[11px] text-slate-400" dir="ltr">
                    {terminalUrl(tm.token)}
                  </p>
                )}
              </div>
              {tm.active && (
                <div className="flex gap-2">
                  <button onClick={() => copyTerminal(tm)} className={btnGhost}>
                    {copiedId === tm.id ? t("copied") : t("copyLink")}
                  </button>
                  <a href={terminalUrl(tm.token)} target="_blank" rel="noopener noreferrer" className={btnGhost}>
                    {t("openTerminal")}
                  </a>
                  <button
                    disabled={busy}
                    onClick={() => act({ action: "revoke_terminal", terminalId: tm.id })}
                    className={`${btnGhost} text-red-300`}
                  >
                    {t("revoke")}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Members */}
      <section className="space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchMembers")}
          className={inputClass}
        />

        {members.length === 0 && (
          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-slate-400">
            {t("noMembers")}
          </div>
        )}

        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id} className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{m.fullName}</p>
                  <p className="font-mono text-[11px] text-slate-500">
                    {m.swimId}
                    {m.hasFins ? `  -  ${t("withFins")}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={() => act({ action: "mark_presence", memberId: m.id, status: "present" })}
                    className={`${btnGhost} ${m.todayStatus === "present" ? "border-emerald-500/50 text-emerald-300" : ""}`}
                  >
                    {t("markPresent")}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => act({ action: "mark_presence", memberId: m.id, status: "absent" })}
                    className={`${btnGhost} ${m.todayStatus === "absent" ? "border-red-500/50 text-red-300" : ""}`}
                  >
                    {t("markAbsent")}
                  </button>
                  {m.todayStatus && (
                    <button
                      disabled={busy}
                      onClick={() => act({ action: "clear_presence", memberId: m.id })}
                      className={btnGhost}
                    >
                      {t("clearMark")}
                    </button>
                  )}
                  <button onClick={() => setPanel({ type: "record", memberId: m.id })} className={btnGhost}>
                    {t("addRecord")}
                  </button>
                  <button
                    onClick={() => {
                      setPanel({ type: "pack", memberId: m.id });
                      setExtras(0);
                      setWithFins(false);
                    }}
                    className={btnGhost}
                  >
                    {t("addPack")}
                  </button>
                  {m.packs.length > 0 && (
                    <button
                      onClick={() => {
                        setPanel({ type: "extras", memberId: m.id });
                        setExtras(1);
                      }}
                      className={btnGhost}
                    >
                      {t("addExtras")}
                    </button>
                  )}
                  <a
                    href={`/swim/profile/${encodeURIComponent(m.swimId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={btnGhost}
                  >
                    {t("memberFile")}
                  </a>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px] sm:grid-cols-5">
                <div className="rounded-[10px] bg-[var(--surface-2)] p-2">
                  <p className="font-mono text-sm text-white">{m.sessionsAttended}</p>
                  <p className="text-slate-400">{t("sessionsAttended")}</p>
                </div>
                <div className="rounded-[10px] bg-[var(--surface-2)] p-2">
                  <p className="font-mono text-sm text-cyan-300">
                    {m.sessionsRemaining} / {m.sessionsTotal}
                  </p>
                  <p className="text-slate-400">{t("sessionsRemaining")}</p>
                </div>
                <div className="rounded-[10px] bg-[var(--surface-2)] p-2">
                  <p className="font-mono text-sm text-white" dir="ltr">
                    {m.bestStaticSeconds !== null ? formatApneaDuration(m.bestStaticSeconds) : "-"}
                  </p>
                  <p className="text-slate-400">{t("staticRecord")}</p>
                </div>
                <div className="rounded-[10px] bg-[var(--surface-2)] p-2">
                  <p className="font-mono text-sm text-white" dir="ltr">
                    {m.bestDynamicMeters !== null ? `${m.bestDynamicMeters} ${t("metersShort")}` : "-"}
                  </p>
                  <p className="text-slate-400">{t("dynamicRecord")}</p>
                </div>
                <div className="col-span-2 rounded-[10px] bg-[var(--surface-2)] p-2 sm:col-span-1">
                  <p
                    className={`text-sm font-semibold ${
                      m.todayStatus === "present"
                        ? "text-emerald-300"
                        : m.todayStatus === "absent"
                          ? "text-red-300"
                          : "text-slate-500"
                    }`}
                  >
                    {m.todayStatus ? t(m.todayStatus) : t("notMarked")}
                  </p>
                  <p className="text-slate-400">{t("today")}</p>
                </div>
              </div>

              <p className="mt-2 text-[11px] text-slate-500">
                {t("price")}: <span className="font-mono text-slate-300">{m.totalPriceDA} {t("currency")}</span>
                {"  -  "}
                {t("paid")}: <span className="font-mono text-slate-300">{m.totalPaidDA} {t("currency")}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Action panel (modal) */}
      {panel && panelMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePanel();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_0_15px_rgba(0,242,255,0.15)]">
            <div>
              <h3 className="text-base font-bold text-white">
                {panel.type === "pack" ? t("addPack") : panel.type === "extras" ? t("addExtras") : t("addRecord")}
              </h3>
              <p className="text-xs text-slate-400">{panelMember.fullName}</p>
            </div>

            {panel.type === "pack" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setWithFins(false)}
                    className={`${btnGhost} ${!withFins ? "border-cyan-400/60 text-cyan-300" : ""}`}
                  >
                    {t("noFins")} - {c.packPriceDA} {t("currency")}
                  </button>
                  <button
                    onClick={() => setWithFins(true)}
                    className={`${btnGhost} ${withFins ? "border-cyan-400/60 text-cyan-300" : ""}`}
                  >
                    {t("withFins")} - {c.packWithFinsPriceDA} {t("currency")}
                  </button>
                </div>
                <label className="block text-xs text-slate-400">
                  {t("extrasCount")} ({t("extraPriceHint")})
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={extras}
                    onChange={(e) => setExtras(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                    className={`${inputClass} mt-1`}
                    dir="ltr"
                  />
                </label>
                <p className="text-sm text-white">
                  {t("price")}:{" "}
                  <span className="font-mono text-cyan-300">
                    {(withFins ? c.packWithFinsPriceDA : c.packPriceDA) + extras * c.extraSessionPriceDA}{" "}
                    {t("currency")}
                  </span>
                </p>
              </>
            )}

            {panel.type === "extras" && (
              <>
                <label className="block text-xs text-slate-400">
                  {t("extrasCount")} ({t("extraPriceHint")})
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={extras}
                    onChange={(e) => setExtras(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                    className={`${inputClass} mt-1`}
                    dir="ltr"
                  />
                </label>
                <p className="text-sm text-white">
                  {t("price")}:{" "}
                  <span className="font-mono text-cyan-300">
                    {extras * c.extraSessionPriceDA} {t("currency")}
                  </span>
                </p>
              </>
            )}

            {panel.type === "record" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {(["static", "dynamic"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        setRecordKind(k);
                        setRecordValue("");
                      }}
                      className={`${btnGhost} ${recordKind === k ? "border-cyan-400/60 text-cyan-300" : ""}`}
                    >
                      {k === "static" ? t("kindStatic") : t("kindDynamic")}
                    </button>
                  ))}
                </div>
                <input
                  value={recordValue}
                  onChange={(e) => setRecordValue(e.target.value)}
                  dir="ltr"
                  placeholder={recordKind === "static" ? `${t("valueSeconds")} (155 / 2:35)` : t("valueMeters")}
                  className={`${inputClass} font-mono`}
                />
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-slate-400">{t("recentRecords")}</p>
                  {panelMember.recentRecords.length === 0 ? (
                    <p className="text-xs text-slate-500">{t("noRecords")}</p>
                  ) : (
                    <ul className="max-h-40 space-y-1 overflow-y-auto">
                      {panelMember.recentRecords.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between rounded-[6px] bg-[var(--surface-2)] px-2 py-1 text-xs"
                        >
                          <span className="text-slate-300">
                            {r.kind === "static" ? t("kindStatic") : t("kindDynamic")}
                            {": "}
                            <span className="font-mono text-white" dir="ltr">
                              {r.kind === "static"
                                ? `${formatApneaDuration(r.value)} (${r.value} ${t("secondsShort")})`
                                : `${r.value} ${t("metersShort")}`}
                            </span>
                            {"  "}
                            <span className="font-mono text-slate-500" dir="ltr">
                              {new Date(r.recordedAt).toISOString().slice(0, 10)}
                            </span>
                          </span>
                          <button
                            disabled={busy}
                            onClick={() => {
                              if (window.confirm(t("confirmDelete"))) act({ action: "delete_record", recordId: r.id });
                            }}
                            className="text-[11px] font-semibold text-red-300 hover:text-red-200"
                          >
                            {t("delete")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={closePanel} className={btnGhost}>
                {t("cancel")}
              </button>
              {panel.type === "extras" ? (
                <button
                  disabled={busy || panelMember.packs.length === 0}
                  onClick={() => submitExtras(panelMember.packs[panelMember.packs.length - 1].id)}
                  className={btnPrimary}
                >
                  {busy ? t("saving") : t("save")}
                </button>
              ) : (
                <button
                  disabled={busy}
                  onClick={panel.type === "pack" ? submitPack : submitRecord}
                  className={btnPrimary}
                >
                  {busy ? t("saving") : t("save")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
