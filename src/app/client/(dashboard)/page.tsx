"use client";

import { useState, useEffect } from "react";
import { Card, Button, Badge, Alert } from "@/components/admin/ui";

type ClientProfile = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  balance: number;
  cards: Array<{ cardCode: string; publicToken: string }>;
  redemptions: Array<{
    id: string;
    redeemedAt: string;
    creditsUsed: number;
    activity: { name: string };
    session?: { sessionDate: string; location: string | null } | null;
    checkIns?: Array<{ scannedAt: string; status: string }>;
  }>;
};

export default function ClientDashboardPage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/client/me");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        } else {
          setError("Please login to view your card balance.");
        }
      } catch {
        setError("Network error loading profile.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
        <p className="text-sm font-semibold text-[var(--muted)]">Loading client portal...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
        <Card className="max-w-md w-full text-center space-y-4">
          <h2 className="text-lg font-bold">AQA Client Portal</h2>
          <Alert tone="danger">{error || "Access restricted"}</Alert>
          <p className="text-xs text-[var(--muted)]">
            To view your balance, enter your card QR code link or request a login PIN.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-2)] p-4 sm:p-6 space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)]">Welcome, {profile.fullName}</h1>
          <p className="text-xs text-[var(--muted)]">{profile.email || profile.phone || "AQA Member Account"}</p>
        </div>
        <Badge tone="success">Client Self-Service</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-xl">
          <p className="text-xs font-extrabold uppercase tracking-wider opacity-80">Available Credit Balance</p>
          <p className="text-4xl font-black mt-2">{profile.balance} <span className="text-base font-medium">Credits</span></p>
          <p className="text-[11px] opacity-75 mt-3">Valid for all AQA Sports sessions & events</p>
        </Card>

        <Card className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] font-mono">My Event Card Code</p>
          <p className="text-xl font-black font-mono text-[var(--primary)]">
            {profile.cards[0]?.cardCode || "No Card Issued"}
          </p>
          <p className="text-xs text-[var(--muted)]">Show this code or QR code at check-in terminals.</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <h3 className="text-base font-bold">Recent Session Redemptions</h3>
        {profile.redemptions.length === 0 ? (
          <p className="text-xs text-[var(--muted)] py-4">No activity redemptions yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border)] text-xs">
            {profile.redemptions.map((r) => {
              const checkIn = r.checkIns?.[0];
              const eventDateStr = r.session?.sessionDate
                ? new Date(r.session.sessionDate).toLocaleString()
                : new Date(r.redeemedAt).toLocaleString();
              return (
                <div key={r.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[var(--foreground)]">{r.activity.name}</p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {checkIn ? (
                        <>
                          Event: {eventDateStr} · Checked in: {new Date(checkIn.scannedAt).toLocaleString()}
                        </>
                      ) : (
                        <>
                          Event: {eventDateStr}
                        </>
                      )}
                    </p>
                  </div>
                  <Badge tone="warning">-{r.creditsUsed} Credit</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
