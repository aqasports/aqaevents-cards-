"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Badge, Button, Input, Card } from "@/components/admin/ui";

interface SwimCardItem {
  id: string;
  cardCode: string;
  publicToken: string;
  status: string;
  url: string;
  qrDataUrl: string;
  memberId: string | null;
  member: {
    id: string;
    swimId: string;
    fullName: string;
    phone: string;
    level: string;
    paymentStatus: string;
    group: {
      name: string;
      coachName: string | null;
    } | null;
  } | null;
}

export default function SwimCardsPage() {
  const [cards, setCards] = useState<SwimCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "blank" | "assigned">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch Generation State
  const [batchCount, setBatchCount] = useState("20");
  const [generating, setGenerating] = useState(false);

  // Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCardCode, setLinkCardCode] = useState("");
  const [linkSwimmerId, setLinkSwimmerId] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  async function loadCards() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/swim/cards?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCards();
  }, [filter]);

  async function handleGenerateBatch(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/swim/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: parseInt(batchCount, 10) }),
      });
      if (res.ok) {
        loadCards();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLinking(true);
    setLinkError(null);

    try {
      const res = await fetch("/api/admin/swim/cards/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardCode: linkCardCode,
          memberSwimId: linkSwimmerId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setLinkError(data.error || "Failed to link card");
        return;
      }

      setShowLinkModal(false);
      setLinkCardCode("");
      setLinkSwimmerId("");
      loadCards();
    } catch (err) {
      setLinkError("Network error linking card");
    } finally {
      setLinking(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(cards.map((c) => c.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  function triggerPrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-6">
        <PageHeader
          title="Sector 4: AQA Swim PVC Cards QRCode Generator"
          description="Pre-generate sequential PVC card batches (SWM-000001), export sticker print sheets for the agency, and link cards to swimmers."
          action={
            <div className="flex gap-2">
              <Button onClick={() => setShowLinkModal(true)} variant="secondary">
                Link Card to Swimmer
              </Button>
              <Button onClick={triggerPrint} variant="primary">
                Print Selected Sheets ({selectedIds.size})
              </Button>
            </div>
          }
        />

        {/* Generator Controls */}
        <Card>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <form onSubmit={handleGenerateBatch} className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-semibold text-white whitespace-nowrap">
                Generate Blank Batch:
              </span>
              <select
                value={batchCount}
                onChange={(e) => setBatchCount(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="10">10 Cards</option>
                <option value="20">20 Cards</option>
                <option value="50">50 Cards</option>
                <option value="100">100 Cards</option>
              </select>
              <Button type="submit" variant="primary" size="sm" disabled={generating}>
                {generating ? "Generating..." : "Generate Batch"}
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={selectAll}>
                Select All
              </Button>
              <Button size="sm" variant="secondary" onClick={selectNone}>
                Deselect
              </Button>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] gap-1 w-fit">
          {(["all", "blank", "assigned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-white hover:bg-slate-800"
              }`}
            >
              {f === "all" ? "All Cards" : f === "blank" ? "Blank Cards" : "Assigned Passes"}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            Loading swim cards...
          </div>
        ) : cards.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            No cards found. Use the generator above to create a blank batch.
          </div>
        ) : (
          cards.map((item) => {
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`relative rounded-2xl border p-3.5 flex flex-col items-center text-center transition-all ${
                  isSelected
                    ? "border-cyan-400 bg-slate-900 ring-2 ring-cyan-500/30 shadow-[0_0_15px_rgba(0,242,255,0.15)]"
                    : "border-white/10 bg-slate-900/80 hover:border-white/20"
                } ${!isSelected ? "print:hidden" : "print:border-slate-300 print:bg-white print:text-black"}`}
              >
                {/* Select checkbox (screen only) */}
                <label className="absolute left-2.5 top-2.5 print:hidden cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.id)}
                    className="h-4 w-4 accent-cyan-500 rounded"
                  />
                </label>

                {/* Brand label */}
                <div className="w-full flex items-center justify-between pl-6 print:pl-0 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 print:text-slate-800">
                    AQA Swim
                  </span>
                  <span className="text-[8px] font-mono text-slate-500 print:text-slate-400">
                    {item.member ? "PASS" : "BLANK"}
                  </span>
                </div>

                {/* QR code */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.qrDataUrl}
                  alt={item.cardCode}
                  className="w-28 h-28 rounded-lg bg-white p-1 my-1 shadow-sm"
                />

                {/* Card Code */}
                <p className="font-mono text-sm font-black tracking-wider text-white print:text-black mt-1">
                  {item.cardCode}
                </p>

                {/* Swimmer info or blank */}
                <div className="mt-1 min-h-[32px] w-full">
                  {item.member ? (
                    <div>
                      <p className="text-[11px] font-bold text-slate-200 print:text-black truncate">
                        {item.member.fullName}
                      </p>
                      <p className="text-[9px] text-cyan-400 print:text-slate-600 truncate">
                        {item.member.group?.name || "No group"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] italic text-slate-500 print:text-slate-400">
                      Unassigned blank card
                    </p>
                  )}
                </div>

                {/* Live verification link (screen only) */}
                <div className="w-full pt-2 border-t border-white/5 print:hidden">
                  <Link
                    href={`/swim/card/${item.publicToken}`}
                    target="_blank"
                    className="text-[10px] text-cyan-400 hover:underline flex items-center justify-center gap-1"
                  >
                    <span>Test Scan View</span>
                    <span className="text-[8px]">↗</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Link Card Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">Link PVC Card to Swimmer</h3>
            <p className="text-xs text-slate-400">
              Enter the card code (from pre-printed PVC batch) and the swimmer&apos;s personal ID.
            </p>

            {linkError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
                {linkError}
              </div>
            )}

            <form onSubmit={handleLinkSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  PVC Card Code *
                </label>
                <Input
                  required
                  value={linkCardCode}
                  onChange={(e) => setLinkCardCode(e.target.value)}
                  placeholder="e.g. SWM-000001"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Swimmer ID *
                </label>
                <Input
                  required
                  value={linkSwimmerId}
                  onChange={(e) => setLinkSwimmerId(e.target.value)}
                  placeholder="e.g. SWM-001001"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={linking}
                  className="flex-1"
                >
                  Link Card
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
