"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, PageHeader, ConfirmModal, Alert } from "@/components/admin/ui";

type Club = {
  id: string;
  name: string;
  logoUrl?: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  terminalToken: string;
  isActive: boolean;
  activities: { id: string; name: string }[];
  _count: { checkIns: number };
};

function ClubInitials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return <span className="text-lg font-black tracking-tight text-white">{initials}</span>;
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-sky-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];

function avatarGradient(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return AVATAR_GRADIENTS[n % AVATAR_GRADIENTS.length];
}

import { useCallback } from "react";
import { fetchWithRetry } from "@/lib/fetch-utils";
import { useDataCache, invalidateCache } from "@/lib/use-data-cache";

export default function ClubsListPage() {
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    clubId: string;
    clubName: string;
  }>({ isOpen: false, clubId: "", clubName: "" });

  const fetcher = useCallback(async () => {
    const res = await fetchWithRetry("/api/admin/clubs");
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      throw new Error(data?.error || "Failed to load clubs.");
    }
    return data as Club[];
  }, []);

  const { data: clubsData, loading, error, refetch, mutate } = useDataCache(
    "/api/admin/clubs",
    fetcher
  );

  const clubs = clubsData ?? [];

  useEffect(() => {
    if (error) {
      setMessage({ text: error, tone: "danger" });
    }
    localStorage.setItem("aqa_last_viewed_clubs_time", new Date().toISOString());
  }, [error]);

  async function handleToggleActive(id: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/admin/clubs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        mutate((prev) => (prev || []).map((c: Club) => c.id === id ? { ...c, isActive: !currentStatus } : c), false);
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to update club status.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Failed to update club status.", tone: "danger" });
    }
  }

  async function handleRegenerateToken() {
    const { clubId } = confirmConfig;
    if (!clubId) return;
    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/regenerate-token`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        mutate((prev) => (prev || []).map((c: Club) => c.id === clubId ? { ...c, terminalToken: data.terminalToken } : c), false);
        setMessage({ text: "Terminal URL regenerated. Old URL is now invalid.", tone: "success" });
      } else {
        setMessage({ text: data.error || "Failed to regenerate token.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Failed to regenerate token.", tone: "danger" });
    } finally {
      setConfirmConfig({ isOpen: false, clubId: "", clubName: "" });
    }
  }

  function handleCopyUrl(club: Club) {
    const url = `${window.location.origin}/checkin/${club.terminalToken}`;
    navigator.clipboard.writeText(url);
    setCopiedId(club.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Partner Clubs"
        description="Manage contracted partner clubs and configure their check-in terminal access."
        action={
          <Link href="/admin/clubs/new">
            <Button>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Club
            </Button>
          </Link>
        }
      />

      {message && (
        <Alert tone={message.tone}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-52 rounded-2xl bg-[var(--border)]/20 animate-pulse border border-[var(--border)]" />
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-700 mb-1">No partner clubs yet</p>
          <p className="text-xs text-slate-400 mb-5">Create your first partner club to get started.</p>
          <Link href="/admin/clubs/new">
            <Button size="sm">Create Club</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {clubs.map((club) => (
            <div
              key={club.id}
              className={`group relative flex flex-col rounded-2xl border bg-[var(--surface)] overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                club.isActive ? "border-[var(--border)]" : "border-[var(--border)] opacity-60"
              }`}
            >
              {/* Card header strip */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${avatarGradient(club.id)}`} />

              <div className="p-5 flex flex-col flex-1 gap-4">

                {/* Top row: avatar + name + toggle */}
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    {club.logoUrl ? (
                      <img
                        src={club.logoUrl}
                        alt={`${club.name} logo`}
                        className="h-12 w-12 rounded-xl object-contain border border-[var(--border)] bg-white p-1"
                      />
                    ) : (
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${avatarGradient(club.id)} flex items-center justify-center shadow-sm`}>
                        <ClubInitials name={club.name} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/clubs/${club.id}`}
                      className="font-bold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors leading-tight line-clamp-1"
                    >
                      {club.name}
                    </Link>
                    {club.contactName && (
                      <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{club.contactName}</p>
                    )}
                  </div>

                  {/* Active toggle */}
                  <button
                    title={club.isActive ? "Deactivate club" : "Activate club"}
                    onClick={() => handleToggleActive(club.id, club.isActive)}
                    className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      club.isActive ? "bg-green-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                        club.isActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Contact info */}
                {(club.contactEmail || club.contactPhone) && (
                  <div className="space-y-1">
                    {club.contactPhone && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="truncate">{club.contactPhone}</span>
                      </div>
                    )}
                    {club.contactEmail && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                        <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{club.contactEmail}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-3 py-3 border-y border-[var(--border)]">
                  <div className="flex-1 text-center">
                    <p className="text-lg font-black text-[var(--foreground)]">{club._count.checkIns}</p>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Check-ins</p>
                  </div>
                  <div className="w-px h-8 bg-[var(--border)]" />
                  <div className="flex-1 text-center">
                    <p className="text-lg font-black text-[var(--foreground)]">{club.activities.length}</p>
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Activities</p>
                  </div>
                  <div className="w-px h-8 bg-[var(--border)]" />
                  <div className="flex-1 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      club.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${club.isActive ? "bg-green-500" : "bg-slate-300"}`} />
                      {club.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link href={`/admin/clubs/${club.id}`} className="flex-1">
                    <button className="w-full py-1.5 px-3 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors">
                      Manage
                    </button>
                  </Link>

                  <button
                    onClick={() => handleCopyUrl(club)}
                    disabled={!club.isActive}
                    title="Copy terminal URL"
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      copiedId === club.id
                        ? "border-green-400 bg-green-50 text-green-700"
                        : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {copiedId === club.id ? (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Copy URL
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setConfirmConfig({ isOpen: true, clubId: club.id, clubName: club.name })}
                    title="Rotate terminal token"
                    className="py-1.5 px-2.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title="Regenerate Terminal Token"
        message={`Are you sure you want to regenerate the terminal URL for "${confirmConfig.clubName}"?\n\nThis will invalidate the current public terminal link immediately. Any devices on the old URL will stop working until updated.`}
        confirmLabel="Regenerate"
        isDanger={true}
        onConfirm={handleRegenerateToken}
        onCancel={() => setConfirmConfig({ isOpen: false, clubId: "", clubName: "" })}
      />
    </div>
  );
}
