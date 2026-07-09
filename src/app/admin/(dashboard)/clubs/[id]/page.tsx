"use client";

import { use, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, PageHeader, Input, Alert, Badge } from "@/components/admin/ui";
import QRCode from "qrcode";

type ClubSession = {
  id: string;
  sessionDate: string;
  location: string | null;
  activity: { id: string; name: string };
};

type ClubDetail = {
  id: string;
  name: string;
  logoUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  terminalToken: string;
  isActive: boolean;
  sessions: ClubSession[];
  _count: { checkIns: number };
};

type CheckInHistory = {
  id: string;
  scannedAt: string;
  client: {
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  activity: {
    name: string;
  };
  session: {
    sessionDate: string;
    location: string | null;
  } | null;
};

export default function ClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [qrUrl, setQrUrl] = useState("");

  // Filters
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  async function loadClubDetails() {
    try {
      const res = await fetch(`/api/admin/clubs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setClub(data);
      } else {
        setMessage({ text: "Failed to load club details.", tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Failed to load club details.", tone: "danger" });
    }
  }

  async function loadCheckIns() {
    try {
      const url = `/api/admin/clubs/${id}/checkins${
        selectedActivityId ? `?activityId=${selectedActivityId}` : ""
      }`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCheckIns(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    Promise.all([loadClubDetails(), loadCheckIns()]).finally(() => setLoading(false));
    localStorage.setItem("aqa_last_viewed_clubs_time", new Date().toISOString());
  }, [id]);

  useEffect(() => {
    loadCheckIns();
  }, [selectedActivityId]);

  useEffect(() => {
    if (club?.terminalToken) {
      const url = `${window.location.origin}/checkin/${club.terminalToken}`;
      QRCode.toDataURL(url, { width: 200, margin: 1 })
        .then(setQrUrl)
        .catch(console.error);
    }
  }, [club?.terminalToken]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const logoUrl = formData.get("logoUrl") as string;
    const contactName = formData.get("contactName") as string;
    const contactEmail = formData.get("contactEmail") as string;
    const contactPhone = formData.get("contactPhone") as string;
    const isActive = formData.get("isActive") === "true";

    try {
      const res = await fetch(`/api/admin/clubs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          logoUrl: logoUrl.trim() || null,
          contactName: contactName.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          isActive,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setClub((prev) => (prev ? { ...prev, ...updated } : null));
        setMessage({ text: "Club details updated successfully.", tone: "success" });
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to save changes.", tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "An error occurred while saving.", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this partner club? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/clubs/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/admin/clubs");
        router.refresh();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to delete club.", tone: "danger" });
        setDeleting(false);
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "An error occurred while deleting.", tone: "danger" });
      setDeleting(false);
    }
  }

  function handleCopyUrl() {
    if (!club) return;
    const url = `${window.location.origin}/checkin/${club.terminalToken}`;
    navigator.clipboard.writeText(url);
    setMessage({ text: "Terminal URL copied to clipboard.", tone: "success" });
  }

  function exportCSV() {
    if (checkIns.length === 0) return;
    const rows = [
      ["Date", "Client", "Client Email", "Client Phone", "Activity", "Session Date", "Location"],
      ...checkIns.map((ci) => [
        new Date(ci.scannedAt).toISOString(),
        ci.client.fullName,
        ci.client.email ?? "",
        ci.client.phone ?? "",
        ci.activity.name,
        ci.session ? new Date(ci.session.sessionDate).toLocaleDateString() : "",
        ci.session?.location ?? "",
      ]),
    ];
    const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `club-${club?.name.toLowerCase().replace(/\s+/g, "-")}-checkins.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredCheckIns = checkIns.filter(
    (ci) =>
      !searchFilter ||
      ci.client.fullName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      ci.activity.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (loading) {
    return <div className="h-96 rounded-xl bg-slate-50 border animate-pulse" />;
  }

  if (!club) {
    return (
      <Card className="py-12 text-center">
        <p className="text-sm font-semibold text-slate-700">Club not found</p>
        <Link href="/admin/clubs" className="mt-4 inline-block">
          <Button size="sm">Back to Clubs</Button>
        </Link>
      </Card>
    );
  }

  const terminalUrl = `${window.location.origin}/checkin/${club.terminalToken}`;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={club.name}
        description="Edit partner details, retrieve terminal QR codes, and view check-in audits."
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: edit form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-base font-bold mb-4">Edit Club Information</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Club Name"
                name="name"
                defaultValue={club.name}
                required
              />

              <Input
                label="Club Logo URL"
                name="logoUrl"
                defaultValue={club.logoUrl || ""}
                placeholder="e.g. https://example.com/logo.png"
              />

              <Input
                label="Contact Name"
                name="contactName"
                defaultValue={club.contactName || ""}
                placeholder="Name of primary contact"
              />

              <Input
                label="Contact Email"
                name="contactEmail"
                type="email"
                defaultValue={club.contactEmail || ""}
                placeholder="Email address"
              />

              <Input
                label="Contact Phone"
                name="contactPhone"
                defaultValue={club.contactPhone || ""}
                placeholder="Phone number"
              />

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Status
                </label>
                <select
                  name="isActive"
                  defaultValue={club.isActive ? "true" : "false"}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none text-[var(--foreground)]"
                >
                  <option value="true">Active (Terminal Enabled)</option>
                  <option value="false">Inactive (Terminal Disabled)</option>
                </select>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                >
                  Delete Club
                </Button>
                <div className="flex gap-3">
                  <Link href="/admin/clubs">
                    <Button type="button" variant="secondary" disabled={saving || deleting}>
                      Back
                    </Button>
                  </Link>
                  <Button type="submit" loading={saving} disabled={deleting}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </Card>

          {/* Check-In History */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold">Attendance Check-in History</h3>
                <p className="text-xs text-[var(--muted)]">All scans registered by this club.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportCSV}
                disabled={checkIns.length === 0}
              >
                Export CSV
              </Button>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Filter by client name..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
              <div className="w-52">
                <select
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  className="w-full h-[38px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none text-[var(--foreground)]"
                >
                  <option value="">All Activities</option>
                  {Array.from(
                    new Map(club.sessions.map((s) => [s.activity.id, s.activity])).values()
                  ).map((act) => (
                    <option key={act.id} value={act.id}>
                      {act.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredCheckIns.length === 0 ? (
              <div className="py-12 text-center border rounded-xl border-dashed border-[var(--border)]">
                <p className="text-xs text-[var(--muted)]">No check-in history found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <table className="w-full border-collapse text-left text-sm text-[var(--foreground)]">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-slate-50/50 font-semibold text-[var(--muted)]">
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3">Session Date</th>
                      <th className="px-4 py-3">Checked In At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredCheckIns.map((ci) => (
                      <tr key={ci.id} className="hover:bg-slate-50/30">
                        <td className="px-4 py-3 font-semibold">{ci.client.fullName}</td>
                        <td className="px-4 py-3">{ci.activity.name}</td>
                        <td className="px-4 py-3 text-xs">
                          {ci.session
                            ? new Date(ci.session.sessionDate).toLocaleDateString()
                            : "General"}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums">
                          {new Date(ci.scannedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right column: terminal access info */}
        <div className="space-y-6">
          <Card className="text-center">
            <h3 className="text-base font-bold mb-2">Club Terminal Access</h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              Place this QR code at the desk or share the URL with the club representative. Scanning grants access to check-ins without password requirements.
            </p>

            {club.logoUrl && (
              <div className="mb-4 flex justify-center">
                <img src={club.logoUrl} alt={`${club.name} Logo`} className="h-16 w-16 object-contain rounded-lg border border-[var(--border)] p-1 bg-white" />
              </div>
            )}

            {qrUrl ? (
              <div className="inline-block p-3 bg-white border border-[var(--border)] rounded-2xl shadow-sm mb-4">
                <img src={qrUrl} alt="Terminal QR Code" className="mx-auto" />
              </div>
            ) : (
              <div className="h-[200px] w-[200px] mx-auto bg-slate-100 rounded-2xl mb-4 animate-pulse" />
            )}

            <div className="space-y-2">
              <button
                onClick={handleCopyUrl}
                className="w-full py-2.5 px-4 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-2)] text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy URL
              </button>
              <a
                href={terminalUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full py-2.5 px-4 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-sm font-semibold rounded-xl transition text-center"
              >
                Open Terminal
              </a>
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-bold mb-3">Linked Events</h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              Upcoming scheduled sessions assigned to this club.
            </p>

            {club.sessions.length === 0 ? (
              <div className="py-6 text-center border border-dashed rounded-xl border-[var(--border)]">
                <p className="text-xs text-[var(--muted)]">No active sessions linked.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {club.sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg border border-[var(--border)] bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-xs block">{s.activity.name}</span>
                      <span className="text-[10px] text-[var(--muted)]">
                        {new Date(s.sessionDate).toLocaleDateString()} {s.location ? `at ${s.location}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
