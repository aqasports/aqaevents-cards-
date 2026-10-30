"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Alert, Button, Input } from "@/components/admin/ui";
import { useTranslations } from "@/lib/i18n";

function LoginForm() {
  const { t } = useTranslations("adminLogin");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error.includes("ACCOUNT_LOCKED")) {
        const parts = result.error.split(":");
        const seconds = parseInt(parts[1] || "900", 10);
        const minutes = Math.ceil(seconds / 60);
        setError(t("accountLocked", { minutes }));
      } else {
        setError(t("invalidCredentials"));
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
            src="/aqa-logo.png"
            alt="AQA ERP Logo"
            className="h-12 w-auto object-contain mb-4 filter drop-shadow-[0_0_15px_rgba(0,242,255,0.25)] hover:scale-105 transition-transform duration-300 cursor-pointer"
          />
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
            AQA ERP
          </p>
          <h1 className="mt-1.5 text-2xl font-bold text-[var(--foreground)] tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {t("subtitle")}
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md p-6 shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-glow)] transition-all duration-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t("emailLabel")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label={t("passwordLabel")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && <Alert tone="danger">{error}</Alert>}

            <Button type="submit" className="w-full" loading={loading}>
              {t("signInBtn")}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          {t("footer")}
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
