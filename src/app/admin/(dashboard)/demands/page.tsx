"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/i18n";
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  StatCard,
} from "@/components/admin/ui";
import { fetchWithRetry } from "@/lib/fetch-utils";

type CardDemand = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  creditType: "package" | "custom";
  packageId: string | null;
  amount: number | null;
  price: number;
  status: "pending" | "accepted" | "rejected";
  cardCode: string | null;
  createdAt: string;
  updatedAt: string;
};

type Package = {
  id: string;
  name: string;
};

export default function AdminDemandsPage() {
  const { t, locale, dir } = useTranslations("demands");
  const [demands, setDemands] = useState<CardDemand[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "accepted" | "rejected">("all");

  // Modals / Actions state
  const [processingDemand, setProcessingDemand] = useState<CardDemand | null>(null);
  const [inputCardCode, setInputCardCode] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Stats
  const [totalMoneyInQueue, setTotalMoneyInQueue] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch Demands
  async function fetchDemands() {
    setLoading(true);
    try {
      const res = await fetchWithRetry(`/api/admin/demands?status=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        setDemands(data);
      }
    } catch (err) {
      console.error("Failed to fetch demands:", err);
    } finally {
      setLoading(false);
    }
  }

  // Fetch Stats (separately to always calculate total queue money based on ALL pending demands)
  async function fetchStats() {
    try {
      const res = await fetchWithRetry("/api/admin/demands?status=pending");
      if (res.ok) {
        const pendingDemands: CardDemand[] = await res.json();
        const total = pendingDemands.reduce((sum, d) => sum + d.price, 0);
        setTotalMoneyInQueue(total);
        setPendingCount(pendingDemands.length);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }

  // Fetch Packages
  async function fetchPackages() {
    try {
      const res = await fetchWithRetry("/api/public/packages");
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (err) {
      console.error("Failed to fetch packages:", err);
    }
  }

  useEffect(() => {
    fetchDemands();
    fetchStats();
    fetchPackages();
  }, [activeTab]);

  function getPackageName(packageId: string | null) {
    if (!packageId) return "";
    const pkg = packages.find((p) => p.id === packageId);
    return pkg ? pkg.name : "Unknown Package";
  }

  function getDesiredCreditText(demand: CardDemand) {
    if (demand.creditType === "package") {
      return getPackageName(demand.packageId);
    }
    return `${demand.amount} credits`;
  }

  // Format phone number to clean digits for WhatsApp link
  function getCleanPhone(phone: string) {
    return phone.replace(/[^\d+]/g, "");
  }

  // Handle Reject
  async function handleReject(demandId: string) {
    if (!confirm(t("rejectConfirm"))) return;

    try {
      const res = await fetch(`/api/admin/demands/${demandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (res.ok) {
        fetchDemands();
        fetchStats();
      } else {
        alert("Failed to reject demand.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred.");
    }
  }

  // Handle Delete
  async function handleDelete(demandId: string) {
    if (!confirm(locale === "ar" ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete this record?")) return;

    try {
      const res = await fetch(`/api/admin/demands/${demandId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchDemands();
        fetchStats();
      } else {
        alert("Failed to delete record.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred.");
    }
  }

  // Handle Accept Submit
  async function handleAcceptSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!processingDemand) return;
    if (!inputCardCode.trim()) {
      setModalError("Card Code is required");
      return;
    }

    setModalSubmitting(true);
    setModalError(null);

    try {
      const res = await fetch("/api/admin/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demandId: processingDemand.id,
          cardCode: inputCardCode.trim(),
        }),
      });

      if (res.ok) {
        setProcessingDemand(null);
        setInputCardCode("");
        fetchDemands();
        fetchStats();
      } else {
        const data = await res.json();
        setModalError(data.error ?? "Failed to process demand");
      }
    } catch (err) {
      setModalError("Network error. Please try again.");
    } finally {
      setModalSubmitting(false);
    }
  }

  // Auto generate card code helper
  function handleAutoGenerateCode() {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    setInputCardCode(`AQA-${randomDigits}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label={t("totalMoneyQueue")}
          value={`${totalMoneyInQueue.toLocaleString("fr-DZ")} DA`}
          hint={locale === "ar" ? "إجمالي قيمة طلبات البطاقات المعلقة" : "Total value of pending card requests"}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("pendingDemands")}
          value={pendingCount}
          hint={locale === "ar" ? "عدد الطلبات التي تنتظر المراجعة والتسليم" : "Number of requests waiting for review and delivery"}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Tabs Control */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto">
        {(["all", "pending", "accepted", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-5 text-sm font-semibold transition-all border-b-2 outline-none whitespace-nowrap ${
              activeTab === tab
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab === "all"
              ? t("tabAll")
              : tab === "pending"
              ? t("tabPending")
              : tab === "accepted"
              ? t("tabAccepted")
              : t("tabRejected")}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <Card padding={false}>
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <svg className="h-8 w-8 animate-spin mx-auto text-[var(--primary)] mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs">{locale === "ar" ? "جاري التحميل..." : "Loading demands..."}</p>
          </div>
        ) : demands.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <svg className="h-12 w-12 mx-auto text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-semibold text-slate-700">{t("emptyState")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
                  <th className="py-3 px-4 font-bold text-[var(--muted)]">{t("name")}</th>
                  <th className="py-3 px-4 font-bold text-[var(--muted)]">{t("phone")}</th>
                  <th className="py-3 px-4 font-bold text-[var(--muted)]">{t("desiredCredit")}</th>
                  <th className="py-3 px-4 font-bold text-[var(--muted)]">{t("price")}</th>
                  <th className="py-3 px-4 font-bold text-[var(--muted)]">{t("status")}</th>
                  <th className="py-3 px-4 font-bold text-[var(--muted)]">{t("date")}</th>
                  <th className="py-3 px-4 font-bold text-[var(--muted)] text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {demands.map((demand) => (
                  <tr key={demand.id} className="hover:bg-slate-50/5 transition-colors">
                    <td className="py-4 px-4 font-bold text-[var(--foreground)]">
                      {demand.name}
                      {demand.email && (
                        <span className="block text-xs font-normal text-[var(--muted)] mt-0.5">
                          {demand.email}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono text-[var(--foreground)]">{demand.phone}</td>
                    <td className="py-4 px-4">
                      <span className="font-semibold">{getDesiredCreditText(demand)}</span>
                    </td>
                    <td className="py-4 px-4 font-bold text-[var(--primary)] font-mono">
                      {demand.price.toLocaleString("fr-DZ")} DA
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        tone={
                          demand.status === "accepted"
                            ? "success"
                            : demand.status === "rejected"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {demand.status === "accepted"
                          ? t("tabAccepted")
                          : demand.status === "rejected"
                          ? t("tabRejected")
                          : t("tabPending")}
                      </Badge>
                      {demand.cardCode && (
                        <span className="block text-[10px] font-mono text-[var(--muted)] mt-1">
                          Code: {demand.cardCode}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs text-[var(--muted)]">
                      {new Date(demand.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                      {demand.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setProcessingDemand(demand);
                              setInputCardCode("");
                              setModalError(null);
                            }}
                          >
                            {t("accept")}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleReject(demand.id)}
                            className="text-[var(--danger-text)] border-[var(--danger)]/30 hover:bg-[var(--danger-bg)]"
                          >
                            {t("reject")}
                          </Button>
                        </>
                      )}

                      {/* WhatsApp External Quick Links */}
                      {demand.status === "pending" && (
                        <a
                          href={`https://wa.me/${getCleanPhone(demand.phone)}?text=${encodeURIComponent(
                            `Hello ${demand.name}, we received your AQA Card request for: ${getDesiredCreditText(
                              demand
                            )}. We will deliver your card shortly.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 transition"
                        >
                          {t("sendWhatsApp")}
                        </a>
                      )}

                      {demand.status === "accepted" && (
                        <a
                          href={`https://wa.me/${getCleanPhone(demand.phone)}?text=${encodeURIComponent(
                            `Hello ${demand.name}! Your AQA Card has been activated. Card Code: ${demand.cardCode}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 transition"
                        >
                          {t("sendClientWhatsApp")}
                        </a>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(demand.id)}
                        className="text-[var(--muted)] hover:text-red-400"
                        title="Delete Record"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Accept Link Physical Card Modal */}
      {processingDemand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--foreground)]">{t("linkCardTitle")}</h2>
              <button
                onClick={() => setProcessingDemand(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-slate-100/10 font-bold"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAcceptSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {modalError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-400">
                  {modalError}
                </div>
              )}

              <div className="bg-[var(--surface-2)]/30 border border-[var(--border)] rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">{t("name")}:</span>
                  <span className="font-bold text-[var(--foreground)]">{processingDemand.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">{t("desiredCredit")}:</span>
                  <span className="font-bold text-[var(--foreground)]">
                    {getDesiredCreditText(processingDemand)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">{t("price")}:</span>
                  <span className="font-bold text-[var(--primary)] font-mono">
                    {processingDemand.price.toLocaleString("fr-DZ")} DA
                  </span>
                </div>
              </div>

              <p className="text-xs text-[var(--muted)] leading-relaxed">
                {t("linkCardDesc")}
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block">
                  {t("cardCodeLabel")}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      value={inputCardCode}
                      onChange={(e) => setInputCardCode(e.target.value)}
                      placeholder={t("cardCodePlaceholder")}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-light)] focus:border-[var(--primary)] font-mono"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAutoGenerateCode}
                    className="whitespace-nowrap px-3 text-xs"
                  >
                    {t("autoGenerateBtn")}
                  </Button>
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-[var(--border)]">
                <Button
                  type="submit"
                  disabled={modalSubmitting}
                  loading={modalSubmitting}
                  className="flex-1"
                >
                  {t("activateBtn")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setProcessingDemand(null)}
                  className="px-4"
                >
                  {t("cancelBtn")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
