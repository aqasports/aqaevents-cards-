"use client";

import { FormEvent, useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Alert, Button, Card, Input, PageHeader } from "@/components/admin/ui";

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";

  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"account" | "audit">("account");

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

    if (newPassword.length < 12) {
      setMessage({ text: "New password must be at least 12 characters.", tone: "danger" });
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
                <Input label="New password" name="newPassword" type="password" autoComplete="new-password" hint="Minimum 12 characters." required />
                <Input label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
                <Button type="submit" loading={saving}>Update password</Button>
              </form>
            </Card>
          </div>
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

    </div>
  );
}
