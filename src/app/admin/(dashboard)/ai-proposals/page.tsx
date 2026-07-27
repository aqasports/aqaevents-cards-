"use client";

import { useState, useEffect } from "react";
import { Alert, Button, Card, PageHeader, Badge, EmptyState } from "@/components/admin/ui";

type Proposal = {
  id: string;
  actionType: string;
  proposedPayload: string;
  reasoning: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  createdAt: string;
};

export default function AiProposalsPage() {
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai/queue");
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      } else {
        setMessage({ text: "Failed to load proposed AI actions.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error loading AI queue.", tone: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  async function handleReview(proposalId: string, status: "approved" | "rejected") {
    setActionLoading(proposalId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ai/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, status }),
      });

      if (res.ok) {
        setMessage({ text: `Proposal ${status} successfully.`, tone: "success" });
        await loadProposals();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to review proposal.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error reviewing proposal.", tone: "danger" });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="AI Human-in-the-Loop Proposal Queue"
        description="Super-admin approval queue for mutations proposed by the read-only AI analyst."
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {loading ? (
        <Card>
          <p className="py-8 text-center text-sm text-[var(--muted)]">Loading proposed action queue...</p>
        </Card>
      ) : proposals.length === 0 ? (
        <Card>
          <EmptyState
            title="No AI proposals pending review"
            description="When the AI assistant identifies recommended administrative actions, they will appear here for explicit human approval."
            icon={
              <svg className="h-8 w-8 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((item) => (
            <Card key={item.id} className="space-y-3 border-l-4 border-l-[var(--primary)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[var(--foreground)]">{item.actionType}</span>
                  <Badge tone={item.status === "pending" ? "warning" : item.status === "approved" ? "success" : "danger"}>
                    {item.status.toUpperCase()}
                  </Badge>
                </div>
                <span className="text-xs text-[var(--muted)]">{new Date(item.createdAt).toLocaleString()}</span>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">AI Reasoning:</h4>
                <p className="text-xs text-[var(--foreground)] mt-1 font-sans">{item.reasoning}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Proposed Payload JSON:</h4>
                <pre className="text-[11px] font-mono bg-[var(--surface-2)] p-2.5 rounded-xl border border-[var(--border)] overflow-x-auto mt-1">
                  {item.proposedPayload}
                </pre>
              </div>

              {item.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    loading={actionLoading === item.id}
                    onClick={() => handleReview(item.id, "rejected")}
                  >
                    Reject Proposal
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    loading={actionLoading === item.id}
                    onClick={() => handleReview(item.id, "approved")}
                  >
                    Approve & Execute
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
