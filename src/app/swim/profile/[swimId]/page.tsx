"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface SwimMemberData {
  id: string;
  swimId: string;
  fullName: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  dateOfStart: string;
  category: string;
  level: string;
  formula: string;
  duration: string | null;
  priceDA: number;
  coachMessage: string | null;
  paymentStatus: string;
  groupStatus: string;
  rejectionReason: string | null;
  group: {
    id: string;
    name: string;
    coachName: string | null;
    schedule: string;
    level: string;
  } | null;
}

export default function SwimmerProfilePage({
  params,
}: {
  params: Promise<{ swimId: string }>;
}) {
  const { swimId } = use(params);
  const [member, setMember] = useState<SwimMemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision Modal State
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [preferredDays, setPreferredDays] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`/api/public/swim/member/${encodeURIComponent(swimId)}`);
        if (!res.ok) {
          setError("Swimmer profile not found. Please check the ID.");
          return;
        }
        const data = await res.json();
        setMember(data);
      } catch (err) {
        setError("Failed to load profile. Please check your internet connection.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [swimId]);

  async function handleDecision(action: "accept" | "reject") {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/public/swim/member/${encodeURIComponent(swimId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            reason: rejectReason,
            preferredDays,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setMember(data.member);
        setShowRejectModal(false);
        if (action === "accept") {
          setActionSuccess("Group confirmed! We look forward to seeing you at the pool.");
        } else {
          setActionSuccess(
            "Solid group rejected. Your availability has been registered for a new group allocation."
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading swimmer profile...</p>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-white/10 text-center space-y-4">
          <h2 className="text-lg font-bold text-rose-400">Profile Not Found</h2>
          <p className="text-xs text-slate-400">{error}</p>
          <Link
            href="/swim"
            className="inline-block px-4 py-2 rounded-xl bg-slate-800 text-cyan-400 text-xs font-semibold hover:bg-slate-700"
          >
            ← Try Another ID
          </Link>
        </div>
      </div>
    );
  }

  const isProposed = member.groupStatus === "proposed";
  const isAccepted = member.groupStatus === "accepted";
  const isRejected = member.groupStatus === "rejected";

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-cyan-500 selection:text-black">
      <div className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-sky-500/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] bg-cyan-400/10 blur-[120px] pointer-events-none rounded-full" />

      <main className="w-full max-w-lg relative z-10 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>AQA Swim Portal</span>
            <span className="text-slate-500">·</span>
            <span>Client Area</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back, {member.fullName.split(" ")[0]}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Swimmer ID: <span className="font-mono text-cyan-300">{member.swimId}</span>
          </p>
        </div>

        {actionSuccess && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-medium text-center">
            {actionSuccess}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 shadow-2xl space-y-6">
          {/* Swimmer summary */}
          <div className="flex items-center gap-4 pb-5 border-b border-white/10">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.fullName}
                className="h-16 w-16 rounded-2xl object-cover border border-cyan-400/40 shadow-[0_0_15px_rgba(0,242,255,0.2)]"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.25)] shrink-0">
                {member.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-white truncate">
                {member.fullName}
              </h2>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-white/10">
                  {member.category}
                </span>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-sky-950/60 text-sky-400 border border-sky-800/40">
                  Level: {member.level}
                </span>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800/80 text-cyan-300 border border-cyan-800/30">
                  {member.formula}
                </span>
              </div>
            </div>
          </div>

          {/* Word from coach */}
          {member.coachMessage && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.1)]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-1">
                Word From Your Coach
              </p>
              <p className="text-xs italic text-slate-200 leading-relaxed">
                &ldquo;{member.coachMessage}&rdquo;
              </p>
            </div>
          )}

          {/* Solid Group Proposal Card */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Proposed Solid Group
              </span>
              {isAccepted && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                  Accepted
                </span>
              )}
              {isRejected && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-950/60 border border-rose-500/40 text-rose-400">
                  Change Requested
                </span>
              )}
              {isProposed && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/60 border border-amber-500/40 text-amber-400">
                  Awaiting Your Confirmation
                </span>
              )}
            </div>

            {member.group ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Group Name</span>
                  <span className="text-sm font-bold text-white">
                    {member.group.name}
                  </span>
                </div>
                {member.group.coachName && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Assigned Coach</span>
                    <span className="text-xs font-semibold text-cyan-300">
                      {member.group.coachName}
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2 pt-2 border-t border-white/5">
                  <span className="text-xs text-slate-400 shrink-0">Training Time</span>
                  <span className="text-xs font-medium text-slate-200 text-right">
                    {member.group.schedule}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                No solid group assigned yet. Our coaching team will link a group shortly.
              </p>
            )}

            {/* Accept / Reject actions if proposed */}
            {isProposed && member.group && (
              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleDecision("accept")}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] active:scale-[0.99]"
                >
                  Accept Solid Group
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 font-semibold text-xs transition-all active:scale-[0.99]"
                >
                  Reject & Request Other Group
                </button>
              </div>
            )}
          </div>

          {/* Pricing and membership details */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Formula Tarif</span>
            <span className="font-mono font-bold text-cyan-400">
              {member.priceDA.toLocaleString("fr-DZ")} DA
            </span>
          </div>

          {/* Back link */}
          <div className="text-center pt-2">
            <Link
              href="/swim"
              className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
            >
              ← Enter Another Swimmer ID
            </Link>
          </div>
        </div>
      </main>

      {/* Rejection / Availability Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Request New Group Allocation
            </h3>
            <p className="text-xs text-slate-400">
              Tell us why the proposed group does not suit you and specify your preferred days and times.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for Rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Schedule clash with work, pool location..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Your Availability (Preferred Days / Hours)
              </label>
              <input
                type="text"
                value={preferredDays}
                onChange={(e) => setPreferredDays(e.target.value)}
                placeholder="e.g. Monday & Wednesday from 18:00 to 20:00"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision("reject")}
                disabled={submitting}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                Submit Re-inscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
