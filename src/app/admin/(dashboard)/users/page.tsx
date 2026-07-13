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
  Textarea,
} from "@/components/admin/ui";

// Client-side TypeScript interfaces
interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { redemptions: number; ledgerEntries: number };
}

interface Coach {
  id: string;
  name: string;
  type: "coach" | "staff";
  email: string;
  phone: string;
  baseRate: number; // DA per session
  bonusPerAttendee: number; // DA per attendee
  notes: string;
  createdAt: string;
}

interface CoachAssignment {
  id: string;
  coachId: string;
  sessionId: string; // references ActivitySession.id
  createdAt: string;
}

interface CoachPayoutSession {
  sessionId: string;
  activityName: string;
  sessionDate: string;
  location: string;
  attendees: number;
  baseRate: number;
  bonusPerAttendee: number;
  totalPay: number;
}

interface CoachPayout {
  id: string;
  coachId: string;
  coachName: string;
  coachEmail: string;
  coachPhone: string;
  invoiceCode: string; // e.g. PAY-COACH-1689230
  startDate: string;
  endDate: string;
  sessions: CoachPayoutSession[];
  totalAmount: number;
  status: "paid" | "unpaid";
  notes?: string;
  createdAt: string;
  paidAt?: string;
}

interface DatabaseSession {
  id: string;
  sessionDate: string;
  location: string | null;
  capacity: number | null;
  active: boolean;
  activity: {
    id: string;
    name: string;
  };
  redemptions: { id: string }[];
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"staff" | "coaches" | "reports" | "invoices">("staff");
  const [mounted, setMounted] = useState(false);

  // Original Staff Accounts state
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" | "info" } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  // Coach Adder state
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [assignments, setAssignments] = useState<CoachAssignment[]>([]);
  const [payouts, setPayouts] = useState<CoachPayout[]>([]);
  const [dbSessions, setDbSessions] = useState<DatabaseSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Search/Filters state
  const [coachSearch, setCoachSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  // Coach Form/Editor state
  const [editingCoachId, setEditingCoachId] = useState<string | null>(null);
  const [coachName, setCoachName] = useState("");
  const [coachType, setCoachType] = useState<"coach" | "staff">("coach");
  const [coachEmail, setCoachEmail] = useState("");
  const [coachPhone, setCoachPhone] = useState("");
  const [coachBaseRate, setCoachBaseRate] = useState("2000");
  const [coachBonusPerAttendee, setCoachBonusPerAttendee] = useState("150");
  const [coachNotes, setCoachNotes] = useState("");

  // Report state
  const [reportCoachId, setReportCoachId] = useState("");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportNotes, setReportNotes] = useState("");

  // Invoice view state
  const [selectedInvoice, setSelectedInvoice] = useState<CoachPayout | null>(null);

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

  // Original functions to load and manage staff accounts
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

  // Load database sessions to link to coaches
  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/admin/sessions?activeOnly=false");
      if (res.ok) {
        const data = await res.json();
        setDbSessions(data);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  }

  // Hydration sync and storage loads
  useEffect(() => {
    setMounted(true);
    
    // Load local storage states
    const savedCoaches = localStorage.getItem("aqa_coaches");
    if (savedCoaches) {
      try { setCoaches(JSON.parse(savedCoaches)); } catch (e) { console.error(e); }
    }
    
    const savedAssignments = localStorage.getItem("aqa_coach_assignments");
    if (savedAssignments) {
      try { setAssignments(JSON.parse(savedAssignments)); } catch (e) { console.error(e); }
    }
    
    const savedPayouts = localStorage.getItem("aqa_coach_payouts");
    if (savedPayouts) {
      try { setPayouts(JSON.parse(savedPayouts)); } catch (e) { console.error(e); }
    }

    loadUsers();
    loadSessions();
  }, []);

  // Save changes to local storage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("aqa_coaches", JSON.stringify(coaches));
    }
  }, [coaches, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("aqa_coach_assignments", JSON.stringify(assignments));
    }
  }, [assignments, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("aqa_coach_payouts", JSON.stringify(payouts));
    }
  }, [payouts, mounted]);

  // Original user account management handlers
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
      true
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

  // Coach and Salary manager handlers
  function handleCoachSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingCoachId) {
      setCoaches((prev) =>
        prev.map((c) => {
          if (c.id === editingCoachId) {
            return {
              ...c,
              name: coachName,
              type: coachType,
              email: coachEmail,
              phone: coachPhone,
              baseRate: Number(coachBaseRate) || 0,
              bonusPerAttendee: Number(coachBonusPerAttendee) || 0,
              notes: coachNotes,
            };
          }
          return c;
        })
      );
      setMessage({ text: `Updated ${coachName} successfully.`, tone: "success" });
      resetCoachForm();
    } else {
      const newCoach: Coach = {
        id: "coach_" + Math.random().toString(36).substr(2, 9),
        name: coachName,
        type: coachType,
        email: coachEmail,
        phone: coachPhone,
        baseRate: Number(coachBaseRate) || 0,
        bonusPerAttendee: Number(coachBonusPerAttendee) || 0,
        notes: coachNotes,
        createdAt: new Date().toISOString(),
      };

      setCoaches((prev) => [newCoach, ...prev]);
      setMessage({ text: `Added ${newCoach.name} successfully.`, tone: "success" });
      resetCoachForm();
    }
  }

  function resetCoachForm() {
    setEditingCoachId(null);
    setCoachName("");
    setCoachType("coach");
    setCoachEmail("");
    setCoachPhone("");
    setCoachBaseRate("2000");
    setCoachBonusPerAttendee("150");
    setCoachNotes("");
  }

  function startEditCoach(coach: Coach) {
    setEditingCoachId(coach.id);
    setCoachName(coach.name);
    setCoachType(coach.type);
    setCoachEmail(coach.email);
    setCoachPhone(coach.phone);
    setCoachBaseRate(coach.baseRate.toString());
    setCoachBonusPerAttendee(coach.bonusPerAttendee.toString());
    setCoachNotes(coach.notes);
  }

  function removeCoach(coach: Coach) {
    triggerConfirm(
      "Remove Coach/Staff Profile",
      `Are you sure you want to remove ${coach.name}? This will delete their profile and assignments, but historical invoices will remain intact.`,
      () => {
        setCoaches((prev) => prev.filter((c) => c.id !== coach.id));
        setAssignments((prev) => prev.filter((a) => a.coachId !== coach.id));
        setMessage({ text: `${coach.name} has been removed.`, tone: "success" });
      },
      true
    );
  }

  // Assignment handlers
  function linkSession(coachId: string, sessionId: string) {
    const isAlreadyLinked = assignments.some(
      (a) => a.coachId === coachId && a.sessionId === sessionId
    );
    if (isAlreadyLinked) {
      setMessage({ text: "This event session is already assigned to this coach.", tone: "danger" });
      return;
    }

    const newAssignment: CoachAssignment = {
      id: "assign_" + Math.random().toString(36).substr(2, 9),
      coachId,
      sessionId,
      createdAt: new Date().toISOString(),
    };

    setAssignments((prev) => [...prev, newAssignment]);
  }

  function unlinkSession(coachId: string, sessionId: string) {
    setAssignments((prev) =>
      prev.filter((a) => !(a.coachId === coachId && a.sessionId === sessionId))
    );
  }

  // Report calculations helper
  function getReportData() {
    if (!reportCoachId) return { coach: null, matchingSessions: [], totalSessions: 0, totalAttendees: 0, totalPayout: 0 };
    
    const coach = coaches.find((c) => c.id === reportCoachId);
    if (!coach) return { coach: null, matchingSessions: [], totalSessions: 0, totalAttendees: 0, totalPayout: 0 };

    // Get session assignments for this coach
    const coachSessionIds = assignments
      .filter((a) => a.coachId === coach.id)
      .map((a) => a.sessionId);

    // Filter dbSessions
    const coachSessions = dbSessions.filter((s) => coachSessionIds.includes(s.id));

    // Filter by dates
    const start = reportStartDate ? new Date(reportStartDate) : null;
    const end = reportEndDate ? new Date(reportEndDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const filtered = coachSessions.filter((s) => {
      const sDate = new Date(s.sessionDate);
      if (start && sDate < start) return false;
      if (end && sDate > end) return false;
      return true;
    });

    // Compute details
    let totalAttendees = 0;
    let totalPayout = 0;

    const matchingSessions = filtered.map((s) => {
      const attendees = s.redemptions.length;
      const basePay = coach.baseRate;
      const bonusPay = attendees * coach.bonusPerAttendee;
      const totalPay = basePay + bonusPay;

      totalAttendees += attendees;
      totalPayout += totalPay;

      return {
        sessionId: s.id,
        activityName: s.activity.name,
        sessionDate: s.sessionDate,
        location: s.location || "Default",
        attendees,
        baseRate: basePay,
        bonusPerAttendee: coach.bonusPerAttendee,
        totalPay,
      };
    });

    return {
      coach,
      matchingSessions,
      totalSessions: matchingSessions.length,
      totalAttendees,
      totalPayout,
    };
  }

  // Generate a payout invoice
  function generateInvoice() {
    const { coach, matchingSessions, totalPayout } = getReportData();
    if (!coach || matchingSessions.length === 0) {
      setMessage({ text: "Cannot generate invoice: No sessions found in the selected period.", tone: "danger" });
      return;
    }

    const codeSuffix = Math.floor(100000 + Math.random() * 900000);
    const invoiceCode = `PAY-${coach.type.toUpperCase()}-${codeSuffix}`;

    const newPayout: CoachPayout = {
      id: "payout_" + Math.random().toString(36).substr(2, 9),
      coachId: coach.id,
      coachName: coach.name,
      coachEmail: coach.email,
      coachPhone: coach.phone,
      invoiceCode,
      startDate: reportStartDate || "All Time",
      endDate: reportEndDate || "Present",
      sessions: matchingSessions,
      totalAmount: totalPayout,
      status: "unpaid",
      notes: reportNotes || undefined,
      createdAt: new Date().toISOString(),
    };

    setPayouts((prev) => [newPayout, ...prev]);
    setReportNotes("");
    setActiveTab("invoices");
    setMessage({ text: `Payout invoice ${invoiceCode} has been generated.`, tone: "success" });
  }

  function toggleInvoiceStatus(invoiceId: string) {
    setPayouts((prev) =>
      prev.map((p) => {
        if (p.id === invoiceId) {
          const newStatus = p.status === "paid" ? "unpaid" : "paid";
          return {
            ...p,
            status: newStatus,
            paidAt: newStatus === "paid" ? new Date().toISOString() : undefined,
          };
        }
        return p;
      })
    );
    // Sync with selected invoice modal if open
    if (selectedInvoice && selectedInvoice.id === invoiceId) {
      setSelectedInvoice((prev) => {
        if (!prev) return null;
        const newStatus = prev.status === "paid" ? "unpaid" : "paid";
        return {
          ...prev,
          status: newStatus,
          paidAt: newStatus === "paid" ? new Date().toISOString() : undefined,
        };
      });
    }
  }

  function deleteInvoice(invoiceId: string) {
    triggerConfirm(
      "Delete Payout Invoice",
      "Are you sure you want to delete this payout invoice log? This cannot be undone.",
      () => {
        setPayouts((prev) => prev.filter((p) => p.id !== invoiceId));
        setMessage({ text: "Invoice log has been deleted.", tone: "success" });
      },
      true
    );
  }

  // Loading indicator for mounting
  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Staff Users & Coach Salaries" description="Manage accounts, staff roles, and coach earnings." />
        <Card className="max-w-md">
          <EmptyState
            title="Access Restricted"
            description="Only super admins can view staff accounts and salaries. Contact your system administrator."
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

  const selectedCoach = coaches.find((c) => c.id === selectedCoachId);
  const { coach: reportCoach, matchingSessions, totalSessions, totalAttendees, totalPayout } = getReportData();
  const hasBonus = reportCoach && reportCoach.bonusPerAttendee > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & Salaries Admin"
        description="Manage admin user accounts, define coach profiles, log events, and generate payouts."
      />

      {/* Main tab switcher */}
      <div className="print:hidden border-b border-[var(--border)] flex flex-wrap gap-1 sm:gap-4">
        <button
          onClick={() => { setActiveTab("staff"); setMessage(null); }}
          className={`pb-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "staff"
              ? "border-[var(--primary)] text-[var(--foreground)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Staff Accounts
        </button>
        <button
          onClick={() => { setActiveTab("coaches"); setMessage(null); }}
          className={`pb-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "coaches"
              ? "border-[var(--primary)] text-[var(--foreground)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Coaches & Staff Profiles
        </button>
        <button
          onClick={() => { setActiveTab("reports"); setMessage(null); }}
          className={`pb-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "reports"
              ? "border-[var(--primary)] text-[var(--foreground)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Salary Calculator & Reports
        </button>
        <button
          onClick={() => { setActiveTab("invoices"); setMessage(null); }}
          className={`pb-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "invoices"
              ? "border-[var(--primary)] text-[var(--foreground)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Payout Invoices
        </button>
      </div>

      {message && (
        <div className="print:hidden">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

      {/* TAB 1: STAFF ACCOUNTS */}
      {activeTab === "staff" && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr] animate-fade-in">
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
                placeholder="Min 12 characters"
                required
              />
              <Select label="Role" name="role" defaultValue="staff">
                <option value="staff">Staff — can redeem and view clients</option>
                <option value="super_admin">Super admin — full access</option>
              </Select>
              <Button type="submit" className="w-full cursor-pointer" loading={submitting}>
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
                          <Select
                            defaultValue={user.role}
                            onChange={(e) => changeRole(user, e.target.value)}
                            className="h-8 text-xs cursor-pointer"
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
                            className="text-[var(--danger)] hover:bg-red-955/20 cursor-pointer"
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
      )}

      {/* TAB 2: COACH & STAFF PROFILES */}
      {activeTab === "coaches" && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr] animate-fade-in">
          {/* Add/Edit Coach form */}
          <Card>
            <h3 className="mb-4 text-base font-semibold">
              {editingCoachId ? "Edit Profile" : "Add Coach or Instructor"}
            </h3>
            <form onSubmit={handleCoachSubmit} className="space-y-4">
              <Input
                label="Full name"
                name="name"
                placeholder="e.g. Karim Bensmail"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                required
              />
              <Select
                label="Staff type"
                name="type"
                value={coachType}
                onChange={(e) => setCoachType(e.target.value as any)}
              >
                <option value="coach">Coach / Instructor</option>
                <option value="staff">Administrative Staff</option>
              </Select>
              <Input
                label="Email (optional)"
                name="email"
                type="email"
                value={coachEmail}
                onChange={(e) => setCoachEmail(e.target.value)}
                placeholder="e.g. karim@aqasports.com"
              />
              <Input
                label="Phone (optional)"
                name="phone"
                value={coachPhone}
                onChange={(e) => setCoachPhone(e.target.value)}
                placeholder="e.g. 0550123456"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Base pay / event"
                  name="baseRate"
                  type="number"
                  value={coachBaseRate}
                  onChange={(e) => setCoachBaseRate(e.target.value)}
                  min="0"
                  required
                  hint="DA per session"
                />
                <Input
                  label="Bonus / attendee"
                  name="bonusPerAttendee"
                  type="number"
                  value={coachBonusPerAttendee}
                  onChange={(e) => setCoachBonusPerAttendee(e.target.value)}
                  min="0"
                  required
                  hint="DA per client"
                />
              </div>
              <Textarea
                label="Notes / Qualifications"
                name="notes"
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                placeholder="Specialties, certifications, schedule preferences..."
              />
              {editingCoachId ? (
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={resetCoachForm} className="flex-1 cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 cursor-pointer">
                    Save Profile
                  </Button>
                </div>
              ) : (
                <Button type="submit" className="w-full cursor-pointer">
                  Add profile
                </Button>
              )}
            </form>
          </Card>

          {/* Coaches List */}
          <Card padding={false}>
            <div className="border-b border-[var(--border)] px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">
                Coaches & Staff Profiles ({coaches.length})
              </h3>
              <input
                type="text"
                placeholder="Search by name..."
                value={coachSearch}
                onChange={(e) => setCoachSearch(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs outline-none focus:border-[var(--primary)] text-[var(--foreground)]"
              />
            </div>

            {coaches.length === 0 ? (
              <EmptyState
                title="No profiles created yet"
                description="Add profiles on the left to start linking them to event sessions."
              />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {coaches
                  .filter((c) => c.name.toLowerCase().includes(coachSearch.toLowerCase()))
                  .map((coach) => {
                    const assignedCount = assignments.filter((a) => a.coachId === coach.id).length;
                    const historicalPayouts = payouts
                      .filter((p) => p.coachId === coach.id && p.status === "paid")
                      .reduce((sum, p) => sum + p.totalAmount, 0);

                    return (
                      <li
                        key={coach.id}
                        className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--surface-2)]/20 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{coach.name}</p>
                            <Badge tone={coach.type === "coach" ? "primary" : "info"} size="sm">
                              {coach.type === "coach" ? "Coach" : "Staff"}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            {coach.email && `${coach.email} · `}
                            {coach.phone && `${coach.phone} · `}
                            Rate: {coach.baseRate.toLocaleString("fr-DZ")} DA/session + {coach.bonusPerAttendee.toLocaleString("fr-DZ")} DA/client
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)] font-medium">
                            Linked to {assignedCount} event sessions · Paid payouts: {historicalPayouts.toLocaleString("fr-DZ")} DA
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedCoachId(coach.id);
                              setIsAssignmentModalOpen(true);
                            }}
                            className="cursor-pointer"
                          >
                            Link Events
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => startEditCoach(coach)}
                            className="cursor-pointer"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[var(--danger)] hover:bg-red-955/20 cursor-pointer"
                            onClick={() => removeCoach(coach)}
                          >
                            Remove
                          </Button>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: SALARY CALCULATOR & REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <h3 className="mb-4 text-base font-semibold">Salary Calculator & Report Parameters</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Select Coach or Staff Member"
                value={reportCoachId}
                onChange={(e) => setReportCoachId(e.target.value)}
                className="cursor-pointer"
              >
                <option value="">Choose a profile...</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === "coach" ? "Coach" : "Staff"})
                  </option>
                ))}
              </Select>
              <Input
                label="Start date"
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
              />
              <Input
                label="End date"
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
              />
            </div>
            {reportCoachId && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setReportCoachId("");
                    setReportStartDate("");
                    setReportEndDate("");
                  }}
                  className="cursor-pointer"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </Card>

          {!reportCoachId ? (
            <Card>
              <EmptyState
                title="Select a profile to begin"
                description="Choose a coach or staff member above, then filter by date range to calculate their earnings."
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-3-3v3m-3-3v3M8.25 18a4.5 4.5 0 01-4.5-4.5V6.75A2.25 2.25 0 016 4.5h12A2.25 2.25 0 0120.25 6.75v6.75A4.5 4.5 0 0115.75 18M3.75 18h16.5M4.5 9h15" />
                  </svg>
                }
              />
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Sessions Taught</p>
                  <p className="mt-2 text-2xl font-bold">{totalSessions}</p>
                </Card>
                {hasBonus && (
                  <Card>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Total Attendance</p>
                    <p className="mt-2 text-2xl font-bold">{totalAttendees} clients</p>
                  </Card>
                )}
                <Card className={hasBonus ? "" : "sm:col-span-2"}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Total Salary Earned</p>
                  <p className="mt-2 text-2xl font-bold text-[var(--primary)]">
                    {totalPayout.toLocaleString("fr-DZ")} DA
                  </p>
                </Card>
              </div>

              {/* Detailed Breakdown table */}
              <Card padding={false}>
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <h3 className="text-base font-semibold">Sessions Breakdown Statement</h3>
                </div>

                {matchingSessions.length === 0 ? (
                  <EmptyState
                    title="No sessions found"
                    description="No events are linked to this profile during the selected time period."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                          <th className="px-5 py-3">Event Date</th>
                          <th className="px-5 py-3">Activity</th>
                          <th className="px-5 py-3">Location</th>
                          {hasBonus && <th className="px-5 py-3 text-center">Attendees</th>}
                          <th className="px-5 py-3 text-right">Base Pay</th>
                          {hasBonus && <th className="px-5 py-3 text-right">Attendee Bonus</th>}
                          <th className="px-5 py-3 text-right">Total Payout</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {matchingSessions.map((item, idx) => (
                          <tr key={item.sessionId + "_" + idx} className="hover:bg-[var(--surface-2)]/10 transition-colors">
                            <td className="px-5 py-3.5 text-[var(--foreground)]">
                              {new Date(item.sessionDate).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-[var(--foreground)]">{item.activityName}</td>
                            <td className="px-5 py-3.5 text-[var(--muted)]">{item.location}</td>
                            {hasBonus && <td className="px-5 py-3.5 text-center text-[var(--foreground)]">{item.attendees}</td>}
                            <td className="px-5 py-3.5 text-right tabular-nums">{item.baseRate.toLocaleString("fr-DZ")} DA</td>
                            {hasBonus && (
                              <td className="px-5 py-3.5 text-right tabular-nums">
                                {item.bonusPerAttendee > 0
                                  ? `${(item.attendees * item.bonusPerAttendee).toLocaleString("fr-DZ")} DA`
                                  : "—"}
                              </td>
                            )}
                            <td className="px-5 py-3.5 text-right font-semibold text-[var(--primary)] tabular-nums">
                              {item.totalPay.toLocaleString("fr-DZ")} DA
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Generate Payout Receipt Card */}
              {totalPayout > 0 && (
                <Card className="max-w-xl">
                  <h3 className="mb-4 text-base font-semibold">Generate Disbursement Invoice</h3>
                  <div className="space-y-4">
                    <Input
                      label="Payout notes / memorandum"
                      placeholder="e.g. Outstanding June salary payment, cash disbursement"
                      value={reportNotes}
                      onChange={(e) => setReportNotes(e.target.value)}
                    />
                    <Button onClick={generateInvoice} className="w-full cursor-pointer">
                      Generate Payment Invoice
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAYOUT INVOICES */}
      {activeTab === "invoices" && (
        <Card padding={false} className="animate-fade-in">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="text-base font-semibold">Salary Disbursement Invoices ({payouts.length})</h3>
          </div>

          {payouts.length === 0 ? (
            <EmptyState
              title="No payout invoices generated"
              description="Calculate salaries and generate invoices under the Salary Calculator tab."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    <th className="px-5 py-3">Invoice Code</th>
                    <th className="px-5 py-3">Recipient</th>
                    <th className="px-5 py-3">Statement Period</th>
                    <th className="px-5 py-3">Date Generated</th>
                    <th className="px-5 py-3 text-right">Total Payout</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {payouts.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-[var(--surface-2)]/10 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-[var(--foreground)]">{invoice.invoiceCode}</td>
                      <td className="px-5 py-3.5 font-semibold text-[var(--foreground)]">{invoice.coachName}</td>
                      <td className="px-5 py-3.5 text-[var(--muted)]">
                        {invoice.startDate === "All Time" ? "Beginning" : new Date(invoice.startDate).toLocaleDateString()} to{" "}
                        {invoice.endDate === "Present" ? "Present" : new Date(invoice.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--muted)]">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-[var(--foreground)] tabular-nums">
                        {invoice.totalAmount.toLocaleString("fr-DZ")} DA
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          onClick={() => toggleInvoiceStatus(invoice.id)}
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold cursor-pointer select-none ${
                            invoice.status === "paid"
                              ? "bg-[var(--success-bg)] text-[var(--success-text)]"
                              : "bg-[var(--warning-bg)] text-[var(--warning-text)]"
                          }`}
                        >
                          {invoice.status === "paid" ? "PAID" : "UNPAID"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                            className="cursor-pointer"
                          >
                            View &amp; Print
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteInvoice(invoice.id)}
                            className="text-[var(--danger)] hover:bg-red-955/20 cursor-pointer"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* DUAL-PANEL EVENT ASSIGNMENT MODAL */}
      {isAssignmentModalOpen && selectedCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 animate-fade-in print:hidden">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-slate-900/50">
              <div>
                <h3 className="font-bold text-lg text-[var(--foreground)]">
                  Link Event Sessions: {selectedCoach.name}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Base rate: {selectedCoach.baseRate.toLocaleString("fr-DZ")} DA/session · Attendance bonus: {selectedCoach.bonusPerAttendee.toLocaleString("fr-DZ")} DA/attendee
                </p>
              </div>
              <button
                onClick={() => { setIsAssignmentModalOpen(false); setSelectedCoachId(null); }}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] transition cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
              
              {/* Left Panel: Linked Sessions */}
              <div className="flex flex-col min-h-0 p-5">
                <h4 className="font-semibold text-sm uppercase tracking-wider text-[var(--primary)] mb-3 flex items-center gap-2">
                  <span>Linked Sessions</span>
                  <Badge tone="primary" size="sm">
                    {assignments.filter((a) => a.coachId === selectedCoach.id).length}
                  </Badge>
                </h4>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {assignments.filter((a) => a.coachId === selectedCoach.id).length === 0 ? (
                    <EmptyState
                      title="No events linked yet"
                      description="Select and link sessions from the available events list on the right."
                    />
                  ) : (
                    assignments
                      .filter((a) => a.coachId === selectedCoach.id)
                      .map((assignment) => {
                        const s = dbSessions.find((sess) => sess.id === assignment.sessionId);
                        if (!s) return null;
                        return (
                          <div
                            key={assignment.id}
                            className="p-3 bg-[var(--surface-2)]/50 border border-[var(--border)] rounded-xl flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate text-[var(--foreground)]">
                                {s.activity.name}
                              </p>
                              <p className="text-xs text-[var(--muted)] mt-0.5">
                                {new Date(s.sessionDate).toLocaleDateString()} · {s.location || "Default Location"}
                              </p>
                              <p className="text-xs text-[var(--primary)] font-medium mt-0.5">
                                {s.redemptions.length} clients attended
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[var(--danger)] hover:bg-red-955/20 cursor-pointer"
                              onClick={() => unlinkSession(selectedCoach.id, s.id)}
                            >
                              Unlink
                            </Button>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Right Panel: Available Sessions to Link */}
              <div className="flex flex-col min-h-0 p-5 bg-[var(--surface-2)]/10">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-[var(--muted)]">
                    Available Sessions
                  </h4>
                  <input
                    type="text"
                    placeholder="Search sessions..."
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs outline-none focus:border-[var(--primary)] text-[var(--foreground)] w-40"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {sessionsLoading ? (
                    <div className="py-10 text-center">
                      <div className="mx-auto mb-2 h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
                      <p className="text-xs text-[var(--muted)]">Loading available sessions...</p>
                    </div>
                  ) : dbSessions.length === 0 ? (
                    <EmptyState
                      title="No database sessions"
                      description="Create event sessions in the Activities panel first."
                    />
                  ) : (
                    (() => {
                      const linkedSessionIds = assignments
                        .filter((a) => a.coachId === selectedCoach.id)
                        .map((a) => a.sessionId);
                      
                      const filteredSessions = dbSessions
                        .filter((s) => !linkedSessionIds.includes(s.id))
                        .filter((s) => {
                          const matchesSearch =
                            s.activity.name.toLowerCase().includes(sessionSearch.toLowerCase()) ||
                            (s.location && s.location.toLowerCase().includes(sessionSearch.toLowerCase()));
                          return matchesSearch;
                        });

                      if (filteredSessions.length === 0) {
                        return (
                          <EmptyState
                            title="No matching sessions"
                            description="Adjust your search query or verify sessions are not already linked."
                          />
                        );
                      }

                      return filteredSessions.map((s) => (
                        <div
                          key={s.id}
                          className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-between gap-3 hover:border-[var(--primary)]/30 transition-all"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate text-[var(--foreground)]">
                              {s.activity.name}
                            </p>
                            <p className="text-xs text-[var(--muted)] mt-0.5">
                              {new Date(s.sessionDate).toLocaleDateString()} · {s.location || "Default Location"}
                            </p>
                            <p className="text-xs text-[var(--muted)] mt-0.5">
                              Attendees: {s.redemptions.length}
                            </p>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => linkSession(selectedCoach.id, s.id)}
                          >
                            Link
                          </Button>
                        </div>
                      ));
                    })()
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[var(--border)] bg-slate-900/30 flex justify-end">
              <Button
                variant="primary"
                onClick={() => { setIsAssignmentModalOpen(false); setSelectedCoachId(null); }}
                className="cursor-pointer"
              >
                Done
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT / INVOICE VIEW MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 overflow-y-auto animate-fade-in print:bg-white print:text-black">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black my-auto">
            
            {/* Modal Actions Header */}
            <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-slate-900/50">
              <h3 className="font-bold text-sm uppercase tracking-widest text-[var(--muted)]">
                Invoice Details: {selectedInvoice.invoiceCode}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant={selectedInvoice.status === "paid" ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => toggleInvoiceStatus(selectedInvoice.id)}
                  className="cursor-pointer"
                >
                  Mark as {selectedInvoice.status === "paid" ? "Unpaid" : "Paid"}
                </Button>
                <Button variant="primary" size="sm" onClick={() => window.print()} className="cursor-pointer">
                  Print Invoice
                </Button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] transition cursor-pointer"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Printable Paper Document */}
            <div className="p-8 print:p-0 bg-white text-slate-800">
              
              {/* Header Grid */}
              <div className="grid grid-cols-2 justify-between items-start gap-4 pb-6 border-b-2 border-slate-200">
                <div>
                  <img src="/image/logoevents.png" alt="AQA Sports Logo" className="h-12 w-auto object-contain mb-3" />
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">AQA SPORTS</h1>
                  <p className="text-xs text-slate-500 font-medium">Outdoor Adventures & Events Management</p>
                  <p className="text-xs text-slate-500">Algiers, Algeria</p>
                </div>
                <div className="text-right">
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Receipt</h2>
                  <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">{selectedInvoice.invoiceCode}</p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    Date: {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    Period: {selectedInvoice.startDate === "All Time" ? "Start" : new Date(selectedInvoice.startDate).toLocaleDateString()} to {selectedInvoice.endDate === "Present" ? "Present" : new Date(selectedInvoice.endDate).toLocaleDateString()}
                  </p>
                  <div className="mt-3 inline-block">
                    <span className={`inline-block text-xs font-extrabold px-3 py-1 rounded-md ${
                      selectedInvoice.status === "paid"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}>
                      {selectedInvoice.status === "paid" ? "PAID" : "UNPAID"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recipient / Payout details */}
              <div className="py-6 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Staff Member Details</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{selectedInvoice.coachName}</p>
                  <p className="text-slate-600 mt-0.5">Type: {selectedInvoice.coachEmail.includes("staff") || selectedInvoice.coachName.toLowerCase().includes("staff") ? "Administrative Staff" : "Coach / Instructor"}</p>
                  {selectedInvoice.coachEmail && <p className="text-slate-600 mt-0.5">{selectedInvoice.coachEmail}</p>}
                  {selectedInvoice.coachPhone && <p className="text-slate-600 mt-0.5">{selectedInvoice.coachPhone}</p>}
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Payment Summary</p>
                  <p className="text-2xl font-black text-[var(--primary)] text-slate-900 mt-1 tabular-nums">
                    {selectedInvoice.totalAmount.toLocaleString("fr-DZ")} DA
                  </p>
                  {selectedInvoice.paidAt && (
                    <p className="text-slate-500 mt-1">Paid on: {new Date(selectedInvoice.paidAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              {/* Statement details table */}
              <div className="mt-4">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-2">Linked Session Statement Details</p>
                {(() => {
                  const invoiceHasBonus = selectedInvoice.sessions.some(s => s.bonusPerAttendee > 0);
                  return (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-500 font-bold">
                          <th className="py-2.5 px-2">Date</th>
                          <th className="py-2.5 px-2">Activity Description</th>
                          <th className="py-2.5 px-2">Location</th>
                          {invoiceHasBonus && <th className="py-2.5 px-2 text-center">Attendees</th>}
                          <th className="py-2.5 px-2 text-right">Base rate</th>
                          {invoiceHasBonus && <th className="py-2.5 px-2 text-right">Bonus rate</th>}
                          <th className="py-2.5 px-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedInvoice.sessions.map((item, idx) => (
                          <tr key={item.sessionId + "_" + idx} className="text-slate-700">
                            <td className="py-2.5 px-2 font-medium">{new Date(item.sessionDate).toLocaleDateString()}</td>
                            <td className="py-2.5 px-2 font-bold text-slate-900">{item.activityName}</td>
                            <td className="py-2.5 px-2">{item.location}</td>
                            {invoiceHasBonus && <td className="py-2.5 px-2 text-center">{item.attendees}</td>}
                            <td className="py-2.5 px-2 text-right tabular-nums">{item.baseRate.toLocaleString("fr-DZ")} DA</td>
                            {invoiceHasBonus && <td className="py-2.5 px-2 text-right tabular-nums">{item.bonusPerAttendee.toLocaleString("fr-DZ")} DA</td>}
                            <td className="py-2.5 px-2 text-right font-semibold text-slate-900 tabular-nums">
                              {item.totalPay.toLocaleString("fr-DZ")} DA
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
                          <td colSpan={invoiceHasBonus ? 5 : 4} className="py-3 px-2 text-right text-sm font-extrabold uppercase">Disbursement Total</td>
                          <td colSpan={invoiceHasBonus ? 2 : 1} className="py-3 px-2 text-right text-base font-black text-slate-900 tabular-nums">
                            {selectedInvoice.totalAmount.toLocaleString("fr-DZ")} DA
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  );
                })()}
              </div>

              {/* Notes block */}
              {selectedInvoice.notes && (
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <p className="font-bold text-slate-700">Memorandum Notes</p>
                  <p className="text-slate-600 mt-1">{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Signatures */}
              <div className="mt-12 grid grid-cols-2 gap-10 text-xs">
                <div className="border-t border-slate-300 pt-3">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Authorized Signature</p>
                  <p className="mt-1.5 font-bold text-slate-700">{session?.user?.name || "Admin Disburser"}</p>
                </div>
                <div className="border-t border-slate-300 pt-3 text-right">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Recipient Signature</p>
                  <p className="mt-1.5 text-slate-400 font-medium">Date: ____/____/________</p>
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="print:hidden px-6 py-4 border-t border-[var(--border)] bg-slate-900/30 flex justify-end">
              <Button variant="primary" onClick={() => setSelectedInvoice(null)} className="cursor-pointer">
                Close
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
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
