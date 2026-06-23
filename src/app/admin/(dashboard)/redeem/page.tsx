"use client";

import { FormEvent, useEffect, useState, useRef } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  EmptyState,
} from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";

type Activity = {
  id: string;
  name: string;
  creditCost: number;
  sessions: Array<{ id: string; sessionDate: string; location: string | null }>;
};

type LookupResult = {
  client: { id: string; fullName: string };
  card: { cardCode: string } | null;
  balance: number;
};

type ClientDropdownItem = {
  id: string;
  fullName: string;
  balance: number;
  card: { cardCode: string; publicToken: string } | null;
};

export default function RedeemPage() {
  const { t, locale, dir } = useTranslations("redeem");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [matches, setMatches] = useState<LookupResult[]>([]);
  const [clients, setClients] = useState<ClientDropdownItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" | "info" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  // Audio synthesizers using Web Audio API
  function playSuccessSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playBeep = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
      };

      const now = ctx.currentTime;
      playBeep(now, 880, 0.08); // High note A5
      playBeep(now + 0.1, 880, 0.1); // High note A5 double beep
    } catch (err) {
      console.warn("Failed to play success sound:", err);
    }
  }

  function playErrorSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, ctx.currentTime); // Low buzz
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (err) {
      console.warn("Failed to play error sound:", err);
    }
  }

  // Haptic Vibrations
  function triggerSuccessHaptics() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }

  function triggerErrorHaptics() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(300);
    }
  }

  // Load activities and clients on mount, and focus search input
  useEffect(() => {
    fetch("/api/admin/activities")
      .then((r) => r.json())
      .then(setActivities);

    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(console.error);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".search-container")) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global keydown event for Enter quick checkout
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && lookup && selectedActivityId && !redeeming) {
        // If the search input is focused, let it submit search/lookup instead
        if (
          document.activeElement?.tagName === "INPUT" &&
          (document.activeElement as HTMLInputElement).placeholder === t("searchPlaceholder")
        ) {
          return;
        }
        // Programmatically submit the redemption form
        const form = document.getElementById("redemption-form") as HTMLFormElement;
        if (form) {
          e.preventDefault();
          form.requestSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [lookup, selectedActivityId, redeeming, t]);

  async function lookupCard(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setLookup(null);
    setMatches([]);

    const isToken = search.length > 20;
    const query = isToken
      ? `token=${encodeURIComponent(search)}`
      : `query=${encodeURIComponent(search)}`;

    try {
      const res = await fetch(`/api/admin/cards/lookup?${query}`);
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setMessage({ text: data.error ?? t("noActiveCard"), tone: "danger" });
        playErrorSound();
        triggerErrorHaptics();
        return;
      }

      if (data.matchType === "single" || !data.matchType) {
        setLookup(data);
        setSelectedActivityId("");
        playSuccessSound();
        triggerSuccessHaptics();
        if (data.balance === 0) {
          setMessage({ text: t("clientNoCreditsAlert"), tone: "info" });
        }
      } else if (data.matchType === "multiple") {
        setMatches(data.matches);
        playSuccessSound();
        triggerSuccessHaptics();
      }
    } catch {
      setLoading(false);
      setMessage({ text: "Failed to look up card.", tone: "danger" });
      playErrorSound();
      triggerErrorHaptics();
    }
  }

  function selectMatch(match: LookupResult) {
    setLookup(match);
    setMatches([]);
    setSelectedActivityId("");
    playSuccessSound();
    triggerSuccessHaptics();
    if (match.balance === 0) {
      setMessage({ text: t("clientNoCreditsAlert"), tone: "info" });
    } else {
      setMessage(null);
    }
  }

  async function redeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lookup) return;
    setRedeeming(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    try {
      const res = await fetch("/api/admin/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: lookup.client.id,
          activityId: formData.get("activityId"),
          sessionId: formData.get("sessionId") || undefined,
          notes: formData.get("notes") || undefined,
        }),
      });

      const data = await res.json();
      setRedeeming(false);

      if (!res.ok) {
        setMessage({ text: data.error ?? t("insufficientBalance"), tone: "danger" });
        playErrorSound();
        triggerErrorHaptics();
        return;
      }

      playSuccessSound();
      triggerSuccessHaptics();

      setMessage({
        text: t("successRedeem", {
          balance: data.balance,
          s: data.balance !== 1 ? "s" : "",
        }),
        tone: "success",
      });
      setLookup({ ...lookup, balance: data.balance });

      // Focus card code input again for the next scan!
      if (inputRef.current) {
        inputRef.current.focus();
      }

      // Reset form
      (event.target as HTMLFormElement).reset();
      setSelectedActivityId("");
    } catch {
      setRedeeming(false);
      setMessage({ text: "Redemption request failed.", tone: "danger" });
      playErrorSound();
      triggerErrorHaptics();
    }
  }

  const selectedActivity = activities.find((a) => a.id === selectedActivityId);

  return (
    <div className="animate-fade-in" dir={dir}>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      {/* Lookup card */}
      <Card className="max-w-2xl mb-6">
        <h3 className={`mb-4 text-base font-semibold ${dir === "rtl" ? "text-right" : "text-left"}`}>
          {t("findClientCard")}
        </h3>
        <form onSubmit={lookupCard} className="flex gap-3">
          <div className="flex-1 search-container relative">
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder={t("searchPlaceholder")}
              hint={t("searchHint")}
            />
            {showDropdown && (() => {
              const queryParts = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
              const matchingClients = queryParts.length > 0
                ? clients.filter((c) => {
                    const nameParts = c.fullName.toLowerCase().split(/\s+/);
                    return queryParts.every((qPart) =>
                      nameParts.some((nPart) => nPart.startsWith(qPart))
                    );
                  })
                : [];

              if (matchingClients.length === 0) return null;

              return (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                  {matchingClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setLookup({
                          client: { id: c.id, fullName: c.fullName },
                          card: c.card,
                          balance: c.balance,
                        });
                        setSearch(c.fullName);
                        setShowDropdown(false);
                        setMessage(null);
                        if (c.balance === 0) {
                          setMessage({ text: t("clientNoCreditsAlert"), tone: "info" });
                        }
                      }}
                      className={`w-full px-4 py-2.5 hover:bg-slate-50 transition flex items-center justify-between border-b border-[var(--border)] last:border-0 ${
                        dir === "rtl" ? "text-right flex-row-reverse" : "text-left"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-[var(--foreground)]">{c.fullName}</p>
                        <p className="text-xs text-[var(--muted)]">
                          Card: {c.card?.cardCode ?? t("noActiveCard")}
                        </p>
                      </div>
                      <Badge tone={c.balance === 0 ? "danger" : c.balance <= 2 ? "warning" : "success"}>
                        {c.balance === 0
                          ? t("noCreditsLeft")
                          : c.balance === 1
                          ? t("oneCreditRemaining")
                          : t("creditsRemaining", { count: c.balance })}
                      </Badge>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="pt-0.5">
            <Button type="submit" loading={loading} className="h-[38px]">
              {t("findBtn")}
            </Button>
          </div>
        </form>
      </Card>

      {message && (
        <div className="mb-6 max-w-2xl">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

      {matches.length > 0 && (
        <Card className="max-w-2xl mb-6 animate-slide-in">
          <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)] ${
            dir === "rtl" ? "text-right" : "text-left"
          }`}>
            {t("multipleMatchesTitle", { count: matches.length })}
          </h3>
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            {matches.map((match) => (
              <div key={match.client.id} className={`flex items-center justify-between p-3 hover:bg-slate-50 transition ${
                dir === "rtl" ? "flex-row-reverse" : ""
              }`}>
                <div className={dir === "rtl" ? "text-right" : "text-left"}>
                  <p className="font-bold text-[var(--foreground)]">{match.client.fullName}</p>
                  <p className="text-xs font-mono text-[var(--muted)]">
                    {t("cardDetails")}: {match.card?.cardCode ?? t("noActiveCard")} · {
                      match.balance === 0
                        ? t("noCreditsLeft")
                        : match.balance === 1
                        ? t("oneCreditRemaining")
                        : t("creditsRemaining", { count: match.balance })
                    }
                  </p>
                </div>
                <Button size="sm" onClick={() => selectMatch(match)}>
                  {t("selectBtn")}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {lookup && (
        <div className="grid gap-4 lg:grid-cols-2 max-w-2xl animate-slide-in">
          {/* Client card */}
          <Card>
            <p className={`text-xs font-semibold uppercase tracking-wide text-[var(--muted)] ${
              dir === "rtl" ? "text-right" : "text-left"
            }`}>
              {t("clientFound")}
            </p>
            <h3 className={`mt-2 text-2xl font-bold ${dir === "rtl" ? "text-right" : "text-left"}`}>
              {lookup.client.fullName}
            </h3>
            <p className={`mt-1 font-mono text-sm text-[var(--muted)] ${
              dir === "rtl" ? "text-right" : "text-left"
            }`}>
              {lookup.card?.cardCode ?? t("noActiveCard")}
            </p>

            <div className={`mt-4 flex items-center gap-3 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-black ${
                  lookup.balance === 0
                    ? "bg-[var(--danger-bg)] text-[var(--danger)]"
                    : lookup.balance <= 2
                    ? "bg-[var(--warning-bg)] text-[var(--warning)]"
                    : "bg-[var(--success-bg)] text-[var(--success)]"
                }`}
              >
                {lookup.balance}
              </div>
              <div className={dir === "rtl" ? "text-right" : "text-left"}>
                <p className="text-sm font-semibold">
                  {lookup.balance === 0
                    ? t("noCreditsLeft")
                    : lookup.balance === 1
                    ? t("oneCreditRemaining")
                    : t("creditsRemaining", { count: lookup.balance })}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {lookup.balance === 0
                    ? t("cannotRedeem")
                    : lookup.balance <= 2
                    ? t("runningLow")
                    : t("readyToRedeem")}
                </p>
              </div>
            </div>
          </Card>

          {/* Redemption form */}
          <Card>
            <h3 className={`mb-4 text-base font-semibold ${dir === "rtl" ? "text-right" : "text-left"}`}>
              {t("title")}
            </h3>
            <form id="redemption-form" onSubmit={redeem} className="space-y-3">
              <Select
                label={t("activityLabel")}
                name="activityId"
                required
                defaultValue=""
                onChange={(e) => setSelectedActivityId(e.target.value)}
              >
                <option value="" disabled>
                  {t("selectActivity")}
                </option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name} — {activity.creditCost} {
                      locale === "ar"
                        ? "رصيد"
                        : locale === "fr"
                        ? `crédit${activity.creditCost > 1 ? "s" : ""}`
                        : `credit${activity.creditCost > 1 ? "s" : ""}`
                    }
                  </option>
                ))}
              </Select>

              {selectedActivity && selectedActivity.sessions.length > 0 && (
                <Select label={t("sessionLabel")} name="sessionId" defaultValue="">
                  <option value="">{t("noSpecificSession")}</option>
                  {selectedActivity.sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {new Date(session.sessionDate).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {session.location ? ` · ${session.location}` : ""}
                    </option>
                  ))}
                </Select>
              )}

              <Input
                label={t("notesLabel")}
                name="notes"
                placeholder={t("notesPlaceholder")}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={lookup.balance <= 0}
                loading={redeeming}
              >
                {lookup.balance <= 0 ? t("insufficientBalance") : t("confirmRedemption")}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {!lookup && !loading && !message && (
        <div className="max-w-2xl">
          <Card>
            <EmptyState
              title={t("noCardScannedTitle")}
              description={t("noCardScannedDesc")}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                </svg>
              }
            />
          </Card>
        </div>
      )}
    </div>
  );
}
