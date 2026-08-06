"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface CardItem {
  id: string;
  cardCode: string;
  publicToken: string;
  status: string;
  issuedAt: string;
  clientId: string | null;
  organizationId: string | null;
  client: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    department: { name: string } | null;
  } | null;
}

interface Employee {
  id: string;
  fullName: string;
}

export const dynamic = "force-dynamic";

export default function PortalCardsPage() {
  const sessionRes = useSession();
  const session = sessionRes?.data;
  const role = session?.user?.role || "VIEWER";
  const canManage = role === "OWNER" || role === "HR_MANAGER";

  const [cards, setCards] = useState<CardItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  // Link modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [linking, setLinking] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<"all" | "blank" | "assigned">("all");

  async function loadData() {
    setLoading(true);
    try {
      const [cardsRes, empRes] = await Promise.all([
        fetch("/api/portal/cards"),
        fetch("/api/portal/employees"),
      ]);

      if (cardsRes.ok) {
        setCards(await cardsRes.json());
      }
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.map((e: any) => ({ id: e.id, fullName: e.fullName })));
      }
    } catch {
      setMessage({ text: "Failed to load card data.", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleLink() {
    if (!selectedCard || !selectedEmployee) return;
    setLinking(true);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "link",
          cardId: selectedCard.id,
          clientId: selectedEmployee,
        }),
      });

      if (res.ok) {
        setMessage({ text: `Card ${selectedCard.cardCode} linked successfully.`, tone: "success" });
        setShowLinkModal(false);
        setSelectedCard(null);
        setSelectedEmployee("");
        await loadData();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to link card.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error linking card.", tone: "danger" });
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(card: CardItem) {
    if (!confirm(`Unlink card ${card.cardCode} from ${card.client?.fullName}?`)) return;
    setMessage(null);

    try {
      const res = await fetch("/api/portal/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink", cardId: card.id }),
      });

      if (res.ok) {
        setMessage({ text: `Card ${card.cardCode} unlinked.`, tone: "success" });
        await loadData();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to unlink card.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error unlinking card.", tone: "danger" });
    }
  }

  const filteredCards = cards.filter((c) => {
    if (filter === "blank") return !c.clientId;
    if (filter === "assigned") return !!c.clientId;
    return true;
  });

  const blankCount = cards.filter((c) => !c.clientId).length;
  const assignedCount = cards.filter((c) => !!c.clientId).length;

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
        Loading card inventory...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Card Management</span>
          <h1 className="text-2xl font-bold text-white mt-1">Card Inventory</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            View all organization cards, link blank cards to employees, or unlink assigned cards
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-xl border text-xs font-medium ${
          message.tone === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0f172a] border border-slate-800/80 p-4 rounded-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Cards</span>
          <p className="text-2xl font-extrabold text-white font-mono mt-1">{cards.length}</p>
        </div>
        <div className="bg-[#0f172a] border border-slate-800/80 p-4 rounded-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Blank / Available</span>
          <p className="text-2xl font-extrabold text-amber-400 font-mono mt-1">{blankCount}</p>
        </div>
        <div className="bg-[#0f172a] border border-slate-800/80 p-4 rounded-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned</span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{assignedCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-bold">
        {(["all", "blank", "assigned"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`py-2.5 px-3 border-b-2 uppercase transition ${
              filter === f
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {f === "all" ? `All (${cards.length})` : f === "blank" ? `Blank (${blankCount})` : `Assigned (${assignedCount})`}
          </button>
        ))}
      </div>

      {/* Cards Table */}
      {filteredCards.length === 0 ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-xs text-slate-500">No cards found for this filter.</p>
        </div>
      ) : (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 uppercase text-[10px] tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-4">Card Code</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Issued</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCards.map((card) => (
                  <tr key={card.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-white">{card.cardCode}</td>
                    <td className="py-3 px-4">
                      {card.clientId ? (
                        <span className="inline-flex px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-full uppercase">
                          Assigned
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-full uppercase">
                          Blank
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {card.client?.fullName || <span className="text-slate-600 italic">Unassigned</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {card.client?.department?.name || "--"}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(card.issuedAt).toLocaleDateString()}
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        {!card.clientId ? (
                          <button
                            onClick={() => {
                              setSelectedCard(card);
                              setSelectedEmployee("");
                              setShowLinkModal(true);
                            }}
                            className="px-3 py-1.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold rounded-lg hover:bg-sky-500/20 transition"
                          >
                            Link to Employee
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnlink(card)}
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold rounded-lg hover:bg-red-500/20 transition"
                          >
                            Unlink
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Link Card to Employee</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-slate-500 hover:text-white text-lg"
              >
                x
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-500">Card Code</p>
                <p className="text-lg font-mono font-black text-sky-400 mt-0.5">{selectedCard.cardCode}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Select Employee</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLinkModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLink}
                disabled={!selectedEmployee || linking}
                className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {linking ? "Linking..." : "Link Card"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
