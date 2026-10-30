"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Alert } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";

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
  const { t } = useTranslations("clientOverview");
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const urlToken = params?.get("token");
        const endpoint = urlToken ? `/api/client/me?token=${encodeURIComponent(urlToken)}` : "/api/client/me";
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          setProfile({
            ...(data.client ?? data),
            balance: data.creditBalance ?? data.balance ?? 0,
            cards: data.cards ?? [],
            redemptions: data.redemptions ?? [],
          });
        } else {
          setError(t("openLinkPrompt"));
        }
      } catch {
        setError(t("networkError"));
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
        <p className="text-sm font-semibold text-[var(--muted)]">{t("loading")}</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] p-4">
        <Card className="max-w-md w-full text-center space-y-4">
          <h2 className="text-lg font-bold">{t("portalTitle")}</h2>
          <Alert tone="danger">{error || t("accessRestricted")}</Alert>
          <p className="text-xs text-[var(--muted)]">
            {t("pinHint")}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-2)] p-4 sm:p-6 space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)]">{t("welcome", { name: profile.fullName })}</h1>
          <p className="text-xs text-[var(--muted)]">{profile.email || profile.phone || t("memberAccount")}</p>
        </div>
        <Badge tone="success">{t("selfServiceBadge")}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-xl">
          <p className="text-xs font-extrabold uppercase tracking-wider opacity-80">{t("availableBalance")}</p>
          <p className="text-4xl font-black mt-2">{profile.balance} <span className="text-base font-medium">{t("creditsUnit")}</span></p>
          <p className="text-[11px] opacity-75 mt-3">{t("validForAll")}</p>
        </Card>

        <Card className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] font-mono">{t("cardCodeLabel")}</p>
          <p className="text-xl font-black font-mono text-[var(--primary)]">
            {profile.cards[0]?.cardCode || t("noCardIssued")}
          </p>
          <p className="text-xs text-[var(--muted)]">{t("showCodeHint")}</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <h3 className="text-base font-bold">{t("recentRedemptions")}</h3>
        {profile.redemptions.length === 0 ? (
          <p className="text-xs text-[var(--muted)] py-4">{t("noRedemptions")}</p>
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
                          {t("eventLabel")}: {eventDateStr} · {t("checkedInLabel")}: {new Date(checkIn.scannedAt).toLocaleString()}
                        </>
                      ) : (
                        <>
                          {t("eventLabel")}: {eventDateStr}
                        </>
                      )}
                    </p>
                  </div>
                  <Badge tone="warning">{t("creditDeducted", { count: r.creditsUsed })}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
