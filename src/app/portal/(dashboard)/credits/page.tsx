"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Employee {
  id: string;
  fullName: string;
}

export default function PortalCreditsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role || "VIEWER";
  const canManage = role === "OWNER" || role === "HR_MANAGER";

  const [sharedPool, setSharedPool] = useState(0);
  const [useSharedPool, setUseSharedPool] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Individual allocation form
  const [selectedClientId, setSelectedClientId] = useState("");
  const [allocAmount, setAllocAmount] = useState<number>(10);
  const [allocNotes, setAllocNotes] = useState("");
  const [allocating, setAllocating] = useState(false);

  // Request credits form
  const [requestCredits, setRequestCredits] = useState<number>(500);
  const [requestNotes, setRequestNotes] = useState("");
  const [requesting, setRequesting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [credRes, empRes] = await Promise.all([
        fetch("/api/portal/credits"),
        fetch("/api/portal/employees"),
      ]);

      if (credRes.ok && empRes.ok) {
        const credData = await credRes.json();
        const empData = await empRes.json();

        setSharedPool(credData.organization?.sharedCreditPool || 0);
        setUseSharedPool(credData.organization?.useSharedPool || false);
        setAllocations(credData.recentAllocations || []);
        setPendingRequests(credData.pendingRequests || []);
        setEmployees(empData.map((e: any) => ({ id: e.id, fullName: e.fullName })));
      }
    } catch {
      setMessage("Failed to load credit pool data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleIndividualAllocate(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || !selectedClientId || allocAmount <= 0) return;
    setAllocating(true);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "allocate_individual",
          clientId: selectedClientId,
          creditAmount: allocAmount,
          notes: allocNotes,
        }),
      });

      if (res.ok) {
        setMessage("Credits allocated successfully from pool to employee.");
        setSelectedClientId("");
        setAllocAmount(10);
        setAllocNotes("");
        await loadData();
      } else {
        const data = await res.json();
        setMessage(`Allocation failed: ${data.error}`);
      }
    } catch {
      setMessage("Network error performing allocation.");
    } finally {
      setAllocating(false);
    }
  }

  async function handleToggleSharedPool(newVal: boolean) {
    if (!canManage) return;
    try {
      const res = await fetch("/api/portal/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_shared_pool",
          useSharedPool: newVal,
        }),
      });

      if (res.ok) {
        setUseSharedPool(newVal);
        setMessage(`Shared pool mode updated to ${newVal ? "ON" : "OFF"}.`);
      }
    } catch {
      setMessage("Failed to toggle shared pool mode.");
    }
  }

  async function handleRequestCredits(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || requestCredits <= 0) return;
    setRequesting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_credits",
          requestedCredits: requestCredits,
          notes: requestNotes,
        }),
      });

      if (res.ok) {
        setMessage("Top-up request submitted to AQA Sports staff for review.");
        setRequestNotes("");
        await loadData();
      } else {
        const data = await res.json();
        setMessage(`Request failed: ${data.error}`);
      }
    } catch {
      setMessage("Network error submitting credit request.");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Company Credit Pool & Allocation</h1>
          <p className="text-xs text-slate-400 mt-1">
            Allocate credits directly to employees or enable shared pool redemption with department budget caps
          </p>
        </div>
        <div className="bg-[#0f172a] px-5 py-3 rounded-xl border border-slate-800 text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400">Available Credit Pool</span>
          <p className="text-2xl font-extrabold text-sky-400 font-mono">{sharedPool} Credits</p>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 text-xs font-medium">
          {message}
        </div>
      )}

      {/* Mode Toggle Block */}
      <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Shared Credit Pool Redemption Mode</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            When active, all registered employees in your organization can redeem activities directly from the unallocated pool balance (governed by department budget caps).
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => handleToggleSharedPool(!useSharedPool)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition border ${
              useSharedPool
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
            }`}
          >
            {useSharedPool ? "Shared Pool Mode: ACTIVE" : "Shared Pool Mode: INACTIVE"}
          </button>
        )}
      </div>

      {/* Grid: Allocate vs Request */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocate to Individual Employee */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white">Push Fixed Credits to Employee Card</h3>
          <p className="text-xs text-slate-400">
            Deduct credits from company pool and assign directly onto a specific employee's AQA Card.
          </p>

          <form onSubmit={handleIndividualAllocate} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400">Select Employee</label>
              <select
                disabled={!canManage}
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Credit Amount</label>
              <input
                type="number"
                min={1}
                max={sharedPool}
                disabled={!canManage}
                value={allocAmount}
                onChange={(e) => setAllocAmount(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Notes / Reason</label>
              <input
                type="text"
                disabled={!canManage}
                value={allocNotes}
                onChange={(e) => setAllocNotes(e.target.value)}
                placeholder="e.g. Q3 wellness reward"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={!canManage || allocating || !selectedClientId}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition"
            >
              {allocating ? "Allocating..." : "Allocate Credits"}
            </button>
          </form>
        </div>

        {/* Request Top-up from AQA Staff */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white">Request Additional Credit Pool (AQA Staff Action)</h3>
          <p className="text-xs text-slate-400">
            Submit a formal credit top-up request. AQA Sports staff will action the request and issue the corresponding invoice.
          </p>

          <form onSubmit={handleRequestCredits} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400">Requested Credits Amount</label>
              <input
                type="number"
                min={50}
                step={50}
                disabled={!canManage}
                value={requestCredits}
                onChange={(e) => setRequestCredits(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Special Notes / PO Number Reference</label>
              <input
                type="text"
                disabled={!canManage}
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="e.g. PO-2026-9981"
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={!canManage || requesting}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 font-bold rounded-xl transition"
            >
              {requesting ? "Submitting..." : "Submit Top-Up Request to Staff"}
            </button>
          </form>
        </div>
      </div>

      {/* Pending Requests & Allocation Audit History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Top-Up Requests</h4>
          {pendingRequests.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No pending top-up credit requests.</p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div key={req.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-sky-400">{req.confirmationCode}</span>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Requested: {new Date(req.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded uppercase">
                    Awaiting Staff Review
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Allocation Log */}
        <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Employee Pool Allocations</h4>
          {allocations.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No recent individual pool allocations.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allocations.map((item) => (
                <div key={item.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">{item.client?.fullName || "Employee"}</span>
                    <div className="text-slate-400 text-[11px] mt-0.5">{item.reason || "Pool allocation"}</div>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">+{item.delta} Credits</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
