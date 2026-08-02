"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  billingAddress: string | null;
  nif: string | null;
  nis: string | null;
  rc: string | null;
  defaultPaymentTermDays: number | null;
  users: Array<{ id: string; email: string; role: string; active: boolean }>;
}

export const dynamic = "force-dynamic";

export default function PortalSettingsPage() {
  const sessionRes = useSession();
  const session = sessionRes?.data;
  const role = session?.user?.role || "VIEWER";
  const isOwner = role === "OWNER";

  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Form fields
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [nif, setNif] = useState("");
  const [nis, setNis] = useState("");
  const [rc, setRc] = useState("");
  const [saving, setSaving] = useState(false);

  // Add Portal User Modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("HR_MANAGER");
  const [userPassword, setUserPassword] = useState("");
  const [sendMagicLink, setSendMagicLink] = useState(true);
  const [addingUser, setAddingUser] = useState(false);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/settings");
      if (res.ok) {
        const data = await res.json();
        setOrg(data);
        setContactName(data.contactName || "");
        setContactEmail(data.contactEmail || "");
        setContactPhone(data.contactPhone || "");
        setBillingAddress(data.billingAddress || "");
        setNif(data.nif || "");
        setNis(data.nis || "");
        setRc(data.rc || "");
      }
    } catch {
      setMessage("Failed to load organization settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName,
          contactEmail,
          contactPhone,
          billingAddress,
          nif,
          nis,
          rc,
        }),
      });

      if (res.ok) {
        setMessage("Organization contact & tax details updated successfully.");
        await loadSettings();
      } else {
        const data = await res.json();
        setMessage(`Update failed: ${data.error}`);
      }
    } catch {
      setMessage("Network error saving settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setAddingUser(true);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          role: userRole,
          password: userPassword || undefined,
          sendMagicLink,
        }),
      });

      if (res.ok) {
        setMessage("Portal user created successfully.");
        setShowUserModal(false);
        setUserEmail("");
        setUserPassword("");
        await loadSettings();
      } else {
        const data = await res.json();
        setMessage(`Failed to add user: ${data.error}`);
      }
    } catch {
      setMessage("Network error adding portal user.");
    } finally {
      setAddingUser(false);
    }
  }

  async function handleUpdateUserRole(userId: string, newRole: string) {
    if (!isOwner) return;
    try {
      const res = await fetch("/api/portal/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        setMessage("User role updated.");
        await loadSettings();
      }
    } catch {
      setMessage("Failed to update user role.");
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <h1 className="text-xl font-bold text-white">Organization Profile & User Roles</h1>
        <p className="text-xs text-slate-400 mt-1">
          {isOwner
            ? "Manage organization profile, billing tax identifiers, and portal access permissions."
            : "View organization profile and contact information (Read-Only for non-owners)."}
        </p>
      </div>

      {message && (
        <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 text-xs font-medium">
          {message}
        </div>
      )}

      {/* Org Info Form */}
      <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white">Company Information & Legal Tax IDs</h3>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-400">Contact Person Name</label>
              <input
                type="text"
                disabled={!isOwner}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Contact Email</label>
              <input
                type="email"
                disabled={!isOwner}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Contact Phone</label>
              <input
                type="text"
                disabled={!isOwner}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Billing Address</label>
              <input
                type="text"
                disabled={!isOwner}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h4 className="text-[11px] uppercase font-bold text-sky-400">Algerian Tax / Trade Identifiers (NIF / NIS / RC)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-slate-400">NIF (Identifiant Fiscal)</label>
                <input
                  type="text"
                  disabled={!isOwner}
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  placeholder="000000000000000"
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono outline-none focus:border-sky-500 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">NIS (Identifiant Statistique)</label>
                <input
                  type="text"
                  disabled={!isOwner}
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="00000000000000"
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono outline-none focus:border-sky-500 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">RC (Registre du Commerce)</label>
                <input
                  type="text"
                  disabled={!isOwner}
                  value={rc}
                  onChange={(e) => setRc(e.target.value)}
                  placeholder="00/00-0000000B00"
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono outline-none focus:border-sky-500 disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {isOwner && (
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              {saving ? "Saving..." : "Save Profile Settings"}
            </button>
          )}
        </form>
      </div>

      {/* Portal Users Management (OWNER Only) */}
      {isOwner && (
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Portal User Accounts & Roles</h3>
              <p className="text-xs text-slate-400">Manage portal access roles (OWNER, HR_MANAGER, FINANCE, VIEWER)</p>
            </div>
            <button
              type="button"
              onClick={() => setShowUserModal(true)}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl"
            >
              Add Portal User
            </button>
          </div>

          <div className="space-y-2">
            {org?.users.map((u) => (
              <div key={u.id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white">{u.email}</span>
                  <div className="text-[11px] text-slate-500">Status: {u.active ? "Active" : "Inactive"}</div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                    className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs outline-none"
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="HR_MANAGER">HR_MANAGER</option>
                    <option value="FINANCE">FINANCE</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Portal User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-md p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add Portal User Account</h3>
            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">User Email</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Portal Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none"
                >
                  <option value="OWNER">OWNER (Full org access + billing)</option>
                  <option value="HR_MANAGER">HR_MANAGER (Manage employees & allocations)</option>
                  <option value="FINANCE">FINANCE (View invoices & reports)</option>
                  <option value="VIEWER">VIEWER (Read-only reports)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Password (Optional if sending magic token)</label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={sendMagicLink}
                  onChange={(e) => setSendMagicLink(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 text-sky-500"
                />
                <span>Generate active magic link token</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl"
                >
                  {addingUser ? "Adding..." : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
