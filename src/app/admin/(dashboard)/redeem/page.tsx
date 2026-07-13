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
  ConfirmModal,
} from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";
import { formatDate } from "@/lib/i18n";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";

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

  const [showOverdraftConfirm, setShowOverdraftConfirm] = useState(false);
  const [pendingRedeemData, setPendingRedeemData] = useState<{
    activityId: string;
    sessionId?: string;
    notes?: string;
    creditsUsed?: number;
  } | null>(null);

  // Sound and simulation states
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentRedemptionsList, setRecentRedemptionsList] = useState<any[]>([]);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [pendingRefundId, setPendingRefundId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Audio preference loading
  useEffect(() => {
    const saved = localStorage.getItem("redeem_sound_enabled");
    if (saved !== null) {
      setSoundEnabled(saved === "true");
    }
  }, []);

  const toggleSound = () => {
    const val = !soundEnabled;
    setSoundEnabled(val);
    localStorage.setItem("redeem_sound_enabled", val.toString());
  };

  // Audio synthesizers using Web Audio API
  function playSuccessSound() {
    if (!soundEnabled) return;
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
      playBeep(now, 880, 0.08);
      playBeep(now + 0.1, 880, 0.1);
    } catch (err) {
      console.warn("Failed to play success sound:", err);
    }
  }

  function playErrorSound() {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, ctx.currentTime);
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

  const loadRecentRedemptions = async () => {
    try {
      const res = await fetch("/api/admin/redemptions");
      if (res.ok) {
        const data = await res.json();
        setRecentRedemptionsList(data);
      }
    } catch (err) {
      console.error("Failed to load recent redemptions:", err);
    }
  };

  // Load only activities that have upcoming events + clients, then focus search
  useEffect(() => {
    fetch("/api/admin/activities?redeemable=true")
      .then((r) => r.json())
      .then(setActivities);

    fetch("/api/admin/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(console.error);

    loadRecentRedemptions();

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
        if (
          document.activeElement?.tagName === "INPUT" &&
          (document.activeElement as HTMLInputElement).placeholder === t("searchPlaceholder")
        ) {
          return;
        }
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
    if (!lookup || !selectedActivityId) return;

    const formData = new FormData(event.currentTarget);
    const activityId = formData.get("activityId") as string;
    const sessionId = (formData.get("sessionId") as string) || undefined;
    const notes = (formData.get("notes") as string) || undefined;

    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return;

    const cost = activity.creditCost;
    const isInsufficient = lookup.balance < cost;

    if (isInsufficient) {
      if (isSuperAdmin) {
        setPendingRedeemData({ activityId, sessionId, notes });
        setShowOverdraftConfirm(true);
        return;
      } else {
        setMessage({ text: t("insufficientBalance"), tone: "danger" });
        playErrorSound();
        triggerErrorHaptics();
        return;
      }
    }

    await executeRedeem(activityId, sessionId, notes, false);
  }

  async function handleRedeemKid() {
    if (!lookup || !selectedActivityId) return;

    const form = document.getElementById("redemption-form") as HTMLFormElement;
    let sessionId: string | undefined = undefined;
    let notes: string | undefined = undefined;
    if (form) {
      const formData = new FormData(form);
      sessionId = (formData.get("sessionId") as string) || undefined;
      notes = (formData.get("notes") as string) || undefined;
    }

    const activity = activities.find((a) => a.id === selectedActivityId);
    if (!activity) return;

    if (!sessionId) {
      const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
      const upcomingSessions = activity.sessions?.filter((s: any) => s.active && new Date(s.sessionDate) >= tenHoursAgo) || [];
      if (upcomingSessions.length > 0) {
        sessionId = upcomingSessions[0].id;
      }
    }

    const cost = 0.7;
    const isInsufficient = lookup.balance < cost;

    if (isInsufficient) {
      if (isSuperAdmin) {
        setPendingRedeemData({ activityId: selectedActivityId, sessionId, notes, creditsUsed: cost });
        setShowOverdraftConfirm(true);
        return;
      } else {
        setMessage({ text: t("insufficientBalance"), tone: "danger" });
        playErrorSound();
        triggerErrorHaptics();
        return;
      }
    }

    await executeRedeem(selectedActivityId, sessionId, notes, false, cost);
  }

  async function quickRedeem(activityId: string, creditsUsed?: number) {
    if (!lookup) return;
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return;

    const cost = creditsUsed ?? activity.creditCost;
    const isInsufficient = lookup.balance < cost;

    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
    const upcomingSessions = activity.sessions?.filter((s: any) => s.active && new Date(s.sessionDate) >= tenHoursAgo) || [];
    const nextSession = upcomingSessions.length > 0 ? upcomingSessions[0].id : undefined;

    if (isInsufficient) {
      if (isSuperAdmin) {
        setPendingRedeemData({ activityId, sessionId: nextSession, creditsUsed: cost });
        setShowOverdraftConfirm(true);
        return;
      } else {
        setMessage({ text: t("insufficientBalance"), tone: "danger" });
        playErrorSound();
        triggerErrorHaptics();
        return;
      }
    }

    await executeRedeem(activityId, nextSession, "Quick checkout", false, cost);
  }

  async function executeRedeem(
    activityId: string,
    sessionId?: string,
    notes?: string,
    bypassBalanceCheck = false,
    creditsUsed?: number
  ) {
    setRedeeming(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: lookup!.client.id,
          activityId,
          sessionId,
          notes,
          bypassBalanceCheck,
          creditsUsed,
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
      setLookup({ ...lookup!, balance: data.balance });

      // Refresh list and clients dropdown list
      loadRecentRedemptions();

      if (inputRef.current) {
        inputRef.current.focus();
      }

      const form = document.getElementById("redemption-form") as HTMLFormElement;
      if (form) form.reset();
      setSelectedActivityId("");

      fetch("/api/admin/clients")
        .then((r) => r.json())
        .then(setClients)
        .catch(console.error);
    } catch {
      setRedeeming(false);
      setMessage({ text: "Redemption request failed.", tone: "danger" });
      playErrorSound();
      triggerErrorHaptics();
    }
  }

  const confirmRefund = (id: string) => {
    setPendingRefundId(id);
    setShowRefundConfirm(true);
  };

  const handleRefund = async () => {
    if (!pendingRefundId) return;
    setRefundingId(pendingRefundId);
    setShowRefundConfirm(false);
    try {
      const res = await fetch(`/api/admin/redemptions/${pendingRefundId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessage({ text: t("refundedSuccessfully"), tone: "success" });
        playSuccessSound();
        triggerSuccessHaptics();
        await Promise.all([
          loadRecentRedemptions(),
          fetch("/api/admin/clients")
            .then((r) => r.json())
            .then(setClients),
        ]);
        if (lookup) {
          const updatedClientsRes = await fetch("/api/admin/clients");
          if (updatedClientsRes.ok) {
            const freshClientsList = await updatedClientsRes.json();
            const freshClientObj = freshClientsList.find((c: any) => c.id === lookup.client.id);
            if (freshClientObj) {
              setLookup({
                client: { id: freshClientObj.id, fullName: freshClientObj.fullName },
                card: freshClientObj.card,
                balance: freshClientObj.balance,
              });
            }
          }
        }
      } else {
        const errData = await res.json();
        setMessage({ text: errData.error || "Failed to refund redemption.", tone: "danger" });
        playErrorSound();
        triggerErrorHaptics();
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Failed to refund redemption.", tone: "danger" });
      playErrorSound();
      triggerErrorHaptics();
    } finally {
      setRefundingId(null);
      setPendingRefundId(null);
    }
  };

  function simulateCardScan() {
    const clientsWithCards = clients.filter((c) => c.card && c.card.cardCode);
    if (clientsWithCards.length === 0) {
      setMessage({ text: "No clients with active cards found to simulate.", tone: "danger" });
      return;
    }
    const randomClient = clientsWithCards[Math.floor(Math.random() * clientsWithCards.length)];
    if (randomClient) {
      setSearch(randomClient.card!.cardCode);
      setLoading(true);
      setMessage(null);
      setLookup(null);
      setMatches([]);
      fetch(`/api/admin/cards/lookup?query=${encodeURIComponent(randomClient.card!.cardCode)}`)
        .then((res) => res.json())
        .then((data) => {
          setLoading(false);
          setLookup(data);
          setSelectedActivityId("");
          playSuccessSound();
          triggerSuccessHaptics();
          if (data.balance === 0) {
            setMessage({ text: t("clientNoCreditsAlert"), tone: "info" });
          }
        })
        .catch(() => {
          setLoading(false);
          setMessage({ text: "Simulated scan lookup failed.", tone: "danger" });
        });
    }
  }

  const selectedActivity = activities.find((a) => a.id === selectedActivityId);

  return (
    <div className="animate-fade-in space-y-6" dir={dir}>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (Find client, selected client, quick redeem grid & advanced form) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Find Client Card */}
          <Card>
            <h3 className={`mb-4 text-base font-semibold ${dir === "rtl" ? "text-right" : "text-left"}`}>
              {t("findClientCard")}
            </h3>
            <form onSubmit={lookupCard} className="flex gap-3">
              <div className="flex-1 search-container relative z-30">
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
            <Alert tone={message.tone}>{message.text}</Alert>
          )}

          {matches.length > 0 && (
            <Card className="animate-slide-in">
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
            <div className="space-y-6">
              {/* Selected Client info */}
              <Card className="border-t-4 border-[var(--primary)] animate-slide-in">
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

              {/* One-Click Quick Redeem Activity Grid */}
              <Card className="animate-slide-in">
                <h3 className={`mb-4 text-base font-semibold ${dir === "rtl" ? "text-right" : "text-left"}`}>
                  {t("quickRedeem")}
                </h3>
                {activities.length === 0 ? (
                  <p className="text-sm text-[var(--muted)] italic">
                    {t("noActivitiesAvailable")}
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activities.map((activity) => {
                      const cost = activity.creditCost;
                      const hasSufficient = lookup.balance >= cost;
                      const hasKidSufficient = lookup.balance >= 0.7;

                      return (
                        <div key={activity.id} className="rounded-xl border border-[var(--border)] bg-slate-50/50 p-4 hover:border-[var(--primary)]/40 hover:bg-[var(--primary-light)]/5 transition-all duration-300 group flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm group-hover:text-[var(--primary)] transition-colors">
                              {activity.name}
                            </h4>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <Badge tone="primary" size="sm">
                                {cost} {cost === 1 ? "Credit" : "Credits"}
                              </Badge>
                              {(() => {
                                const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
                                const upcoming = activity.sessions?.filter((s: any) => s.active && new Date(s.sessionDate) >= tenHoursAgo) || [];
                                if (upcoming.length === 0) return null;
                                return (
                                  <Badge tone="info" size="sm">
                                    {formatDate(upcoming[0].sessionDate, locale, true).split(" ")[0]}
                                  </Badge>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 font-bold"
                              onClick={() => quickRedeem(activity.id)}
                              disabled={redeeming || (!hasSufficient && !isSuperAdmin)}
                            >
                              {!hasSufficient && isSuperAdmin ? "Overdraft" : "Redeem"}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="font-semibold text-slate-700"
                              onClick={() => quickRedeem(activity.id, 0.7)}
                              disabled={redeeming || (!hasKidSufficient && !isSuperAdmin)}
                            >
                              Kid (0.7)
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Advanced Redemption Form */}
              <details className="border border-[var(--border)] rounded-xl bg-slate-50/40 overflow-hidden group">
                <summary className="px-5 py-4 font-semibold text-xs text-[var(--muted)] uppercase cursor-pointer hover:bg-slate-50 transition flex items-center justify-between select-none">
                  <span>Advanced Validation Form (Custom session / Notes)</span>
                  <svg className="h-4 w-4 transform group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-5 border-t border-[var(--border)] bg-[var(--surface)] space-y-3">
                  <form id="redemption-form" onSubmit={redeem} className="space-y-3">
                    <Select
                      label={t("activityLabel")}
                      name="activityId"
                      required
                      value={selectedActivityId}
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

                    {selectedActivity && (() => {
                      const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
                      const upcoming = selectedActivity.sessions?.filter((s: any) => s.active && new Date(s.sessionDate) >= tenHoursAgo) || [];
                      if (upcoming.length === 0) return null;
                      return (
                        <Select label={t("sessionLabel")} name="sessionId" defaultValue={upcoming[0].id}>
                          <option value="">{t("noSpecificSession")}</option>
                          {upcoming.map((session) => (
                            <option key={session.id} value={session.id}>
                              {formatDate(session.sessionDate, locale, true)}
                              {session.location ? ` · ${session.location}` : ""}
                            </option>
                          ))}
                        </Select>
                      );
                    })()}

                    <Input
                      label={t("notesLabel")}
                      name="notes"
                      placeholder={t("notesPlaceholder")}
                    />

                    {(() => {
                      const cost = selectedActivity ? selectedActivity.creditCost : 1;
                      const isInsufficient = lookup.balance < cost;
                      const disableButton = isInsufficient ? !isSuperAdmin : false;
                      
                      let buttonLabel = t("confirmRedemption");
                      if (isInsufficient) {
                        if (isSuperAdmin) {
                          buttonLabel = "Authorize Overdraft Redemption";
                        } else {
                          buttonLabel = t("insufficientBalance");
                        }
                      }

                      return (
                        <div className="space-y-2 pt-2">
                          <Button
                            type="submit"
                            className="w-full font-bold"
                            disabled={disableButton}
                            loading={redeeming}
                          >
                            {buttonLabel}
                          </Button>
                          <Button
                            type="button"
                            onClick={handleRedeemKid}
                            className="w-full font-semibold"
                            variant="secondary"
                            disabled={!selectedActivityId || (lookup.balance < 0.7 && !isSuperAdmin)}
                            loading={redeeming}
                          >
                            {t("redeemKid")}
                          </Button>
                        </div>
                      );
                    })()}
                  </form>
                </div>
              </details>
            </div>
          )}

          {!lookup && !loading && !message && (
            <div className="space-y-4">
              {activities.length === 0 && (
                <Alert tone="info">{t("noActivitiesAvailable")}</Alert>
              )}
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

        {/* Right Column (Scanner status, sound settings, simulated scanning button, and Recent Redemptions Log) */}
        <div className="space-y-6">
          {/* Scanner controls */}
          <Card>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 20h.01M21 12h-1.88M3 12h1.88M12 21h.01m8.88-8.88h-.01m-17.76 0h-.01" />
              </svg>
              <span>Scan Station Controls</span>
            </h3>
            
            <div className="flex items-center justify-between border border-[var(--border)] rounded-xl p-3 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-700">{t("scannerReady")}</span>
              </div>
              <button
                onClick={toggleSound}
                type="button"
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition text-slate-600"
                title={soundEnabled ? t("soundOff") : t("soundOn")}
              >
                {soundEnabled ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zm12.95-6.364l-6.364 6.364m0-6.364l6.364 6.364" />
                  </svg>
                )}
              </button>
            </div>

            <Button
              type="button"
              onClick={simulateCardScan}
              className="w-full mt-3 font-semibold justify-center"
              variant="secondary"
            >
              <svg className="h-4 w-4 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t("simulateScan")}
            </Button>
          </Card>

          {/* Recent Redemptions Log */}
          <Card className="max-h-[550px] flex flex-col">
            <h3 className="text-base font-semibold mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H9m2-2a2 2 0 00-2 2v1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1V5a2 2 0 00-2-2h-2m-4 9l2 2 4-4" />
                </svg>
                <span>{t("recentRedemptionsLog")}</span>
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            </h3>

            {recentRedemptionsList.length === 0 ? (
              <p className="text-xs text-[var(--muted)] italic py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-[var(--border)]">
                No redemptions logged today yet.
              </p>
            ) : (
              <div className="overflow-y-auto pr-1 space-y-2 flex-1 max-h-[420px]">
                {recentRedemptionsList.slice(0, 15).map((red) => {
                  const isRefunding = refundingId === red.id;
                  const dateStr = new Date(red.redeemedAt).toLocaleTimeString(locale === "ar" ? "ar-EG" : "fr-DZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <div key={red.id} className="p-3 border border-[var(--border)] rounded-xl bg-[var(--surface)] hover:bg-slate-50/50 transition flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{red.client?.fullName || "Unknown Client"}</p>
                          <p className="text-[10px] font-semibold text-[var(--muted)] mt-0.5">
                            {red.activity?.name} {red.session ? `· ${formatDate(red.session.sessionDate, locale, true).split(" ")[0]}` : ""}
                          </p>
                        </div>
                        <Badge tone={red.creditsUsed === 0.7 ? "warning" : "danger"} size="sm">
                          −{red.creditsUsed ?? 1.0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-[var(--border)]/50">
                        <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {dateStr} {red.staff ? `· ${red.staff.name}` : ""}
                        </span>
                        {isSuperAdmin ? (
                          <button
                            type="button"
                            onClick={() => confirmRefund(red.id)}
                            disabled={isRefunding}
                            className="text-[10px] font-bold text-red-600 hover:text-red-800 transition flex items-center gap-0.5"
                          >
                            {isRefunding ? "..." : t("undoBtn")}
                          </button>
                        ) : (
                          <span className="text-[8px] text-slate-400 font-medium">Read-only</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Overdraft Confirmation Modal */}
      <ConfirmModal
        isOpen={showOverdraftConfirm}
        title="Authorize Overdraft Redemption"
        message={`WARNING: This client has insufficient credits (${lookup?.balance} credits available, but this activity costs ${
          pendingRedeemData?.creditsUsed ?? activities.find((a) => a.id === pendingRedeemData?.activityId)?.creditCost
        } credits).

Do you want to proceed and allow a negative balance of ${
          (lookup?.balance ?? 0) - (pendingRedeemData?.creditsUsed ?? activities.find((a) => a.id === pendingRedeemData?.activityId)?.creditCost ?? 0)
        } credits?`}
        isDanger={true}
        onConfirm={async () => {
          setShowOverdraftConfirm(false);
          if (pendingRedeemData) {
            await executeRedeem(
              pendingRedeemData.activityId,
              pendingRedeemData.sessionId,
              pendingRedeemData.notes,
              true,
              pendingRedeemData.creditsUsed
            );
            setPendingRedeemData(null);
          }
        }}
        onCancel={() => {
          setShowOverdraftConfirm(false);
          setPendingRedeemData(null);
        }}
      />

      {/* Refund/Undo Confirmation Modal */}
      <ConfirmModal
        isOpen={showRefundConfirm}
        title={t("refundConfirmTitle")}
        message={t("refundConfirmMsg")}
        isDanger={true}
        onConfirm={handleRefund}
        onCancel={() => {
          setShowRefundConfirm(false);
          setPendingRefundId(null);
        }}
      />
    </div>
  );
}
