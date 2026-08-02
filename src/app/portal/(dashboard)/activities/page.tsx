"use client";

import { useState, useEffect } from "react";

interface Activity {
  id: string;
  name: string;
  description: string | null;
  creditCost: number;
  duration: string | null;
  sessions: Array<{ id: string; sessionDate: string; location: string | null }>;
}

export default function PortalActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Proposal modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadActivities() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/activities");
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch {
      setMessage("Failed to load activities.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivities();
  }, []);

  async function handleProposeActivity(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          userName,
          userPhone,
        }),
      });

      if (res.ok) {
        setMessage("Activity proposal submitted to AQA Sports team for review.");
        setShowModal(false);
        setTitle("");
        setDescription("");
        setUserName("");
        setUserPhone("");
      } else {
        const data = await res.json();
        setMessage(`Failed: ${data.error}`);
      }
    } catch {
      setMessage("Network error submitting activity proposal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Available Corporate Activities</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse activities eligible for employee credit redemption or propose custom corporate events
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-sky-500/10"
        >
          Propose Custom Activity
        </button>
      </div>

      {message && (
        <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 text-xs font-medium">
          {message}
        </div>
      )}

      {/* Activities Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading activity catalog...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((act) => (
            <div key={act.id} className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white">{act.name}</h3>
                  <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono font-bold rounded">
                    {act.creditCost} Credits
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-3">{act.description || "No description provided."}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500">Upcoming Sessions</span>
                {act.sessions.length === 0 ? (
                  <div className="text-[11px] text-slate-500 italic">No upcoming sessions scheduled</div>
                ) : (
                  <div className="space-y-1">
                    {act.sessions.map((s) => (
                      <div key={s.id} className="flex justify-between text-[11px] text-slate-300">
                        <span>{new Date(s.sessionDate).toLocaleDateString()}</span>
                        <span className="text-slate-500">{s.location || "Standard Venue"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Propose Activity Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-md p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Propose Custom Corporate Activity</h3>
            <form onSubmit={handleProposeActivity} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Activity / Event Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Corporate Kayak Tournament"
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Description & Desired Dates</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your requested activity, estimated attendee count, and dates."
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Contact Person Name</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Contact Phone Number</label>
                <input
                  type="text"
                  required
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="+213555123456"
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl"
                >
                  {submitting ? "Submitting..." : "Submit Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
