"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader, StatCard } from "@/components/admin/ui";

type ActivityProposal = {
  id: string;
  title: string;
  description: string;
  userName: string;
  userPhone: string;
  userEmail: string | null;
  status: "pending" | "reviewed" | "archived";
  createdAt: string;
  updatedAt: string;
};

export default function AdminProposalsPage() {
  const [proposals, setProposals] = useState<ActivityProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "reviewed" | "archived">("all");
  const [pendingCount, setPendingCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchProposals() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/proposals?status=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (err) {
      console.error("Failed to fetch proposals:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/proposals/pending-count");
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.count);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }

  useEffect(() => {
    fetchProposals();
    fetchStats();
  }, [activeTab]);

  async function handleStatusChange(id: string, status: "pending" | "reviewed" | "archived") {
    try {
      const res = await fetch(`/api/admin/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchProposals();
        fetchStats();
      } else {
        alert("Failed to update proposal.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this proposal?")) return;
    try {
      const res = await fetch(`/api/admin/proposals/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchProposals();
        fetchStats();
      } else {
        alert("Failed to delete proposal.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred.");
    }
  }

  function getCleanPhone(phone: string) {
    return phone.replace(/[^\d+]/g, "");
  }

  const TABS = ["all", "pending", "reviewed", "archived"] as const;
  const TAB_LABELS: Record<typeof TABS[number], string> = {
    all: "All",
    pending: "Pending",
    reviewed: "Reviewed",
    archived: "Archived",
  };
  const STATUS_TONE: Record<ActivityProposal["status"], "warning" | "success" | "default"> = {
    pending: "warning",
    reviewed: "success",
    archived: "default",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Proposals"
        description="View and manage user-submitted proposals for new activities and events on the AQA platform."
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Pending Proposals"
          value={pendingCount}
          hint="Proposals waiting to be reviewed by the team"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Proposals"
          value={proposals.length}
          hint="All proposals in the current filtered view"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-5 text-sm font-semibold transition-all border-b-2 outline-none whitespace-nowrap ${
              activeTab === tab
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <Card padding={false}>
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <svg className="h-8 w-8 animate-spin mx-auto text-[var(--primary)] mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs">Loading proposals...</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <svg className="h-12 w-12 mx-auto text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="font-semibold text-slate-700">No proposals found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                  <th className="py-3 px-4 font-bold text-[var(--muted)]">Proposer</th>
                  <th className="py-3 px-4 font-bold text-[var(--muted)]">Title</th>
                  <th className="py-3 px-4 font-bold text-[var(--muted)]">Status</th>
                  <th className="py-3 px-4 font-bold text-[var(--muted)]">Date</th>
                  <th className="py-3 px-4 font-bold text-[var(--muted)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {proposals.map((proposal) => (
                  <>
                    <tr
                      key={proposal.id}
                      className="hover:bg-slate-50/5 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === proposal.id ? null : proposal.id)}
                    >
                      <td className="py-4 px-4 font-bold text-[var(--foreground)]">
                        {proposal.userName}
                        <span className="block text-xs font-mono font-normal text-[var(--muted)] mt-0.5">
                          {proposal.userPhone}
                        </span>
                        {proposal.userEmail && (
                          <span className="block text-xs font-normal text-[var(--muted)] mt-0.5">
                            {proposal.userEmail}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-semibold text-[var(--foreground)] max-w-[220px]">
                        {proposal.title}
                        <span className="block text-xs font-normal text-[var(--muted)] mt-0.5 truncate">
                          {expandedId === proposal.id ? "" : proposal.description.slice(0, 80) + (proposal.description.length > 80 ? "…" : "")}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge tone={STATUS_TONE[proposal.status]}>
                          {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-xs text-[var(--muted)]">
                        {new Date(proposal.createdAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {proposal.status === "pending" && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleStatusChange(proposal.id, "reviewed")}
                          >
                            Mark Reviewed
                          </Button>
                        )}
                        {proposal.status === "reviewed" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleStatusChange(proposal.id, "archived")}
                            className="text-[var(--muted)]"
                          >
                            Archive
                          </Button>
                        )}
                        <a
                          href={`https://wa.me/${getCleanPhone(proposal.userPhone)}?text=${encodeURIComponent(
                            `Hello ${proposal.userName}, thank you for your activity proposal "${proposal.title}". Our team has reviewed it and will get back to you shortly.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 transition"
                        >
                          WhatsApp
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(proposal.id)}
                          className="text-[var(--muted)] hover:text-red-400"
                          title="Delete Proposal"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </td>
                    </tr>

                    {/* Expanded description row */}
                    {expandedId === proposal.id && (
                      <tr key={`${proposal.id}-expanded`} className="bg-[var(--surface-2)]/20">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="bg-[var(--surface-2)]/30 border border-[var(--border)] rounded-xl p-4">
                            <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">
                              Full Proposal Description
                            </p>
                            <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                              {proposal.description}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
