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
import { formatDate, useLocale } from "@/lib/i18n";

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

type Invoice = {
  id: string;
  invoiceCode: string;
  amount: number;
  category: string;
  items: string;
  notes: string | null;
  status: string;
  createdAt: string;
  paidAt: string | null;
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
  invoices: Invoice[];
  // CRM Fields
  leadSource: string | null;
  customerSegment: string | null;
  totalSpent: number | null;
  lastActivityDate: string | null;
  favoriteActivity: string | null;
};

export default function ClientDetailPage() {
  const { locale } = useLocale();
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [tab, setTab] = useState<"overview" | "transactions" | "invoices" | "notifications" | "activities" | "store">("overview");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  // Additional states for Activities, Store and Invoices
  const [activities, setActivities] = useState<any[]>([]);
  const [redeemActivityId, setRedeemActivityId] = useState("");
  const [redeemSessionId, setRedeemSessionId] = useState("");
  const [redeemNotes, setRedeemNotes] = useState("");
  const [submittingRedeem, setSubmittingRedeem] = useState(false);

  const [purchasingStoreId, setPurchasingStoreId] = useState<string | null>(null);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);

  // Not Paid flag state
  const [isNotPaid, setIsNotPaid] = useState(false);
  const [togglingNotPaid, setTogglingNotPaid] = useState(false);

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

  // Reissue Card modal states
  const [isReissueModalOpen, setIsReissueModalOpen] = useState(false);
  const [reissueMode, setReissueMode] = useState<"auto" | "preprinted">("auto");
  const [reissueCardCode, setReissueCardCode] = useState("");
  const [reissueError, setReissueError] = useState<string | null>(null);

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
  const [computedMoneyCredits, setComputedMoneyCredits] = useState(0);
  const [moneyReason, setMoneyReason] = useState("");
  const [customCredits, setCustomCredits] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [paidMoney, setPaidMoney] = useState("");

  const activeCard = client?.cards?.find((c) => c.status === "active");
  const publicUrl = activeCard
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/eventscard/${activeCard.publicToken}`
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
    try {
      const res = await fetch(`/api/admin/clients/${params.id}`);
      const data = await res.json();
      if (res.ok) {
        setClient(data);
        setError(null);
      } else {
        setError(data.error ?? "Failed to fetch client details.");
        setClient(null);
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Failed to fetch client details.");
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadClient();
    // Load not-paid flag status
    fetch(`/api/admin/clients/${params.id}/not-paid`)
      .then((r) => r.json())
      .then((data) => { if (typeof data.isNotPaid === "boolean") setIsNotPaid(data.isNotPaid); })
      .catch(() => {});
    fetch("/api/admin/packages")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPackages(data.filter((p: Package & { active: boolean }) => p.active));
        } else {
          console.error("Packages response is not an array:", data);
          setPackages([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching packages:", err);
        setPackages([]);
      });

    fetch("/api/admin/activities?redeemable=true")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActivities(data.filter((a: any) => a.active));
        } else {
          console.error("Activities response is not an array:", data);
          setActivities([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching activities:", err);
        setActivities([]);
      });
  }, [loadClient]);

  useEffect(() => {
    if (redeemActivityId) {
      const activity = activities.find((a) => a.id === redeemActivityId);
      const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
      const upcoming = activity?.sessions?.filter((s: any) => s.active && new Date(s.sessionDate) >= tenHoursAgo) || [];
      if (upcoming.length > 0) {
        setRedeemSessionId(upcoming[0].id);
      } else {
        setRedeemSessionId("");
      }
    } else {
      setRedeemSessionId("");
    }
  }, [redeemActivityId, activities]);

  async function toggleNotPaid() {
    setTogglingNotPaid(true);
    setMessage(null);
    try {
      const method = isNotPaid ? "DELETE" : "POST";
      const res = await fetch(`/api/admin/clients/${params.id}/not-paid`, { method });
      if (res.ok) {
        const data = await res.json();
        setIsNotPaid(data.isNotPaid);
        setMessage({
          text: data.isNotPaid
            ? "Client marked as Not Paid. The client portal will now show a Not Paid alert."
            : "Not Paid flag cleared. Client portal restored to normal.",
          tone: "success",
        });
      } else {
        setMessage({ text: "Failed to update Not Paid status.", tone: "danger" });
      }
    } catch {
      setMessage({ text: "Network error updating Not Paid status.", tone: "danger" });
    } finally {
      setTogglingNotPaid(false);
    }
  }

  async function handleRedeemActivity(e?: FormEvent<HTMLFormElement>, creditsUsed?: number) {
    if (e) e.preventDefault();
    if (!redeemActivityId) return;
    setSubmittingRedeem(true);
    setMessage(null);
    try {
      const activity = activities.find((a) => a.id === redeemActivityId);
      let resolvedSessionId = redeemSessionId || undefined;
      if (!resolvedSessionId && activity) {
        const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
        const upcoming = activity.sessions?.filter((s: any) => s.active && new Date(s.sessionDate) >= tenHoursAgo) || [];
        if (upcoming.length > 0) {
          resolvedSessionId = upcoming[0].id;
        }
      }

      const res = await fetch("/api/admin/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: params.id,
          activityId: redeemActivityId,
          sessionId: resolvedSessionId,
          notes: redeemNotes || undefined,
          creditsUsed,
        }),
      });
      if (res.ok) {
        setMessage({ text: "Activity redeemed successfully.", tone: "success" });
        setRedeemActivityId("");
        setRedeemSessionId("");
        setRedeemNotes("");
        await loadClient();
      } else {
        const data = await res.json();
        setMessage({ text: data.error ?? "Failed to redeem activity.", tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Network error redeeming activity.", tone: "danger" });
    } finally {
      setSubmittingRedeem(false);
    }
  }

  async function handleBuyPackage(pkgId: string, status: "paid" | "unpaid") {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;
    setPurchasingStoreId(`${pkgId}-${status}`);
    setMessage(null);

    const invoiceMsg = status === "paid" ? "Paid" : "On Credit (Unpaid)";
    const bodyPayload = {
      packageId: pkgId,
      reason: `Store Purchase: ${pkg.name} (${invoiceMsg})`,
      invoice: {
        amount: pkg.price,
        category: "package",
        items: `${pkg.name} Package — ${pkg.creditAmount} credits + ${pkg.bonusCredits} bonus (${pkg.totalCredits} total)`,
        notes: status === "unpaid" ? "Purchased on credit (Unpaid)" : "Paid at storefront",
        status: status,
      },
    };

    try {
      const res = await fetch(`/api/admin/clients/${params.id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      if (res.ok) {
        const resData = await res.json();
        setMessage({
          text: `Successfully purchased ${pkg.name} (${invoiceMsg}).${resData.invoice ? ` Invoice ${resData.invoice.invoiceCode} created.` : ""}`,
          tone: "success",
        });
        await loadClient();
      } else {
        const data = await res.json();
        setMessage({ text: data.error ?? "Failed to purchase package.", tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Network error purchasing package.", tone: "danger" });
    } finally {
      setPurchasingStoreId(null);
    }
  }

  async function handleBuyProduct(product: { name: string; price: number }, status: "paid" | "unpaid") {
    setPurchasingStoreId(`${product.name}-${status}`);
    setMessage(null);

    const invoiceMsg = status === "paid" ? "Paid" : "On Credit (Unpaid)";
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: params.id,
          amount: product.price,
          category: "adhoc",
          items: `Product: ${product.name}`,
          notes: status === "unpaid" ? "Product bought on credit" : "Product purchased at storefront",
          status: status,
        }),
      });
      if (res.ok) {
        const resData = await res.json();
        setMessage({
          text: `Successfully purchased ${product.name} (${invoiceMsg}). Invoice ${resData.invoice.invoiceCode} created.`,
          tone: "success",
        });
        await loadClient();
      } else {
        const data = await res.json();
        setMessage({ text: data.error ?? "Failed to purchase product.", tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Network error purchasing product.", tone: "danger" });
    } finally {
      setPurchasingStoreId(null);
    }
  }

  async function handleUpdateInvoiceStatus(invoiceId: string, status: "paid" | "unpaid" | "refunded") {
    setUpdatingInvoiceId(invoiceId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setMessage({ text: `Invoice marked as ${status} successfully.`, tone: "success" });
        await loadClient();
      } else {
        const data = await res.json();
        setMessage({ text: data.error ?? "Failed to update invoice.", tone: "danger" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Network error updating invoice.", tone: "danger" });
    } finally {
      setUpdatingInvoiceId(null);
    }
  }

  async function handleDeleteInvoice(invoiceId: string) {
    triggerConfirm(
      "Delete Invoice",
      "Are you sure you want to delete this invoice? This will permanently delete the invoice record from the system.",
      async () => {
        setDeletingInvoiceId(invoiceId);
        setMessage(null);
        try {
          const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setMessage({ text: "Invoice deleted successfully.", tone: "success" });
            await loadClient();
          } else {
            const data = await res.json();
            setMessage({ text: data.error ?? "Failed to delete invoice.", tone: "danger" });
          }
        } catch (err) {
          console.error(err);
          setMessage({ text: "Network error deleting invoice.", tone: "danger" });
        } finally {
          setDeletingInvoiceId(null);
        }
      },
      true // isDanger
    );
  }

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
      // Exact credit = money / 1900, rounded to 2 decimal places
      const total = Math.round((parsedMoney / 1900) * 100) / 100;

      if (total === 0) {
        setMessage({ text: "Total credits to add must be greater than 0.", tone: "danger" });
        setSubmittingCredits(false);
        return;
      }

      const computedReason = moneyReason
        ? `Payment: ${parsedMoney.toLocaleString()} DA = ${total.toFixed(2)} credits - ${moneyReason}`
        : `Payment: ${parsedMoney.toLocaleString()} DA = ${total.toFixed(2)} credits`;

      bodyPayload = {
        customAmount: total,
        reason: computedReason,
        invoice: {
          amount: parsedMoney,
          category: "custom",
          items: `Custom recharge — ${parsedMoney.toLocaleString()} DA = ${total.toFixed(2)} credits`,
          notes: moneyReason || undefined,
          status: "paid",
        },
      };
    } else if (adjustMode === "manual") {
      const rawAmount = Number(customCredits);
      const amount = Math.round(rawAmount * 100) / 100;
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
                items: manualReason || `Manual adjustment: ${amount > 0 ? "+" : ""}${amount.toFixed(2)} credits`,
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
        setComputedMoneyCredits(0);
        setMoneyReason("");
        setCustomCredits("");
        setManualReason("");
        setPaidMoney("");
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

  function reissueCard() {
    setReissueMode("auto");
    setReissueCardCode("");
    setReissueError(null);
    setIsReissueModalOpen(true);
  }

  async function handleReissueSubmit() {
    if (reissueMode === "preprinted" && !reissueCardCode.trim()) {
      setReissueError("Please enter a valid card code.");
      return;
    }

    setReissuingCard(true);
    setReissueError(null);
    try {
      const res = await fetch(`/api/admin/clients/${params.id}/reissue-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCardCode: reissueMode === "preprinted" ? reissueCardCode.trim().toUpperCase() : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: "New card issued. Old card has been deactivated.", tone: "success" });
        setIsReissueModalOpen(false);
        await loadClient();
      } else {
        setReissueError(data.error ?? "Failed to reissue card.");
      }
    } catch {
      setReissueError("Network error reissuing card.");
    } finally {
      setReissuingCard(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p className="text-sm text-[var(--muted)]">Loading client…</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-red-50/50 border border-red-200 rounded-xl text-center space-y-4">
        <h3 className="text-lg font-bold text-red-800">Error Loading Client</h3>
        <p className="text-sm text-red-600">{error || "Client not found or failed to load."}</p>
        <div className="pt-2">
          <Link href="/admin/clients">
            <Button variant="secondary" size="sm">
              ← Back to clients
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={client.fullName}
        description="Client profile, balance history, invoices, notifications, and store purchases."
        action={
          <Link href="/admin/clients" className="text-sm text-[var(--primary)] hover:underline">
            ← Back to clients
          </Link>
        }
      />

      {message && (
        <Alert tone={message.tone}>{message.text}</Alert>
      )}

      {/* Top Banner Overview: Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-50 border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Current Balance</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-4xl font-black tabular-nums ${
              client.balance === 0
                ? "text-[var(--danger)]"
                : client.balance <= 2
                ? "text-[var(--warning)]"
                : "text-[var(--success)]"
            }`}>
              {Number(client.balance.toFixed(2))}
            </span>
            <span className="text-xs text-[var(--muted)] font-medium">activities</span>
          </div>
        </Card>

        <Card className="bg-slate-50 border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Customer Segment</p>
          <div className="mt-2.5">
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
          </div>
        </Card>

        <Card className="bg-slate-50 border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Total Spent</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">
            {(client.totalSpent ?? 0).toLocaleString()} DA
          </p>
        </Card>

        {/* Not Paid flag card */}
        <Card className={`border-2 transition-all duration-300 ${
          isNotPaid
            ? "bg-red-50 border-red-300"
            : "bg-slate-50 border-slate-200"
        }`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">Payment Status</p>
          {isNotPaid && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-black text-red-600 uppercase tracking-wide">Not Paid</span>
            </div>
          )}
          <button
            id="toggle-not-paid-btn"
            onClick={toggleNotPaid}
            disabled={togglingNotPaid}
            className={`w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all border ${
              isNotPaid
                ? "bg-red-100 border-red-300 text-red-700 hover:bg-red-200"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
            } disabled:opacity-60`}
          >
            {togglingNotPaid ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isNotPaid ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
            {isNotPaid ? "Clear Not Paid" : "Mark as Not Paid"}
          </button>
          {!isNotPaid && (
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              Flags the client portal with a red alert.
            </p>
          )}
        </Card>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-[var(--border)] flex flex-wrap gap-2">
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "transactions", label: "Transactions & Top-Up" },
            { id: "invoices", label: "Invoices" },
            { id: "notifications", label: "Notifications" },
            { id: "activities", label: "Activities & Redeem" },
          ] as const
        ).map((tItem) => (
          <button
            key={tItem.id}
            onClick={() => {
              setTab(tItem.id);
              setMessage(null);
            }}
            className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 -mb-px rounded-t-lg ${
              tab === tItem.id
                ? "border-[var(--primary)] text-[var(--primary)] bg-blue-50/50"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tItem.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Card Info & 3D Card */}
          <Card className="lg:col-span-2 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 w-full space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Active Card</h3>
                  {activeCard ? (
                    <div className="mt-3 space-y-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--muted)]">Card Code:</span>
                        <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">{activeCard.cardCode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--muted)]">Date Issued:</span>
                        <span className="font-semibold">{formatDate(activeCard.issuedAt, locale)}</span>
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

          {/* Contact & CRM Info */}
          <Card>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Client Details</h3>
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
                <Button type="submit" loading={saving} className="w-full">Save changes</Button>
              </form>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm">
                <div className="col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Favorite Activity</dt>
                  <dd className="mt-0.5 text-base font-bold text-slate-800">{client.favoriteActivity ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Lead Source</dt>
                  <dd className="mt-0.5 text-[var(--foreground)]">{client.leadSource ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Email</dt>
                  <dd className="mt-0.5 text-[var(--foreground)] break-all">{client.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Phone</dt>
                  <dd className="mt-0.5 text-[var(--foreground)]">{client.phone ?? "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Notes</dt>
                  <dd className="mt-0.5 text-[var(--foreground)] bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs italic break-words whitespace-pre-wrap">
                    {client.notes ?? "No client notes added yet."}
                  </dd>
                </div>
              </dl>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Transactions & Top-Up */}
      {tab === "transactions" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Adjust Balance Top-up Panel */}
          <div className="lg:col-span-1">
            <Card>
              <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h3 className="text-sm font-bold uppercase text-slate-800">Adjust Balance</h3>
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
                          label="Money Paid (DA)"
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
                        step="0.01"
                        placeholder="e.g. 20000"
                        value={moneyAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMoneyAmount(val);
                          const parsed = parseFloat(val) || 0;
                          const credits = Math.round((parsed / 1900) * 100) / 100;
                          setComputedMoneyCredits(credits);
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

                    {moneyAmount && computedMoneyCredits > 0 && (
                      <div className="rounded-lg bg-[var(--primary-light)] text-[var(--primary)] p-3 text-xs flex justify-between items-center font-bold">
                        <span>Credits to be credited:</span>
                        <span>{computedMoneyCredits.toFixed(2)} Activities</span>
                      </div>
                    )}
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
                        label="Money Paid (DA) (optional)"
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
                      placeholder="e.g. Typo correction / Loyalty reward"
                      value={manualReason}
                      onChange={(e) => setManualReason(e.target.value)}
                      required
                    />
                  </>
                )}

                <Button type="submit" className="w-full" loading={submittingCredits}>
                  Confirm Top-Up / Recharge
                </Button>
              </form>
            </Card>
          </div>

          {/* Ledger / Transactions List */}
          <div className="lg:col-span-2">
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h3 className="text-sm font-bold uppercase text-slate-800">Ledger History</h3>
              </div>
              {client.ledgerEntries.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--muted)]">No ledger transactions found.</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {client.ledgerEntries.map((entry) => (
                    <li key={entry.id} className="flex flex-col gap-3 px-5 py-3.5 text-sm md:flex-row md:items-center md:justify-between">
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
                                step="0.01"
                                value={editDelta}
                                onChange={(e) => setEditDelta(Math.round(Number(e.target.value) * 100) / 100)}
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
                              {formatDate(entry.createdAt, locale, true)}
                              {entry.createdBy ? ` · by ${entry.createdBy.name}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-4 shrink-0 mt-2 md:mt-0">
                            <Badge tone={entry.delta > 0 ? "success" : "default"}>
                              {entry.delta > 0 ? "+" : ""}
                              {Number(entry.delta.toFixed(2))}
                            </Badge>
                            <div className="flex items-center gap-1.5">
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
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Tab 3: Invoices */}
      {tab === "invoices" && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="text-sm font-bold uppercase text-slate-800">Billing Invoices</h3>
          </div>
          {client.invoices.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--muted)]">No invoices have been generated for this client.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-[var(--border)] text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Invoice Code</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Item details</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {client.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-700">{inv.invoiceCode}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {formatDate(inv.createdAt, locale)}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs truncate">
                        <p className="font-semibold text-slate-800">{inv.items}</p>
                        {inv.notes && (
                          <p className="text-xs text-slate-400 truncate italic mt-0.5">
                            Notes: {(() => {
                              if (inv.notes.startsWith("{") && inv.notes.endsWith("}")) {
                                try {
                                  const parsed = JSON.parse(inv.notes);
                                  return parsed.originalNotes ?? inv.notes;
                                } catch {
                                  return inv.notes;
                                }
                              }
                              return inv.notes;
                            })()}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 tabular-nums">
                        {inv.amount.toLocaleString()} DA
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge
                          tone={
                            inv.status === "paid"
                              ? "success"
                              : inv.status === "refunded"
                              ? "default"
                              : "warning"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5">
                          {inv.status === "unpaid" && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleUpdateInvoiceStatus(inv.id, "paid")}
                              loading={updatingInvoiceId === inv.id}
                            >
                              Mark Paid
                            </Button>
                          )}
                          {inv.status === "paid" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleUpdateInvoiceStatus(inv.id, "unpaid")}
                              loading={updatingInvoiceId === inv.id}
                            >
                              Mark Unpaid
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteInvoice(inv.id)}
                            loading={deletingInvoiceId === inv.id}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Notifications */}
      {tab === "notifications" && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase text-slate-800">Notification Logs</h3>
            <Button size="sm" variant="ghost" onClick={loadNotifications} loading={loadingNotifications}>
              Refresh Logs
            </Button>
          </div>

          {loadingNotifications ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <svg className="h-6 w-6 animate-spin mr-2 text-[var(--primary)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Fetching notification logs...</span>
            </div>
          ) : notificationsError ? (
            <p className="py-12 text-center text-sm text-[var(--danger)]">{notificationsError}</p>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <svg className="h-12 w-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="font-semibold text-slate-700">No notifications sent</p>
              <p className="text-xs text-slate-500">Welcome, recharge, or redemption logs will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {notifications.map((notif) => (
                <li key={notif.id} className="p-5 text-sm space-y-2 hover:bg-slate-50/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-black ${
                        notif.type === "email" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        notif.type === "whatsapp" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        "bg-teal-50 text-teal-700 border border-teal-200"
                      }`}>
                        {notif.type === "email" ? "EMAIL" : notif.type === "whatsapp" ? "WHATSAPP" : "SMS"}
                      </span>
                      <span className="font-semibold text-slate-600 font-mono text-xs">{notif.recipient}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                        notif.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}>
                        {notif.status}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {formatDate(notif.sentAt, locale, true)}
                      </span>
                    </div>
                  </div>
                  {notif.subject && (
                    <p className="text-sm font-bold text-slate-800">Subject: {notif.subject}</p>
                  )}
                  <p className="text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3.5 font-mono text-xs whitespace-pre-wrap">
                    {notif.message}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Tab 5: Activities & Redeem */}
      {tab === "activities" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Inline Redeem Activity Form */}
          <div className="lg:col-span-1">
            <Card>
              <div className="mb-4 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold uppercase text-slate-800">Redeem Event Activity</h3>
              </div>

              <form onSubmit={handleRedeemActivity} className="space-y-4">
                <Select
                  label="Select Activity to Redeem"
                  value={redeemActivityId}
                  onChange={(e) => setRedeemActivityId(e.target.value)}
                  required
                >
                  <option value="">Choose activity…</option>
                  {activities.map((act) => (
                    <option key={act.id} value={act.id}>
                      {act.name} — Cost: {act.creditCost} credits
                    </option>
                  ))}
                </Select>

                {redeemActivityId && (() => {
                  const selectedActivity = activities.find((a) => a.id === redeemActivityId);
                  if (!selectedActivity || !selectedActivity.sessions) return null;
                  const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
                  const upcoming = selectedActivity.sessions.filter((s: any) => s.active && new Date(s.sessionDate) >= tenHoursAgo);
                  if (upcoming.length === 0) return null;
                  return (
                    <Select
                      label="Select Event Session"
                      value={redeemSessionId}
                      onChange={(e) => setRedeemSessionId(e.target.value)}
                    >
                      <option value="">No specific event session</option>
                      {upcoming.map((session: any) => (
                        <option key={session.id} value={session.id}>
                          {formatDate(session.sessionDate, locale, true)}
                          {session.location ? ` · ${session.location}` : ""}
                        </option>
                      ))}
                    </Select>
                  );
                })()}

                <Input
                  label="Optional Notes"
                  placeholder="e.g. Session info / Equipment rented"
                  value={redeemNotes}
                  onChange={(e) => setRedeemNotes(e.target.value)}
                />

                <Button type="submit" className="w-full" loading={submittingRedeem} variant="primary">
                  Confirm Activity Redemption
                </Button>
                <Button
                  type="button"
                  onClick={() => handleRedeemActivity(undefined, 0.7)}
                  className="w-full mt-2"
                  loading={submittingRedeem}
                  variant="secondary"
                  disabled={!redeemActivityId}
                >
                  Redeem Kid (0.7 Credits)
                </Button>
              </form>
            </Card>
          </div>

          {/* Activity Redemptions List */}
          <div className="lg:col-span-2">
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h3 className="text-sm font-bold uppercase text-slate-800">Redemption History</h3>
              </div>
              {client.redemptions.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--muted)]">No activities redeemed yet.</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {client.redemptions.map((item) => (
                    <li key={item.id} className="flex flex-col gap-3 px-5 py-3.5 text-sm md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-base">{item.activity.name}</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {formatDate(item.redeemedAt, locale, true)}
                          {item.session?.location ? ` · Location: ${item.session.location}` : ""}
                          {item.staff ? ` · by ${item.staff.name}` : ""}
                          {item.notes ? ` · "${item.notes}"` : ""}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 shrink-0 mt-2 md:mt-0">
                        <Badge tone="warning">−{item.creditsUsed} credits</Badge>
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
              )}
            </Card>
          </div>
        </div>
      )}


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

      {isReissueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-slate-50/50">
              <h3 className="font-bold text-[var(--foreground)] flex items-center gap-2">
                <svg className="h-5 w-5 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-2 2a2 2 0 00-2-2m2-2a2 2 0 00-2 2m2 2h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Reissue Client Card
              </h3>
              <button
                onClick={() => setIsReissueModalOpen(false)}
                type="button"
                className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Body */}
            <div className="p-5 text-sm text-[var(--muted)] leading-relaxed space-y-4">
              <p>
                Replace this card? The current card will be deactivated. The client&apos;s active credits and history will remain unchanged.
              </p>

              {reissueError && (
                <Alert tone="danger">
                  {reissueError}
                </Alert>
              )}

              <div className="space-y-2">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Card Issuance Mode</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-6 mt-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="reissueMode"
                      checked={reissueMode === "auto"}
                      onChange={() => {
                        setReissueMode("auto");
                        setReissueError(null);
                      }}
                      className="accent-[var(--primary)] h-4 w-4"
                    />
                    Auto-generate code
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="reissueMode"
                      checked={reissueMode === "preprinted"}
                      onChange={() => {
                        setReissueMode("preprinted");
                        setReissueError(null);
                      }}
                      className="accent-[var(--primary)] h-4 w-4"
                    />
                    Link pre-printed card
                  </label>
                </div>
              </div>

              {reissueMode === "preprinted" && (
                <div className="space-y-1">
                  <Input
                    label="Pre-printed Card Code"
                    placeholder="e.g. AQA-989751"
                    value={reissueCardCode}
                    onChange={(e) => {
                      setReissueCardCode(e.target.value);
                      setReissueError(null);
                    }}
                    required
                  />
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)] bg-slate-50/20">
              <Button
                variant="secondary"
                className="flex-1"
                type="button"
                onClick={() => setIsReissueModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                type="button"
                loading={reissuingCard}
                onClick={handleReissueSubmit}
              >
                Confirm Reissue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
