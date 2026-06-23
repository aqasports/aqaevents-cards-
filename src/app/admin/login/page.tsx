"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Alert, Button, Input } from "@/components/admin/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const [email, setEmail] = useState("admin@aqasports.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error.includes("ACCOUNT_LOCKED")) {
        const parts = result.error.split(":");
        const seconds = parseInt(parts[1] || "900", 10);
        const minutes = Math.ceil(seconds / 60);
        setError(`Too many failed attempts. This account is temporarily locked. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`);
      } else {
        setError("Invalid email or password. Please try again.");
      }
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo block */}
        <div className="mb-8 text-center flex flex-col items-center">
          <img
            src="/image/logoevents.png"
            alt="AQA Events Logo"
            className="h-16 w-auto object-contain mb-4 filter drop-shadow-[0_0_15px_rgba(0,242,255,0.25)] hover:scale-105 transition-transform duration-300 cursor-pointer"
          />
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">
            AQA Sports
          </p>
          <h1 className="mt-1.5 text-2xl font-bold text-[var(--foreground)] tracking-tight">Admin Portal</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sign in to manage clients and event cards
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md p-6 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-glow)] transition-all duration-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && <Alert tone="danger">{error}</Alert>}

            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          AQA Sports · Event Card Management System
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
