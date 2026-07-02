"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  PageHeader,
  Textarea,
  EmptyState,
  ConfirmModal,
} from "@/components/admin/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type Expense = { name: string; amount: number };

type Session = { id: string; sessionDate: string; location: string | null };

type Activity = {
  id: string;
  name: string;
  description: string | null;
  creditCost: number;
  imageUrl: string | null;
  places: string | null;
  duration: string | null;
  gallery: string | null;
  equipment: string | null;
  active: boolean;
  eventType: string;
  sessions: Session[];
  expenses: { id: string; name: string; amount: number }[];
  _count: { redemptions: number };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RATE = 1900; // 1 credit = 1,900 DA

function getActivityImage(activity: Activity): string {
  if (activity.imageUrl) return activity.imageUrl;
  const name = activity.name.toLowerCase();
  if (name.includes("kayak")) return "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80";
  if (name.includes("climb")) return "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=600&q=80";
  if (name.includes("bike") || name.includes("biking")) return "https://images.unsplash.com/photo-1484156818044-c040038b0719?auto=format&fit=crop&w=600&q=80";
  if (name.includes("hik") || name.includes("walk")) return "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80";
  if (name.includes("paddle") || name.includes("board")) return "https://images.unsplash.com/photo-1517178351167-452c9bad7ad0?auto=format&fit=crop&w=600&q=80";
  if (name.includes("trail") || name.includes("travers")) return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80";
  return "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=600&q=80";
}

// ─── Price Reference Calculator ───────────────────────────────────────────────

function PriceCalculator({ creditCost }: { creditCost: number | string }) {
  const costNum = Number(creditCost) || 0;
  const price = costNum * RATE;
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs flex items-center gap-2">
      <svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <span className="font-bold text-blue-800">
          {costNum} credit{costNum !== 1 ? "s" : ""} = {price.toLocaleString("fr-DZ")} DA
        </span>
        <span className="text-blue-500 ml-1.5">({RATE.toLocaleString()} DA/credit)</span>
      </div>
    </div>
  );
}

// ─── Image Edit Modal ─────────────────────────────────────────────────────────

function ImageEditModal({
  activity,
  onClose,
  onSaved,
}: {
  activity: Activity;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [url, setUrl] = useState(activity.imageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(activity.imageUrl ?? "");

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/admin/activities/${activity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: url.trim() || null }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Edit Cover Image</h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {preview && (
            <div className="h-40 rounded-xl overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="w-full h-full object-cover" onError={() => setPreview("")} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Image URL</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={url}
              onChange={(e) => { setUrl(e.target.value); setPreview(e.target.value); }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">Paste a direct image URL. Supports Unsplash, Imgur, etc.</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition">
              {saving ? "Saving…" : "Save Image"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingActivity, setTogglingActivity] = useState<string | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [editingImageFor, setEditingImageFor] = useState<Activity | null>(null);

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

  // Form: temp expenses
  const [tempExpenses, setTempExpenses] = useState<Expense[]>([]);
  const [newExpName, setNewExpName] = useState("");
  const [newExpAmount, setNewExpAmount] = useState("");

  // Form: credit cost live calculator
  const [formCreditCost, setFormCreditCost] = useState<number | string>(1);

  async function loadActivities() {
    try {
      const res = await fetch("/api/admin/activities");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setActivities(data);
      } else {
        setActivities([]);
        setMessage({ text: data?.error || "Failed to load activities.", tone: "danger" });
      }
    } catch {
      setActivities([]);
      setMessage({ text: "Failed to load activities.", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadActivities(); }, []);

  function handleAddTempExpense() {
    if (!newExpName || !newExpAmount) return;
    const amount = parseFloat(newExpAmount);
    if (isNaN(amount) || amount <= 0) return;
    setTempExpenses([...tempExpenses, { name: newExpName, amount }]);
    setNewExpName("");
    setNewExpAmount("");
  }

  function handleRemoveTempExpense(idx: number) {
    setTempExpenses(tempExpenses.filter((_, i) => i !== idx));
  }

  async function createActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const fd = new FormData(event.currentTarget);

    const res = await fetch("/api/admin/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        description: fd.get("description") || undefined,
        creditCost: Number(fd.get("creditCost") || 1),
        imageUrl: fd.get("imageUrl") || undefined,
        places: fd.get("places") || undefined,
        duration: fd.get("duration") || undefined,
        eventType: fd.get("eventType") || "fixed",
        expenses: tempExpenses,
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      setMessage({ text: "Activity created successfully.", tone: "success" });
      (event.target as HTMLFormElement).reset();
      setTempExpenses([]);
      setFormCreditCost(1);
      await loadActivities();
    } else {
      setMessage({ text: "Failed to create activity.", tone: "danger" });
    }
  }

  async function toggleActivity(activity: Activity) {
    setTogglingActivity(activity.id);
    await fetch(`/api/admin/activities/${activity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !activity.active }),
    });
    setTogglingActivity(null);
    await loadActivities();
  }

  async function deleteActivity(activityId: string) {
    triggerConfirm(
      "Delete Activity",
      "WARNING: Deleting this activity will permanently erase all associated events, client registrations, expenses, and redemptions!\n\nCredits used by clients for this activity will be automatically refunded.\n\nAre you absolutely sure you want to proceed?",
      async () => {
        setDeletingActivityId(activityId);
        try {
          const res = await fetch(`/api/admin/activities/${activityId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setMessage({ text: "Activity deleted successfully.", tone: "success" });
            await loadActivities();
          } else {
            const data = await res.json();
            setMessage({ text: data.error || "Failed to delete activity.", tone: "danger" });
          }
        } catch (err) {
          console.error(err);
          setMessage({ text: "An error occurred while deleting the activity.", tone: "danger" });
        } finally {
          setDeletingActivityId(null);
        }
      },
      true // isDanger
    );
  }

  const activeActivities = activities.filter((a) => a.active);
  const disabledActivities = activities.filter((a) => !a.active);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Activities Portal"
        description="Add outdoor activities, configure places, track expenses, and view scheduled events."
      />

      {message && (
        <div className="mb-6">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* ── Create Form ─────────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <h3 className="mb-4 text-base font-semibold">Add Activity</h3>
            <form onSubmit={createActivity} className="space-y-4">
              <Input label="Activity name" name="name" placeholder="e.g. Kayaking" required />

              <Textarea label="Description" name="description" placeholder="Brief description of the activity…" />

              {/* Credit Cost + Live Price Calculator */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Credits per session
                </label>
                <input
                  type="number"
                  name="creditCost"
                  min={0}
                  step="any"
                  value={formCreditCost}
                  onChange={(e) => setFormCreditCost(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                <div className="mt-2">
                  <PriceCalculator creditCost={formCreditCost} />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Duration</label>
                <select
                  name="duration"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">— Select duration —</option>
                  {["1h", "1h30", "2h", "2h30", "3h", "Half day (4h)", "Full day (8h)", "Multi-day"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Cover Image URL"
                name="imageUrl"
                placeholder="e.g. https://images.unsplash.com/…"
              />
              <Input
                label="Places / Locations"
                name="places"
                placeholder="e.g. Oued Fès, Bin El Ouidane (comma separated)"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Event Type</label>
                <select
                  name="eventType"
                  defaultValue="fixed"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="fixed">aqasports.com/events (Fixed)</option>
                  <option value="whatsapp">WhatsApp group variable</option>
                </select>
              </div>

              {/* Expenses Inline Builder */}
              <div className="border-t border-dashed border-[var(--border)] pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Initial Expenses
                </p>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="e.g. Guide fee"
                      value={newExpName}
                      onChange={(e) => setNewExpName(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      placeholder="DA"
                      value={newExpAmount}
                      onChange={(e) => setNewExpAmount(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                  <Button type="button" size="sm" onClick={handleAddTempExpense}>+</Button>
                </div>
                {tempExpenses.length > 0 && (
                  <ul className="mb-3 space-y-1.5 rounded-lg border border-[var(--border)] bg-slate-50 p-2 text-xs max-h-36 overflow-y-auto">
                    {tempExpenses.map((exp, idx) => (
                      <li key={idx} className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">{exp.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{exp.amount.toLocaleString()} DA</span>
                          <button type="button" onClick={() => handleRemoveTempExpense(idx)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                        </div>
                      </li>
                    ))}
                    <li className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
                      <span>Total:</span>
                      <span>{tempExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()} DA</span>
                    </li>
                  </ul>
                )}
              </div>

              <Button type="submit" className="w-full" loading={submitting}>
                Create Activity
              </Button>
            </form>
          </Card>

          {/* Price Reference Card */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Price Reference
            </h3>
            <p className="text-xs text-slate-500 mb-3">Base rate: <span className="font-bold text-slate-800">1,900 DA</span> = 1 credit</p>
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5, 10].map((c) => (
                <div key={c} className="flex justify-between text-xs rounded-lg px-3 py-1.5 bg-slate-50">
                  <span className="text-slate-500">{c} credit{c > 1 ? "s" : ""}</span>
                  <span className="font-bold text-slate-800">{(c * RATE).toLocaleString()} DA</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Disabled activities */}
          {disabledActivities.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Disabled ({disabledActivities.length})
              </h3>
              <ul className="space-y-2">
                {disabledActivities.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[var(--muted)] line-through truncate flex-1">{a.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={togglingActivity === a.id}
                        onClick={() => toggleActivity(a)}
                      >
                        Enable
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 font-semibold"
                        loading={deletingActivityId === a.id}
                        onClick={() => deleteActivity(a.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* ── Activities Grid ──────────────────────────────────── */}
        <div className="space-y-4">
          {loading ? (
            <div className="grid gap-5 md:grid-cols-2">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] animate-pulse"
                >
                  {/* Image skeleton */}
                  <div className="h-48 w-full bg-[var(--border)]/40" />
                  
                  {/* Content skeleton */}
                  <div className="flex flex-1 flex-col p-4 space-y-3">
                    <div className="h-5 w-2/3 rounded bg-[var(--border)]/60" />
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded bg-[var(--border)]/40" />
                      <div className="h-3 w-4/5 rounded bg-[var(--border)]/40" />
                    </div>
                    <div className="pt-2 flex gap-2">
                      <div className="h-4 w-24 rounded-full bg-[var(--border)]/40" />
                      <div className="h-4 w-16 rounded-full bg-[var(--border)]/40" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeActivities.length === 0 ? (
            <Card>
              <EmptyState
                title="No active activities"
                description="Add your first activity to enable scheduling and redemptions."
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {activeActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] hover:shadow-lg transition-all duration-200"
                >
                  {/* Card Image with edit button */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getActivityImage(activity)}
                      alt={activity.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                    {/* Edit image button */}
                    <button
                      onClick={() => setEditingImageFor(activity)}
                      className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-white/90 hover:bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition opacity-0 group-hover:opacity-100"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      Edit
                    </button>

                    {/* Badges bottom-left */}
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                        {activity.creditCost} credit{activity.creditCost > 1 ? "s" : ""} · {(activity.creditCost * RATE).toLocaleString()} DA
                      </span>
                      {activity.duration && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                          <svg className="h-3 w-3 text-slate-500 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {activity.duration}
                        </span>
                      )}
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm ${
                        activity.eventType === "whatsapp" ? "bg-amber-500" : "bg-sky-500"
                      }`}>
                        {activity.eventType === "whatsapp" ? "WhatsApp Variable" : "aqasports.com Fixed"}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-[var(--foreground)]">{activity.name}</h3>
                      {activity.description ? (
                        <p className="mt-1.5 text-xs text-[var(--muted)] line-clamp-2">{activity.description}</p>
                      ) : (
                        <p className="mt-1.5 text-xs text-[var(--muted-light)] italic">No description provided.</p>
                      )}

                      {/* Places */}
                      {activity.places && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {activity.places.split(",").map((place, pIdx) => (
                            <span key={pIdx} className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              <svg className="h-3 w-3 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {place.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Equipment preview */}
                      {activity.equipment && (() => {
                        try {
                          const eq = JSON.parse(activity.equipment) as { name: string; type: string }[];
                          if (eq.length === 0) return null;
                          return (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {eq.slice(0, 3).map((e, i) => (
                                <span key={i} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                                  e.type === "provided" ? "bg-green-50 text-green-700" :
                                  e.type === "rent" ? "bg-amber-50 text-amber-700" :
                                  "bg-slate-100 text-slate-600"
                                }`}>
                                  {e.type === "provided" ? (
                                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : e.type === "rent" ? (
                                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                                    </svg>
                                  ) : (
                                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                                    </svg>
                                  )}
                                  {e.name}
                                </span>
                              ))}
                              {eq.length > 3 && <span className="text-[10px] text-slate-400">+{eq.length - 3} more</span>}
                            </div>
                          );
                        } catch { return null; }
                      })()}
                    </div>

                    {/* Gallery Thumbnails Preview */}
                    {(() => {
                      const galleryItems = (() => {
                        if (!activity.gallery) return [];
                        try {
                          return JSON.parse(activity.gallery);
                        } catch {
                          return [];
                        }
                      })();
                      if (galleryItems.length === 0) return null;
                      return (
                        <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--border)] pt-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gallery:</span>
                          <div className="flex gap-1 overflow-x-auto py-0.5">
                            {galleryItems.slice(0, 5).map((item: any, idx: number) => (
                              <div key={idx} className="h-6 w-6 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                {item.type === "image" ? (
                                  <img src={item.url} alt={item.caption ?? ""} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                    <svg className="h-3.5 w-3.5 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            ))}
                            {galleryItems.length > 5 && (
                              <span className="text-[10px] font-bold text-slate-400 flex items-center pl-1">
                                +{galleryItems.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Financial Performance / Profitability */}
                    {(() => {
                      const totalRev = activity._count.redemptions * activity.creditCost * RATE;
                      const totalExp = activity.expenses.reduce((sum, exp) => sum + exp.amount, 0);
                      const netProfit = totalRev - totalExp;
                      const margin = totalRev > 0 ? Math.round((netProfit / totalRev) * 100) : 0;
                      return (
                        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span className="font-bold text-slate-700">Profitability</span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              margin >= 50 ? "bg-green-100 text-green-700 border border-green-200" :
                              margin >= 0 ? "bg-amber-100 text-amber-700 border border-amber-200" :
                              "bg-red-100 text-red-700 border border-red-200"
                            }`}>
                              {margin}% Margin
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Revenue:</span>
                              <span className="font-bold text-slate-800 tabular-nums">{totalRev.toLocaleString()} DZD</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Expenses:</span>
                              <span className="font-bold text-slate-800 tabular-nums">{totalExp.toLocaleString()} DZD</span>
                            </div>
                            <div className="flex justify-between col-span-2 border-t border-slate-100 pt-1.5">
                              <span className="font-semibold text-slate-600">Net Profit:</span>
                              <span className={`font-black tabular-nums ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {netProfit >= 0 ? "+" : ""}{netProfit.toLocaleString()} DZD
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Stats */}
                    <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
                      <div className="flex gap-4">
                        <div>
                          <span className="font-bold text-[var(--foreground)]">{activity.sessions.length}</span> scheduled
                        </div>
                        <div>
                          <span className="font-bold text-[var(--foreground)]">{activity._count.redemptions}</span> check-in{activity._count.redemptions !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-500 hover:text-slate-700"
                          loading={togglingActivity === activity.id}
                          onClick={() => toggleActivity(activity)}
                        >
                          Disable
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 font-semibold"
                          loading={deletingActivityId === activity.id}
                          onClick={() => deleteActivity(activity.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 pt-1 flex gap-2">
                      <Link href={`/admin/activities/${activity.id}`} className="flex-1">
                        <Button className="w-full">View Details →</Button>
                      </Link>
                      <Link href={`/admin/activities/${activity.id}/edit`}>
                        <Button variant="secondary" className="px-3">Edit</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Edit Modal */}
      {editingImageFor && (
        <ImageEditModal
          activity={editingImageFor}
          onClose={() => setEditingImageFor(null)}
          onSaved={loadActivities}
        />
      )}

      {/* Confirm Modal */}
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
