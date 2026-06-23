"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  Textarea,
  ConfirmModal,
} from "@/components/admin/ui";

type Package = {
  id: string;
  name: string;
  creditAmount: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
};

type LedgerEntry = {
  id: string;
  delta: number;
  type: string;
  reason: string | null;
  createdAt: string;
  package: { name: string } | null;
  createdBy: { name: string } | null;
};

type Redemption = {
  id: string;
  creditsUsed: number;
  redeemedAt: string;
  activity: { name: string };
  session: { sessionDate: string; location: string | null } | null;
  staff: { name: string } | null;
  notes: string | null;
};

type ClientDetail = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  balance: number;
  cards: Array<{
    id: string;
    cardCode: string;
    publicToken: string;
    status: string;
    issuedAt: string;
  }>;
  ledgerEntries: LedgerEntry[];
  redemptions: Redemption[];
  // CRM Fields
  leadSource: string | null;
  customerSegment: string | null;
  totalSpent: number | null;
  lastActivityDate: string | null;
  favoriteActivity: string | null;
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [tab, setTab] = useState<"ledger" | "redemptions" | "notifications">("ledger");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    setNotificationsError("");
    try {
      const res = await fetch(`/api/admin/clients/${params.id}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      } else {
        const data = await res.json();
        setNotificationsError(data.error ?? "Failed to fetch notifications.");
      }
    } catch {
      setNotificationsError("Network error. Failed to fetch notifications.");
    } finally {
      setLoadingNotifications(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (tab === "notifications") {
      loadNotifications();
    }
  }, [tab, loadNotifications]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingCredits, setSubmittingCredits] = useState(false);
  const [reissuingCard, setReissuingCard] = useState(false);
  const [editingLedgerIdLoading, setEditingLedgerIdLoading] = useState<string | null>(null);
  const [deletingLedgerId, setDeletingLedgerId] = useState<string | null>(null);
  const [refundingRedemptionId, setRefundingRedemptionId] = useState<string | null>(null);

  // Storing state for editing individual credit history (ledger) records
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);
  const [editDelta, setEditDelta] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>("");

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

  // Balance adjuster states
  const [adjustMode, setAdjustMode] = useState<"package" | "money" | "manual">("package");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [moneyAmount, setMoneyAmount] = useState("");
  const [baseCredits, setBaseCredits] = useState(0);
  const [bonusCredits, setBonusCredits] = useState(0);
  const [moneyReason, setMoneyReason] = useState("");
  const [customCredits, setCustomCredits] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [changeOption, setChangeOption] = useState<"refund" | "convert">("refund");
  const [paidMoney, setPaidMoney] = useState("");

  const activeCard = client?.cards.find((c) => c.status === "active");
  const publicUrl = activeCard
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/eventcard/${activeCard.publicToken}`
    : null;

  const [isFlipped, setIsFlipped] = useState(false);
  const [activeCardQrUrl, setActiveCardQrUrl] = useState("");

  useEffect(() => {
    if (publicUrl) {
      QRCode.toDataURL(publicUrl, { margin: 1, width: 200 })
        .then(setActiveCardQrUrl)
        .catch(console.error);
    } else {
      setActiveCardQrUrl("");
    }
  }, [publicUrl]);

  const loadClient = useCallback(async () => {
    const res = await fetch(`/api/admin/clients/${params.id}`);
    const data = await res.json();
    setClient(data);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadClient();
    fetch("/api/admin/packages")
      .then((r) => r.json())
      .then((data) => setPackages(data.filter((p: Package & { active: boolean }) => p.active)));
  }, [loadClient]);

  async function addCredits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingCredits(true);
    setMessage(null);

    let bodyPayload: Record<string, unknown> = {};

    if (adjustMode === "package") {
      if (!selectedPackageId) {
        setSubmittingCredits(false);
        return;
      }
      const pkg = packages.find((p) => p.id === selectedPackageId);
      if (!pkg) {
        setSubmittingCredits(false);
        return;
      }

      const invoiceAmount = paidMoney ? parseFloat(paidMoney) : pkg.price;
      const moneyPaidStr = `${invoiceAmount.toLocaleString()} DA`;
      const computedReason = moneyReason
        ? `Package: ${pkg.name} (${pkg.creditAmount} paid + ${pkg.bonusCredits} bonus) - Paid: ${moneyPaidStr} - ${moneyReason}`
        : `Package: ${pkg.name} (${pkg.creditAmount} paid + ${pkg.bonusCredits} bonus) - Paid: ${moneyPaidStr}`;

      bodyPayload = {
        packageId: selectedPackageId,
        reason: computedReason,
        invoice: {
          amount: invoiceAmount,
          category: "package",
          items: `${pkg.name} Package — ${pkg.creditAmount} credits + ${pkg.bonusCredits} bonus (${pkg.totalCredits} total)`,
          notes: moneyReason || undefined,
          status: "paid",
        },
      };
    } else if (adjustMode === "money") {
      const parsedMoney = parseFloat(moneyAmount) || 0;
      const rest = parsedMoney % 1900;
      const hasRest = rest > 0;
      const isConvert = hasRest && changeOption === "convert";

      const total = baseCredits + bonusCredits + (isConvert ? 1 : 0);
      if (total === 0) {
        setMessage({ text: "Total credits to add must be greater than 0.", tone: "danger" });
        setSubmittingCredits(false);
        return;
      }

      let restInfo = "";
      if (hasRest) {
        restInfo = isConvert
          ? ` + 1 rest; change of ${rest.toLocaleString()} DA converted`
          : `; change of ${rest.toLocaleString()} DA refunded`;
      }

      const computedReason = moneyReason
        ? `Payment: ${parsedMoney.toLocaleString()} DA (${baseCredits} paid + ${bonusCredits} bonus${restInfo}) - ${moneyReason}`
        : `Payment: ${parsedMoney.toLocaleString()} DA (${baseCredits} paid + ${bonusCredits} bonus${restInfo})`;

      bodyPayload = {
        customAmount: total,
        reason: computedReason,
        invoice: {
          amount: parsedMoney,
          category: "custom",
          items: `Custom recharge — ${baseCredits} paid + ${bonusCredits} bonus${isConvert ? " + 1 rest" : ""} = ${total} credits`,
          notes: moneyReason || (hasRest ? `Change: ${rest.toLocaleString()} DA ${isConvert ? "converted to credit" : "refunded"}` : undefined),
          status: "paid",
        },
      };
    } else if (adjustMode === "manual") {
      const amount = Number(customCredits);
      if (isNaN(amount) || amount === 0) {
        setMessage({ text: "Please enter a non-zero adjustment amount.", tone: "danger" });
        setSubmittingCredits(false);
        return;
      }

      let computedReason = manualReason;
      if (paidMoney) {
        computedReason = `${manualReason} - Paid: ${parseFloat(paidMoney).toLocaleString()} DA`;
      }

      bodyPayload = {
        customAmount: amount,
        reason: computedReason,
        // Only create invoice if money was actually paid
        ...(paidMoney && parseFloat(paidMoney) > 0
          ? {
              invoice: {
                amount: parseFloat(paidMoney),
                category: "adhoc",
                items: manualReason || `Manual adjustment: ${amount > 0 ? "+" : ""}${amount} credits`,
                status: "paid",
              },
            }
          : {}),
      };
    }

    try {
      const res = await fetch(`/api/admin/clients/${params.id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (res.ok) {
        const resData = await res.json();
        const invoiceMsg = resData.invoice ? ` · Invoice ${resData.invoice.invoiceCode} created.` : "";
        setMessage({ text: `Balance adjusted successfully.${invoiceMsg}`, tone: "success" });
        setSelectedPackageId("");
        setMoneyAmount("");
        setBaseCredits(0);
        setBonusCredits(0);
        setMoneyReason("");
        setCustomCredits("");
        setManualReason("");
        setPaidMoney("");
        setChangeOption("refund");
        await loadClient();
      } else {
        let errorMsg = "Failed to adjust balance.";
        try {
          const data = await res.json();
          errorMsg = data.error ?? errorMsg;
        } catch {
          errorMsg = `Server error (status ${res.status}).`;
        }
        setMessage({ text: errorMsg, tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Network error adjusting balance.", tone: "danger" });
    } finally {
      setSubmittingCredits(false);
    }
  }

  async function saveLedgerEdit(id: string) {
    setEditingLedgerIdLoading(id);
    try {
      const res = await fetch(`/api/admin/ledger/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delta: editDelta,
          reason: editReason,
        }),
      });
      if (res.ok) {
        setMessage({ text: "Ledger entry updated successfully.", tone: "success" });
        setEditingLedgerId(null);
        await loadClient();
      } else {
        let errorMsg = "Failed to update ledger entry.";
        try {
          const data = await res.json();
          errorMsg = data.error ?? errorMsg;
        } catch {}
        setMessage({ text: errorMsg, tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Network error updating ledger entry.", tone: "danger" });
    } finally {
      setEditingLedgerIdLoading(null);
    }
  }

  async function deleteLedgerEntry(id: string) {
    triggerConfirm(
      "Delete Ledger Entry",
      "Are you sure you want to delete this ledger entry? This will permanently adjust the client's balance.",
      async () => {
        setDeletingLedgerId(id);
        try {
          const res = await fetch(`/api/admin/ledger/${id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setMessage({ text: "Ledger entry deleted successfully.", tone: "success" });
            await loadClient();
          } else {
            let errorMsg = "Failed to delete ledger entry.";
            try {
              const data = await res.json();
              errorMsg = data.error ?? errorMsg;
            } catch {}
            setMessage({ text: errorMsg, tone: "danger" });
          }
        } catch (err) {
          console.error(err);
          setMessage({ text: "Network error deleting ledger entry.", tone: "danger" });
        } finally {
          setDeletingLedgerId(null);
        }
      },
      true // isDanger
    );
  }

  async function refundRedemption(id: string) {
    triggerConfirm(
      "Refund Redemption",
      "Refund this redemption? This will cancel the redemption record and return the credits to the client's balance.",
      async () => {
        setRefundingRedemptionId(id);
        try {
          const res = await fetch(`/api/admin/redemptions/${id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setMessage({ text: "Redemption refunded successfully.", tone: "success" });
            await loadClient();
          } else {
            let errorMsg = "Failed to refund redemption.";
            try {
              const data = await res.json();
              errorMsg = data.error ?? errorMsg;
            } catch {}
            setMessage({ text: errorMsg, tone: "danger" });
          }
        } catch (err) {
          console.error(err);
          setMessage({ text: "Network error refunding redemption.", tone: "danger" });
        } finally {
          setRefundingRedemptionId(null);
        }
      }
    );
  }

  async function reissueCard() {
    triggerConfirm(
      "Reissue Card",
      "Replace this card? The old card will be deactivated and a new QR token generated.",
      async () => {
        setReissuingCard(true);
        try {
          const res = await fetch(`/api/admin/clients/${params.id}/reissue-card`, { method: "POST" });
          if (res.ok) {
            setMessage({ text: "New card issued. Old card has been deactivated.", tone: "success" });
            await loadClient();
          } else {
            setMessage({ text: "Failed to reissue card.", tone: "danger" });
          }
        } catch {
          setMessage({ text: "Network error reissuing card.", tone: "danger" });
        } finally {
          setReissuingCard(false);
        }
      },
      true // isDanger
    );
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);

    const res = await fetch(`/api/admin/clients/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: formData.get("fullName"),
        email: formData.get("email") || null,
        phone: formData.get("phone") || null,
        notes: formData.get("notes") || null,
        leadSource: formData.get("leadSource") || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage({ text: "Contact info updated.", tone: "success" });
      setEditing(false);
      await loadClient();
    } else {
      setMessage({ text: "Failed to update contact.", tone: "danger" });
    }
  }

  if (loading || !client) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p className="text-sm text-[var(--muted)]">Loading client…</p>
        </div>
      </div>
    );
  }
  return (
    <div className="animate-fade-in">
      <PageHeader
        title={client.fullName}
        description="Client profile, card, balance, and activity history."
        action={
          <Link href="/admin/clients" className="text-sm text-[var(--primary)] hover:underline">
            ← Back to clients
          </Link>
        }
      />

      {message && (
        <div className="mb-6">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

      {/* Top row: Balance + Card */}
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        {/* Balance */}
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Current balance</p>
          <p
            className={`mt-3 text-5xl font-black tabular-nums ${
              client.balance === 0
                ? "text-[var(--danger)]"
                : client.balance <= 2
                ? "text-[var(--warning)]"
                : "text-[var(--success)]"
            }`}
          >
            {client.balance}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {client.balance === 1 ? "activity remaining" : "activities remaining"}
          </p>
          {client.balance === 0 && (
            <p className="mt-2 text-xs text-[var(--danger)] flex items-center gap-1">
              <svg className="h-3.5 w-3.5 text-[var(--danger)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Top up required before next redemption
            </p>
          )}
        </Card>

        {/* Card info */}
        <Card className="lg:col-span-2">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {activeCard ? "Active card" : "No active card"}
                </p>
                {activeCard ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--muted)]">Card Code:</span>
                      <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">{activeCard.cardCode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--muted)]">Date Issued:</span>
                      <span className="font-semibold">{new Date(activeCard.issuedAt).toLocaleDateString(undefined, { dateStyle: "long" })}</span>
                    </div>
                    {publicUrl && (
                      <div className="space-y-1">
                        <span className="text-xs text-[var(--muted)] block">Public Balance Page URL:</span>
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--primary)] hover:underline break-all font-mono text-xs bg-blue-50 px-2.5 py-1.5 rounded block border border-blue-100"
                        >
                          {publicUrl}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[var(--muted)]">No card has been issued to this client.</p>
                )}
              </div>

              {activeCard && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={reissueCard} loading={reissuingCard}>
                    Reissue card
                  </Button>
                  <Link href="/admin/print">
                    <Button variant="ghost" size="sm">
                      Print QR sticker →
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Realistic 3D card preview */}
            {activeCard && (
              <div className="flex flex-col items-center gap-2 shrink-0 select-none">
                <div 
                  className="relative w-[280px] h-[177px] cursor-pointer group"
                  style={{ perspective: "1000px" }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div 
                    className="relative w-full h-full duration-500 transition-transform"
                    style={{ 
                      transformStyle: "preserve-3d",
                      transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                    }}
                  >
                    {/* Front Face */}
                    <div 
                      className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-md bg-slate-900"
                      style={{ 
                        backfaceVisibility: "hidden",
                        backgroundImage: "url('/image/face.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center"
                      }}
                    >
                      {/* Front overlay details */}
                      <div className="absolute inset-0 bg-black/10 flex flex-col justify-between p-4 text-white">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-blue-700 px-2 py-0.5 rounded shadow">
                            AQA
                          </span>
                          <span className="text-[9px] font-semibold text-white/80 uppercase">
                            Sports Card
                          </span>
                        </div>
                        <div>
                          <p className="font-mono text-sm font-bold tracking-wide drop-shadow-md">
                            {client.fullName}
                          </p>
                          <p className="font-mono text-[10px] text-white/70 tracking-widest mt-0.5">
                            {activeCard?.cardCode}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Back Face */}
                    <div 
                      className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-md bg-slate-900"
                      style={{ 
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                        backgroundImage: "url('/image/back.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center"
                      }}
                    >
                      {/* Back overlay details: QR sticker */}
                      <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center p-3">
                        {activeCardQrUrl ? (
                          <div className="bg-white p-1.5 rounded-lg shadow-lg flex flex-col items-center gap-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={activeCardQrUrl} 
                              alt="QR Code" 
                              className="w-[85px] h-[85px]"
                            />
                            <span className="font-mono text-[8px] font-black text-slate-800 tracking-wider">
                              {activeCard?.cardCode}
                            </span>
                          </div>
                        ) : (
                          <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-[10px] text-slate-600 font-bold">
                            Generating QR…
                          </div>
                        )}
                        <span className="text-[8px] text-white/70 font-medium tracking-widest uppercase mt-2 drop-shadow">
                          Scan to check balance
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic flex items-center gap-1 justify-center">
                  <svg className="h-3 w-3 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Click card to flip and view QR code
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Middle row: Add credits + Contact */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        {/* Adjust balance */}
        {/* Adjust balance */}
        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h3 className="text-base font-semibold">Adjust balance</h3>
            <div className="flex rounded-md bg-slate-100 p-0.5 text-[10px] sm:text-xs">
              {(["package", "money", "manual"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setAdjustMode(m);
                    setMessage(null);
                  }}
                  className={`rounded px-2.5 py-1 font-medium capitalize transition-all ${
                    adjustMode === m
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {m === "package" ? "Package" : m === "money" ? "By Money" : "Manual"}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={addCredits} className="space-y-4">
            {adjustMode === "package" && (
              <>
                <Select
                  label="Select Package"
                  name="packageId"
                  value={selectedPackageId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedPackageId(id);
                    const pkg = packages.find((p) => p.id === id);
                    if (pkg) {
                      setPaidMoney(pkg.price.toString());
                    } else {
                      setPaidMoney("");
                    }
                  }}
                  required
                >
                  <option value="">Choose package…</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — pay for {pkg.creditAmount}, get {pkg.totalCredits} credits — {pkg.price.toLocaleString()} DA
                    </option>
                  ))}
                </Select>
                {selectedPackageId && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Money Paid (DA) (for invoicing)"
                      type="number"
                      min={0}
                      value={paidMoney}
                      onChange={(e) => setPaidMoney(e.target.value)}
                    />
                    <Input
                      label="Custom Note (Optional)"
                      placeholder="e.g. Cash payment"
                      value={moneyReason}
                      onChange={(e) => setMoneyReason(e.target.value)}
                    />
                  </div>
                )}
                {selectedPackageId && (() => {
                  const pkg = packages.find((p) => p.id === selectedPackageId);
                  if (!pkg) return null;
                  return (
                    <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1.5 border border-[var(--border)]">
                      <div className="flex justify-between font-medium">
                        <span>Invoice package price:</span>
                        <span>{pkg.price.toLocaleString()} DA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Base Credits:</span>
                        <span>{pkg.creditAmount}</span>
                      </div>
                      <div className="flex justify-between text-[var(--success)]">
                        <span>Bonus Credits:</span>
                        <span>+{pkg.bonusCredits} free</span>
                      </div>
                      <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                        <span>Total Credited:</span>
                        <span>{pkg.totalCredits} activities</span>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {adjustMode === "money" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Money Received (DA)"
                    type="number"
                    min={0}
                    placeholder="e.g. 20000"
                    value={moneyAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMoneyAmount(val);
                      const parsed = parseFloat(val) || 0;
                      const base = Math.floor(parsed / 1900);
                      
                      // Auto compute bonus based on scale
                      let bonus = 0;
                      if (base >= 50) bonus = 17;
                      else if (base >= 30) bonus = 9;
                      else if (base >= 20) bonus = 5;
                      else if (base >= 10) bonus = 2;
                      else if (base >= 7) bonus = 1;

                      setBaseCredits(base);
                      setBonusCredits(bonus);
                    }}
                    required
                  />
                  <Input
                    label="Custom Note (Optional)"
                    placeholder="e.g. Cash / Bank transfer"
                    value={moneyReason}
                    onChange={(e) => setMoneyReason(e.target.value)}
                  />
                </div>

                {moneyAmount && (parseFloat(moneyAmount) % 1900) > 0 && (
                  <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-xs space-y-2">
                    <p className="font-semibold text-amber-800">
                      Remaining Change (Rest): {(parseFloat(moneyAmount) % 1900).toLocaleString()} DA
                    </p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                        <input
                          type="radio"
                          name="changeOption"
                          value="refund"
                          checked={changeOption === "refund"}
                          onChange={() => setChangeOption("refund")}
                          className="text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        Refund change to client
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                        <input
                          type="radio"
                          name="changeOption"
                          value="convert"
                          checked={changeOption === "convert"}
                          onChange={() => setChangeOption("convert")}
                          className="text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        Convert change to +1 credit
                      </label>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 grid-cols-2 bg-slate-50 p-3 rounded-lg border border-[var(--border)]">
                  <Input
                    label="Paid Credits (1,900 DA each)"
                    type="number"
                    min={0}
                    value={baseCredits}
                    onChange={(e) => setBaseCredits(Number(e.target.value))}
                  />
                  <Input
                    label="Bonus Credits Given"
                    type="number"
                    min={0}
                    value={bonusCredits}
                    onChange={(e) => setBonusCredits(Number(e.target.value))}
                  />
                </div>

                <div className="rounded-lg bg-[var(--primary-light)] text-[var(--primary)] p-3 text-xs flex justify-between items-center font-bold">
                  <span>Invoice Breakdown Summary:</span>
                  <span>
                    {baseCredits} Paid + {bonusCredits} Bonus
                    {moneyAmount && (parseFloat(moneyAmount) % 1900) > 0 && changeOption === "convert" && " + 1 Rest"}
                    {" = "}{baseCredits + bonusCredits + (moneyAmount && (parseFloat(moneyAmount) % 1900) > 0 && changeOption === "convert" ? 1 : 0)} Activities
                  </span>
                </div>
              </>
            )}

            {adjustMode === "manual" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Custom Credit Adjustment"
                    name="customAmount"
                    type="number"
                    step="any"
                    placeholder="e.g. 5 (to add) or -3 (to deduct)"
                    value={customCredits}
                    onChange={(e) => setCustomCredits(e.target.value)}
                    required
                  />
                  <Input
                    label="Money Paid (DA) (optional, for invoicing)"
                    type="number"
                    min={0}
                    placeholder="e.g. 5000"
                    value={paidMoney}
                    onChange={(e) => setPaidMoney(e.target.value)}
                  />
                </div>
                <Input
                  label="Adjustment Reason"
                  name="reason"
                  placeholder="e.g. Correcting typo / Promo bonus"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  required
                />
              </>
            )}

            <Button type="submit" className="w-full" loading={submittingCredits}>
              Confirm Balance Adjustment
            </Button>
          </form>
        </Card>

        {/* Contact info */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Contact info</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(!editing)}
            >
              {editing ? "Cancel" : "Edit"}
            </Button>
          </div>

          {editing ? (
            <form onSubmit={saveContact} className="space-y-3">
              <Input label="Full name" name="fullName" defaultValue={client.fullName} required />
              <Input label="Email" name="email" type="email" defaultValue={client.email ?? ""} />
              <Input label="Phone" name="phone" defaultValue={client.phone ?? ""} />
              <Input label="Lead source" name="leadSource" defaultValue={client.leadSource ?? ""} />
              <Textarea label="Notes" name="notes" defaultValue={client.notes ?? ""} />
              <Button type="submit" loading={saving}>Save changes</Button>
            </form>
          ) : (
            <dl className="space-y-3 text-sm">
              {[
                { label: "Segment", value: (
                  <Badge
                    tone={
                      client.customerSegment === "VIP"
                        ? "success"
                        : client.customerSegment === "High-Value"
                        ? "primary"
                        : client.customerSegment === "Inactive"
                        ? "danger"
                        : "default"
                    }
                  >
                    {client.customerSegment ?? "Standard"}
                  </Badge>
                ) },
                { label: "Lead source", value: client.leadSource },
                { label: "Total spent", value: `${(client.totalSpent ?? 0).toLocaleString()} DA` },
                { label: "Last activity", value: client.lastActivityDate ? new Date(client.lastActivityDate).toLocaleDateString() : "No activities yet" },
                { label: "Favorite activity", value: client.favoriteActivity },
                { label: "Email", value: client.email },
                { label: "Phone", value: client.phone },
                { label: "Notes", value: client.notes },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
                  <dd className="mt-0.5 text-[var(--foreground)]">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </div>

      {/* History tabs */}
      <Card padding={false}>
        <div className="flex border-b border-[var(--border)] flex-wrap">
          <button
            onClick={() => setTab("ledger")}
            className={`px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === "ledger"
                ? "border-[var(--primary)] text-[var(--primary)] font-bold"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Credit history ({client.ledgerEntries.length})
          </button>
          <button
            onClick={() => setTab("redemptions")}
            className={`px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === "redemptions"
                ? "border-[var(--primary)] text-[var(--primary)] font-bold"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Redemptions ({client.redemptions.length})
          </button>
          <button
            onClick={() => setTab("notifications")}
            className={`px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === "notifications"
                ? "border-[var(--primary)] text-[var(--primary)] font-bold"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Notification Logs {notifications.length > 0 ? `(${notifications.length})` : ""}
          </button>
        </div>

        {tab === "ledger" && (
          client.ledgerEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">No ledger entries yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {client.ledgerEntries.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-3 px-5 py-3 text-sm md:flex-row md:items-center md:justify-between">
                  {editingLedgerId === entry.id ? (
                    <div className="flex w-full flex-col gap-3 md:flex-row md:items-end">
                      <div className="flex-1 grid gap-3 grid-cols-1 md:grid-cols-3">
                        <div className="md:col-span-2">
                          <Input
                            label="Reason"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                          />
                        </div>
                        <div>
                          <Input
                            label="Amount"
                            type="number"
                            step="1"
                            value={editDelta}
                            onChange={(e) => setEditDelta(Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 justify-end">
                        <Button size="sm" onClick={() => saveLedgerEdit(entry.id)} loading={editingLedgerIdLoading === entry.id}>
                          Save
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingLedgerId(null)} disabled={editingLedgerIdLoading === entry.id}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--foreground)] break-words">
                          {entry.reason ?? entry.package?.name ?? entry.type}
                        </p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {new Date(entry.createdAt).toLocaleString()}
                          {entry.createdBy ? ` · by ${entry.createdBy.name}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 shrink-0 mt-2 md:mt-0">
                        <Badge tone={entry.delta > 0 ? "success" : "default"}>
                          {entry.delta > 0 ? "+" : ""}
                          {entry.delta}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setEditingLedgerId(entry.id);
                              setEditDelta(entry.delta);
                              setEditReason(entry.reason || "");
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => deleteLedgerEntry(entry.id)}
                            loading={deletingLedgerId === entry.id}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "redemptions" && (
          client.redemptions.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">No redemptions yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {client.redemptions.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 px-5 py-3 text-sm md:flex-row md:items-center md:justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--foreground)]">{item.activity.name}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {new Date(item.redeemedAt).toLocaleString()}
                      {item.session?.location ? ` · ${item.session.location}` : ""}
                      {item.staff ? ` · by ${item.staff.name}` : ""}
                      {item.notes ? ` · "${item.notes}"` : ""}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 shrink-0 mt-2 md:mt-0">
                    <Badge tone="warning">−{item.creditsUsed}</Badge>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => refundRedemption(item.id)}
                      loading={refundingRedemptionId === item.id}
                    >
                      Refund / Cancel
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "notifications" && (
          loadingNotifications ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <svg className="h-5 w-5 animate-spin mr-2 text-[var(--primary)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Fetching notification logs...</span>
            </div>
          ) : notificationsError ? (
            <p className="py-8 text-center text-sm text-[var(--danger)]">{notificationsError}</p>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <svg className="h-10 w-10 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="font-semibold text-slate-700">No notifications sent</p>
              <p className="text-xs text-slate-500">Welcome, recharges or redemption notifications will show here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {notifications.map((notif) => (
                <li key={notif.id} className="p-5 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                        notif.type === "email" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-teal-50 text-teal-700 border border-teal-200"
                      }`}>
                        {notif.type === "email" ? (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>EMAIL</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>SMS</span>
                          </>
                        )}
                      </span>
                      <span className="font-medium text-slate-700 font-mono text-xs">{notif.recipient}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        notif.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}>
                        {notif.status}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{new Date(notif.sentAt).toLocaleString()}</span>
                    </div>
                  </div>
                  {notif.subject && (
                    <p className="text-sm font-bold text-slate-900">Subject: {notif.subject}</p>
                  )}
                  <p className="text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3.5 font-mono text-xs whitespace-pre-wrap">
                    {notif.message}
                  </p>
                </li>
              ))}
            </ul>
          )
        )}
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
