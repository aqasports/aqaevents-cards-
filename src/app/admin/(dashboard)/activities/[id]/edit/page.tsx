"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  Textarea,
  ConfirmModal,
} from "@/components/admin/ui";

const RATE = 1900;

type ActivityDetail = {
  id: string;
  name: string;
  description: string | null;
  creditCost: number;
  imageUrl: string | null;
  places: string | null;
  duration: string | null;
  active: boolean;
  eventType: string;
  requiresCheck?: boolean;
  clubId?: string | null;
};

export default function EditActivityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creditCost, setCreditCost] = useState<number | string>(1);
  const [imageUrl, setImageUrl] = useState("");
  const [places, setPlaces] = useState("");
  const [duration, setDuration] = useState("");
  const [active, setActive] = useState(true);
  const [eventType, setEventType] = useState("fixed");
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);


  // Confirm modal state
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

  const loadActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/activities/${params.id}`);
      if (!res.ok) throw new Error("Failed to load activity details.");
      const data = (await res.json()) as ActivityDetail;
      setName(data.name);
      setDescription(data.description ?? "");
      setCreditCost(data.creditCost);
      setImageUrl(data.imageUrl ?? "");
      setPlaces(data.places ?? "");
      setDuration(data.duration ?? "");
      setActive(data.active);
      const loadedType = data.eventType === "whatsapp" ? "variable" : (data.eventType ?? "fixed");
      setEventType(loadedType);
      setClubId(data.clubId ?? null);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error loading activity details.", tone: "danger" });
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    async function loadClubs() {
      try {
        const res = await fetch("/api/admin/clubs");
        if (res.ok) {
          const data = await res.json();
          setClubs(data);
        }
      } catch (err) {
        console.error("Failed to load clubs:", err);
      }
    }
    loadClubs();
    loadActivity();
  }, [loadActivity]);


  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/activities/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          creditCost: Number(creditCost),
          imageUrl: imageUrl.trim() || null,
          places: places.trim() || null,
          duration: duration || null,
          active: active,
          eventType: eventType,
          requiresCheck: !!clubId,
          clubId: clubId,
        }),
      });

      if (res.ok) {
        router.push(`/admin/activities/${params.id}`);
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to save activity changes.", tone: "danger" });
        setSaving(false);
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "An error occurred while saving the activity.", tone: "danger" });
      setSaving(false);
    }
  }

  async function handleDelete() {
    triggerConfirm(
      "Delete Activity",
      "WARNING: Deleting this activity will permanently erase all associated events, client registrations, expenses, and redemptions!\n\nCredits used by clients for this activity will be automatically refunded.\n\nAre you absolutely sure you want to proceed?",
      async () => {
        setDeleting(true);
        setMessage(null);
        try {
          const res = await fetch(`/api/admin/activities/${params.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            router.push("/admin/activities");
          } else {
            const data = await res.json();
            setMessage({ text: data.error || "Failed to delete activity.", tone: "danger" });
            setDeleting(false);
          }
        } catch (err) {
          console.error(err);
          setMessage({ text: "An error occurred while deleting the activity.", tone: "danger" });
          setDeleting(false);
        }
      },
      true
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p className="text-sm text-[var(--muted)]">Loading activity data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <PageHeader
          title={`Edit Activity: ${name || "…"}`}
          description="Modify core settings, locations, pricing, and active status."
        />
        <Link href={`/admin/activities/${params.id}`}>
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
      </div>

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <Card>
        <form onSubmit={handleSave} className="space-y-5">
          <Input
            label="Activity Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Traversée en Kayak"
            required
          />

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Introduce this activity…"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Credits Cost
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={creditCost}
                onChange={(e) => setCreditCost(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              />
              <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs flex items-center gap-2">
                <svg className="h-4 w-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-blue-800">
                  {Number(creditCost) || 0} credit{Number(creditCost) !== 1 ? "s" : ""} = {((Number(creditCost) || 0) * RATE).toLocaleString()} DA
                </span>
              </div>
            </div>

            <Select
              label="Duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="">— Select duration —</option>
              {["1h", "1h30", "2h", "2h30", "3h", "Half day (4h)", "Full day (8h)", "Multi-day"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </div>

          <Input
            label="Cover Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="e.g. https://images.unsplash.com/…"
          />

          {imageUrl && (
            <div className="h-40 w-full overflow-hidden rounded-xl bg-slate-100 border border-[var(--border)] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Cover preview" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Preview</div>
            </div>
          )}

          <Input
            label="Locations / Places (Comma-separated)"
            value={places}
            onChange={(e) => setPlaces(e.target.value)}
            placeholder="e.g. Barrage de Boukerdane, Plage Beldj"
            hint="Predefined places list for session scheduling"
          />

          <Select
            label="Status"
            value={active ? "active" : "disabled"}
            onChange={(e) => setActive(e.target.value === "active")}
          >
            <option value="active">Active (Visible & bookable)</option>
            <option value="disabled">Disabled (Hidden from active grid)</option>
          </Select>

          <Select
            label="Event Frequency"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            <option value="fixed">Fixed (e.g., each Sunday)</option>
            <option value="variable">Planned according to a variable (announced via WhatsApp group)</option>
          </Select>

          <Select
            label="Partner Club (Optional)"
            value={clubId || ""}
            onChange={(e) => setClubId(e.target.value || null)}
          >
            <option value="">— No Partner Club (Unspecified) —</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>




          <div className="flex flex-wrap gap-3 pt-3 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={saving || deleting}
            >
              Delete Activity
            </Button>

            <div className="flex-1" />

            <Link href={`/admin/activities/${params.id}`}>
              <Button type="button" variant="secondary" disabled={saving || deleting}>Cancel</Button>
            </Link>

            <Button type="submit" loading={saving} disabled={deleting}>Save Changes</Button>
          </div>
        </form>
      </Card>

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
