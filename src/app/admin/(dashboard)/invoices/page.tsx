"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  Textarea,
  ConfirmModal,
} from "@/components/admin/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientOption = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
};

type Package = {
  id: string;
  name: string;
  creditAmount: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
};

type Invoice = {
  id: string;
  invoiceCode: string;
  amount: number;
  status: "paid" | "unpaid" | "refunded";
  category: "package" | "custom" | "adhoc";
  items: string;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  client: {
    id: string;
    fullName: string;
    phone: string | null;
    email: string | null;
  };
};

type Expense = {
  id: string;
  name: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  activityId: string;
  activity: {
    id: string;
    name: string;
  };
};

type Stats = {
  totalInvoiced: number;
  paidRevenue: number;
  unpaidOutstanding: number;
  refundedAmount: number;
  totalExpenses: number;
  netProfit: number;
};

type ReportsSummary = {
  totalRedemptions: number;
  totalCreditsSold: number;
  totalCreditsUsed: number;
  totalClientsWithCards: number;
};

type Activity = {
  id: string;
  name: string;
  creditCost: number;
  active: boolean;
  expenses: { id: string; amount: number }[];
  _count: { redemptions: number };
  sessions: { id: string }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RATE = 1900;

function fmt(n: number) {
  return n.toLocaleString("fr-DZ") + " DA";
}

function dateFmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toInputDateTime(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  unpaid: "bg-amber-100 text-amber-700",
  refunded: "bg-slate-100 text-slate-600",
};

const CAT_LABELS: Record<string, string> = {
  package: "Package",
  custom: "Custom Credits",
  adhoc: "Ad-hoc",
};

// ─── Print Invoice Modal ───────────────────────────────────────────────────────

function PrintModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice ${invoice.invoiceCode}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 40px; color: #111; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 24px; }
        .brand-name { font-size: 24px; font-weight: 800; color: #1d4ed8; }
        .brand-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .invoice-code { font-size: 18px; font-weight: 700; color: #374151; }
        .invoice-date { font-size: 12px; color: #9ca3af; margin-top: 4px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
        .client-name { font-size: 18px; font-weight: 700; }
        .client-detail { font-size: 13px; color: #6b7280; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f9fafb; text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
        td { padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
        .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #e5e7eb; }
        .watermark { text-align: center; font-size: 64px; font-weight: 900; letter-spacing: 0.2em; opacity: 0.06; color: #111; position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); pointer-events: none; }
        .status-paid { color: #059669; } .status-unpaid { color: #d97706; } .status-refunded { color: #6b7280; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Invoice Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 font-bold"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative">
            <div ref={printRef} className="font-sans text-slate-800">
              {/* Watermark */}
              <div
                className="pointer-events-none select-none fixed-none text-center"
                style={{
                  position: "absolute",
                  fontSize: "90px",
                  fontWeight: 900,
                  opacity: 0.03,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%) rotate(-30deg)",
                  whiteSpace: "nowrap",
                  color: "#111",
                  letterSpacing: "0.25em",
                }}
              >
                {invoice.status.toUpperCase()}
              </div>

              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6">
                <div>
                  <div className="text-2xl font-extrabold text-blue-700">AQA Sports</div>
                  <div className="text-xs text-slate-500 mt-1">Event Card Management System</div>
                  <div className="text-xs text-slate-400 mt-0.5">Algeria</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-700">{invoice.invoiceCode}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Issued: {dateFmt(invoice.createdAt)}
                  </div>
                  {invoice.paidAt && (
                    <div className="text-xs text-slate-400">Paid: {dateFmt(invoice.paidAt)}</div>
                  )}
                  <div
                    className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[invoice.status]}`}
                  >
                    {invoice.status}
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-6">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
                  Bill To
                </div>
                <div className="text-xl font-bold text-slate-900">{invoice.client.fullName}</div>
                {invoice.client.phone && (
                  <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{invoice.client.phone}</span>
                  </div>
                )}
                {invoice.client.email && (
                  <div className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{invoice.client.email}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse mb-6 text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-3">{invoice.items}</td>
                    <td className="py-3 px-3 text-slate-500">{CAT_LABELS[invoice.category]}</td>
                    <td className="py-3 px-3 text-right font-semibold">{fmt(invoice.amount)}</td>
                  </tr>
                  {invoice.notes && (
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-xs text-slate-400 italic">
                        Note: {(() => {
                          if (invoice.notes.startsWith("{") && invoice.notes.endsWith("}")) {
                            try {
                              const parsed = JSON.parse(invoice.notes);
                              return parsed.originalNotes ?? invoice.notes;
                            } catch {
                              return invoice.notes;
                            }
                          }
                          return invoice.notes;
                        })()}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td className="py-3 px-3 font-bold text-base" colSpan={2}>
                      Total
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-lg text-blue-700">
                      {fmt(invoice.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Footer */}
              <div className="text-center text-xs text-slate-400 border-t border-slate-200 pt-4 mt-4">
                Thank you for choosing AQA Sports • This is an official invoice
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Invoice Modal ────────────────────────────────────────────────────────

function EditInvoiceModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(invoice.amount));
  const [category, setCategory] = useState(invoice.category);
  const [items, setItems] = useState(invoice.items);
  const [notes, setNotes] = useState(() => {
    const raw = invoice.notes ?? "";
    if (raw.startsWith("{") && raw.endsWith("}")) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.originalNotes ?? raw;
      } catch {
        return raw;
      }
    }
    return raw;
  });
  const [status, setStatus] = useState(invoice.status);
  const [createdAt, setCreatedAt] = useState(toInputDateTime(invoice.createdAt));
  const [paidAt, setPaidAt] = useState(toInputDateTime(invoice.paidAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!items.trim()) {
      setError("Please enter a description.");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/admin/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parsedAmount,
        category,
        items: items.trim(),
        notes: notes.trim() || null,
        status,
        createdAt: new Date(createdAt).toISOString(),
        paidAt: status === "paid" ? (paidAt ? new Date(paidAt).toISOString() : new Date().toISOString()) : null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to update invoice.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Edit Invoice {invoice.invoiceCode}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 font-bold"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Client</label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 font-bold">
              {invoice.client.fullName}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (DA)"
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as "package" | "custom" | "adhoc")}
              required
            >
              <option value="package">Package</option>
              <option value="custom">Custom Credits</option>
              <option value="adhoc">Ad-hoc</option>
            </Select>
          </div>

          <Input
            label="Description"
            value={items}
            onChange={(e) => setItems(e.target.value)}
            required
          />

          <Textarea
            label="Notes"
            placeholder="Internal notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Payment Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(["paid", "unpaid", "refunded"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase transition ${
                    status === s
                      ? s === "paid"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : s === "unpaid"
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-slate-400 bg-slate-50 text-slate-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date Issued"
              type="datetime-local"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              required
            />
            {status === "paid" && (
              <Input
                label="Date Paid"
                type="datetime-local"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            )}
          </div>

          <div className="pt-2 flex gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              className="flex-1"
            >
              Save Invoice
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Expense Modal ────────────────────────────────────────────────────────

function EditExpenseModal({
  expense,
  activities,
  onClose,
  onSaved,
}: {
  expense: Expense;
  activities: Activity[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(expense.name);
  const [amount, setAmount] = useState(String(expense.amount));
  const [notes, setNotes] = useState(expense.notes ?? "");
  const [activityId, setActivityId] = useState(expense.activityId);
  const [createdAt, setCreatedAt] = useState(toInputDateTime(expense.createdAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter an expense title.");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/admin/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        amount: parsedAmount,
        notes: notes.trim() || null,
        activityId,
        createdAt: new Date(createdAt).toISOString(),
      }),
    });

    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to update expense.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Edit Activity Expense</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 font-bold"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Select
            label="Linked Activity *"
            value={activityId}
            onChange={(e) => setActivityId(e.target.value)}
            required
          >
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>

          <Input
            label="Expense Item Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Amount (DA) *"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Textarea
            label="Notes"
            placeholder="Expense notes, details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Input
            label="Recorded At *"
            type="datetime-local"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
            required
          />

          <div className="pt-2 flex gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              className="flex-1"
            >
              Save Expense
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Record Expense Card ────────────────────────────────────────────────────────

function RecordExpenseCard({
  activities,
  onCreated,
}: {
  activities: Activity[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [activityId, setActivityId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!activityId) {
      setError("Please select an activity.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityId,
        name: name.trim(),
        amount: parsedAmount,
        notes: notes.trim() || undefined,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setName("");
      setAmount("");
      setNotes("");
      setActivityId("");
      onCreated();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to record expense.");
    }
  }

  return (
    <Card>
      <h3 className="mb-4 text-base font-semibold">Record Activity Expense</h3>
      {error && <div className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Select Activity"
          value={activityId}
          onChange={(e) => setActivityId(e.target.value)}
          required
        >
          <option value="">— Select Activity —</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Input
          label="Expense Item Name"
          placeholder="e.g. Instructor fee, Transport, Gear maintenance"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Amount (DA)"
          type="number"
          min="1"
          placeholder="e.g. 5000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <Textarea
          label="Notes (Optional)"
          placeholder="e.g. Paid in cash"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button type="submit" className="w-full" loading={saving}>
          Record Expense
        </Button>
      </form>
    </Card>
  );
}

// ─── Create Invoice Form ───────────────────────────────────────────────────────

function CreateInvoiceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [category, setCategory] = useState<"package" | "custom" | "adhoc">("package");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [amount, setAmount] = useState("");
  const [customCredits, setCustomCredits] = useState("");
  const [items, setItems] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"paid" | "unpaid">("paid");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client autocomplete
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/packages")
      .then((r) => r.json())
      .then((data) => setPackages(data.filter((p: Package & { active: boolean }) => p.active)));
  }, []);

  useEffect(() => {
    if (clientSearch.length < 1) {
      setClientOptions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/admin/clients?search=${encodeURIComponent(clientSearch)}&limit=8`)
        .then((r) => r.json())
        .then((data) => setClientOptions(Array.isArray(data) ? data : data.clients ?? []));
    }, 200);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Auto-fill amount from package
  const selectedPkg = packages.find((p) => p.id === selectedPackageId);
  useEffect(() => {
    if (category === "package" && selectedPkg) {
      setAmount(String(selectedPkg.price));
      setItems(
        `${selectedPkg.name} Package — ${selectedPkg.creditAmount} credits + ${selectedPkg.bonusCredits} bonus (${selectedPkg.totalCredits} total)`
      );
    }
  }, [selectedPkg, category]);

  function getCreditDelta(): number | undefined {
    if (category === "adhoc") return undefined;
    if (category === "package" && selectedPkg) return selectedPkg.totalCredits;
    if (category === "custom") {
      const parsed = parseFloat(customCredits);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedClient) {
      setError("Please select a client.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!items.trim()) {
      setError("Please enter a description.");
      return;
    }

    const creditDelta = getCreditDelta();

    setSaving(true);
    const res = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selectedClient.id,
        amount: parsedAmount,
        category,
        items: items.trim(),
        notes: notes.trim() || undefined,
        status,
        packageId: category === "package" ? selectedPackageId || undefined : undefined,
        creditDelta,
        creditReason: `Invoice — ${items.trim()}`,
      }),
    });

    setSaving(false);
    if (res.ok) {
      onCreated();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create invoice.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Create New Invoice</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 font-bold"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Client Search */}
          <div className="relative z-30" ref={dropdownRef}>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Client *
            </label>
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                <div>
                  <p className="font-semibold text-sm text-slate-800">{selectedClient.fullName}</p>
                  {selectedClient.phone && (
                    <p className="text-xs text-slate-400">{selectedClient.phone}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Type client name..."
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                {showDropdown && clientOptions.length > 0 && (
                  <ul className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                    {clientOptions.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm"
                          onClick={() => {
                            setSelectedClient(c);
                            setClientSearch("");
                            setShowDropdown(false);
                          }}
                        >
                          <span className="font-medium">{c.fullName}</span>
                          {c.phone && (
                            <span className="ml-2 text-xs text-slate-400">{c.phone}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Invoice Category *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["package", "custom", "adhoc"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    setAmount("");
                    setItems("");
                    setSelectedPackageId("");
                    setCustomCredits("");
                  }}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                    category === cat
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {cat === "package" ? (
                    <span className="flex items-center justify-center gap-1">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                      Package
                    </span>
                  ) : cat === "custom" ? (
                    <span className="flex items-center justify-center gap-1">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      Custom
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      Ad-hoc
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {category === "package" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Select Package *
              </label>
              <select
                value={selectedPackageId}
                onChange={(e) => setSelectedPackageId(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              >
                <option value="">— Choose a package —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.creditAmount}+{p.bonusCredits} credits — {fmt(p.price)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {category === "custom" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Credits to Add *
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                placeholder="e.g. 5"
                value={customCredits}
                onChange={(e) => setCustomCredits(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                required
              />
            </div>
          )}

          <Input
            label="Amount (DA) *"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 19000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Input
            label="Description *"
            placeholder="e.g. Kayak Value Package (10 credits + 2 bonus)"
            value={items}
            onChange={(e) => setItems(e.target.value)}
            required
          />

          <Textarea
            label="Notes (optional)"
            placeholder="Internal notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Payment Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["paid", "unpaid"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                    status === s
                      ? s === "paid"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {s === "paid" ? (
                    <span className="flex items-center justify-center gap-1">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Paid
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Unpaid
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              className="flex-1"
            >
              Create Invoice
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [tab, setTab] = useState<"invoices" | "expenses" | "bookkeeping">("invoices");
  
  // Invoice states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Expenses states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseActivityFilter, setExpenseActivityFilter] = useState("all");
  const [activities, setActivities] = useState<Activity[]>([]);

  // Reports details state
  const [reportsSummary, setReportsSummary] = useState<ReportsSummary | null>(null);

  // Modals / Actions states
  const [showCreate, setShowCreate] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [editExpense, setEditExpense] = useState<Expense[] | Expense | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Load invoices & statistics
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    const res = await fetch(`/api/admin/invoices?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setInvoices(data.invoices);
      setStats(data.stats);
    }
    setLoading(false);
  }, [statusFilter, debouncedSearch]);

  // Load expenses
  const loadExpenses = useCallback(async () => {
    setExpensesLoading(true);
    const res = await fetch("/api/admin/expenses");
    if (res.ok) {
      const data = await res.json();
      setExpenses(data);
    }
    setExpensesLoading(false);
  }, []);

  // Load activities
  const loadActivities = useCallback(async () => {
    const res = await fetch("/api/admin/activities");
    if (res.ok) {
      const data = await res.json();
      setActivities(data);
    }
  }, []);

  // Load reports summary (credit stats)
  const loadReportsSummary = useCallback(async () => {
    const res = await fetch("/api/admin/reports/summary");
    if (res.ok) {
      const data = await res.json();
      setReportsSummary(data);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    if (tab === "expenses" || tab === "bookkeeping") {
      loadExpenses();
      loadActivities();
    }
    if (tab === "bookkeeping") {
      loadReportsSummary();
    }
  }, [tab, loadExpenses, loadActivities, loadReportsSummary]);

  const handleCreatedInvoice = () => {
    loadInvoices();
  };

  const handleSavedInvoice = () => {
    loadInvoices();
  };

  const handleSavedExpense = () => {
    loadExpenses();
    loadInvoices(); // update expense stats in header
  };

  async function markPaid(id: string) {
    setActionLoading(id + "-paid");
    await fetch(`/api/admin/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });
    setActionLoading(null);
    loadInvoices();
  }

  async function markRefunded(id: string) {
    triggerConfirm(
      "Refund Invoice",
      "Refund this invoice? This will reverse any credited balance.",
      async () => {
        setActionLoading(id + "-refund");
        await fetch(`/api/admin/invoices/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "refunded" }),
        });
        setActionLoading(null);
        loadInvoices();
      },
      true // isDanger
    );
  }

  async function deleteInvoice(id: string) {
    triggerConfirm(
      "Delete Invoice",
      "Delete this invoice? This cannot be undone.",
      async () => {
        setActionLoading(id + "-delete");
        await fetch(`/api/admin/invoices/${id}`, { method: "DELETE" });
        setActionLoading(null);
        loadInvoices();
      },
      true // isDanger
    );
  }

  async function deleteExpense(id: string) {
    triggerConfirm(
      "Delete Expense",
      "Delete this expense record?",
      async () => {
        setActionLoading(id + "-expense-delete");
        await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
        setActionLoading(null);
        loadExpenses();
        loadInvoices(); // reload stats card
      },
      true // isDanger
    );
  }

  const statCards = stats
    ? [
        {
          label: "Collected Revenue",
          value: fmt(stats.paidRevenue),
          icon: (
            <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: "bg-emerald-50/60 border-emerald-100",
          textColor: "text-emerald-700",
        },
        {
          label: "Outstanding Receivables",
          value: fmt(stats.unpaidOutstanding),
          icon: (
            <svg className="h-5 w-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: "bg-amber-50/60 border-amber-100",
          textColor: "text-amber-700",
        },
        {
          label: "Expenses",
          value: fmt(stats.totalExpenses),
          icon: (
            <svg className="h-5 w-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          ),
          color: "bg-red-50/60 border-red-100",
          textColor: "text-red-600",
        },
        {
          label: "Net Profit / Loss",
          value: fmt(stats.netProfit),
          icon: stats.netProfit >= 0 ? (
            <svg className="h-5 w-5 text-sky-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          ),
          color:
            stats.netProfit >= 0
              ? "bg-sky-50/60 border-sky-100 shadow-[0_0_15px_rgba(14,165,233,0.1)]"
              : "bg-red-50/60 border-red-100",
          textColor: stats.netProfit >= 0 ? "text-sky-700" : "text-red-600",
        },
      ]
    : [];

  // Filter expenses list
  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      !expenseSearch ||
      exp.name.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      (exp.notes ?? "").toLowerCase().includes(expenseSearch.toLowerCase());
    const matchesActivity =
      expenseActivityFilter === "all" || exp.activityId === expenseActivityFilter;
    return matchesSearch && matchesActivity;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices & Bookkeeping</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage billing invoices, track operational expenses, and analyze business performance.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </button>
      </div>

      {/* Statistics Panels */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl border p-4 ${card.color} flex flex-col gap-2 transition duration-200 hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  {card.label}
                </span>
                <span className="text-lg">{card.icon}</span>
              </div>
              <p className={`text-xl font-extrabold leading-tight ${card.textColor}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-200">
        {[
          {
            id: "invoices",
            label: "Invoices & Receipts",
            icon: (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            )
          },
          {
            id: "expenses",
            label: "Operational Expenses",
            icon: (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            )
          },
          {
            id: "bookkeeping",
            label: "Financial Ledger & P&L",
            icon: (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            )
          },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as "invoices" | "expenses" | "bookkeeping")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}

      {/* ── Tab: Invoices ──────────────────────────────────────────────── */}
      {tab === "invoices" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search client name or invoice code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1 bg-slate-50">
              {["all", "paid", "unpaid", "refunded"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                    statusFilter === s
                      ? "bg-white shadow text-slate-800 font-extrabold"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices List Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="h-12 w-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
                <p className="font-semibold text-sm">No invoices found</p>
                <p className="text-xs mt-1">Create your first invoice to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                        Description
                      </th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                        Category
                      </th>
                      <th className="text-right py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-center py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                          <div className="font-bold">{inv.invoiceCode}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{dateFmt(inv.createdAt)}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{inv.client.fullName}</div>
                          {inv.client.phone && <div className="text-[10px] text-slate-400 mt-0.5">{inv.client.phone}</div>}
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell text-slate-600 max-w-xs truncate" title={inv.items}>
                          {inv.items}
                        </td>
                        <td className="py-3.5 px-4 hidden sm:table-cell">
                          <Badge tone="default">{CAT_LABELS[inv.category]}</Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">{fmt(inv.amount)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${STATUS_COLORS[inv.status]}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit */}
                            <button
                              onClick={() => setEditInvoice(inv)}
                              title="Edit Details"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {/* Print */}
                            <button
                              onClick={() => setPrintInvoice(inv)}
                              title="Print Invoice"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                            {/* Mark Paid */}
                            {inv.status === "unpaid" && (
                              <button
                                onClick={() => markPaid(inv.id)}
                                disabled={actionLoading === inv.id + "-paid"}
                                title="Mark as Paid"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
                            {/* Refund */}
                            {inv.status === "paid" && (
                              <button
                                onClick={() => markRefunded(inv.id)}
                                disabled={actionLoading === inv.id + "-refund"}
                                title="Refund Invoice"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 hover:text-amber-700 transition"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                              </button>
                            )}
                            {/* Delete */}
                            <button
                              onClick={() => deleteInvoice(inv.id)}
                              disabled={actionLoading === inv.id + "-delete"}
                              title="Delete Invoice"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Expenses ──────────────────────────────────────────────── */}
      {tab === "expenses" && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Record expense card */}
          <div>
            <RecordExpenseCard
              activities={activities}
              onCreated={loadExpenses}
            />
          </div>

          {/* Expenses table & filters */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Search expense name or notes…"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <Select
                value={expenseActivityFilter}
                onChange={(e) => setExpenseActivityFilter(e.target.value)}
                className="w-full sm:w-56"
              >
                <option value="all">All Activities</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>

            <Card padding={false} className="overflow-hidden">
              {expensesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                </div>
              ) : filteredExpenses.length === 0 ? (
                <p className="py-20 text-center text-sm text-slate-400 italic">No expenses recorded matching filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-3">Expense Item</th>
                        <th className="px-5 py-3">Activity</th>
                        <th className="px-5 py-3">Amount</th>
                        <th className="px-5 py-3">Notes</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-slate-800">{exp.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{dateFmt(exp.createdAt)}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <Link href={`/admin/activities/${exp.activityId}`} className="text-blue-600 font-semibold hover:underline">
                              {exp.activity.name}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-red-500 tabular-nums">{fmt(exp.amount)}</td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 max-w-xs truncate" title={exp.notes ?? ""}>
                            {exp.notes ?? "—"}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditExpense(exp)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteExpense(exp.id)}
                                disabled={actionLoading === exp.id + "-expense-delete"}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab: Bookkeeping ───────────────────────────────────────────── */}
      {tab === "bookkeeping" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cash accounting report */}
            <Card>
              <h3 className="mb-4 text-base font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
                <svg className="h-5 w-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cash Accounting (Actual Flows)
              </h3>
              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Collected Cash Revenue (Paid Invoices)</span>
                  <span className="font-extrabold text-emerald-600">{stats ? fmt(stats.paidRevenue) : "—"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b pb-2">
                  <span className="text-slate-500 font-medium">Total Paid Expenses</span>
                  <span className="font-extrabold text-red-500">- {stats ? fmt(stats.totalExpenses) : "—"}</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-base font-black text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span>Net Operational Income (Cash Flow)</span>
                  <span className={stats && stats.netProfit >= 0 ? "text-emerald-600" : "text-red-500"}>
                    {stats ? fmt(stats.netProfit) : "—"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Accrual and Credit Liability report */}
            <Card>
              <h3 className="mb-4 text-base font-bold text-slate-800 border-b pb-2 flex items-center gap-1.5">
                <svg className="h-5 w-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Accrual Overview & Client Liability
              </h3>
              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Accounts Receivable (Unpaid Invoices)</span>
                  <span className="font-extrabold text-amber-600">{stats ? fmt(stats.unpaidOutstanding) : "—"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Total Billing volume (All Invoices)</span>
                  <span className="font-bold text-slate-700">{stats ? fmt(stats.totalInvoiced) : "—"}</span>
                </div>
                {reportsSummary ? (
                  <>
                    <div className="flex justify-between items-center py-1 border-t pt-2">
                      <span className="text-slate-500 font-medium">Active Owed Credits (Client Balance Sheet)</span>
                      <span className="font-bold text-slate-700">
                        {reportsSummary.totalCreditsSold - reportsSummary.totalCreditsUsed} credits
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 text-base font-black text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span>Total Credit Liability (Owed Services)</span>
                      <span className="text-blue-600">
                        {fmt((reportsSummary.totalCreditsSold - reportsSummary.totalCreditsUsed) * RATE)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">Loading credit liability metrics…</div>
                )}
              </div>
            </Card>
          </div>

          {/* Activity Profit & Loss Breakdown */}
          <div>
            <h3 className="mb-4 text-base font-bold text-slate-800">Activity P&L Performance Summary</h3>
            <Card padding={false} className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3 text-left">Activity Name</th>
                      <th className="px-5 py-3 text-center">Sessions</th>
                      <th className="px-5 py-3 text-center">Redemptions</th>
                      <th className="px-5 py-3 text-right">Revenue (DA)</th>
                      <th className="px-5 py-3 text-right">Expenses (DA)</th>
                      <th className="px-5 py-3 text-right">Net Profit / Loss (DA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activities.map((act) => {
                      const redemptions = act._count.redemptions;
                      const revenue = redemptions * act.creditCost * RATE;
                      const expenses = act.expenses.reduce((s, e) => s + e.amount, 0);
                      const profit = revenue - expenses;
                      return (
                        <tr key={act.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-5 py-3.5 font-bold text-slate-800">
                            <Link href={`/admin/activities/${act.id}`} className="hover:underline hover:text-blue-600">
                              {act.name}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 text-center text-slate-500">{act.sessions.length}</td>
                          <td className="px-5 py-3.5 text-center font-semibold text-slate-700">{redemptions}</td>
                          <td className="px-5 py-3.5 text-right font-medium text-slate-700">{revenue.toLocaleString()} DA</td>
                          <td className="px-5 py-3.5 text-right font-medium text-slate-500">{expenses.toLocaleString()} DA</td>
                          <td className={`px-5 py-3.5 text-right font-extrabold ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {profit >= 0 ? "+" : ""}{profit.toLocaleString()} DA
                          </td>
                        </tr>
                      );
                    })}

                    {/* Summary row */}
                    {activities.length > 0 && (() => {
                      const totalRedemptions = activities.reduce((sum, a) => sum + a._count.redemptions, 0);
                      const totalRevenue = activities.reduce((sum, a) => sum + a._count.redemptions * a.creditCost * RATE, 0);
                      const totalExpenses = activities.reduce((sum, a) => sum + a.expenses.reduce((s, e) => s + e.amount, 0), 0);
                      const totalProfit = totalRevenue - totalExpenses;
                      return (
                        <tr className="bg-slate-50/80 font-black border-t-2 border-slate-200 text-slate-900">
                          <td className="px-5 py-4 text-base">Total Performance</td>
                          <td className="px-5 py-4 text-center">—</td>
                          <td className="px-5 py-4 text-center">{totalRedemptions}</td>
                          <td className="px-5 py-4 text-right text-blue-700">{totalRevenue.toLocaleString()} DA</td>
                          <td className="px-5 py-4 text-right text-red-500">{totalExpenses.toLocaleString()} DA</td>
                          <td className={`px-5 py-4 text-right text-lg ${totalProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {totalProfit >= 0 ? "+" : ""}{totalProfit.toLocaleString()} DA
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreatedInvoice}
        />
      )}
      {printInvoice && (
        <PrintModal
          invoice={printInvoice}
          onClose={() => setPrintInvoice(null)}
        />
      )}
      {editInvoice && (
        <EditInvoiceModal
          invoice={editInvoice}
          onClose={() => setEditInvoice(null)}
          onSaved={handleSavedInvoice}
        />
      )}
      {editExpense && (
        <EditExpenseModal
          expense={editExpense as Expense}
          activities={activities}
          onClose={() => setEditExpense(null)}
          onSaved={handleSavedExpense}
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
