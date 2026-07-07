"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate, useLocale } from "@/lib/i18n";
import {
  Badge,
  Card,
  Input,
  PageHeader,
  EmptyState,
} from "@/components/admin/ui";

type Activity = {
  id: string;
  name: string;
};

type SessionExpense = {
  id: string;
  amount: number;
};

type Session = {
  id: string;
  sessionDate: string;
  location: string | null;
  capacity: number | null;
  active: boolean;
  activity: Activity;
  redemptions: { id: string }[];
  sessionExpenses: SessionExpense[];
};

export default function EventsPage() {
  const { locale } = useLocale();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "canceled">("all");
  const [activityFilter, setActivityFilter] = useState("all");

  useEffect(() => {
    async function loadData() {
      try {
        const [sessionsRes, activitiesRes] = await Promise.all([
          fetch("/api/admin/sessions?activeOnly=false"),
          fetch("/api/admin/activities"),
        ]);
        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          setSessions(sessionsData);
        }
        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          setActivities(activitiesData);
        }
      } catch (err) {
        console.error("Failed to load events data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    // Search filter
    const matchesSearch =
      s.activity.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.location && s.location.toLowerCase().includes(search.toLowerCase()));

    // Status filter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.active) ||
      (statusFilter === "canceled" && !s.active);

    // Activity filter
    const matchesActivity = activityFilter === "all" || s.activity.id === activityFilter;

    return matchesSearch && matchesStatus && matchesActivity;
  });

  // Calculate statistics
  const totalEvents = filteredSessions.length;
  const activeEvents = filteredSessions.filter((s) => s.active).length;
  const canceledEvents = filteredSessions.filter((s) => !s.active).length;
  const totalExpenses = filteredSessions.reduce((sum, s) => {
    const sessionCost = s.sessionExpenses.reduce((sSum, exp) => sSum + exp.amount, 0);
    return sum + sessionCost;
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Events Dashboard" description="Overview of all scheduled activities and sessions" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Total Events</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalEvents}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Active Events</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{activeEvents}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Canceled Events</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{canceledEvents}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Total Expenses</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {totalExpenses.toLocaleString("fr-DZ")} DA
          </p>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Search Events"
            placeholder="Search by activity name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="canceled">Canceled Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Activity Filter
            </label>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Activities</option>
              {activities.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Events List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <EmptyState
            title="No events found"
            description="Adjust your search filters or schedule a new event from the activities dashboard."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Activity</th>
                  <th className="px-6 py-4">Date &amp; Time</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4 text-center">Attendees</th>
                  <th className="px-6 py-4 text-right">Expenses</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSessions.map((session) => {
                  const attendeesCount = session.redemptions.length;
                  const capacity = session.capacity;
                  const sessionCost = session.sessionExpenses.reduce((sum, exp) => sum + exp.amount, 0);

                  return (
                    <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {session.activity.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(session.sessionDate, locale, true)}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{session.location ?? "—"}</td>
                      <td className="px-6 py-4 text-center text-slate-600">
                        {attendeesCount}
                        {capacity ? ` / ${capacity}` : ""}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        {sessionCost > 0 ? `${sessionCost.toLocaleString("fr-DZ")} DA` : "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge tone={session.active ? "success" : "danger"}>
                          {session.active ? "Active" : "Canceled"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/activities/${session.activity.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                          Manage Activity
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
