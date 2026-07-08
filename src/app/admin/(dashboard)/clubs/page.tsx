"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, PageHeader, Badge, ConfirmModal, Alert } from "@/components/admin/ui";

type Club = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  terminalToken: string;
  isActive: boolean;
  activities: { id: string; name: string }[];
  _count: { checkIns: number };
};

export default function ClubsListPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  
  // Token regeneration modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    clubId: string;
    clubName: string;
  }>({
    isOpen: false,
    clubId: "",
    clubName: "",
  });

  async function loadClubs() {
    try {
      const res = await fetch("/api/admin/clubs");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setClubs(data);
      } else {
        setMessage({ text: data?.error || "Failed to load clubs.", tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Failed to load clubs.", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClubs();
  }, []);

  async function handleToggleActive(id: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/admin/clubs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        setClubs((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: !currentStatus } : c))
        );
        setMessage({ text: "Club status updated successfully.", tone: "success" });
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to update club status.", tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Failed to update club status.", tone: "danger" });
    }
  }

  async function handleRegenerateToken() {
    const { clubId } = confirmConfig;
    if (!clubId) return;

    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/regenerate-token`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setClubs((prev) =>
          prev.map((c) => (c.id === clubId ? { ...c, terminalToken: data.terminalToken } : c))
        );
        setMessage({ text: "Terminal URL token regenerated successfully. Old URL is now invalid.", tone: "success" });
      } else {
        setMessage({ text: data.error || "Failed to regenerate token.", tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Failed to regenerate token.", tone: "danger" });
    } finally {
      setConfirmConfig({ isOpen: false, clubId: "", clubName: "" });
    }
  }

  function handleCopyUrl(token: string) {
    const url = `${window.location.origin}/checkin/${token}`;
    navigator.clipboard.writeText(url);
    setMessage({ text: "Terminal URL copied to clipboard.", tone: "success" });
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Partner Clubs"
        description="Manage third-party clubs under contract and configure QR code terminal URLs."
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 rounded-xl bg-[var(--border)]/20 animate-pulse border border-[var(--border)]" />
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <Card className="py-12 text-center">
          <svg className="h-12 w-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-sm font-semibold text-slate-700 mb-1">No clubs found</p>
          <p className="text-xs text-slate-400 mb-4">Get started by creating your first partner club.</p>
          <Link href="/admin/clubs/new">
            <Button size="sm">Create Club</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Card key={club.id} className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/admin/clubs/${club.id}`} className="hover:text-[var(--primary)] transition-colors">
                    <h3 className="font-bold text-base text-[var(--foreground)]">{club.name}</h3>
                  </Link>
                  <button
                    onClick={() => handleToggleActive(club.id, club.isActive)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
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

                <div className="space-y-1 text-xs text-[var(--muted)]">
                  {club.contactName && <p>Contact: {club.contactName}</p>}
                  {club.contactPhone && <p>Phone: {club.contactPhone}</p>}
                  {club.contactEmail && <p>Email: {club.contactEmail}</p>}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                  <Badge tone={club.isActive ? "success" : "default"}>
                    {club.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge tone="info">
                    {club.activities.length} Activities
                  </Badge>
                  <Badge tone="primary">
                    {club._count.checkIns} Check-ins
                  </Badge>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleCopyUrl(club.terminalToken)}
                  disabled={!club.isActive}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy URL
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs shrink-0"
                  onClick={() =>
                    setConfirmConfig({ isOpen: true, clubId: club.id, clubName: club.name })
                  }
                >
                  Rotate
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title="Regenerate Terminal Token"
        message={`Are you sure you want to regenerate the terminal URL for "${confirmConfig.clubName}"?\n\nThis will invalidate the current public terminal link immediately. Any devices currently logged in to the terminal page will fail to scan cards until they open the new URL.`}
        confirmLabel="Regenerate"
        isDanger={true}
        onConfirm={handleRegenerateToken}
        onCancel={() => setConfirmConfig({ isOpen: false, clubId: "", clubName: "" })}
      />
    </div>
  );
}
