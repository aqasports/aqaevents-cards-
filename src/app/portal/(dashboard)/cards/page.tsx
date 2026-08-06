"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface OrgCard {
  id: string;
  cardCode: string;
  publicToken: string;
  status: string;
  issuedAt: string;
  clientId: string | null;
  client: {
    id: string;
    fullName: string;
    email: string | null;
    department?: { name: string } | null;
  } | null;
}

interface Employee {
  id: string;
  fullName: string;
  email: string | null;
}

export const dynamic = "force-dynamic";

export default function PortalCardsPage() {
  const sessionRes = useSession();
  const role = sessionRes?.data?.user?.role || "VIEWER";
  const canManage = role === "OWNER" || role === "HR_MANAGER";

  const [cards, setCards] = useState<OrgCard[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" | "info" } | null>(null);
  const [filter, setFilter] = useState<"all" | "blank" | "assigned">("all");

  // Link modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [linking, setLinking] = useState(false);

  // Unlink confirm state
  const [unlinkTarget, setUnlinkTarget] = useState<{ cardId: string; cardCode: string; employeeName: string } | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cardsRes, empRes] = await Promise.all([
        fetch("/api/portal/cards"),
        fetch("/api/portal/employees"),
      ]);
      if (cardsRes.ok) setCards(await cardsRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
    } catch {
      setMessage({ text: "Network error loading card data.", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleLink() {
    if (!selectedCardId || !selectedEmployeeId) return;
    setLinking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/portal/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link", cardId: selectedCardId, clientId: selectedEmployeeId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "Card linked to employee successfully.", tone: "success" });
        setLinkModalOpen(false);
        setSelectedCardId("");
        setSelectedEmployeeId("");
        await loadData();
      } else {
        setMessage({ text: data.error || "Failed to link card.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error.", tone: "danger" });
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink() {
    if (!unlinkTarget) return;
    setUnlinking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/portal/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink", cardId: unlinkTarget.cardId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `Card ${unlinkTarget.cardCode} returned to blank inventory.`, tone: "success" });
        setUnlinkTarget(null);
        await loadData();
      } else {
        setMessage({ text: data.error || "Failed to unlink card.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error.", tone: "danger" });
    } finally {
      setUnlinking(false);
    }
  }

  const blankCards = cards.filter((c) => !c.clientId);
  const assignedCards = cards.filter((c) => !!c.clientId);
  const filtered = cards.filter((c) =>
    filter === "all" ? true : filter === "blank" ? !c.clientId : !!c.clientId
  );

  return (
    <div className="space-y-6">

      {/* Unlink confirm modal */}
      {unlinkTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Unlink Card</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Unlink card <span className="font-mono font-bold text-slate-200">{unlinkTarget.cardCode}</span> from{" "}
                  <span className="font-semibold text-slate-200">{unlinkTarget.employeeName}</span>? The card will return to blank inventory.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setUnlinkTarget(null)}
                disabled={unlinking}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700 hover:border-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition flex items-center gap-1.5 disabled:opacity-60"
              >
                {unlinking ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Unlinking...
                  </>
                ) : (
                  "Unlink Card"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Link Card to Employee</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">Blank Card</label>
                <select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 outline-none focus:border-sky-500"
                >
                  <option value="">-- Select blank card --</option>
                  {blankCards.map((c) => (
                    <option key={c.id} value={c.id}>{c.cardCode}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 outline-none focus:border-sky-500"
                >
                  <option value="">-- Select employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setLinkModalOpen(false); setSelectedCardId(""); setSelectedEmployeeId(""); }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLink}
                disabled={!selectedCardId || !selectedEmployeeId || linking}
                className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition flex items-center gap-1.5 disabled:opacity-60"
              >
                {linking ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Linking...
                  </>
                ) : (
                  "Link Card"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Card Inventory</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage your organization's physical event cards and employee assignments.</p>
        </div>
        {canManage && blankCards.length > 0 && (
          <button
            onClick={() => setLinkModalOpen(true)}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-sky-500/10 flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Assign Card to Employee
          </button>
        )}
      </div>

      {/* Alert */}
      {message && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${
          message.tone === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : message.tone === "danger"
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-sky-500/10 border-sky-500/20 text-sky-400"
        }`}>
          {message.text}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Cards</p>
          <p className="text-2xl font-black text-white font-mono">{cards.length}</p>
          <p className="text-[11px] text-slate-500">In org inventory</p>
        </div>
        <div className="bg-[#0f172a] border border-amber-500/20 rounded-xl p-4 space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Blank</p>
          <p className="text-2xl font-black text-amber-400 font-mono">{blankCards.length}</p>
          <p className="text-[11px] text-slate-500">Available to issue</p>
        </div>
        <div className="bg-[#0f172a] border border-emerald-500/20 rounded-xl p-4 space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">Assigned</p>
          <p className="text-2xl font-black text-emerald-400 font-mono">{assignedCards.length}</p>
          <p className="text-[11px] text-slate-500">Active employee cards</p>
        </div>
      </div>

      {/* Card List */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        {/* Header + filter tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">
            Cards
            <span className="ml-2 text-slate-500 font-normal text-xs">({cards.length} total)</span>
          </h2>
          <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1">
            {(["all", "blank", "assigned"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition ${
                  filter === f
                    ? "bg-sky-500 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f === "all" ? `All (${cards.length})` : f === "blank" ? `Blank (${blankCards.length})` : `Assigned (${assignedCards.length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse flex items-center gap-4">
                <div className="h-3 bg-slate-700 rounded w-28" />
                <div className="h-3 bg-slate-700 rounded w-16" />
                <div className="h-3 bg-slate-700 rounded w-32 ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <svg className="h-10 w-10 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            <p className="text-sm font-semibold text-slate-400">No {filter === "all" ? "" : filter} cards found</p>
            <p className="text-xs text-slate-500 mt-1">
              {filter === "blank" ? "All cards are assigned to employees." : filter === "assigned" ? "No cards have been assigned yet." : "Contact your AQA account manager to add cards to your inventory."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  <tr>
                    <th className="px-4 py-3">Card Code</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Issued</th>
                    {canManage && <th className="px-4 py-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map((card) => (
                    <tr key={card.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-xs text-slate-200 tracking-wider">{card.cardCode}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          card.clientId
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {card.clientId ? "Assigned" : "Blank"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {card.client?.fullName || <span className="text-slate-500 italic text-xs">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {card.client?.department?.name || "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        {new Date(card.issuedAt).toLocaleDateString()}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          {card.clientId ? (
                            <button
                              onClick={() => setUnlinkTarget({ cardId: card.id, cardCode: card.cardCode, employeeName: card.client?.fullName ?? "" })}
                              className="text-xs text-red-400 hover:text-red-300 font-bold transition"
                            >
                              Unlink
                            </button>
                          ) : (
                            <button
                              onClick={() => { setSelectedCardId(card.id); setLinkModalOpen(true); }}
                              className="text-xs text-sky-400 hover:text-sky-300 font-bold transition"
                            >
                              Assign
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card stack */}
            <div className="md:hidden divide-y divide-slate-800">
              {filtered.map((card) => (
                <div key={card.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-bold text-xs text-slate-200 tracking-wider">{card.cardCode}</p>
                    <p className="text-sm text-slate-200 mt-0.5 truncate">
                      {card.client?.fullName || <span className="text-slate-500 italic text-xs">Unassigned</span>}
                    </p>
                    {card.client?.department && (
                      <p className="text-[11px] text-slate-500">{card.client.department.name}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                      card.clientId
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {card.clientId ? "Assigned" : "Blank"}
                    </span>
                    {canManage && (
                      card.clientId ? (
                        <button
                          onClick={() => setUnlinkTarget({ cardId: card.id, cardCode: card.cardCode, employeeName: card.client?.fullName ?? "" })}
                          className="text-xs text-red-400 font-bold"
                        >
                          Unlink
                        </button>
                      ) : (
                        <button
                          onClick={() => { setSelectedCardId(card.id); setLinkModalOpen(true); }}
                          className="text-xs text-sky-400 font-bold"
                        >
                          Assign
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
