"use client";

import { useState, useEffect, useRef, FormEvent, useCallback } from "react";
import { useTranslations } from "@/lib/i18n";
import { useCreditRate } from "@/lib/use-credit-rate";
import { Button, Input, Select, Badge } from "@/components/admin/ui";

type ClientCard = {
  cardCode: string;
};

type Client = {
  id: string;
  fullName: string;
  balance: number;
  phone?: string | null;
  email?: string | null;
  cards?: ClientCard[];
};

type Package = {
  id: string;
  name: string;
  price: number;
  creditAmount: number;
  bonusCredits: number;
  totalCredits: number;
  active: boolean;
};

type QuickBalanceChargerProps = {
  onBalanceUpdated?: () => void;
};

export function QuickBalanceCharger({ onBalanceUpdated }: QuickBalanceChargerProps) {
  const { dir } = useTranslations("dashboard");
  const creditRate = useCreditRate();

  // Data states
  const [clients, setClients] = useState<Client[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Client Selection states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Recharge Form states
  const [adjustMode, setAdjustMode] = useState<"package" | "money" | "manual">("package");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [paidMoney, setPaidMoney] = useState<string>("");
  const [moneyAmount, setMoneyAmount] = useState<string>("");
  const [computedMoneyCredits, setComputedMoneyCredits] = useState<number>(0);
  const [moneyReason, setMoneyReason] = useState<string>("");
  const [customCredits, setCustomCredits] = useState<string>("");
  const [manualReason, setManualReason] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; tone: "success" | "danger" } | null>(null);
  const [successPulse, setSuccessPulse] = useState<boolean>(false);

  // Load clients & packages
  const loadData = useCallback(async () => {
    try {
      setLoadingInitial(true);
      const [clientsRes, packagesRes] = await Promise.all([
        fetch("/api/admin/clients"),
        fetch("/api/admin/packages"),
      ]);

      if (clientsRes.ok) {
        const clientData = await clientsRes.json();
        setClients(clientData);
      }

      if (packagesRes.ok) {
        const pkgData = await packagesRes.json();
        const activePkgs = Array.isArray(pkgData)
          ? pkgData.filter((p: Package) => p.active)
          : [];
        setPackages(activePkgs);
      }
    } catch (err) {
      console.error("Failed to load clients/packages for Quick Charger:", err);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Click outside listener for search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter clients based on search query
  const filteredClients = clients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = c.fullName.toLowerCase().includes(q);
    const phoneMatch = c.phone ? c.phone.toLowerCase().includes(q) : false;
    const cardMatch = c.cards
      ? c.cards.some((card) => card.cardCode.toLowerCase().includes(q))
      : false;
    return nameMatch || phoneMatch || cardMatch;
  });

  // Handle Credit Top-Up Submission (Identical logic to client detail page)
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedClient) {
      setMessage({ text: "Please select a client to charge balance.", tone: "danger" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    let bodyPayload: Record<string, unknown> = {};
    let addedAmountApprox = 0;

    if (adjustMode === "package") {
      if (!selectedPackageId) {
        setMessage({ text: "Please select a package.", tone: "danger" });
        setSubmitting(false);
        return;
      }
      const pkg = packages.find((p) => p.id === selectedPackageId);
      if (!pkg) {
        setMessage({ text: "Selected package is invalid.", tone: "danger" });
        setSubmitting(false);
        return;
      }

      addedAmountApprox = pkg.totalCredits;
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
      const total = Math.round((parsedMoney / creditRate) * 100) / 100;

      if (total <= 0) {
        setMessage({ text: "Total credits to add must be greater than 0.", tone: "danger" });
        setSubmitting(false);
        return;
      }

      addedAmountApprox = total;
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
        setSubmitting(false);
        return;
      }
      if (!manualReason.trim()) {
        setMessage({ text: "Please enter a reason for manual adjustment.", tone: "danger" });
        setSubmitting(false);
        return;
      }

      addedAmountApprox = amount;
      let computedReason = manualReason;
      if (paidMoney) {
        computedReason = `${manualReason} - Paid: ${parseFloat(paidMoney).toLocaleString()} DA`;
      }

      bodyPayload = {
        customAmount: amount,
        reason: computedReason,
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
      const res = await fetch(`/api/admin/clients/${selectedClient.id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (res.ok) {
        const resData = await res.json();
        const invoiceMsg = resData.invoice ? ` · Invoice ${resData.invoice.invoiceCode} created.` : "";
        setMessage({ text: `Balance recharged successfully for ${selectedClient.fullName}.${invoiceMsg}`, tone: "success" });

        // Update selected client balance locally
        const newBalance = Math.round((selectedClient.balance + addedAmountApprox) * 100) / 100;
        setSelectedClient({
          ...selectedClient,
          balance: newBalance,
        });

        // Update list of clients in state
        setClients((prev) =>
          prev.map((c) => (c.id === selectedClient.id ? { ...c, balance: newBalance } : c))
        );

        // Reset form fields
        setSelectedPackageId("");
        setMoneyAmount("");
        setComputedMoneyCredits(0);
        setMoneyReason("");
        setCustomCredits("");
        setManualReason("");
        setPaidMoney("");

        // Trigger success animation glow pulse
        setSuccessPulse(true);
        setTimeout(() => setSuccessPulse(false), 2000);

        // Notify parent if handler passed
        if (onBalanceUpdated) {
          onBalanceUpdated();
        }
      } else {
        const data = await res.json();
        setMessage({ text: data.error ?? "Failed to adjust balance.", tone: "danger" });
      }
    } catch (err) {
      console.error("Quick balance recharge error:", err);
      setMessage({ text: "Network error processing recharge.", tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  const primaryCardCode = selectedClient?.cards?.[0]?.cardCode;

  return (
    <div
      dir={dir}
      className={`relative overflow-hidden rounded-2xl border bg-white p-4 sm:p-6 shadow-sm transition-all duration-500 ${
        successPulse
          ? "border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.3)] ring-2 ring-emerald-400/40"
          : "border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-md"
      }`}
    >
      {/* Decorative top accent line with gradient pulse */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-[var(--primary)] to-emerald-500" />

      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 shadow-inner">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Quick Balance Charger
              <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase px-2 py-0.5 tracking-wider">
                Instant Top-Up
              </span>
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Select a client and recharge activity credits directly from the dashboard.
            </p>
          </div>
        </div>

        {/* Quick Rate Badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600 border border-slate-200/80">
          <svg className="h-4 w-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">1 Credit Rate:</span>
          <span className="font-bold text-slate-900">{creditRate.toLocaleString()} DA</span>
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-12 items-start">
        {/* Step 1: Select Client */}
        <div className="lg:col-span-5 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            1. Select Client
          </label>

          {!selectedClient ? (
            <div ref={searchContainerRef} className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search client by name, phone, or card code…"
                  value={searchQuery}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                />
                <svg
                  className="absolute left-3.5 top-3 h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && (
                <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-xl transition-all animate-fade-in">
                  {loadingInitial ? (
                    <div className="p-4 text-center text-xs text-slate-400">Loading clients…</div>
                  ) : filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No clients matching search</div>
                  ) : (
                    filteredClients.slice(0, 10).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(c);
                          setShowDropdown(false);
                          setMessage(null);
                        }}
                        className="flex w-full items-center justify-between rounded-lg p-2.5 text-left text-sm hover:bg-[var(--primary-light)] transition-colors group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-900 group-hover:text-[var(--primary)] truncate">
                            {c.fullName}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {c.phone || "No phone"} {c.cards?.[0]?.cardCode ? `· ${c.cards[0].cardCode}` : ""}
                          </p>
                        </div>
                        <Badge tone={c.balance === 0 ? "danger" : c.balance <= 2 ? "warning" : "success"} size="sm">
                          {c.balance} credits
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Selected Client Card */
            <div className="relative rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white font-black text-base shadow">
                    {selectedClient.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">
                      {selectedClient.fullName}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      {primaryCardCode ? `Card: ${primaryCardCode}` : selectedClient.phone || "Active Client"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Badge tone={selectedClient.balance === 0 ? "danger" : selectedClient.balance <= 2 ? "warning" : "success"}>
                    {selectedClient.balance} credits
                  </Badge>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setSearchQuery("");
                      setMessage(null);
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 underline transition-colors"
                  >
                    Change client
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Alert Message Box */}
          {message && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold border transition-all ${
                message.tone === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Step 2 & 3: Method Selector & Form */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Select Recharge Method
            </label>

            {/* Mode Switcher Tabs */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
              {(["package", "money", "manual"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setAdjustMode(m);
                    setMessage(null);
                  }}
                  className={`rounded-lg px-3 py-1 font-semibold transition-all duration-200 ${
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

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Mode 1: Package */}
            {adjustMode === "package" && (
              <>
                <Select
                  label="Choose Package"
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
                  <option value="">Choose active package…</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — {pkg.totalCredits} credits ({pkg.creditAmount} + {pkg.bonusCredits} free) — {pkg.price.toLocaleString()} DA
                    </option>
                  ))}
                </Select>

                {selectedPackageId && (
                  <>
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
                        placeholder="e.g. Cash / Bank transfer"
                        value={moneyReason}
                        onChange={(e) => setMoneyReason(e.target.value)}
                      />
                    </div>

                    {(() => {
                      const pkg = packages.find((p) => p.id === selectedPackageId);
                      if (!pkg) return null;
                      return (
                        <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-200">
                          <div className="flex justify-between font-medium text-slate-600">
                            <span>Package price:</span>
                            <span className="font-bold text-slate-900">{pkg.price.toLocaleString()} DA</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Base Credits:</span>
                            <span>{pkg.creditAmount}</span>
                          </div>
                          <div className="flex justify-between text-emerald-600 font-medium">
                            <span>Bonus Credits:</span>
                            <span>+{pkg.bonusCredits} free</span>
                          </div>
                          <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                            <span>Total Credited:</span>
                            <span className="text-[var(--primary)]">{pkg.totalCredits} activities</span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </>
            )}

            {/* Mode 2: By Money */}
            {adjustMode === "money" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Money Received (DA)"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="e.g. 19000"
                    value={moneyAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMoneyAmount(val);
                      const parsed = parseFloat(val) || 0;
                      const credits = Math.round((parsed / creditRate) * 100) / 100;
                      setComputedMoneyCredits(credits);
                    }}
                    required
                  />
                  <Input
                    label="Custom Note (Optional)"
                    placeholder="e.g. Cash payment"
                    value={moneyReason}
                    onChange={(e) => setMoneyReason(e.target.value)}
                  />
                </div>

                {moneyAmount && computedMoneyCredits > 0 && (
                  <div className="rounded-xl bg-[var(--primary-light)] text-[var(--primary)] p-3 text-xs flex justify-between items-center font-bold border border-[var(--primary)]/20 animate-fade-in">
                    <span>Calculated Credits:</span>
                    <span className="text-sm font-black">{computedMoneyCredits.toFixed(2)} Activities</span>
                  </div>
                )}
              </>
            )}

            {/* Mode 3: Manual */}
            {adjustMode === "manual" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Custom Credit Adjustment"
                    type="number"
                    step="any"
                    placeholder="e.g. 5 (add) or -3 (deduct)"
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
                  placeholder="e.g. Loyalty reward / Typo fix"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  required
                />
              </>
            )}

            <Button
              type="submit"
              className="w-full mt-2 py-2.5 text-sm font-bold shadow-md hover:shadow-lg transition-all"
              loading={submitting}
              disabled={!selectedClient || submitting}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Confirm Credit Top-Up</span>
              </div>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
