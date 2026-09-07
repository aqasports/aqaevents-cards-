"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SwimLookupPage() {
  const [swimId, setSwimId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanId = swimId.trim().toUpperCase();
    if (!cleanId) {
      setError("Please enter your Swimmer ID");
      return;
    }
    router.push(`/swim/profile/${encodeURIComponent(cleanId)}`);
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-cyan-500 selection:text-black">
      {/* Background glow orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vh] bg-sky-500/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] bg-cyan-400/10 blur-[120px] pointer-events-none rounded-full" />

      <main className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>AQA Sports</span>
            <span className="text-slate-500">·</span>
            <span>Swim Portal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Swimmer Profile Access
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enter your personal Swimmer ID to review your group allocation and coach note.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 shadow-2xl space-y-4"
        >
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-2">
              Swimmer ID
            </label>
            <input
              type="text"
              value={swimId}
              onChange={(e) => {
                setSwimId(e.target.value);
                setError(null);
              }}
              placeholder="e.g. SWM-123456"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 font-mono text-center tracking-widest text-lg focus:outline-none focus:border-cyan-400 transition-colors uppercase"
              autoFocus
            />
            {error && (
              <p className="text-xs text-rose-400 mt-2 text-center">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(0,242,255,0.25)] active:scale-[0.99]"
          >
            Access My Profile
          </button>

          <p className="text-[11px] text-slate-500 text-center pt-2">
            Lost your ID? Contact your coach or AQA administration.
          </p>
        </form>
      </main>
    </div>
  );
}
