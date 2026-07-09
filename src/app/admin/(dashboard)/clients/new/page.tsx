"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Card, Input, PageHeader, Select, Textarea } from "@/components/admin/ui";

type Package = {
  id: string;
  name: string;
  creditAmount: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
};

type CardMode = "auto" | "preprinted";

export default function NewClientPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cardMode, setCardMode] = useState<CardMode>("auto");
  const [preCardCode, setPreCardCode] = useState("");
  const [cardLookupStatus, setCardLookupStatus] = useState<"idle" | "ok" | "error">("idle");
  const [cardLookupMsg, setCardLookupMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/packages")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPackages(data.filter((p: Package & { active: boolean }) => p.active));
        } else {
          console.error("Packages response is not an array:", data);
          setPackages([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching packages:", err);
        setPackages([]);
      });
  }, []);

  // Live card code validation
  useEffect(() => {
    if (cardMode !== "preprinted" || !preCardCode.trim()) {
      setCardLookupStatus("idle");
      setCardLookupMsg("");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/admin/clients?search=${encodeURIComponent(preCardCode.trim())}&limit=1`);
        // We don't have a dedicated card-lookup endpoint — we'll just let the server validate at submit time
        // But we can do basic format check
        const code = preCardCode.trim().toUpperCase();
        if (/^AQA-\d{6}$/.test(code)) {
          setCardLookupStatus("ok");
          setCardLookupMsg(`Format looks correct. Will be verified on submit.`);
        } else {
          setCardLookupStatus("error");
          setCardLookupMsg("Expected format: AQA-000001");
        }
      } catch {
        setCardLookupStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [preCardCode, cardMode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    const body: Record<string, unknown> = {
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      notes: formData.get("notes"),
      leadSource: formData.get("leadSource"),
      packageId: formData.get("packageId") || undefined,
      issueCard: cardMode === "auto",
      preCardCode: cardMode === "preprinted" && preCardCode.trim() ? preCardCode.trim().toUpperCase() : undefined,
    };

    const response = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to create client");
      return;
    }

    router.push(`/admin/clients/${data.id}`);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="New client"
        description="Create a client profile, link a pre-printed card or auto-issue one, and optionally add a package."
        action={
          <Link href="/admin/clients" className="text-sm text-[var(--primary)] hover:underline">
            ← Back to clients
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Client info */}
            <Input label="Full name" name="fullName" placeholder="e.g. Ahmed Benali" required />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Email" name="email" type="email" placeholder="optional" />
              <Input label="Phone" name="phone" placeholder="optional" />
              <Input label="Lead source" name="leadSource" placeholder="e.g. Google, Walk-in, Friend" />
            </div>
            <Textarea label="Notes" name="notes" placeholder="Any relevant notes…" />

            {/* ── Card section ──────────────────────────────────── */}
            <div className="border-t border-dashed border-[var(--border)] pt-4">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Card Assignment</p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setCardMode("auto")}
                  className={`rounded-xl border-2 py-3 px-3 text-left transition ${
                    cardMode === "auto"
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <p className="font-bold text-sm flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Auto-generate
                  </p>
                  <p className="text-[11px] mt-0.5 opacity-70">Create a brand-new card code</p>
                </button>
                <button
                  type="button"
                  onClick={() => setCardMode("preprinted")}
                  className={`rounded-xl border-2 py-3 px-3 text-left transition ${
                    cardMode === "preprinted"
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <p className="font-bold text-sm flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a2.25 2.25 0 003.182 0l4.318-4.318a2.25 2.25 0 000-3.182L11.16 3.659A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                    Pre-printed card
                  </p>
                  <p className="text-[11px] mt-0.5 opacity-70">Enter the ID from a physical card</p>
                </button>
              </div>

              {cardMode === "preprinted" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Card Code (from physical card)
                  </label>
                  <input
                    type="text"
                    value={preCardCode}
                    onChange={(e) => setPreCardCode(e.target.value)}
                    placeholder="AQA-000001"
                    className={`w-full rounded-xl border-2 px-4 py-2.5 text-sm font-mono focus:outline-none transition uppercase ${
                      cardLookupStatus === "ok"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : cardLookupStatus === "error"
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-slate-300 focus:border-blue-500 bg-[var(--surface)] text-[var(--foreground)]"
                    }`}
                  />
                    <p className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${
                      cardLookupStatus === "ok" ? "text-emerald-600" : "text-red-500"
                    }`}>
                      {cardLookupStatus === "ok" ? (
                        <svg className="h-3.5 w-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {cardLookupMsg}
                    </p>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Generate cards from{" "}
                    <Link href="/admin/print" className="text-blue-600 hover:underline font-semibold">
                      Print QR page
                    </Link>{" "}
                    first, then enter the code printed on the sticker.
                  </p>
                </div>
              )}

              {cardMode === "auto" && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500">
                  A new unique card code (e.g. <code className="font-mono font-bold">AQA-4F2K9</code>) will be generated automatically.
                </div>
              )}
            </div>

            {/* Package */}
            <div className="border-t border-dashed border-[var(--border)] pt-4">
              <Select label="Initial package (optional)" name="packageId" defaultValue="">
                <option value="">No package yet — add credits later</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} — pay for {pkg.creditAmount}, get {pkg.totalCredits} activities — {pkg.price.toLocaleString()} DA {pkg.name.toLowerCase() === "value" ? " (Recommended)" : ""}
                  </option>
                ))}
              </Select>
            </div>

            {error ? <Alert tone="danger">{error}</Alert> : null}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading}>
                Create client & {cardMode === "preprinted" ? "link card" : "issue card"}
              </Button>
              <Link href="/admin/clients">
                <Button variant="secondary" type="button">Cancel</Button>
              </Link>
            </div>
          </form>
        </Card>

        {/* Info panel */}
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold">What happens next?</h3>
            <ul className="space-y-2.5 text-sm text-[var(--muted)]">
              {[
                {
                  icon: (
                    <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  ),
                  text: "Client profile created in the system"
                },
                {
                  icon: (
                    <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                  ),
                  text: cardMode === "preprinted" ? "Pre-printed card linked to client" : "New card issued with unique QR code"
                },
                {
                  icon: (
                    <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  text: "Credits added if you select a package"
                },
                {
                  icon: (
                    <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  ),
                  text: "Public balance URL generated for scanning"
                },
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </Card>

          {packages.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold">Available packages</h3>
              <ul className="space-y-2">
                {packages.map((pkg) => (
                  <li key={pkg.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      {pkg.name}
                      {pkg.name.toLowerCase() === "value" && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">Recommended</span>
                      )}
                    </span>
                    <span className="font-semibold text-[var(--primary)]">{pkg.totalCredits} credits</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <h3 className="mb-2 text-sm font-semibold flex items-center gap-1.5">
              <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a2.25 2.25 0 003.182 0l4.318-4.318a2.25 2.25 0 000-3.182L11.16 3.659A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              Pre-printed cards
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              Print a batch of blank QR stickers from the Print page, distribute them to clients physically, then link each sticker to a client here.
            </p>
            <Link href="/admin/print">
              <Button variant="secondary" className="w-full text-sm">Go to Print QR page →</Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
