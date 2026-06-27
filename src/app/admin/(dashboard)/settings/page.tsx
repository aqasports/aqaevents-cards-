"use client";

import { FormEvent, useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Alert, Button, Card, Input, PageHeader } from "@/components/admin/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type Scope = {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  what: string[];
  keeps: string[];
  severity: "medium" | "high" | "critical";
};

// ─── Erase Scopes Config ──────────────────────────────────────────────────────

const SCOPES: Scope[] = [
  {
    key: "invoices",
    label: "Clear Invoices",
    description: "Delete all invoice records. Credit balances and ledger history remain untouched.",
    icon: (
      <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    what: ["All invoice records"],
    keeps: ["Clients & cards", "Credit ledger", "Redemptions", "Activities"],
    severity: "medium",
  },
  {
    key: "transactions",
    label: "Clear Transactions & Invoices",
    description: "Erase all credit/debit ledger entries and all invoices. Client accounts stay but balances reset to 0.",
    icon: (
      <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    what: ["All ledger entries (credits & debits)", "All invoices"],
    keeps: ["Clients & cards", "Activities", "Sessions", "Redemptions"],
    severity: "high",
  },
  {
    key: "redemptions",
    label: "Clear Redemptions",
    description: "Remove all activity redemption records (booking history). Credits already deducted are NOT refunded.",
    icon: (
      <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3c0-.621-.504-1.125-1.125-1.125H3.375zM3 16.5A1.5 1.5 0 004.5 18h15a1.5 1.5 0 001.5-1.5v-3a1.5 1.5 0 00-1.5-1.5H4.5A1.5 1.5 0 003 15v1.5z" />
      </svg>
    ),
    what: ["All redemption records"],
    keeps: ["Clients & balances", "Invoices", "Activities", "Sessions"],
    severity: "medium",
  },
  {
    key: "sessions",
    label: "Clear Scheduled Sessions",
    description: "Remove all scheduled activity event sessions.",
    icon: (
      <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    what: ["All activity sessions"],
    keeps: ["Clients", "Activities config", "Redemptions history"],
    severity: "medium",
  },
  {
    key: "expenses",
    label: "Clear Activity Expenses",
    description: "Delete all expense records attached to activities.",
    icon: (
      <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    what: ["All expense records"],
    keeps: ["Everything else"],
    severity: "medium",
  },
  {
    key: "clients",
    label: "Clear All Clients",
    description: "Permanently delete every client, their cards, credit history, redemptions and invoices.",
    icon: (
      <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0112 20.25c-1.005 0-1.97-.13-2.873-.37l-1.57 1.57a1.024 1.024 0 01-1.448-1.448l1.57-1.57A11.3 11.3 0 016 16.128v-.11c0-.462.036-.915.109-1.357L4.56 13.11a1.024 1.024 0 011.448-1.448l1.55 1.55c.677-.852 1.517-1.583 2.472-2.133a4.125 4.125 0 116.732 3.12 9.374 9.374 0 00-2.472 2.133L15 19.128z" />
      </svg>
    ),
    what: ["All clients", "All cards", "All ledger entries", "All redemptions", "All invoices"],
    keeps: ["Activities", "Packages", "Admin users"],
    severity: "critical",
  },
  {
    key: "all_operational",
    label: "FULL OPERATIONAL RESET",
    description: "Wipe ALL transactional data. Your system will be completely clean and ready for real usage. Admin users, packages, and activities configuration are preserved.",
    icon: (
      <svg className="h-6 w-6 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
    what: [
      "All clients & cards",
      "All credit/debit ledger entries",
      "All invoices",
      "All redemptions",
      "All activity sessions",
      "All activity expenses",
    ],
    keeps: ["Admin user accounts", "Package configurations", "Activity definitions (name, price, etc.)"],
    severity: "critical",
  },
];

const SEVERITY_STYLES = {
  medium: {
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    btn: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  high: {
    card: "border-orange-200 bg-orange-50",
    badge: "bg-orange-100 text-orange-700",
    btn: "bg-orange-600 hover:bg-orange-700 text-white",
  },
  critical: {
    card: "border-red-300 bg-red-50",
    badge: "bg-red-100 text-red-700",
    btn: "bg-red-700 hover:bg-red-800 text-white",
  },
};

// ─── Erase Modal ──────────────────────────────────────────────────────────────

function EraseModal({
  scope,
  onClose,
  onDone,
}: {
  scope: Scope;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [phrase, setPhrase] = useState("");
  const [erasing, setErasing] = useState(false);
  const [error, setError] = useState("");
  const REQUIRED = "ERASE ALL DATA";
  const match = phrase === REQUIRED;

  async function handleErase() {
    if (!match) return;
    setErasing(true);
    setError("");
    try {
      const res = await fetch("/api/admin/data-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: scope.key, confirm: phrase }),
      });
      const data = await res.json();
      if (res.ok) {
        onDone(data.message ?? "Data erased successfully.");
        onClose();
      } else {
        setError(data.error ?? "An error occurred.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setErasing(false);
    }
  }

  const styles = SEVERITY_STYLES[scope.severity];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border-2 border-red-200">
        {/* Header */}
        <div className="flex items-start gap-3 p-6 border-b border-slate-200">
          <div className="mt-0.5">{scope.icon}</div>
          <div>
            <h3 className="font-black text-slate-900 text-lg">{scope.label}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{scope.description}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* What will be deleted */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-red-700 mb-2 flex items-center gap-1.5">
              <svg className="h-4 w-4 text-red-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Will be permanently deleted
            </p>
            <ul className="space-y-1">
              {scope.what.map((item) => (
                <li key={item} className="text-sm text-red-800 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* What is kept */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700 mb-2 flex items-center gap-1.5">
              <svg className="h-4 w-4 text-emerald-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Will be kept
            </p>
            <ul className="space-y-1">
              {scope.keeps.map((item) => (
                <li key={item} className="text-sm text-emerald-800 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Confirmation phrase */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Type <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-red-700">{REQUIRED}</span> to confirm
            </label>
            <input
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={REQUIRED}
              className={`w-full rounded-xl border-2 px-4 py-3 text-sm font-mono focus:outline-none transition ${
                phrase === "" ? "border-slate-300 bg-[var(--surface)] text-[var(--foreground)]" :
                match ? "border-emerald-500 bg-emerald-50 text-emerald-800" :
                "border-red-300 bg-red-50 text-red-700"
              }`}
            />
            {phrase && !match && (
              <p className="text-xs text-red-500 mt-1.5">
                Phrase does not match — must be exactly: {REQUIRED}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={erasing}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleErase}
              disabled={!match || erasing}
              className={`flex-1 rounded-xl py-3 text-sm font-black transition disabled:opacity-40 disabled:cursor-not-allowed ${styles.btn}`}
            >
              {erasing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Erasing…
                </span>
              ) : (
                "Confirm & Erase Permanently"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";

  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedScope, setSelectedScope] = useState<Scope | null>(null);
  const [dangerUnlocked, setDangerUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<"account" | "erasure" | "audit">("account");

  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const fetchLogs = async () => {
    setLoadingLogs(true);
    setLogsError("");
    try {
      const res = await fetch("/api/admin/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        setFilteredLogs(data);
        setFilterAction(""); // Reset filter on refresh
      } else {
        const data = await res.json();
        setLogsError(data.error ?? "Failed to load audit logs.");
      }
    } catch {
      setLogsError("Network error. Failed to load audit logs.");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "audit" && isSuperAdmin) {
      fetchLogs();
    }
  }, [activeTab, isSuperAdmin]);

  const handleFilterChange = (action: string) => {
    setFilterAction(action);
    if (!action) {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(logs.filter((log) => log.action === action));
    }
  };

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get("newPassword") as string;
    const confirm = formData.get("confirm") as string;

    if (newPassword !== confirm) {
      setMessage({ text: "New passwords do not match.", tone: "danger" });
      setSaving(false);
      return;
    }

    const res = await fetch("/api/admin/users/me/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: formData.get("currentPassword"),
        newPassword,
      }),
    });

    setSaving(false);
    const data = await res.json();

    if (res.ok) {
      setMessage({ text: "Password updated successfully.", tone: "success" });
      (event.target as HTMLFormElement).reset();
    } else {
      setMessage({ text: data.error ?? "Failed to update password.", tone: "danger" });
    }
  }

  const getActionColor = (action: string) => {
    if (action.startsWith("CREATE_")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (action.startsWith("DELETE_") || action === "RESET_DATA") return "bg-rose-50 text-rose-700 border-rose-200";
    if (action.startsWith("UPDATE_") || action.startsWith("EDIT_")) return "bg-sky-50 text-sky-700 border-sky-200";
    if (action.startsWith("ARCHIVE_")) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account, preferences, and data management tools."
      />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("account")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors ${
              activeTab === "account"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Account Settings
          </button>
          {isSuperAdmin && (
            <>
              <button
                onClick={() => setActiveTab("erasure")}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors ${
                  activeTab === "erasure"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Data Erasure
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors ${
                  activeTab === "audit"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                System Audit Logs
              </button>
            </>
          )}
        </nav>
      </div>

      {message && (
        <Alert tone={message.tone}>{message.text}</Alert>
      )}

      {/* Account Tab */}
      {activeTab === "account" && (
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Account</h2>
          <div className="grid gap-6 lg:grid-cols-2 max-w-3xl">
            {/* Profile info */}
            <Card>
              <h3 className="mb-4 text-base font-semibold">Your account</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Name</dt>
                  <dd className="mt-0.5 font-medium">{session?.user?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Email</dt>
                  <dd className="mt-0.5">{session?.user?.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Role</dt>
                  <dd className="mt-0.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isSuperAdmin ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {isSuperAdmin ? (
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3 text-purple-700 fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                          <span>Super Admin</span>
                        </span>
                      ) : (
                        "Staff"
                      )}
                    </span>
                  </dd>
                </div>
              </dl>
              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <Button
                  variant="ghost"
                  className="text-[var(--danger)] hover:bg-red-50 w-full justify-center"
                  onClick={() => signOut({ callbackUrl: "/admin/login" })}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </Button>
              </div>
            </Card>

            {/* Change password */}
            <Card>
              <h3 className="mb-4 text-base font-semibold">Change password</h3>
              <form onSubmit={changePassword} className="space-y-4">
                <Input label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
                <Input label="New password" name="newPassword" type="password" autoComplete="new-password" hint="Minimum 6 characters." required />
                <Input label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
                <Button type="submit" loading={saving}>Update password</Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Data Erasure Tab */}
      {activeTab === "erasure" && isSuperAdmin && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-red-400 flex items-center gap-1.5">
              <svg className="h-4 w-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Data Erasure
            </h2>
          </div>

          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-600 shrink-0">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="font-black text-red-800 text-base">Danger Zone — Irreversible Actions</p>
                <p className="text-sm text-red-600 mt-1">
                  These operations permanently delete data from the database with no recovery option.
                  Use this section to clean test/demo data before going live with real clients.
                  All actions require typing a confirmation phrase.
                </p>
                {!dangerUnlocked && (
                  <button
                    onClick={() => setDangerUnlocked(true)}
                    className="mt-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 transition"
                  >
                    I understand — Unlock Erasure Tools
                  </button>
                )}
              </div>
            </div>
          </div>

          {dangerUnlocked && (
            <div className="space-y-4">
              {/* Scoped erasure grid */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {SCOPES.filter((s) => s.key !== "all_operational").map((scope) => {
                  const styles = SEVERITY_STYLES[scope.severity];
                  return (
                    <div
                      key={scope.key}
                      className={`rounded-2xl border-2 p-4 flex flex-col gap-3 ${styles.card}`}
                    >
                      <div className="flex items-center gap-2.5">
                        {scope.icon}
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{scope.label}</p>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${styles.badge}`}>
                            {scope.severity}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 flex-1">{scope.description}</p>
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <p className="font-bold text-red-600">Deletes: {scope.what.slice(0, 2).join(", ")}{scope.what.length > 2 ? ` +${scope.what.length - 2} more` : ""}</p>
                      </div>
                      <button
                        onClick={() => setSelectedScope(scope)}
                        className={`w-full rounded-xl py-2 text-xs font-black transition flex items-center justify-center gap-1.5 ${styles.btn}`}
                      >
                        <span>Erase</span>
                        {scope.icon}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Full nuclear option */}
              {(() => {
                const nuclear = SCOPES.find((s) => s.key === "all_operational")!;
                return (
                  <div className="rounded-2xl border-2 border-red-400 bg-gradient-to-r from-red-50 to-orange-50 p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="rounded-full bg-red-100 p-2.5 text-red-600 shrink-0">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-red-900 text-lg">{nuclear.label}</p>
                        <p className="text-sm text-red-700 mt-1 max-w-2xl">{nuclear.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {nuclear.keeps.map((k) => (
                            <span key={k} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5">
                              <svg className="h-3 w-3 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedScope(nuclear)}
                        className="shrink-0 rounded-xl border-2 border-red-700 bg-red-700 hover:bg-red-800 text-white font-black px-6 py-3 text-sm transition shadow-lg shadow-red-200 flex items-center gap-2"
                      >
                        <span>Full Reset</span>
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <p className="text-xs text-slate-400 text-center pt-2">
                All erasures require typing <code className="bg-slate-100 px-1 rounded font-mono">ERASE ALL DATA</code> to confirm.
                These actions cannot be undone.
              </p>
            </div>
          )}
        </div>
      )}

      {/* System Audit Logs Tab */}
      {activeTab === "audit" && isSuperAdmin && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-indigo-500 mb-1">System Audit Logs</h2>
              <p className="text-sm text-slate-500">Track and review administrative actions performed on the platform.</p>
            </div>
            <button
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              <svg className={`h-4 w-4 text-slate-500 ${loadingLogs ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          {loadingLogs ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <svg className="h-8 w-8 animate-spin mb-3 text-slate-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-medium">Fetching audit logs...</p>
            </div>
          ) : logsError ? (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
              {logsError}
            </div>
          ) : logs.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <svg className="h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="font-semibold text-slate-700">No logs found</p>
                <p className="text-sm text-slate-400 mt-0.5">No administrative operations have been logged yet.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Filter By Action:</span>
                <select
                  value={filterAction}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="text-xs font-semibold rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none"
                >
                  <option value="">All Actions</option>
                  {Array.from(new Set(logs.map(l => l.action))).map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>

              {/* Timeline */}
              <div className="flow-root bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <ul className="-mb-8">
                  {filteredLogs.map((log, logIdx) => (
                    <li key={log.id}>
                      <div className="relative pb-8">
                        {logIdx !== filteredLogs.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                              log.action === "RESET_DATA" ? 'bg-red-100 text-red-600' :
                              log.action.startsWith("CREATE_") ? 'bg-emerald-100 text-emerald-600' :
                              log.action.startsWith("DELETE_") ? 'bg-red-100 text-red-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                {log.action === "RESET_DATA" ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                ) : log.action.startsWith("CREATE_") ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                )}
                              </svg>
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold border mr-2 ${getActionColor(log.action)}`}>
                                  {log.action}
                                </span>
                                {log.target}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                By <span className="font-bold text-slate-700">{log.user?.name ?? "System"}</span> ({log.user?.email ?? "system@aqasports.com"})
                                {log.ipAddress && <span className="ml-2 font-mono bg-slate-100 text-slate-600 rounded px-1 text-[10px]">IP: {log.ipAddress}</span>}
                              </p>
                              {log.details && (
                                <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-150 font-mono whitespace-pre-wrap">
                                  {log.details}
                                </div>
                              )}
                            </div>
                            <div className="text-right text-xs whitespace-nowrap text-slate-500 font-medium">
                              <time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString()}</time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Erase Modal */}
      {selectedScope && (
        <EraseModal
          scope={selectedScope}
          onClose={() => setSelectedScope(null)}
          onDone={(msg) => setMessage({ text: msg, tone: "success" })}
        />
      )}
    </div>
  );
}
