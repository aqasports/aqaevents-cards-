"use client";

import { useState, useEffect } from "react";
import { Alert, Button, Card, PageHeader, Badge, EmptyState } from "@/components/admin/ui";

type Anomaly = {
  type: string;
  severity: "high" | "medium" | "low";
  description: string;
  detectedAt: string;
};

type Digest = {
  id: string;
  sentAt: string;
  summaryText: string;
  anomalies: Anomaly[];
};

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [digests, setDigests] = useState<Digest[]>([]);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports/anomalies");
      if (res.ok) {
        const data = await res.json();
        setDigests(Array.isArray(data) ? data : [data]);
      } else {
        setMessage({ text: "Failed to load weekly insights digest.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error loading insights.", tone: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="AI Insights & Anomaly Digest"
        description="Automated weekly analysis of operational performance, idle clients, and ledger anomaly flags."
        action={
          <Button onClick={loadInsights} loading={loading}>
            Run Fresh Scan
          </Button>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {loading ? (
        <Card>
          <p className="py-8 text-center text-sm text-[var(--muted)]">Analyzing platform metrics & running anomaly detection...</p>
        </Card>
      ) : digests.length === 0 ? (
        <Card>
          <EmptyState
            title="No insight digests logged"
            description="Weekly automated digests will appear here after the scheduled audit runs."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {digests.map((digest, idx) => (
            <Card key={digest.id || idx} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[var(--foreground)]">Weekly Insight Digest</span>
                  <Badge tone="success">READ-ONLY AI AUDIT</Badge>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {digest.sentAt ? new Date(digest.sentAt).toLocaleString() : "Latest Scan"}
                </span>
              </div>

              <div className="prose text-xs text-[var(--foreground)] whitespace-pre-wrap font-sans leading-relaxed">
                {digest.summaryText || "No critical anomalies detected in the database. Operational metrics are normal."}
              </div>

              {digest.anomalies && digest.anomalies.length > 0 && (
                <div className="border-t border-[var(--border)] pt-3 space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-rose-600">Flagged Anomalies</h4>
                  <div className="space-y-2">
                    {digest.anomalies.map((a, aIdx) => (
                      <div key={aIdx} className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-200 text-xs flex items-start justify-between">
                        <div>
                          <p className="font-bold text-rose-800">{a.type}</p>
                          <p className="text-slate-600 mt-0.5">{a.description}</p>
                        </div>
                        <Badge tone={a.severity === "high" ? "danger" : "warning"}>
                          {a.severity.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
