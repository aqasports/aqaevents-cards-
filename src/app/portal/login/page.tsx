"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [isMagicToken, setIsMagicToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        ...(isMagicToken
          ? { token }
          : { email: email.trim(), password, loginType: "org" }),
      });

      if (res?.error) {
        setError("Invalid credentials or login token. Please check and try again.");
      } else if (res?.ok) {
        router.push("/portal");
        router.refresh();
      }
    } catch {
      setError("Network error logging into Corporate Portal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold text-xl">
            AQA
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AQA Corporate Portal</h1>
          <p className="text-sm text-slate-400">Sign in to manage your company credit pool and employees</p>
        </div>

        {error && (
          <div className="p-3.5 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex border-b border-slate-800 text-xs font-semibold mb-4">
            <button
              type="button"
              className={`flex-1 py-2 text-center border-b-2 ${!isMagicToken ? "border-sky-500 text-sky-400" : "border-transparent text-slate-400"}`}
              onClick={() => setIsMagicToken(false)}
            >
              Email & Password
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-center border-b-2 ${isMagicToken ? "border-sky-500 text-sky-400" : "border-transparent text-slate-400"}`}
              onClick={() => setIsMagicToken(true)}
            >
              Magic Token
            </button>
          </div>

          {!isMagicToken ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hr@company.com"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Magic Token</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste magic link token"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-sky-500/10"
          >
            {loading ? "Signing in..." : "Sign In to Portal"}
          </button>
        </form>
      </div>
    </div>
  );
}
