"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  EmptyState,
  ConfirmModal,
} from "@/components/admin/ui";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { redemptions: number; ledgerEntries: number };
};

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" | "info" } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  // Confirm Modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, isDanger = false) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm, isDanger });
  };

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers([]);
        setMessage({ text: data?.error || "Failed to load users.", tone: "danger" });
      }
    } catch {
      setUsers([]);
      setMessage({ text: "Failed to load users.", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role"),
      }),
    });

    setSubmitting(false);
    const data = await res.json();

    if (res.ok) {
      setMessage({ text: `Staff account created for ${data.name}.`, tone: "success" });
      (event.target as HTMLFormElement).reset();
      await loadUsers();
    } else {
      setMessage({ text: data.error ?? "Failed to create user.", tone: "danger" });
    }
  }

  async function deleteUser(user: StaffUser) {
    triggerConfirm(
      "Remove Staff User",
      `Remove ${user.name} (${user.email})? This cannot be undone.`,
      async () => {
        setDeleting(user.id);
        const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
        setDeleting(null);
        const data = await res.json();
        if (res.ok) {
          setMessage({ text: `${user.name}'s account has been removed.`, tone: "success" });
          await loadUsers();
        } else {
          setMessage({ text: data.error ?? "Failed to remove user.", tone: "danger" });
        }
      },
      true // isDanger
    );
  }

  async function changeRole(user: StaffUser, role: string) {
    setChangingRoleId(user.id);
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      await loadUsers();
    } finally {
      setChangingRoleId(null);
    }
  }

  if (forbidden) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Staff users" description="Manage admin accounts and roles." />
        <Card className="max-w-md">
          <EmptyState
            title="Access restricted"
            description="Only super admins can manage staff accounts. Contact your administrator."
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Staff users"
        description="Create and manage admin accounts. Only super admins can access this page."
      />

      {message && (
        <div className="mb-6">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Create form */}
        <Card>
          <h3 className="mb-4 text-base font-semibold">Add staff account</h3>
          <form onSubmit={createUser} className="space-y-4">
            <Input
              label="Full name"
              name="name"
              placeholder="e.g. Youssef Idrissi"
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="e.g. youssef@aqasports.com"
              required
            />
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Min 6 characters"
              required
            />
            <Select label="Role" name="role" defaultValue="staff">
              <option value="staff">Staff — can redeem and view clients</option>
              <option value="super_admin">Super admin — full access</option>
            </Select>
            <Button type="submit" className="w-full" loading={submitting}>
              Create account
            </Button>
          </form>
        </Card>

        {/* Users list */}
        <Card padding={false}>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="text-base font-semibold">
              All staff {!loading && `(${users.length})`}
            </h3>
          </div>

          {loading ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
              <p className="text-sm text-[var(--muted)]">Loading users…</p>
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="No staff accounts yet"
              description="Create the first staff account above."
            />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {users.map((user) => {
                const isSelf = user.id === session?.user?.id;
                return (
                  <li
                    key={user.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{user.name}</p>
                        {isSelf && (
                          <Badge tone="primary" size="sm">You</Badge>
                        )}
                        <Badge
                          tone={user.role === "super_admin" ? "warning" : "default"}
                          size="sm"
                        >
                          {user.role === "super_admin" ? "Super admin" : "Staff"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{user.email}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        Joined {new Date(user.createdAt).toLocaleDateString()} ·{" "}
                        {user._count.redemptions} redemptions ·{" "}
                        {user._count.ledgerEntries} credits issued
                      </p>
                    </div>

                    {!isSelf && (
                      <div className="flex shrink-0 items-center gap-2">
                        {/* Quick role toggle */}
                        <Select
                          defaultValue={user.role}
                          onChange={(e) => changeRole(user, e.target.value)}
                          className="h-8 text-xs"
                          disabled={changingRoleId === user.id || deleting === user.id}
                        >
                          <option value="staff">Staff</option>
                          <option value="super_admin">Super admin</option>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={deleting === user.id}
                          disabled={changingRoleId === user.id}
                          onClick={() => deleteUser(user)}
                          className="text-[var(--danger)] hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
        onConfirm={() => {
          confirmConfig.onConfirm();
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
