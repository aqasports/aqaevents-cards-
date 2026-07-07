"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { formatDate, useLocale } from "@/lib/i18n";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Textarea,
  EmptyState,
  ConfirmModal,
} from "@/components/admin/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

const RATE = 1900;

type Client = { id: string; fullName: string; balance: number };

type Redemption = {
  id: string;
  clientId: string;
  redeemedAt: string;
  client: { id: string; fullName: string; phone: string | null; email: string | null };
};

type EventSession = {
  id: string;
  sessionDate: string;
  location: string | null;
  capacity: number | null;
  active: boolean;
  redemptions: Redemption[];
};

type ActivityExpense = {
  id: string;
  name: string;
  amount: number;
  notes: string | null;
  createdAt: string;
};

type GalleryItem = {
  type: "image" | "video";
  url: string;
  caption?: string;
};

type EquipmentItem = {
  name: string;
  type: "provided" | "rent" | "buy";
  price?: number;
  notes?: string;
};

type ActivityDetail = {
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
  sessions: EventSession[];
  expenses: ActivityExpense[];
  _count: { redemptions: number };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getActivityImage(nameStr: string, imageUrl: string | null): string {
  if (imageUrl) return imageUrl;
  const name = nameStr.toLowerCase();
  if (name.includes("kayak")) return "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80";
  if (name.includes("climb")) return "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=80";
  if (name.includes("bike") || name.includes("biking")) return "https://images.unsplash.com/photo-1484156818044-c040038b0719?auto=format&fit=crop&w=1200&q=80";
  if (name.includes("hik") || name.includes("walk")) return "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80";
  if (name.includes("paddle") || name.includes("board")) return "https://images.unsplash.com/photo-1517178351167-452c9bad7ad0?auto=format&fit=crop&w=1200&q=80";
  if (name.includes("trail") || name.includes("travers")) return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80";
  return "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=80";
}

function parseGallery(raw: string | null): GalleryItem[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function parseEquipment(raw: string | null): EquipmentItem[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// ─── Image Edit Modal ─────────────────────────────────────────────────────────

function ImageEditModal({
  activityId,
  current,
  onClose,
  onSaved,
}: { activityId: string; current: string | null; onClose: () => void; onSaved: () => void }) {
  const [url, setUrl] = useState(current ?? "");
  const [preview, setPreview] = useState(current ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/activities/${activityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: url.trim() || null }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold">Edit Cover Image</h3>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {preview && (
            <div className="h-44 rounded-xl overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="preview" className="w-full h-full object-cover" onError={() => setPreview("")} />
            </div>
          )}
          <input
            type="url"
            placeholder="https://images.unsplash.com/…"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setPreview(e.target.value); }}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          <p className="text-[11px] text-slate-400">Paste any direct image URL (Unsplash, Imgur, etc.)</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gallery Manager ──────────────────────────────────────────────────────────

function GalleryManager({
  activityId,
  gallery,
  onSaved,
}: { activityId: string; gallery: GalleryItem[]; onSaved: () => void }) {
  const [items, setItems] = useState<GalleryItem[]>(gallery);
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState<"image" | "video">("image");
  const [newCaption, setNewCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  async function saveGallery(updated: GalleryItem[]) {
    setSaving(true);
    await fetch(`/api/admin/activities/${activityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gallery: JSON.stringify(updated) }),
    });
    setSaving(false);
    onSaved();
  }

  function addItem() {
    if (!newUrl.trim()) return;
    const updated = [...items, { type: newType, url: newUrl.trim(), caption: newCaption.trim() || undefined }];
    setItems(updated);
    saveGallery(updated);
    setNewUrl("");
    setNewCaption("");
  }

  function removeItem(idx: number) {
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
    saveGallery(updated);
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Add Media</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setNewType("image")}
            className={`rounded-lg py-2 text-xs font-semibold transition ${newType === "image" ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-white"}`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Image
            </span>
          </button>
          <button
            type="button"
            onClick={() => setNewType("video")}
            className={`rounded-lg py-2 text-xs font-semibold transition ${newType === "video" ? "bg-purple-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-white"}`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25V9.75z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 9.75h3.75m-3.75 4.5h3.75" />
              </svg>
              Video
            </span>
          </button>
        </div>
        <input
          type="url"
          placeholder={newType === "image" ? "https://images.unsplash.com/…" : "https://youtube.com/embed/… or direct .mp4"}
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <input
          type="text"
          placeholder="Caption (optional)"
          value={newCaption}
          onChange={(e) => setNewCaption(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <button
          onClick={addItem}
          disabled={!newUrl.trim() || saving}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Add to Gallery"}
        </button>
      </div>

      {/* Gallery grid */}
      {items.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-6 italic">No gallery items yet. Add images or videos above.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item, idx) => (
            <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer" onClick={() => setLightbox(item)}>
              {item.type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.caption ?? ""} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-white">
                  <svg className="h-8 w-8 text-slate-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25V9.75z" />
                  </svg>
                  <span className="text-[10px] font-medium px-2 text-center line-clamp-2">{item.caption || "Video"}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                <button
                  onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                  className="opacity-0 group-hover:opacity-100 transition rounded-full bg-red-600 text-white h-7 w-7 flex items-center justify-center text-sm font-bold shadow-lg"
                >
                  ×
                </button>
              </div>
              {item.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-[10px] text-white truncate">{item.caption}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-slate-300">×</button>
          {lightbox.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightbox.url} alt={lightbox.caption ?? ""} className="max-w-full max-h-full rounded-xl object-contain" />
          ) : (
            <iframe src={lightbox.url} className="w-full max-w-3xl aspect-video rounded-xl" allowFullScreen />
          )}
          {lightbox.caption && <p className="absolute bottom-6 text-white text-sm font-medium">{lightbox.caption}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Equipment Manager ────────────────────────────────────────────────────────

function EquipmentManager({
  activityId,
  equipment,
  onSaved,
}: { activityId: string; equipment: EquipmentItem[]; onSaved: () => void }) {
  const [items, setItems] = useState<EquipmentItem[]>(equipment);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"provided" | "rent" | "buy">("provided");
  const [newPrice, setNewPrice] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveEquipment(updated: EquipmentItem[]) {
    setSaving(true);
    await fetch(`/api/admin/activities/${activityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipment: JSON.stringify(updated) }),
    });
    setSaving(false);
    onSaved();
  }

  function addItem() {
    if (!newName.trim()) return;
    const item: EquipmentItem = {
      name: newName.trim(),
      type: newType,
      price: newPrice ? parseFloat(newPrice) : undefined,
      notes: newNotes.trim() || undefined,
    };
    const updated = [...items, item];
    setItems(updated);
    saveEquipment(updated);
    setNewName("");
    setNewPrice("");
    setNewNotes("");
  }

  function removeItem(idx: number) {
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
    saveEquipment(updated);
  }

  const typeConfig = {
    provided: {
      label: "Provided",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    rent: {
      label: "Rent",
      color: "bg-amber-100 text-amber-700 border-amber-200",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
      )
    },
    buy: {
      label: "Buy",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      )
    },
  };

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Add Equipment</p>

        <div className="grid grid-cols-3 gap-2">
          {(["provided", "rent", "buy"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setNewType(t)}
              className={`rounded-lg py-1.5 text-xs font-semibold border transition ${
                newType === t ? typeConfig[t].color : "border-slate-200 text-slate-500 hover:bg-white"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {typeConfig[t].icon} {typeConfig[t].label}
              </span>
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Equipment name (e.g. Life jacket, Paddle, Helmet)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />

        {(newType === "rent" || newType === "buy") && (
          <input
            type="number"
            placeholder="Price (DA) — optional"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        )}

        <input
          type="text"
          placeholder="Notes (optional)"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />

        <button
          onClick={addItem}
          disabled={!newName.trim() || saving}
          className="w-full rounded-lg bg-slate-800 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Add Equipment"}
        </button>
      </div>

      {/* Equipment list */}
      {items.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-4 italic">No equipment listed yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const cfg = typeConfig[item.type];
            return (
              <div key={idx} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${cfg.color}`}>
                <div className="flex items-center gap-3">
                  <span className="text-base">{cfg.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{cfg.label}</span>
                      {item.price && <span className="text-[11px] font-bold">{item.price.toLocaleString()} DA</span>}
                      {item.notes && <span className="text-[11px] opacity-70">· {item.notes}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-black/10 text-current font-bold transition"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const DAYS_OF_WEEK = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

function getNextFourDates(selectedDays: number[], timeStr: string): Date[] {
  const dates: Date[] = [];
  const [hours, minutes] = timeStr.split(":").map(Number);
  let current = new Date();
  let safetyCounter = 0;
  while (dates.length < 4 && safetyCounter < 100) {
    safetyCounter++;
    const day = current.getDay();
    if (selectedDays.includes(day)) {
      const candidateDate = new Date(current);
      candidateDate.setHours(hours, minutes, 0, 0);
      if (candidateDate > new Date()) {
        dates.push(candidateDate);
      }
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function ActivityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"events" | "history" | "expenses" | "gallery" | "equipment">("events");
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const { locale } = useLocale();
  const [showImageEdit, setShowImageEdit] = useState(false);

  // Bulk session auto-generate states
  const [scheduleMode, setScheduleMode] = useState<"single" | "bulk">("single");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [bulkTime, setBulkTime] = useState("10:00");
  const [bulkLocation, setBulkLocation] = useState("");
  const [bulkCustomLocation, setBulkCustomLocation] = useState("");
  const [bulkCapacity, setBulkCapacity] = useState("");

  // Event form states
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [selectedClientForEvent, setSelectedClientForEvent] = useState<{ [eventId: string]: string }>({});
  const [searchQueryForEvent, setSearchQueryForEvent] = useState<{ [eventId: string]: string }>({});
  const [showEventDropdown, setShowEventDropdown] = useState<{ [eventId: string]: boolean }>({});
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);
  const [refundingRedemptionId, setRefundingRedemptionId] = useState<string | null>(null);
  const [bulkRefundingSessionId, setBulkRefundingSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [deletingActivity, setDeletingActivity] = useState(false);

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

  // Inline edit state
  const [editingField, setEditingField] = useState<null | "name" | "description" | "places" | "duration" | "creditCost">(null);
  const editRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  const loadActivityData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/activities/${params.id}`);
      if (!res.ok) throw new Error("Failed to load activity details.");
      const data = await res.json();
      setActivity(data);
    } catch (err) {
      console.error(err);
      setMessage({ text: "Error loading activity details.", tone: "danger" });
    }
  }, [params.id]);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.ok) setClients(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    Promise.all([loadActivityData(), loadClients()]).then(() => setLoading(false));
  }, [loadActivityData, loadClients]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[class*='event-search-container']")) setShowEventDropdown({});
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Inline field editing ───────────────────────────────────────────────────
  async function saveField(field: string, value: string | number) {
    // Optimistic UI state update so the change appears instant
    setActivity((prev) => (prev ? { ...prev, [field]: value } : null));
    setEditingField(null);

    try {
      const res = await fetch(`/api/admin/activities/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      await loadActivityData();
    } catch {
      setMessage({ text: "Failed to update field.", tone: "danger" });
      await loadActivityData(); // Revert to actual server state on error
    }
  }

  // ── Event handlers ─────────────────────────────────────────────────────────
  async function handleScheduleEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingEvent(true);
    setMessage(null);
    const fd = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: params.id,
          sessionDate: new Date(fd.get("sessionDate") as string).toISOString(),
          location: (fd.get("location") as string) || (fd.get("customLocation") as string) || undefined,
          capacity: fd.get("capacity") ? Number(fd.get("capacity")) : undefined,
        }),
      });
      if (res.ok) {
        setMessage({ text: "Event scheduled successfully.", tone: "success" });
        (event.target as HTMLFormElement).reset();
        await loadActivityData();
      } else {
        setMessage({ text: "Failed to schedule event.", tone: "danger" });
      }
    } finally { setSubmittingEvent(false); }
  }

  async function handleScheduleBulkEvents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedDays.length === 0) {
      setMessage({ text: "Please select at least one day of the week.", tone: "danger" });
      return;
    }
    if (!bulkTime) {
      setMessage({ text: "Please specify the time.", tone: "danger" });
      return;
    }

    setSubmittingEvent(true);
    setMessage(null);

    const actualLocation = bulkLocation || bulkCustomLocation || undefined;
    const actualCapacity = bulkCapacity ? Number(bulkCapacity) : undefined;

    const dates = getNextFourDates(selectedDays, bulkTime);
    if (dates.length < 4) {
      setMessage({ text: "Failed to calculate 4 future dates.", tone: "danger" });
      setSubmittingEvent(false);
      return;
    }

    try {
      let successCount = 0;
      for (const d of dates) {
        const res = await fetch("/api/admin/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activityId: params.id,
            sessionDate: d.toISOString(),
            location: actualLocation,
            capacity: actualCapacity,
          }),
        });
        if (res.ok) {
          successCount++;
        }
      }

      if (successCount === 4) {
        setMessage({ text: "Successfully scheduled 4 upcoming events.", tone: "success" });
        setSelectedDays([]);
        setBulkTime("10:00");
        setBulkLocation("");
        setBulkCustomLocation("");
        setBulkCapacity("");
        await loadActivityData();
      } else if (successCount > 0) {
        setMessage({ text: `Scheduled ${successCount} of 4 events successfully.`, tone: "success" });
        await loadActivityData();
      } else {
        setMessage({ text: "Failed to schedule events.", tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "An error occurred while generating events.", tone: "danger" });
    } finally {
      setSubmittingEvent(false);
    }
  }

  async function handleDeleteEvent(sessionId: string, attendeeCount: number) {
    const msg = attendeeCount > 0
      ? `Cancel this event? All ${attendeeCount} registered client(s) will be automatically refunded their credits.`
      : "Cancel this event? No clients are registered.";
    triggerConfirm(
      "Cancel Event",
      msg,
      async () => {
        setDeletingSessionId(sessionId);
        try {
          const res = await fetch(`/api/admin/sessions/${sessionId}`, { method: "DELETE" });
          if (res.ok) {
            const refundMsg = attendeeCount > 0
              ? `Event cancelled. ${attendeeCount} client(s) refunded.`
              : "Event cancelled successfully.";
            setMessage({ text: refundMsg, tone: "success" });
            await Promise.all([loadActivityData(), loadClients()]);
          } else { setMessage({ text: "Failed to cancel event.", tone: "danger" }); }
        } finally { setDeletingSessionId(null); }
      },
      true
    );
  }

  async function handleBulkRefundSession(sessionId: string, attendeeCount: number) {
    triggerConfirm(
      "Refund All Clients",
      `Refund all ${attendeeCount} client(s) for this event? Their credits will be restored. This cannot be undone.`,
      async () => {
        setBulkRefundingSessionId(sessionId);
        try {
          const res = await fetch(`/api/admin/sessions/${sessionId}/refund-all`, { method: "POST" });
          const data = await res.json();
          if (res.ok) {
            setMessage({ text: `${data.refunded} client(s) refunded, ${data.totalCreditsRestored} credit(s) restored.`, tone: "success" });
            await Promise.all([loadActivityData(), loadClients()]);
          } else { setMessage({ text: data.error || "Failed to refund all clients.", tone: "danger" }); }
        } finally { setBulkRefundingSessionId(null); }
      },
      true
    );
  }

  async function handleHardDeleteEvent(sessionId: string, registrationCount: number) {
    const msg = registrationCount > 0 
      ? `WARNING: This event has ${registrationCount} registration(s). Permanently deleting it will unlink their event history, but keep client credits intact. Are you absolutely sure you want to permanently erase it?`
      : "Permanently delete this event from the database? This cannot be undone.";

    triggerConfirm(
      "Permanently Delete Event",
      msg,
      async () => {
        setDeletingSessionId(sessionId);
        try {
          const res = await fetch(`/api/admin/sessions/${sessionId}?hard=true`, { method: "DELETE" });
          if (res.ok) {
            setMessage({ text: "Event permanently deleted.", tone: "success" });
            await loadActivityData();
          } else {
            setMessage({ text: "Failed to permanently delete event.", tone: "danger" });
          }
        } finally {
          setDeletingSessionId(null);
        }
      },
      true // isDanger
    );
  }

  async function handleRegisterClient(eventId: string) {
    const clientId = selectedClientForEvent[eventId];
    if (!clientId) return;
    setRegisteringEventId(eventId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, activityId: params.id, sessionId: eventId, notes: `Event registration at ${activity?.name}` }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "Client registered and credits deducted.", tone: "success" });
        setSelectedClientForEvent((prev) => ({ ...prev, [eventId]: "" }));
        setSearchQueryForEvent((prev) => ({ ...prev, [eventId]: "" }));
        await Promise.all([loadActivityData(), loadClients()]);
      } else { setMessage({ text: data.error || "Failed to register client.", tone: "danger" }); }
    } finally { setRegisteringEventId(null); }
  }

  async function handleRefundClient(redemptionId: string) {
    triggerConfirm(
      "Refund Registration",
      "Refund this registration? Credits will be returned.",
      async () => {
        setRefundingRedemptionId(redemptionId);
        try {
          const res = await fetch(`/api/admin/redemptions/${redemptionId}`, { method: "DELETE" });
          if (res.ok) {
            setMessage({ text: "Registration refunded.", tone: "success" });
            await Promise.all([loadActivityData(), loadClients()]);
          } else { setMessage({ text: "Failed to refund.", tone: "danger" }); }
        } finally { setRefundingRedemptionId(null); }
      }
    );
  }

  async function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingExpense(true);
    const fd = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: params.id,
          name: fd.get("name"),
          amount: Number(fd.get("amount")),
          notes: fd.get("notes") || undefined,
        }),
      });
      if (res.ok) {
        setMessage({ text: "Expense recorded.", tone: "success" });
        (event.target as HTMLFormElement).reset();
        await loadActivityData();
      } else { setMessage({ text: "Failed to record expense.", tone: "danger" }); }
    } finally { setSubmittingExpense(false); }
  }

  async function handleDeleteExpense(expenseId: string) {
    triggerConfirm(
      "Delete Expense",
      "Delete this expense record?",
      async () => {
        setDeletingExpenseId(expenseId);
        try {
          const res = await fetch(`/api/admin/expenses/${expenseId}`, { method: "DELETE" });
          if (res.ok) {
            setMessage({ text: "Expense deleted.", tone: "success" });
            await loadActivityData();
          } else {
            setMessage({ text: "Failed to delete expense.", tone: "danger" });
          }
        } finally {
          setDeletingExpenseId(null);
        }
      },
      true // isDanger
    );
  }

  async function handleDeleteActivity() {
    triggerConfirm(
      "Delete Activity",
      "WARNING: Deleting this activity will permanently erase all associated events, client registrations, expenses, and redemptions!\n\nCredits used by clients for this activity will be automatically refunded.\n\nAre you absolutely sure you want to proceed?",
      async () => {
        setDeletingActivity(true);
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
            setDeletingActivity(false);
          }
        } catch (err) {
          console.error(err);
          setMessage({ text: "An error occurred while deleting the activity.", tone: "danger" });
          setDeletingActivity(false);
        }
      },
      true // isDanger
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || !activity) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p className="text-sm text-[var(--muted)]">Loading details…</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const limitTime = new Date(now.getTime() - 10 * 60 * 60 * 1000);
  const upcomingSessions = activity.sessions.filter((s) => s.active && new Date(s.sessionDate) >= limitTime);
  const pastAndCancelledSessions = activity.sessions.filter((s) => !s.active || new Date(s.sessionDate) < limitTime);
  const totalExpenses = activity.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalRevenue = activity._count.redemptions * activity.creditCost * RATE;
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
  const predefinedPlaces = activity.places ? activity.places.split(",").map((p) => p.trim()) : [];
  const galleryItems = parseGallery(activity.gallery);
  const equipmentItems = parseEquipment(activity.equipment);

  const TABS = [
    { key: "events", label: `Events (${upcomingSessions.length})` },
    { key: "history", label: `History (${pastAndCancelledSessions.length})` },
    { key: "gallery", label: `Gallery (${galleryItems.length})` },
    { key: "equipment", label: `Equipment (${equipmentItems.length})` },
    { key: "expenses", label: `Expenses (${activity.expenses.length})` },
  ] as const;

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] shadow-md">
        <div className="h-72 w-full relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getActivityImage(activity.name, activity.imageUrl)}
            alt={activity.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent flex items-end p-6">
            <div className="text-white flex-1">
              {/* Inline editable name */}
              {editingField === "name" ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    ref={editRef as React.RefObject<HTMLInputElement>}
                    defaultValue={activity.name}
                    className="bg-white/20 text-white text-2xl font-black rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white/50 w-full max-w-xs"
                    onKeyDown={(e) => { if (e.key === "Enter") saveField("name", e.currentTarget.value); if (e.key === "Escape") setEditingField(null); }}
                  />
                  <button onClick={() => saveField("name", (editRef.current as HTMLInputElement)?.value ?? "")} className="bg-white text-slate-900 rounded-lg px-3 py-1 text-sm font-bold">Save</button>
                  <button onClick={() => setEditingField(null)} className="text-white/70 hover:text-white text-sm">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 group mb-1">
                  <h1 className="text-3xl font-black">{activity.name}</h1>
                  <button onClick={() => { setEditingField("name"); }} className="opacity-0 group-hover:opacity-100 transition bg-white/20 hover:bg-white/40 rounded-lg p-1.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                </div>
              )}

              {/* Price + Duration badges */}
              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-sm font-bold text-white shadow">
                  {activity.creditCost} credit{activity.creditCost > 1 ? "s" : ""} · {(activity.creditCost * RATE).toLocaleString()} DA
                </span>
                {activity.duration && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white">
                    <svg className="h-3.5 w-3.5 text-white/80 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {activity.duration}
                  </span>
                )}
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${activity.active ? "bg-emerald-500 text-white" : "bg-slate-500 text-white"}`}>
                  ● {activity.active ? "Active" : "Disabled"}
                </span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                  (activity.eventType === "whatsapp" || activity.eventType === "variable") ? "bg-amber-500 text-white" : "bg-blue-500 text-white"
                }`}>
                  ● {(activity.eventType === "whatsapp" || activity.eventType === "variable") ? "Variable (announced via WhatsApp group)" : "Fixed (e.g., each Sunday)"}
                </span>
              </div>
 
              {/* Description */}
              {activity.description && (
                <p className="text-sm text-slate-200 max-w-2xl">{activity.description}</p>
              )}
 
              {/* Places */}
              {activity.places && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {predefinedPlaces.map((place, idx) => (
                    <span key={idx} className="inline-flex items-center bg-white/20 text-white rounded-full px-2.5 py-0.5 text-xs font-medium">
                      <svg className="h-3 w-3 text-white/80 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {place}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top controls */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Link href="/admin/activities" className="inline-flex items-center rounded-lg bg-white/90 hover:bg-white text-slate-900 px-3 py-1.5 text-xs font-semibold shadow-sm transition">
              ← Back
            </Link>
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Link href={`/admin/activities/${activity.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 px-3 py-1.5 text-xs font-semibold shadow-sm transition">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Edit Details
            </Link>
            <button
              onClick={() => setShowImageEdit(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 px-3 py-1.5 text-xs font-semibold shadow-sm transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Edit Cover
            </button>
            <button
              onClick={handleDeleteActivity}
              disabled={deletingActivity}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm transition disabled:opacity-60"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deletingActivity ? "Deleting…" : "Delete Activity"}
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Stats ──────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Price / Session</p>
          <p className="mt-2 text-xl md:text-2xl font-black text-blue-700">{(activity.creditCost * RATE).toLocaleString()} DZD</p>
          <p className="text-xs text-slate-400 mt-1">{activity.creditCost} credit{activity.creditCost > 1 ? "s" : ""} × {RATE.toLocaleString()} DZD</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Attendance</p>
          <p className="mt-2 text-xl md:text-2xl font-black text-indigo-700">{activity._count.redemptions.toLocaleString()} claims</p>
          <p className="text-xs text-slate-400 mt-1">Total check-ins</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Revenue</p>
          <p className="mt-2 text-xl md:text-2xl font-black text-[var(--success)]">{totalRevenue.toLocaleString()} DZD</p>
          <p className="text-xs text-[var(--muted)] mt-1">From redemptions</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Expenses</p>
          <p className="mt-2 text-xl md:text-2xl font-black text-[var(--danger)]">{totalExpenses.toLocaleString()} DZD</p>
          <p className="text-xs text-[var(--muted)] mt-1">Operational costs</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Net P&L</p>
          <p className={`mt-2 text-xl md:text-2xl font-black ${netProfit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {netProfit.toLocaleString()} DZD
          </p>
          <p className="text-xs text-[var(--muted)] mt-1 font-bold">
            {netProfit >= 0 ? "+" : ""}{margin}% Margin
          </p>
        </Card>
      </div>

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex border-b border-[var(--border)] bg-[var(--surface)] rounded-t-xl px-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3.5 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Events Tab ─────────────────────────────────────────────── */}
      {activeTab === "events" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Upcoming Events</h2>
            {/* Upcoming Events */}
            {upcomingSessions.length === 0 ? (
              <Card>
                <EmptyState
                  title="No events scheduled"
                  description="Schedule an event using the scheduler panel."
                  icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
                />
              </Card>
            ) : (
              upcomingSessions.map((session) => (
                <div key={session.id} className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] ${expandedEventId === session.id ? "" : "overflow-hidden"}`}>
                  <div onClick={() => setExpandedEventId(expandedEventId === session.id ? null : session.id)} className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition ${expandedEventId === session.id ? "rounded-t-xl" : "rounded-xl"}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold">{formatDate(session.sessionDate, locale, true)}</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5 flex items-center gap-1">
                          <svg className="h-3.5 w-3.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {session.location || "Unspecified"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone="default">{session.redemptions.length} attendee{session.redemptions.length === 1 ? "" : "s"}</Badge>
                      {session.capacity && <span className="text-xs text-[var(--muted)]">Cap: {session.capacity}</span>}
                      <Button variant="ghost" size="sm" loading={deletingSessionId === session.id} onClick={(e) => { e.stopPropagation(); handleDeleteEvent(session.id, session.redemptions.length); }} className="text-red-500 hover:text-red-700">
                        Cancel
                      </Button>
                    </div>
                  </div>
                  {expandedEventId === session.id && (
                    <div className="border-t border-[var(--border)] bg-slate-50/50 p-4 space-y-4">
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3">Add Client</h4>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className={`relative event-search-container-${session.id} flex-1 z-30`}>
                            <input
                              type="text"
                              placeholder="Type client name…"
                              value={searchQueryForEvent[session.id] || ""}
                              onChange={(e) => { setSearchQueryForEvent((p) => ({ ...p, [session.id]: e.target.value })); setShowEventDropdown((p) => ({ ...p, [session.id]: true })); if (!e.target.value) setSelectedClientForEvent((p) => ({ ...p, [session.id]: "" })); }}
                              onFocus={() => setShowEventDropdown((p) => ({ ...p, [session.id]: true }))}
                              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                            />
                            {showEventDropdown[session.id] && (
                              <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                                {(() => {
                                  const q = (searchQueryForEvent[session.id] || "").toLowerCase();
                                  const matching = q ? clients.filter((c) => c.fullName.toLowerCase().split(/\s+/).some((p) => p.startsWith(q))) : clients;
                                  if (matching.length === 0) return <p className="p-3 text-xs text-[var(--muted)] text-center">No clients match</p>;
                                  return matching.map((c) => (
                                    <button key={c.id} type="button"
                                      onClick={() => { setSelectedClientForEvent((p) => ({ ...p, [session.id]: c.id })); setSearchQueryForEvent((p) => ({ ...p, [session.id]: c.fullName })); setShowEventDropdown((p) => ({ ...p, [session.id]: false })); }}
                                      className="w-full px-3 py-2.5 text-left text-xs hover:bg-slate-50 transition flex items-center justify-between border-b border-[var(--border)] last:border-0"
                                    >
                                      <span className="font-bold">{c.fullName}</span>
                                      <Badge tone={c.balance === 0 ? "danger" : c.balance <= 2 ? "warning" : "success"} size="sm">{c.balance} credits</Badge>
                                    </button>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>
                          <Button onClick={() => handleRegisterClient(session.id)} loading={registeringEventId === session.id} disabled={!selectedClientForEvent[session.id]} className="shrink-0">
                            Register
                          </Button>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Attendees ({session.redemptions.length})</h4>
                          {session.redemptions.length > 0 && (
                            <Button
                              variant="danger"
                              size="sm"
                              loading={bulkRefundingSessionId === session.id}
                              onClick={() => handleBulkRefundSession(session.id, session.redemptions.length)}
                            >
                              Refund All ({session.redemptions.length})
                            </Button>
                          )}
                        </div>
                        {session.redemptions.length === 0 ? (
                          <p className="text-xs text-[var(--muted)] italic p-2 border border-dashed border-[var(--border)] rounded-lg">No clients registered.</p>
                        ) : (
                          <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
                            {session.redemptions.map((red) => (
                              <li key={red.id} className="flex items-center justify-between px-3 py-2.5 text-xs">
                                <div>
                                  <p className="font-bold">{red.client.fullName}</p>
                                  <p className="text-[10px] text-[var(--muted)] mt-0.5 flex items-center flex-wrap gap-2">
                                    {red.client.phone && (
                                      <span className="inline-flex items-center gap-0.5">
                                        <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        {red.client.phone}
                                      </span>
                                    )}
                                    {red.client.email && (
                                      <span className="inline-flex items-center gap-0.5">
                                        <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        {red.client.email}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[var(--muted)]">{formatDate(red.redeemedAt, locale, true).split(" ")[1] ?? ""}</span>
                                  <Button variant="danger" size="sm" loading={refundingRedemptionId === red.id} onClick={() => handleRefundClient(red.id)}>Refund</Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Past & Cancelled Events (summary in Events tab) */}
            {pastAndCancelledSessions.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted)] font-semibold">
                  {pastAndCancelledSessions.length} past / cancelled event{pastAndCancelledSessions.length !== 1 ? "s" : ""} — view full history in the{" "}
                  <button className="underline text-[var(--primary)]" onClick={() => setActiveTab("history")}>History tab</button>.
                </p>
              </div>
            )}
          </div>

          {/* Schedule panel */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Schedule Event</h2>
            <Card>
              {activity?.eventType !== "whatsapp" && activity?.eventType !== "variable" && (
                <div className="flex border-b border-[var(--border)] mb-4">
                  <button
                    type="button"
                    onClick={() => setScheduleMode("single")}
                    className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-colors ${
                      scheduleMode === "single"
                        ? "border-[var(--primary)] text-[var(--primary)]"
                        : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    Single Event
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode("bulk")}
                    className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-colors ${
                      scheduleMode === "bulk"
                        ? "border-[var(--primary)] text-[var(--primary)]"
                        : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    Auto-Generate 4 Events
                  </button>
                </div>
              )}

              {scheduleMode === "single" ? (
                <form onSubmit={handleScheduleEvent} className="space-y-4">
                  <Input label="Date & Time" name="sessionDate" type="datetime-local" required />
                  {predefinedPlaces.length > 0 ? (
                    <Select label="Location" name="location" defaultValue="">
                      <option value="">Select predefined place…</option>
                      {predefinedPlaces.map((place, idx) => <option key={idx} value={place}>{place}</option>)}
                    </Select>
                  ) : (
                    <Input label="Location" name="location" placeholder="e.g. Oued Fès" required />
                  )}
                  {predefinedPlaces.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-[var(--muted)] block">Or custom location</span>
                      <input type="text" name="customLocation" placeholder="e.g. Sebou River" className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]" onChange={(e) => { const sel = document.getElementsByName("location")[0] as HTMLSelectElement; if (sel && e.target.value) sel.value = ""; }} />
                    </div>
                  )}
                  <Input label="Capacity" name="capacity" type="number" min={1} placeholder="e.g. 12" />
                  <Button type="submit" className="w-full" loading={submittingEvent}>Schedule Event</Button>
                </form>
              ) : (
                <form onSubmit={handleScheduleBulkEvents} className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide block">Days of the Week</span>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = selectedDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedDays(selectedDays.filter((d) => d !== day.value));
                              } else {
                                setSelectedDays([...selectedDays, day.value]);
                              }
                            }}
                            className={`flex-1 min-w-[50px] py-1.5 px-2 rounded-lg text-xs font-bold text-center border transition-all ${
                              isSelected
                                ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                                : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:bg-slate-50"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Input
                    label="Event Time"
                    type="time"
                    value={bulkTime}
                    onChange={(e) => setBulkTime(e.target.value)}
                    required
                  />

                  {predefinedPlaces.length > 0 ? (
                    <Select
                      label="Location"
                      value={bulkLocation}
                      onChange={(e) => {
                        setBulkLocation(e.target.value);
                        if (e.target.value) setBulkCustomLocation("");
                      }}
                    >
                      <option value="">Select predefined place…</option>
                      {predefinedPlaces.map((place, idx) => <option key={idx} value={place}>{place}</option>)}
                    </Select>
                  ) : (
                    <Input
                      label="Location"
                      value={bulkLocation}
                      onChange={(e) => setBulkLocation(e.target.value)}
                      placeholder="e.g. Oued Fès"
                      required
                    />
                  )}
                  {predefinedPlaces.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-[var(--muted)] block">Or custom location</span>
                      <input
                        type="text"
                        value={bulkCustomLocation}
                        placeholder="e.g. Sebou River"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                        onChange={(e) => {
                          setBulkCustomLocation(e.target.value);
                          if (e.target.value) setBulkLocation("");
                        }}
                      />
                    </div>
                  )}
                  <Input
                    label="Capacity"
                    type="number"
                    min={1}
                    value={bulkCapacity}
                    onChange={(e) => setBulkCapacity(e.target.value)}
                    placeholder="e.g. 12"
                  />
                  <Button type="submit" className="w-full" loading={submittingEvent}>Generate & Schedule 4 Events</Button>
                </form>
              )}
            </Card>

            {/* Price reference mini-card */}
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Price Reference</p>
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                <p className="text-2xl font-extrabold text-blue-700">{(activity.creditCost * RATE).toLocaleString()} DZD</p>
                <p className="text-xs text-blue-500 mt-0.5">{activity.creditCost} credit{activity.creditCost > 1 ? "s" : ""} × {RATE.toLocaleString()} DZD/credit</p>
              </div>
              {activity.duration && (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">{activity.duration}</span>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-semibold">
                  {(activity.eventType === "whatsapp" || activity.eventType === "variable") ? "Variable (announced via WhatsApp group)" : "Fixed (e.g., each Sunday)"}
                </span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── History Tab ─────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Event History</h2>
            <span className="text-xs text-[var(--muted)] font-semibold">{pastAndCancelledSessions.length} event{pastAndCancelledSessions.length !== 1 ? "s" : ""}</span>
          </div>
          {pastAndCancelledSessions.length === 0 ? (
            <Card>
              <EmptyState
                title="No past events"
                description="Past and cancelled events will appear here after they occur."
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {pastAndCancelledSessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[var(--shadow-sm)]">
                  {/* Session header */}
                  <div
                    onClick={() => setExpandedEventId(expandedEventId === session.id ? null : session.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        session.active ? "bg-slate-100 text-slate-500" : "bg-red-50 text-red-400"
                      }`}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">{formatDate(session.sessionDate, locale, true)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {session.location || "Unspecified"}
                          </span>
                          <Badge tone={session.active ? "default" : "danger"} size="sm">
                            {session.active ? "Past" : "Cancelled"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={session.redemptions.length > 0 ? "default" : "warning"}>
                        {session.redemptions.length} attendee{session.redemptions.length === 1 ? "" : "s"}
                      </Badge>
                      <svg className={`h-4 w-4 text-[var(--muted)] transition-transform ${expandedEventId === session.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded attendee list */}
                  {expandedEventId === session.id && (
                    <div className="border-t border-[var(--border)] bg-slate-50/50 p-4 space-y-4">
                      {/* Attendees */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Attendees ({session.redemptions.length})</h4>
                        </div>
                        {session.redemptions.length === 0 ? (
                          <p className="text-xs text-[var(--muted)] italic p-2 border border-dashed border-[var(--border)] rounded-lg">No clients were registered.</p>
                        ) : (
                          <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
                            {session.redemptions.map((red) => (
                              <li key={red.id} className="flex items-center justify-between px-3 py-2.5 text-xs">
                                <div>
                                  <p className="font-bold">{red.client.fullName}</p>
                                  <p className="text-[10px] text-[var(--muted)] mt-0.5 flex items-center flex-wrap gap-2">
                                    {red.client.phone && (
                                      <span className="inline-flex items-center gap-0.5">
                                        <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        {red.client.phone}
                                      </span>
                                    )}
                                    {red.client.email && (
                                      <span className="inline-flex items-center gap-0.5">
                                        <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        {red.client.email}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <span className="text-[var(--muted)] tabular-nums">
                                  {formatDate(red.redeemedAt, locale, true)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Permanently delete */}
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={deletingSessionId === session.id}
                          onClick={() => handleHardDeleteEvent(session.id, session.redemptions.length)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold"
                        >
                          <span className="flex items-center gap-1">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Erase Permanently
                          </span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Gallery Tab ─────────────────────────────────────────────── */}
      {activeTab === "gallery" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="text-lg font-bold mb-4">Photo & Video Gallery</h2>
            <GalleryManager activityId={params.id} gallery={galleryItems} onSaved={loadActivityData} />
          </div>
          <div>
            <h2 className="text-lg font-bold mb-4">Tips</h2>
            <Card>
              <ul className="space-y-2.5 text-sm text-slate-500">
                {[
                  "Use Unsplash links for high quality photos",
                  "For videos, use YouTube embed URLs (youtube.com/embed/…)",
                  "Add captions to describe each media item",
                  "Click any image to open fullscreen lightbox",
                  "Click × on an item to remove it",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* ── Equipment Tab ───────────────────────────────────────────── */}
      {activeTab === "equipment" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="text-lg font-bold mb-4">Equipment List</h2>
            <EquipmentManager activityId={params.id} equipment={equipmentItems} onSaved={loadActivityData} />
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Equipment Types</h2>
            <Card>
              <div className="space-y-3 text-sm">
                {[
                  {
                    icon: (
                      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ),
                    label: "Provided",
                    desc: "Included in the activity price. Client does not pay extra.",
                    color: "text-emerald-600"
                  },
                  {
                    icon: (
                      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                      </svg>
                    ),
                    label: "Rent",
                    desc: "Client can rent this item on-site. Set the rental price.",
                    color: "text-amber-600"
                  },
                  {
                    icon: (
                      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                      </svg>
                    ),
                    label: "Buy",
                    desc: "Client must purchase. Available at location or bring their own.",
                    color: "text-blue-600"
                  },
                ].map((t) => (
                  <div key={t.label} className="flex items-start gap-3">
                    <span className={`mt-0.5 ${t.color}`}>{t.icon}</span>
                    <div>
                      <p className={`font-semibold text-sm ${t.color}`}>{t.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Coming Soon</p>
              <p className="text-sm text-slate-400">Rental booking system and equipment inventory tracking will be available in a future update.</p>
            </Card>
          </div>
        </div>
      )}

      {/* ── Expenses Tab ────────────────────────────────────────────── */}
      {activeTab === "expenses" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Expenses & Invoices</h2>
            <Card padding={false} className="overflow-hidden">
              {activity.expenses.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--muted)]">No expenses recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-slate-50 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                        <th className="px-5 py-3">Expense Item</th>
                        <th className="px-5 py-3">Amount</th>
                        <th className="px-5 py-3">Notes</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {activity.expenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3">
                            <p className="font-bold">{exp.name}</p>
                            <p className="text-[10px] text-[var(--muted)]">{formatDate(exp.createdAt, locale)}</p>
                          </td>
                          <td className="px-5 py-3 font-bold tabular-nums text-[var(--danger)]">{exp.amount.toLocaleString()} DA</td>
                          <td className="px-5 py-3 text-xs text-[var(--muted)] max-w-xs truncate">{exp.notes ?? "—"}</td>
                          <td className="px-5 py-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(exp.id)} loading={deletingExpenseId === exp.id} className="text-red-500 hover:text-red-700">Delete</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Record Expense</h2>
            <Card>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <Input label="Expense Title" name="name" placeholder="e.g. Instructor fee" required />
                <Input label="Cost (DA)" name="amount" type="number" min={1} placeholder="e.g. 1500" required />
                <Textarea label="Notes" name="notes" placeholder="Payment mode, details…" />
                <Button type="submit" className="w-full" loading={submittingExpense}>Record Expense</Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Image Edit Modal */}
      {showImageEdit && (
        <ImageEditModal
          activityId={params.id}
          current={activity.imageUrl}
          onClose={() => setShowImageEdit(false)}
          onSaved={loadActivityData}
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
